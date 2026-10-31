<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvacuationCenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EvacuationCenterController extends Controller
{
    /**
     * GET /api/evacuation-centers?lat=&lng=
     * When coordinates are given, each center includes distance_km and the
     * list is sorted nearest first.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
        ]);

        $centers = EvacuationCenter::where('is_active', true)->orderBy('name')->get();

        if (isset($validated['lat'], $validated['lng'])) {
            $centers = $centers->map(function (EvacuationCenter $c) use ($validated) {
                $c->setAttribute('distance_km', ($c->latitude !== null && $c->longitude !== null)
                    ? round($this->haversine((float) $validated['lat'], (float) $validated['lng'], $c->latitude, $c->longitude), 2)
                    : null);
                return $c;
            })->sortBy(fn ($c) => $c->distance_km ?? PHP_FLOAT_MAX)->values();
        }

        return response()->json($centers);
    }

    public function show(EvacuationCenter $evacuationCenter)
    {
        return response()->json($evacuationCenter);
    }

    public function store(Request $request)
    {
        $center = EvacuationCenter::create($this->validated($request) + ['updated_by' => Auth::id()]);

        return response()->json($center, 201);
    }

    public function update(Request $request, EvacuationCenter $evacuationCenter)
    {
        $evacuationCenter->update($this->validated($request, true) + ['updated_by' => Auth::id()]);

        return response()->json($evacuationCenter->fresh());
    }

    public function destroy(EvacuationCenter $evacuationCenter)
    {
        $evacuationCenter->update(['is_active' => false, 'updated_by' => Auth::id()]);

        return response()->json(['message' => 'Evacuation center deactivated']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        $data = $request->validate([
            'name'      => [$req, 'string', 'max:255'],
            'address'   => ['nullable', 'string', 'max:255'],
            'contact'   => ['nullable', 'string', 'max:255'],
            'latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'capacity'  => ['nullable', 'integer', 'min:0'],
            'occupied'  => ['nullable', 'integer', 'min:0'],
            'status'    => ['nullable', 'in:open,full,closed'],
            'resources' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        // Keep status consistent with occupancy unless explicitly closed.
        if (isset($data['capacity'], $data['occupied']) && ($data['status'] ?? null) !== 'closed') {
            $data['status'] = $data['occupied'] >= $data['capacity'] && $data['capacity'] > 0 ? 'full' : 'open';
        }

        return $data;
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
