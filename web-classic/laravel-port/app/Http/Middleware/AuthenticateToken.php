<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Auth\JwtService;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateToken
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return ApiResponse::error('Unauthenticated', 401, 'UNAUTHENTICATED');
        }

        try {
            $payload = $this->jwt->decode($token);
            $user = User::query()->find($payload->sub ?? null);
        } catch (\Throwable) {
            return ApiResponse::error('Invalid or expired token', 401, 'INVALID_TOKEN');
        }

        if (! $user || $user->is_blocked || $user->is_deleted) {
            return ApiResponse::error('Account is not available', 403, 'ACCOUNT_UNAVAILABLE');
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
