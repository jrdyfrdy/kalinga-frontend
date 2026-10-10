<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request as SupplyRequest;
use App\Models\Allocation;
use App\Models\Resource;
use App\Models\Asset;
use App\Models\Responder;
use App\Models\Hospital;
use App\Models\AuditLog;
use App\Models\NotificationLog;
use App\Models\AllocationVehicle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Support\HandlingClass;
use Carbon\Carbon;

class AllocationController extends Controller
{

public function index(Request $request)
{
    $query = Allocation::with([
        'request.hospital',
        'request.resource',
        'sourceHospital',
        'destinationHospital'
    ]);

    // Filter by source hospital (for release requests tab)
    if ($request->filled('source_hospital_id')) {
        $query->where('source_hospital_id', $request->source_hospital_id);
    }

    // Filter by destination hospital
    if ($request->filled('destination_hospital_id')) {
        $query->where('destination_hospital_id', $request->destination_hospital_id);
    }

    // Filter by status
    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    return $query->orderBy('created_at', 'desc')->get();
}


public function show($id)
{
    $allocation = Allocation::with([
        'request',
        'sourceHospital',
        'destinationHospital',
        'allocationVehicles.asset',         
        'allocationVehicles.responder.user',  
        'allocationVehicles.assignedBy'
    ])
    ->findOrFail($id);

    return response()->json($allocation);
}


public function myAllocations()
{
    return Allocation::with([
        'request.hospital',
        'sourceHospital',
        'destinationHospital',
        'request',
        'allocationVehicles.asset',
        'allocationVehicles.responder.user' 
    ])
    ->where(function ($q) {
        $q->where('created_by', auth()->id())
          ->orWhereIn('status', ['planned', 'confirmed', 'logistics_assigned']);
    })
    ->latest()
    ->get();
}

    // 1. Suggest Matches
public function suggestions($requestId)
{
    $request = SupplyRequest::with('hospital')->findOrFail($requestId);

    // Safety check: hospital must exist and have coordinates
    if (!$request->hospital || !$request->hospital->latitude || !$request->hospital->longitude) {
        return response()->json(['error' => 'Request hospital has no coordinates'], 422);
    }

    $destLat      = $request->hospital->latitude;
    $destLng      = $request->hospital->longitude;
    $requiredQty  = $request->quantity;
    $handling     = HandlingClass::canonical($request->handling_class);
    $resourceName = $request->resource_name;

    $query = Resource::select([
            'resources.id as resource_id',
            'resources.hospital_id',
            'resources.quantity as available_quantity',
            'resources.requires_cold_chain',
            'resources.is_high_value',
            'resources.is_narcotic',
            'hospitals.name as hospital_name',
            'hospitals.latitude',
            'hospitals.longitude',
            DB::raw("(6371 * acos(
                cos(radians(?)) * cos(radians(hospitals.latitude)) *
                cos(radians(hospitals.longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(hospitals.latitude))
            ))::numeric(10,2) AS distance_km")
        ])
        ->setBindings([$destLat, $destLng, $destLat])
        ->join('hospitals', 'resources.hospital_id', '=', 'hospitals.id')
        ->where('resources.name', $resourceName)
        ->where('resources.quantity', '>=', $requiredQty)
        ->where('resources.hospital_id', '!=', $request->hospital_id);

    // Handling class filter based on flags
    $query->where(function ($q) use ($handling) {
        if ($handling === HandlingClass::COLD_CHAIN) {
            $q->where('resources.requires_cold_chain', true);
        } elseif ($handling === HandlingClass::HIGH_VALUE) {
            $q->where('resources.is_high_value', true);
        } elseif ($handling === HandlingClass::NARCOTICS) {
            $q->where('resources.is_narcotic', true);
        } else {
            // General: no special flag required
        }
    });

    // Distance filter (use WHERE instead of HAVING in Postgres)
    $query->whereRaw("(6371 * acos(
        cos(radians(?)) * cos(radians(hospitals.latitude)) *
        cos(radians(hospitals.longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(hospitals.latitude))
    )) < 500", [$destLat, $destLng, $destLat]);

    $suggestions = $query
        ->orderBy('distance_km')
        ->get()
        ->map(function ($res) use ($request) {
            // Derive handling class display from flags
            if ($res->requires_cold_chain) {
                $display = 'Cold Chain';
            } elseif ($res->is_high_value) {
                $display = 'High-Value';
            } elseif ($res->is_narcotic) {
                $display = 'Narcotics';
            } else {
                $display = 'General';
            }

            return [
                'resource_id'        => $res->resource_id,
                'hospital_id'        => $res->hospital_id,
                'hospital_name'      => $res->hospital_name,
                'available_quantity' => $res->available_quantity,
                'distance_km'        => (float) $res->distance_km,
                'handling_class'     => $display,
                'can_fulfill'        => $res->available_quantity >= $request->quantity,
            ];
        });

    return response()->json($suggestions);
}


