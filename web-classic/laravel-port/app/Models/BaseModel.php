<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

abstract class BaseModel extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $keyName = $model->getKeyName();

            if (! $model->getAttribute($keyName)) {
                $model->setAttribute($keyName, (string) Str::uuid());
            }
        });
    }
}
