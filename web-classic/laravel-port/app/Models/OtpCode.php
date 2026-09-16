<?php

namespace App\Models;

class OtpCode extends BaseModel
{
    protected $table = 'otp_codes';

    public const UPDATED_AT = null;

    protected $casts = [
        'verified' => 'boolean',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];
}
