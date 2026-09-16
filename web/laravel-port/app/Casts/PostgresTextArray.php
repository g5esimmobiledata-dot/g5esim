<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class PostgresTextArray implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_array($value)) {
            return $value;
        }

        $trimmed = trim((string) $value, '{}');

        if ($trimmed === '') {
            return [];
        }

        return str_getcsv($trimmed, ',', '"', '\\');
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        $items = array_map(
            fn ($item) => '"'.str_replace('"', '\"', (string) $item).'"',
            is_array($value) ? $value : [$value],
        );

        return '{'.implode(',', $items).'}';
    }
}
