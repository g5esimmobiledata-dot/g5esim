<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends BaseModel
{
    protected $table = 'notifications';

    public const UPDATED_AT = null;

    protected $casts = [
        'read' => 'boolean',
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