    // 2. Store Request Create Allocation
public function store(Request $request)
{
    $data = $request->validate([
        'request_id'         => 'required|exists:requests,id',
        'source_hospital_id' => 'required|exists:hospitals,id',
        'quantity'           => 'required|numeric|min:0.0001',
        'handling_class'     => ['required', Rule::in(HandlingClass::ACCEPTED)],
    ]);

    $originalRequest = \App\Models\Request::findOrFail($data['request_id']);

    if ((int) $originalRequest->hospital_id === (int) $data['source_hospital_id']) {
        return response()->json([
            'error' => 'Source hospital must differ from the requesting hospital.',
        ], 422);
    }

    $dbClass = HandlingClass::forAllocation($data['handling_class']);

    $allocation = Allocation::create([
        'request_id'              => $data['request_id'],
        'source_hospital_id'      => $data['source_hospital_id'],
        'destination_hospital_id' => $originalRequest->hospital_id,
        'resource_type'           => $originalRequest->resource_name,
        'quantity'                => $data['quantity'],
        'handling_class'          => $dbClass,
        'status'                  => 'planned',
        'created_by'              => auth()->id(),
    ]);

    $allocation->load([
        'request.hospital',
        'sourceHospital',
        'destinationHospital',
        'request'
    ]);

    AuditLog::create([
        'user_id'        => auth()->id(),
        'action'         => 'CREATE_ALLOCATION',
        'details'        => "Allocation #{$allocation->id} created",
        'auditable_type' => Allocation::class,
        'auditable_id'   => $allocation->id,
    ]);

    return response()->json(
    $allocation->load([
        'request.hospital',
        'sourceHospital',
        'destinationHospital',
        'request.resource'
    ]),
    201
);
}

    // 3. Confirm Allocation
public function confirm($id)
{
    $allocation = Allocation::findOrFail($id);
    
    // Check if it's planned
    if ($allocation->status !== 'planned') {
        return response()->json(['error' => 'Only planned allocations can be confirmed'], 422);
    }

    // Update to 'confirmed' NOT 'logistics_assigned'
    $allocation->update([
        'status'       => 'confirmed', 
        'confirmed_by' => auth()->id(),
        'confirmed_at' => now(),
    ]);

    // Refresh and return
    $allocation->refresh();
    $allocation->load(['request.hospital', 'sourceHospital', 'destinationHospital', 'request']);
    
    return response()->json($allocation);
}


