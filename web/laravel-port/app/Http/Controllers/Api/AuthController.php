<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\Auth\JwtService;
use App\Services\Email\OtpMailer;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(
        private readonly JwtService $jwt,
        private readonly OtpMailer $otpMailer,
    ) {
    }

    public function sendOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'purpose' => ['nullable', 'string'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        if ($user?->is_deleted) {
            return ApiResponse::error('Your account has been deleted or deactivated. Please contact support.', 400);
        }

        $code = app()->environment('local', 'development')
            ? '123456'
            : (string) random_int(100000, 999999);

        OtpCode::query()->create([
            'email' => $validated['email'],
            'code' => $code,
            'purpose' => $validated['purpose'] ?? 'login',
            'expires_at' => now()->addMinutes(10),
            'verified' => false,
            'attempts' => 0,
        ]);

        $this->otpMailer->send($validated['email'], $code, $validated['purpose'] ?? 'login');

        return ApiResponse::success('OTP sent successfully', [
            'email' => $validated['email'],
        ]);
    }

    public function checkEmail(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        return ApiResponse::success('Email check completed', [
            'exists' => (bool) $user,
            'passwordSet' => $user ? (bool) $user->hashed_password : false,
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['nullable', 'string'],
            'isFromGoogle' => ['nullable', 'boolean'],
            'name' => ['nullable', 'string'],
            'imagePath' => ['nullable', 'string'],
            'fcmToken' => ['nullable', 'string'],
            'deviceid' => ['nullable', 'string'],
            'deviceType' => ['nullable', 'string'],
            'deviceModel' => ['nullable', 'string'],
            'appVersion' => ['nullable', 'string'],
            'deviceManufacturer' => ['nullable', 'string'],
            'deviceLocation' => ['nullable', 'string'],
        ]);

        if (! ($validated['isFromGoogle'] ?? false)) {
            $otp = OtpCode::query()
                ->where('email', $validated['email'])
                ->where('purpose', 'login')
                ->where('verified', false)
                ->where('expires_at', '>', now())
                ->latest('created_at')
                ->first();

            if (! $otp || $otp->code !== ($validated['otp'] ?? null)) {
                if ($otp) {
                    $otp->increment('attempts');
                }

                return ApiResponse::error('Invalid or expired OTP', 400);
            }

            $otp->update(['verified' => true]);
        }

        $user = User::query()->firstOrCreate(
            ['email' => $validated['email']],
            [
                'name' => $validated['name'] ?? null,
                'image_path' => $validated['imagePath'] ?? null,
                'is_from_google' => (bool) ($validated['isFromGoogle'] ?? false),
                'kyc_status' => 'pending',
            ],
        );

        if ($user->is_blocked || $user->is_deleted) {
            return ApiResponse::error('Your account is blocked, deleted, or deactivated. Please contact support.', 400);
        }

        $this->updateLoginDeviceFields($user, $validated);

        if ($user->wasRecentlyCreated) {
            Notification::query()->create([
                'user_id' => $user->id,
                'type' => 'welcome',
                'title' => 'Welcome to AyaSIM',
                'message' => 'Thank you for joining us. Start browsing destinations to get your first eSIM.',
                'read' => false,
            ]);
        }

        return ApiResponse::success('User logged in successfully', [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'token' => $this->jwt->issue($user),
            'passwordSet' => (bool) $user->hashed_password,
        ]);
    }

    public function loginPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        if (
            ! $user ||
            ! $user->hashed_password ||
            ! Hash::check($validated['password'], $user->hashed_password) ||
            $user->is_blocked ||
            $user->is_deleted
        ) {
            return ApiResponse::error('Invalid email or password', 400);
        }

        $user->update(['last_password_login_at' => now()]);

        return ApiResponse::success('Login successful', [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'token' => $this->jwt->issue($user),
            'passwordSet' => true,
        ]);
    }

    public function setPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'password' => ['required', 'same:confirmPassword', Password::min(8)->mixedCase()->numbers()],
            'confirmPassword' => ['required', 'string'],
            'name' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        /** @var User $user */
        $user = $request->user();

        if ($user->hashed_password) {
            return ApiResponse::error('Password already set. Use change password instead.', 400);
        }

        $user->update([
            'hashed_password' => Hash::make($request->input('password')),
            'password_set_at' => now(),
            'name' => $request->input('name', $user->name),
        ]);

        return ApiResponse::success('Password set successfully');
    }

    public function appSetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userId' => ['required', 'string'],
            'password' => ['required', 'same:confirmPassword', Password::min(8)->mixedCase()->numbers()],
            'confirmPassword' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $user = User::query()->find($request->input('userId'));

        if (! $user) {
            return ApiResponse::error('User not found', 404, 'NOT_FOUND');
        }

        if ($user->hashed_password) {
            return ApiResponse::error('Password already set. Use change password instead.', 400);
        }

        $user->update([
            'hashed_password' => Hash::make($request->input('password')),
            'password_set_at' => now(),
        ]);

        return ApiResponse::success('Password set successfully');
    }

    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'currentPassword' => ['required', 'string'],
            'newPassword' => ['required', 'same:confirmPassword', Password::min(8)->mixedCase()->numbers()],
            'confirmPassword' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        /** @var User $user */
        $user = $request->user();

        if (! $user->hashed_password || ! Hash::check($request->input('currentPassword'), $user->hashed_password)) {
            return ApiResponse::error('Current password is incorrect', 400);
        }

        $user->update([
            'hashed_password' => Hash::make($request->input('newPassword')),
            'password_set_at' => now(),
        ]);

        return ApiResponse::success('Password changed successfully');
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $code = app()->environment('local', 'development')
            ? '123456'
            : (string) random_int(100000, 999999);

        OtpCode::query()->create([
            'email' => $validated['email'],
            'code' => $code,
            'purpose' => 'password_reset',
            'expires_at' => now()->addMinutes(10),
            'verified' => false,
            'attempts' => 0,
        ]);

        $this->otpMailer->send($validated['email'], $code, 'password_reset');

        return ApiResponse::success('If an account exists, a reset code has been sent', [
            'email' => $validated['email'],
        ]);
    }

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'otp' => ['required', 'string'],
            'newPassword' => ['required', 'same:confirmPassword', Password::min(8)->mixedCase()->numbers()],
            'confirmPassword' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $otp = OtpCode::query()
            ->where('email', $request->input('email'))
            ->where('purpose', 'password_reset')
            ->where('verified', false)
            ->where('expires_at', '>', now())
            ->latest('created_at')
            ->first();

        if (! $otp || $otp->code !== $request->input('otp')) {
            if ($otp) {
                $otp->increment('attempts');
            }

            return ApiResponse::error('Invalid or expired reset code', 400);
        }

        $user = User::query()->where('email', $request->input('email'))->first();

        if (! $user) {
            return ApiResponse::error('Invalid or expired reset code', 400);
        }

        $otp->update(['verified' => true]);
        $user->update([
            'hashed_password' => Hash::make($request->input('newPassword')),
            'password_set_at' => now(),
        ]);

        return ApiResponse::success('Password reset successfully. You can now login with your new password.');
    }

    public function me(Request $request)
    {
        /** @var User $user */
        $user = $request->user();
        $unread = Notification::query()
            ->where('user_id', $user->id)
            ->where('read', false)
            ->count();

        return ApiResponse::success('User fetched successfully', [
            ...$user->toArray(),
            'unreadNotificationCount' => $unread,
        ]);
    }

    public function logout()
    {
        return ApiResponse::success('Logged out successfully');
    }

    private function updateLoginDeviceFields(User $user, array $data): void
    {
        $updates = [];
        $map = [
            'name' => 'name',
            'imagePath' => 'image_path',
            'fcmToken' => 'fcm_token',
            'deviceid' => 'deviceid',
            'deviceType' => 'device_type',
            'deviceModel' => 'device_model',
            'appVersion' => 'app_version',
            'deviceManufacturer' => 'device_manufacturer',
            'deviceLocation' => 'device_location',
            'isFromGoogle' => 'is_from_google',
        ];

        foreach ($map as $input => $column) {
            if (array_key_exists($input, $data) && $data[$input] !== null) {
                $updates[$column] = $data[$input];
            }
        }

        if ($updates !== []) {
            $user->update($updates);
        }
    }
}
