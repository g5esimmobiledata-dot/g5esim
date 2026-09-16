<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ApiResponse
{
    public static function success(string $message, mixed $data = null, int $status = 200): JsonResponse
    {
        $payload = [
            'success' => true,
            'message' => $message,
        ];

        if ($data !== null) {
            $payload['data'] = self::camelize($data);
        }

        return response()->json($payload, $status);
    }

    public static function error(string $message, int $status = 500, ?string $code = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'code' => $code ?? 'ERROR',
        ], $status);
    }

    public static function paginated(string $message, mixed $data, array $pagination): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => self::camelize($data),
            'pagination' => $pagination,
        ]);
    }

    public static function camelize(mixed $value): mixed
    {
        if ($value instanceof \Illuminate\Contracts\Support\Arrayable) {
            $value = $value->toArray();
        }

        if ($value instanceof \stdClass) {
            $value = (array) $value;
        }

        if (! is_array($value)) {
            return $value;
        }

        $result = [];

        foreach ($value as $key => $item) {
            $newKey = is_string($key) ? Str::camel($key) : $key;
            $result[$newKey] = self::camelize($item);
        }

        return $result;
    }
}