    // 4. Assign Logistics (Phase 3 trigger)
public function assign(Request $request, Allocation $allocation)
{
    // PHASE 3: Only confirmed allocations can be assigned
    if ($allocation->status !== 'confirmed') {
        return response()->json([
            'error' => 'Only confirmed allocations can be assigned.'
        ], 422);
    }

    $request->validate([
        'asset_id'     => 'required', // numeric id or asset_code (registry rows use the code)
        'responder_id' => 'required|exists:responders,id',
    ]);

    return DB::transaction(function () use ($request, $allocation) {
        $asset     = $this->resolveAsset($request->asset_id);
        if (!$asset) {
            return response()->json(['error' => 'Selected vehicle was not found.'], 422);
        }
        $responder = Responder::findOrFail($request->responder_id);

        // 1. Asset must be available
        if (!in_array($asset->status, ['Operational', 'Standby'])) {
            return response()->json(['error' => 'Selected vehicle is not available.'], 422);
        }

        // 2. Responder must be available
        if ($responder->status !== 'Available' || $responder->current_asset_id !== null) {
            return response()->json(['error' => 'Selected responder is not available.'], 422);
        }

        // 3. Capability matching (this is the heart of Phase 3)
        $assetCapabilities = array_map(
            fn ($c) => HandlingClass::capability((string) $c),
            (array) ($asset->capabilities ?? [])
        );
        $requiredCapability = HandlingClass::capability($allocation->handling_class);

        if (!in_array($requiredCapability, $assetCapabilities)) {
            return response()->json([
                'error' => "Vehicle does not have required capability: {$requiredCapability}"
            ], 422);
        }

        // 4. Update allocation
        $allocation->update([
            'status'      => 'logistics_assigned',
            'assigned_at' => now(),
            'assigned_by' => auth()->id(),
        ]);

        // 5. Create pivot record 
        AllocationVehicle::create([
            'allocation_id' => $allocation->id,
            'asset_id'      => $asset->id,
            'responder_id'  => $responder->id,
            'assigned_by'   => auth()->id(), 
            'assigned_at' => now(),
        ]);

        // 6. Update asset & responder status 
        $asset->update(['status' => 'Standby']); 
        $responder->update([
            'status'          => 'On Duty',
            'current_asset_id' => $asset->id,
        ]);

        // 7. Audit log
        \App\Models\AuditLog::create([
            'user_id'        => auth()->id(),
            'action'         => 'ASSIGN_LOGISTICS',
            'details'        => "Assigned vehicle {$asset->plate_number} and responder {$responder->full_name} to allocation #{$allocation->id}",
            'auditable_type' => Allocation::class,
            'auditable_id'   => $allocation->id,
        ]);

        // 8. FINAL RETURN 
        $allocation->refresh(); 
        $allocation->load(['allocationVehicles.asset', 'allocationVehicles.responder']);

        return response()->json([
            'message'    => 'Logistics assigned successfully!',
            'allocation' => [
                'id'             => $allocation->id,
                'status'         => $allocation->status,
                'handling_class' => $allocation->handling_class,
                'assigned_at'    => $allocation->assigned_at,
                'vehicle'        => [
                    'id'           => $allocation->allocationVehicles->first()->asset->id ?? null,
                    'plate_number' => $allocation->allocationVehicles->first()->asset->plate_number ?? null,
                    'type'         => $allocation->allocationVehicles->first()->asset->type ?? null,
                    'capabilities' => $allocation->allocationVehicles->first()->asset->capabilities ?? null,
                ],
                'responder'      => [
                    'id'             => $allocation->allocationVehicles->first()->responder->id ?? null,
                    'full_name'      => $allocation->allocationVehicles->first()->responder->full_name ?? null,
                    'contact_number' => $allocation->allocationVehicles->first()->responder->contact_number ?? null,
                ],
            ]
        ], 200);
    });
}


/**
 * PATCH /api/allocations/{allocation}/reassign { asset_id, responder_id }
 * Swap the vehicle/responder on an already-assigned allocation, releasing
 * the previous pair.
 */
public function reassign(Request $request, Allocation $allocation)
{
    if (!in_array($allocation->status, ['logistics_assigned', 'confirmed'], true)) {
        return response()->json(['error' => 'Only assigned allocations can be reassigned.'], 422);
    }

    $request->validate([
        'asset_id'     => 'required', // numeric id or asset_code (registry rows use the code)
        'responder_id' => 'required|exists:responders,id',
    ]);

    return DB::transaction(function () use ($request, $allocation) {
        $current = $allocation->allocationVehicles()->latest('id')->first();

        $asset     = $this->resolveAsset($request->asset_id);
        if (!$asset) {
            return response()->json(['error' => 'Selected vehicle was not found.'], 422);
        }
        $responder = Responder::findOrFail($request->responder_id);

        $sameAsset     = $current && (int) $current->asset_id === (int) $asset->id;
        $sameResponder = $current && (int) $current->responder_id === (int) $responder->id;

        if (!$sameAsset && !in_array($asset->status, ['Operational', 'Standby'], true)) {
            return response()->json(['error' => 'Selected vehicle is not available.'], 422);
        }
        if (!$sameResponder && ($responder->status !== 'Available' || $responder->current_asset_id !== null)) {
            return response()->json(['error' => 'Selected responder is not available.'], 422);
        }

        $requiredCapability = HandlingClass::capability($allocation->handling_class);
        $assetCapabilities = array_map(fn ($c) => HandlingClass::capability((string) $c), (array) ($asset->capabilities ?? []));
        if (!in_array($requiredCapability, $assetCapabilities, true)) {
            return response()->json(['error' => "Vehicle does not have required capability: {$requiredCapability}"], 422);
        }

        // Release the previous assignment.
        if ($current) {
            if (!$sameResponder && $current->responder) {
                $current->responder->update(['status' => 'Available', 'current_asset_id' => null]);
            }
            if (!$sameAsset && $current->asset) {
                $current->asset->update(['status' => 'Operational']);
            }
            $current->delete();
        }

        AllocationVehicle::create([
            'allocation_id' => $allocation->id,
            'asset_id'      => $asset->id,
            'responder_id'  => $responder->id,
            'assigned_by'   => auth()->id(),
            'assigned_at'   => now(),
        ]);

        $asset->update(['status' => 'Standby']);
        $responder->update(['status' => 'On Duty', 'current_asset_id' => $asset->id]);
        $allocation->update([
            'status'      => 'logistics_assigned',
            'assigned_at' => now(),
            'assigned_by' => auth()->id(),
        ]);

        AuditLog::create([
            'user_id'        => auth()->id(),
            'action'         => 'REASSIGN_LOGISTICS',
            'details'        => "Reassigned vehicle {$asset->plate_number} and responder {$responder->full_name} to allocation #{$allocation->id}",
            'auditable_type' => Allocation::class,
            'auditable_id'   => $allocation->id,
        ]);

        return response()->json([
            'message'    => 'Logistics reassigned successfully!',
            'allocation' => $allocation->fresh()->load(['allocationVehicles.asset', 'allocationVehicles.responder']),
        ]);
    });
}


public function assignment($id)
{
    $allocation = Allocation::with([
        'allocationVehicles.asset',
        'allocationVehicles.responder.user'
    ])->findOrFail($id);

    $assignment = $allocation->allocationVehicles->sortByDesc('id')->first();

    if (!$assignment) {
        return response()->json(['vehicle' => null, 'responder' => null]);
    }

    $asset     = $assignment->asset;
    $responder = $assignment->responder;

    return response()->json([
        'vehicle' => $asset ? [
            'id'                => $asset->id,
            'plate_number'      => $asset->plate_number,
            'asset_code'        => $asset->asset_code,
            'type'              => $asset->type,
            'model'             => $asset->model ?? 'N/A',
            'category'          => $asset->category,
            'manufacturer'      => $asset->manufacturer ?? 'N/A',
            'year_manufactured' => $asset->year,
            'capacity'          => $asset->capacity,
            'location'          => $asset->location ?? 'Not specified',
            'status'            => ucfirst(str_replace('_', ' ', $asset->status)),
            'condition'         => $asset->condition ?? 'Excellent',
            'condition_rating'  => null,
            'capabilities'      => $asset->capabilities, 
            'last_maintenance'  => $asset->last_maintenance,
            'next_maintenance'  => $asset->next_maintenance,
        ] : null,

        'responder' => $responder ? [
            'id'                   => $responder->id,
            'responder_code'       => $responder->responder_code,
            'full_name'            => $responder->full_name,
            'contact_number'       => $responder->contact_number,
            'email'                => $responder->user?->email ?? 'N/A',
            'license_number'       => $responder->license_number ?? 'Not provided',
            'years_experience'     => null,
            'status'               => ucfirst(str_replace('_', ' ', $responder->status)),
            'handling_capabilities'=> $responder->handling_capabilities,
            'certifications'       => $responder->certifications ?? [],
        ] : null,
    ]);
}




