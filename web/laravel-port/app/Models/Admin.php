<?php

namespace App\Models;

class Admin extends BaseModel
{
    protected $table = 'admins';

    public const UPDATED_AT = null;

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
