<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Admin;
use App\Services\Auth\JwtService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = Admin::query()->where('email', $validated['email'])->first();

        if (! $admin || ! Hash::check($validated['password'], $admin->password)) {
            return ApiResponse::error('Invalid email or password', 400);
        }

        return ApiResponse::success('Admin logged in successfully', [
            'admin' => $admin,
            'token' => $this->jwt->issueAdmin($admin),
        ]);
    }

    public function me(Request $request)
    {
        return ApiResponse::success('Admin fetched successfully', $request->user());
    }

    public function logout()
    {
        return ApiResponse::success('Logged out successfully');
    }
}
