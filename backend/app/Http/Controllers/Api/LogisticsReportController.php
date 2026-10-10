<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Allocation;
use App\Models\Request as SupplyRequest;

/**
 * Read-only lists for the admin Logistics Overview
 * (src/services/adminService.js getIncomingAllocations / getOutgoingAllocations /
 * getAllocationHistory). Rows share one shape:
 * { id, request_id, item_name, item_quantity, destination_hospital,
 *   source_location, urgency, status, created_at }
 */
class LogisticsReportController extends Controller
{
    private const DISPLAY_STATUS = [
        'pending'            => 'Pending',
        'under_review'       => 'Under Review',
        'approved'           => 'Approved',
        'matched'            => 'Matched',
        'planned'            => 'Approved',
        'confirmed'          => 'Packed',
        'logistics_assigned' => 'Shipped',
        'allocated'          => 'Allocated',
        'in_transit'         => 'On-the-Way',
        'delivered'          => 'Delivered',
        'verified'           => 'Delivered',
        'rejected'           => 'Rejected',
        'failed'             => 'Failed',
        'cancelled'          => 'Cancelled',
        'archived'           => 'Archived',
    ];

    /** Supply requests waiting on logistics. */
    public function incoming()
    {
        $rows = SupplyRequest::with(['hospital:id,name', 'resource:id,name'])
            ->whereIn('status', ['pending', 'under_review', 'approved', 'matched'])
            ->latest()
            ->limit(200)
            ->get()
            ->map(fn (SupplyRequest $r) => [
                'id'                   => $r->id,
                'request_id'           => 'REQ-' . $r->id,
                'item_name'            => $r->resource?->name ?? $r->resource_name,
                'item_quantity'        => $r->quantity,
                'destination_hospital' => $r->hospital?->name,
                'source_location'      => null,
                'urgency'              => $r->urgency_level,
                'status'               => self::DISPLAY_STATUS[$r->status] ?? ucfirst($r->status),
                'created_at'           => $r->created_at?->toIso8601String(),
            ]);

        return response()->json($rows);
    }

    /** Allocations dispatched out of source hospitals and not yet delivered. */
    public function outgoing()
    {
        return response()->json($this->allocationRows(['planned', 'confirmed', 'logistics_assigned', 'in_transit']));
    }

    /** Completed / closed allocations. */
    public function history()
    {
        return response()->json($this->allocationRows(['delivered', 'verified', 'failed', 'cancelled', 'archived']));
    }

    private function allocationRows(array $statuses)
    {
        return Allocation::with(['request:id,urgency_level,resource_name', 'sourceHospital:id,name', 'destinationHospital:id,name'])
            ->whereIn('status', $statuses)
            ->latest()
            ->limit(200)
            ->get()
            ->map(fn (Allocation $a) => [
                'id'                   => $a->id,
                'request_id'           => 'REQ-' . $a->request_id,
                'item_name'            => $a->resource_type ?? $a->request?->resource_name,
                'item_quantity'        => (float) $a->quantity,
                'destination_hospital' => $a->destinationHospital?->name,
                'source_location'      => $a->sourceHospital?->name,
                'urgency'              => $a->request?->urgency_level,
                'status'               => self::DISPLAY_STATUS[$a->status] ?? ucfirst($a->status),
                'created_at'           => $a->created_at?->toIso8601String(),
            ]);
    }
}
