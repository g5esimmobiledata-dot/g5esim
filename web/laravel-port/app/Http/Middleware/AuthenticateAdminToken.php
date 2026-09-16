<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Services\Auth\JwtService;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateAdminToken
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return ApiResponse::error('Admin authentication required', 401, 'UNAUTHENTICATED');
        }

        try {
            $payload = $this->jwt->decode($token);
            $admin = ($payload->guard ?? null) === 'admin'
                ? Admin::query()->find($payload->sub ?? null)
                : null;
        } catch (\Throwable) {
            return ApiResponse::error('Invalid or expired admin token', 401, 'INVALID_TOKEN');
        }

        if (! $admin) {
            return ApiResponse::error('Admin authentication required', 401, 'UNAUTHENTICATED');
        }

        $request->setUserResolver(fn () => $admin);

        return $next($request);
    }
}
