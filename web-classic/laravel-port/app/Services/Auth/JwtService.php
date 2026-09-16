<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\Admin;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    public function issue(User $user): string
    {
        return $this->encode([
            'guard' => 'user',
            'sub' => $user->id,
            'email' => $user->email,
        ]);
    }

    public function issueAdmin(Admin $admin): string
    {
        return $this->encode([
            'guard' => 'admin',
            'sub' => $admin->id,
            'email' => $admin->email,
            'role' => $admin->role,
        ]);
    }

    private function encode(array $claims): string
    {
        $now = time();
        $ttl = (int) config('esim.jwt.ttl_minutes', 43200);

        return JWT::encode($claims + [
            'iss' => config('app.url'),
            'iat' => $now,
            'exp' => $now + ($ttl * 60),
        ], $this->secret(), 'HS256');
    }

    public function decode(string $token): object
    {
        return JWT::decode($token, new Key($this->secret(), 'HS256'));
    }

    private function secret(): string
    {
        $secret = (string) config('esim.jwt.secret');

        if ($secret === '') {
            throw new \RuntimeException('JWT_SECRET or APP_KEY must be configured.');
        }

        return str_starts_with($secret, 'base64:')
            ? base64_decode(substr($secret, 7))
            : $secret;
    }
}
