<?php

namespace App\Models;

class Setting extends BaseModel
{
    protected $table = 'settings';

    public const CREATED_AT = null;

    protected $casts = [
        'updated_at' => 'datetime',
    ];
}
