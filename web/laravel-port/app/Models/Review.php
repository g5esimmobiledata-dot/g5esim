<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends BaseModel
{
    protected $table = 'reviews';

    protected $casts = [
        'is_approved' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(UnifiedPackage::class, 'package_id');
    }
}