    private function resolveAsset($idOrCode): ?Asset
    {
        return Asset::where('asset_code', (string) $idOrCode)->first()
            ?? (ctype_digit((string) $idOrCode) ? Asset::find((int) $idOrCode) : null);
    }

    private function normalizeCapability(string $handlingClass): string
    {
        return HandlingClass::capability($handlingClass);
    }

    /**
     * Record an in-app notification for the destination hospital's users
     * when an allocation is planned for their request.
     */
    private function notifyAllocationCreated(Allocation $allocation): void
    {
        try {
            $recipientIds = DB::table('hospital_user')
                ->where('hospital_id', $allocation->destination_hospital_id)
                ->pluck('user_id');

            foreach ($recipientIds as $userId) {
                NotificationLog::create([
                    'type'            => 'allocation_created',
                    'recipient_id'    => $userId,
                    'notifiable_type' => Allocation::class,
                    'notifiable_id'   => $allocation->id,
                    'message'         => "An allocation of {$allocation->resource_type} has been planned for your request.",
                    'channel'         => 'database',
                    'status'          => 'sent',
                    'sent_at'         => now(),
                ]);
            }
        } catch (\Throwable $e) {
            \Log::warning('notifyAllocationCreated failed', ['error' => $e->getMessage()]);
        }
    }


