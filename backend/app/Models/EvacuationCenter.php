<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvacuationCenter extends Model
{
    protected $fillable = [
        'name', 'address', 'contact', 'latitude', 'longitude',
        'capacity', 'occupied', 'status', 'resources', 'is_active', 'updated_by',
    ];

    protected $casts = [
        'resources' => 'array',
        'is_active' => 'boolean',
        'latitude'  => 'float',
        'longitude' => 'float',
        'capacity'  => 'integer',
        'occupied'  => 'integer',
    ];

    protected $appends = ['available'];

    public function getAvailableAttribute(): int
    {
        return max(0, (int) $this->capacity - (int) $this->occupied);
    }
}
