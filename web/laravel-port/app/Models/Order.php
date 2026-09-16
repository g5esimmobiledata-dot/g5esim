<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends BaseModel
{
    protected $table = 'orders';

    protected $casts = [
        'is_roaming' => 'boolean',
        'usage_data' => 'array',
        'installation_sent' => 'boolean',
        'failover_attempts' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'activated_at' => 'datetime',
        'expires_at' => 'datetime',
        'last_retry_at' => 'datetime',
        'last_status_check' => 'datetime',
        'webhook_received_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(UnifiedPackage::class, 'package_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class, 'provider_id');
    }
}