    // 5. BULK CREATE (from CoordinationPanel)
   public function bulkCreate(Request $request)
{
    $request->validate([
        'allocations' => 'required|array',
        'allocations.*.request_id'          => 'required|exists:requests,id',
        'allocations.*.source_hospital_id'  => 'required|exists:hospitals,id',
        'allocations.*.quantity'            => 'required|numeric|min:0.0001',
        'allocations.*.handling_class'      => ['required', Rule::in(HandlingClass::ACCEPTED)],
    ]);

    $created = [];

    foreach ($request->allocations as $item) {
        $req = SupplyRequest::findOrFail($item['request_id']);

        // Rule: source ≠ destination
        if ($req->hospital_id == $item['source_hospital_id']) {
            continue; // or throw error
        }

        $dbClass = HandlingClass::forAllocation($item['handling_class']);

        $allocation = Allocation::create([
            'request_id'              => $item['request_id'],
            'source_hospital_id'      => $item['source_hospital_id'],
            'destination_hospital_id' => $req->hospital_id,
            'resource_type'           => $req->resource_name,
            'quantity'                => $item['quantity'],
            'handling_class'          => $dbClass,
            'status'                  => 'planned',
            'created_by'              => auth()->id(),
        ]);

        $this->notifyAllocationCreated($allocation);

        AuditLog::create([
            'user_id'        => auth()->id(),
            'action'         => 'BULK_CREATE_ALLOCATION',
            'details'        => "Bulk allocation #{$allocation->id} created",
            'auditable_type' => Allocation::class,
            'auditable_id'   => $allocation->id,
            'ip_address'     => $request->ip(),
            'user_agent'     => $request->userAgent(),
        ]);

        $created[] = $allocation;
    }

    // Return every allocation created (the last one alone was returned before,
    // and the response crashed when all rows were skipped).
    return response()->json(
        collect($created)->each->load([
            'request.hospital',
            'sourceHospital',
            'destinationHospital',
            'request.resource'
        ])->values(),
        201
    );
}

