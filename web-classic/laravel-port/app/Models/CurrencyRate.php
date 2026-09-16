<?php

namespace App\Models;

class CurrencyRate extends BaseModel
{
    protected $table = 'currency_rates';

    protected $casts = [
        'is_default' => 'boolean',
        'is_enabled' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