    // 6. Reject Suggestion 
    public function rejectSuggestion($allocationId)
    {
        $allocation = Allocation::findOrFail($allocationId);
        $allocation->delete();
        return response()->json(['message' => 'Suggestion rejected']);
    }
    

// ---------------------------------------------------------
// LOGISTICS SUGGESTIONS (VEHICLES & RESPONDERS)
// ---------------------------------------------------------


public function suggestVehicle(Allocation $allocation)
{
    $lat = $allocation->sourceHospital->latitude;
    $lng = $allocation->sourceHospital->longitude;
    $capability = HandlingClass::capability($allocation->handling_class);

    $vehicle = Asset::query()
        ->where('status', 'Operational')
        ->whereJsonContains('capabilities', $capability)
        ->selectRaw("
            *, 
            (6371 * acos(
                cos(radians(?)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(?)) + 
                sin(radians(?)) * sin(radians(latitude))
            )) as distance_km
        ", [$lat, $lng, $lat])
        ->orderBy('distance_km')
        ->first();

    return response()->json($vehicle);
}


public function suggestResponder(Allocation $allocation)
{
    $handlingClass = HandlingClass::canonical($allocation->handling_class);

    $responder = Responder::query()
        ->where('status', 'Available')
        ->whereNull('current_asset_id')
        ->whereJsonContains('handling_capabilities', $handlingClass)
        ->with('user:id,name,email,phone')
        ->inRandomOrder()
        ->first();

    return response()->json($responder ?? null);
}


public function availableVehicles(Allocation $allocation, Request $request)
{
    $lat = $allocation->sourceHospital->latitude;
    $lng = $allocation->sourceHospital->longitude;

    $query = Asset::query()
        ->where('status', 'Operational')
        ->selectRaw("
            *, 
            (6371 * acos(
                cos(radians(?)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(?)) + 
                sin(radians(?)) * sin(radians(latitude))
            )) as distance_km
        ", [$lat, $lng, $lat]);

    if ($request->capability) {
        $query->whereJsonContains('capabilities', HandlingClass::capability($request->capability));
    }

    $vehicles = $query->orderBy('distance_km')->get();

    return response()->json([
        'data' => $vehicles,
        'meta' => ['total' => $vehicles->count()]
    ]);
}


public function availableResponders(Allocation $allocation, Request $request)
{
    $query = Responder::query()
        ->where('status', 'Available')
        ->whereNull('current_asset_id');

    if ($request->capability) {
        $query->whereJsonContains('handling_capabilities', HandlingClass::canonical($request->capability));
    }

    return response()->json([
        'data' => $query->get()
    ]);
}

public function assignmentDetails($id)
{
    $allocation = Allocation::with([
        'request.resource',
        'sourceHospital',
        'destinationHospital',
        'allocationVehicles.asset',
        'allocationVehicles.responder.user',           // ← GIVES YOU EMAIL, PHOTO, ADDRESS, CITY, ZIP
        'allocationVehicles.assignedBy'
    ])
    ->findOrFail($id);

    return response()->json([
        'success' => true,
        'data' => $allocation
    ]);
}

public function pendingCount()
{
    $count = SupplyRequest::where('status', 'pending')->count();
    return response()->json(['count' => $count]);
}

public function myAllocationsCount()
{
    $userId = auth()->id();
    
    $counts = Allocation::where('created_by', $userId)
        ->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'logistics_assigned' THEN 1 ELSE 0 END) as logistics_assigned,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned
        ")
        ->first();
    
    return response()->json($counts);
}

public function showWithDetails($id)
{
    $allocation = Allocation::with([
        'sourceHospital',
        'destinationHospital',
        'request',
        'allocationVehicles.asset',
        'allocationVehicles.responder.user',
        'allocationVehicles.assignedBy'
    ])->findOrFail($id);
    
    return response()->json($allocation);
}

/**
 * Get all active shipments for the Supply Tracking page.
 * Adapted from the original AllocationRequest-based implementation
 * to work with the current Allocation + Request architecture.
 */
public function getSupplyTracking()
{
    $activeStatuses = ['planned', 'confirmed', 'logistics_assigned', 'in_transit', 'delivered'];

    $allocations = Allocation::with(['request.resource', 'sourceHospital', 'destinationHospital'])
        ->whereIn('status', $activeStatuses)
        ->orderBy('dispatched_at', 'asc')
        ->orderBy('updated_at', 'desc')
        ->get();

    $formattedShipments = $allocations->map(function ($alloc) {
        $now = Carbon::now();

        // Map internal statuses to front-end display statuses
        $statusMap = [
            'planned'             => 'Approved',
            'confirmed'           => 'Packed',
            'logistics_assigned'  => 'Shipped',
            'in_transit'          => 'On-the-Way',
            'delivered'           => 'Delivered',
        ];
        $displayStatus = $statusMap[$alloc->status] ?? ucfirst($alloc->status);

        // Compute ETA: use dispatched_at + 4 hours as rough ETA if no explicit field
        $eta = $alloc->dispatched_at
            ? Carbon::parse($alloc->dispatched_at)->addHours(4)->toIso8601String()
            : ($alloc->assigned_at
                ? Carbon::parse($alloc->assigned_at)->addHours(6)->toIso8601String()
                : null);

        // Mark as Delayed if ETA is past and not yet delivered
        if ($eta && Carbon::parse($eta)->isPast() && $alloc->status !== 'delivered') {
            $displayStatus = 'Delayed';
        }

        $source      = optional($alloc->sourceHospital)->name ?? 'Logistics HQ';
        $destination = optional($alloc->destinationHospital)->name ?? 'Logistics HQ';

        $resourceName = optional(optional($alloc->request)->resource)->name
            ?? optional($alloc->request)->resource_name
            ?? $alloc->resource_type
            ?? 'Supplies';
        $quantity = $alloc->quantity ?? optional($alloc->request)->quantity ?? 0;

        // Map urgency from the request
        $urgency = optional($alloc->request)->urgency_level ?? 'Normal';

        return [
            'id'        => 'S-' . $alloc->id,
            'route'     => $source . ' → ' . $destination,
            'eta'       => $eta,
            'status'    => $displayStatus,
            'contents'  => $resourceName . ' (Qty: ' . $quantity . ')',
            'lastPing'  => Carbon::parse($alloc->updated_at)->diffForHumans(),
            'priority'  => $urgency,
            // Return GPS from meta JSON so LiveTrackingMap can place truck markers
            'location'  => [
                $alloc->meta['current_location_lat'] ?? null,
                $alloc->meta['current_location_lng'] ?? null,
            ],
        ];
    });

    return response()->json($formattedShipments);
}

}