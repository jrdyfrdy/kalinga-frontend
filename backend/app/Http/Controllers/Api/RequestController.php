<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\Resource;
use App\Models\AuditLog;
use Illuminate\Http\Request as HttpRequest;  
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Validation\Rule;
use App\Support\HandlingClass;

class RequestController extends Controller
{
    use AuthorizesRequests;  
 
public function index(HttpRequest $request)
{
    $user = Auth::user();

   
    if (in_array($user->role, ['logistics', 'admin'], true)) {
        $query = Request::with(['hospital', 'resource', 'creator'])->latest();
    } 
   
    else {
        $query = Request::with(['hospital', 'resource', 'creator'])
            ->myHospital()
            ->latest();
    }

    if ($request->status) {
        $query->where('status', $request->status);
    }
    if ($request->urgency) {
        $query->where('urgency_level', $request->urgency);
    }

    $requests = $request->boolean('all')
        ? $query->get()
        : $query->paginate(min(max((int) $request->input('per_page', 15), 1), 200));

    return response()->json($requests);
}


    /**
     * Resolve the requesting hospital: an explicit hospital_id must belong to
     * the user (admins/logistics may pick any); otherwise use the user's
     * first assigned hospital. Returns null when none can be determined.
     */
    private function resolveHospitalId(?int $requestedId): ?int
    {
        $user = Auth::user();
        $userHospitalIds = $user->hospitals()->pluck('hospitals.id')->map(fn ($id) => (int) $id);

        if ($requestedId) {
            if (in_array($user->role, ['admin', 'logistics'], true) || $userHospitalIds->contains($requestedId)) {
                return $requestedId;
            }
            return null;
        }

        return $userHospitalIds->first();
    }

    private function requestRules(): array
    {
        return [
            'resource_id'     => 'required|exists:resources,id',
            'hospital_id'     => 'nullable|integer|exists:hospitals,id',
            'quantity'        => 'required|integer|min:1',
            'urgency_level'   => 'required|in:Low,Medium,High,Critical',
            'handling_class'  => ['required', Rule::in(HandlingClass::ACCEPTED)],
            'reason'          => 'nullable|string|max:1000',
            'meta'            => 'nullable|array',
        ];
    }

    public function store(HttpRequest $request)
    {
        $validated = $request->validate($this->requestRules());
        $validated['handling_class'] = HandlingClass::canonical($validated['handling_class']);

        $resource = Resource::findOrFail($validated['resource_id']);

        $hospitalId = $this->resolveHospitalId($validated['hospital_id'] ?? null);
        if (!$hospitalId) {
            return response()->json([
                'message' => 'No hospital is assigned to your account. Select a hospital or ask an administrator to assign one.',
                'errors'  => ['hospital_id' => ['A valid hospital is required.']],
            ], 422);
        }

        return DB::transaction(function () use ($validated, $resource, $hospitalId) {

            $req = Request::create([
                'hospital_id'     => $hospitalId,  
                'resource_id'     => $resource->id,
                'resource_name'   => $resource->name,
                'quantity'        => $validated['quantity'],
                'urgency_level'   => $validated['urgency_level'],
                'handling_class'  => $validated['handling_class'],
                'reason'          => $validated['reason'] ?? null,
                'status'          => 'pending', // lowercase
                'created_by'      => Auth::id(),
                'meta'            => array_merge(['source' => 'hospital_portal'], $validated['meta'] ?? []),
            ]);

            AuditLog::create([
                'action'     => 'request_submitted',
                'auditable_type' => Request::class,
                'auditable_id'   => $req->id,
                'user_id'    => Auth::id(),
                'details'    => "Submitted request for {$resource->name} x{$validated['quantity']}"
            ]);

            return response()->json([
                'message'  => 'Request submitted successfully',
                'request'  => $req->load(['resource', 'hospital', 'creator'])
            ], 201);
        });
    }

public function storeDraft(HttpRequest $request)    {
        $validated = $request->validate($this->requestRules());
        $validated['handling_class'] = HandlingClass::canonical($validated['handling_class']);

        $resource = Resource::findOrFail($validated['resource_id']);

        $hospitalId = $this->resolveHospitalId($validated['hospital_id'] ?? null);
        if (!$hospitalId) {
            return response()->json([
                'message' => 'No hospital is assigned to your account. Select a hospital or ask an administrator to assign one.',
                'errors'  => ['hospital_id' => ['A valid hospital is required.']],
            ], 422);
        }

        $draft = Request::create([
            'hospital_id' => $hospitalId,
            'resource_id'     => $resource->id,
            'resource_name'   => $resource->name,
            'quantity'        => $validated['quantity'],
            'urgency_level'   => $validated['urgency_level'],
            'handling_class'  => $validated['handling_class'],
            'reason'          => $validated['reason'] ?? null,
            'status'          => 'draft',
            'meta'            => $validated['meta'] ?? null,
            'created_by'      => Auth::id(),
        ]);

        return response()->json([
            'message'  => 'Draft saved',
            'request'  => $draft->load('resource')
        ], 201);
    }

public function updateDraft(HttpRequest $request, Request $requestModel)    
{
        $this->authorize('update', $requestModel);

        if ($requestModel->status !== 'draft') {
            return response()->json(['error' => 'Only draft requests can be edited'], 403);
        }

        $validated = $request->validate([
            'quantity'       => 'required|integer|min:1',
            'urgency_level'  => 'required|in:Low,Medium,High,Critical',
                'handling_class' => ['required', Rule::in(HandlingClass::ACCEPTED)],
                'reason'         => 'nullable|string|max:1000',
            ]);
            $validated['handling_class'] = HandlingClass::canonical($validated['handling_class']);

            $requestModel->update($validated);

            return response()->json([
                'message' => 'Draft updated',
                'request' => $requestModel->fresh()->load('resource')
            ]);
        }

public function submitDraft(HttpRequest $request, Request $requestModel)
{
    $this->authorize('update', $requestModel);

    if ($requestModel->status !== 'draft') {
        return response()->json(['error' => 'Only draft requests can be submitted'], 403);
    }


    $requestModel->update(['status' => 'pending']);

    $requestModel->auditLogs()->create([
        'action'     => 'request_submitted_from_draft',
        'details'    => 'Converted draft to submitted request',
        'user_id'    => auth()->id(),
        'ip_address' => $request->ip(),
        'user_agent' => $request->header('User-Agent'),
    ]);

    return response()->json([
        'message' => 'Draft submitted successfully',
        'request' => $requestModel->fresh()->load(['resource', 'creator']),
    ]);
}

public function show(Request $requestModel)
    {
        return response()->json($requestModel->load(['resource', 'hospital', 'creator']));
    }

public function destroy(Request $requestModel)    {
        $this->authorize('delete', $requestModel);

        if ($requestModel->status !== 'draft') {
            return response()->json(['error' => 'Only draft requests can be deleted'], 403);
        }

        $requestModel->delete();

        return response()->json(['message' => 'Draft deleted']);
    }




    public function markAsUnderReview(Request $requestModel)
{
    $user = auth()->user();

    // Reviewers: dispatchers (DOH), logistics coordinators and admins.
    if (!in_array($user->role, ['dispatcher', 'logistics', 'admin'], true)) {
        return response()->json(['error' => 'Unauthorized'], 403);
    }

    if ($requestModel->status !== Request::STATUS_PENDING) {
        return response()->json([
            'error' => 'Request is no longer pending',
            'current_status' => $requestModel->status
        ], 422);
    }

    return DB::transaction(function () use ($requestModel, $user) {
        $oldStatus = $requestModel->status;

        $requestModel->update([
            'status' => Request::STATUS_UNDER_REVIEW
        ]);

        // Audit log
        $requestModel->auditLogs()->create([
            'action'         => 'request_under_review',
            'details'        => 'Reviewer started reviewing the request',
            'user_id'        => $user->id,
            'before'         => ['status' => $oldStatus],
            'after'          => ['status' => Request::STATUS_UNDER_REVIEW],
            'ip_address'     => request()->ip(),
            'user_agent'     => request()->header('User-Agent'),
        ]);

        // Optional: notify hospital "Your request is being reviewed"
        $requestModel->notifications()->create([
            'recipient_id' => $requestModel->created_by,
            'type'     => 'request_under_review',
            'message'  => 'Your supply request is now under review by DOH.',
            'channel'  => 'database',
            'status'   => 'sent',
            'sent_at'  => now(),
        ]);

        return response()->json([
            'message' => 'Request is now under review',
            'request' => $requestModel->fresh()->load(['hospital', 'resource'])
        ]);
    });
}

    /**
     * POST /api/requests/{requestModel}/escalate { reason? }
     * Raise urgency to Critical, record it, and alert administrators.
     */
    public function escalate(HttpRequest $httpRequest, Request $requestModel)
    {
        $validated = $httpRequest->validate(['reason' => 'nullable|string|max:1000']);

        if (in_array($requestModel->status, ['delivered', 'verified', 'rejected', 'archived', 'draft'], true)) {
            return response()->json(['error' => "A {$requestModel->status} request cannot be escalated."], 422);
        }

        $before = $requestModel->urgency_level;
        $requestModel->update(['urgency_level' => 'Critical']);

        $requestModel->auditLogs()->create([
            'action'     => 'request_escalated',
            'details'    => $validated['reason'] ?? 'Escalated to central buffer for immediate attention',
            'before'     => ['urgency_level' => $before],
            'after'      => ['urgency_level' => 'Critical'],
            'user_id'    => Auth::id(),
            'ip_address' => $httpRequest->ip(),
            'user_agent' => $httpRequest->header('User-Agent'),
        ]);

        $resourceName = $requestModel->resource_name;
        \App\Models\User::where('role', 'admin')->where('is_active', true)->pluck('id')
            ->each(function ($adminId) use ($requestModel, $resourceName) {
                try {
                    $n = \App\Models\Notification::create([
                        'user_id'     => $adminId,
                        'title'       => 'Supply request escalated',
                        'description' => "Request #{$requestModel->id} ({$resourceName}) was escalated to Critical.",
                        'type'        => 'warning',
                    ]);
                    event(new \App\Events\NotificationCreated($n));
                } catch (\Throwable $e) {
                    \Log::warning('Escalation notification failed', ['error' => $e->getMessage()]);
                }
            });

        return response()->json([
            'message' => 'Request escalated',
            'request' => $requestModel->fresh()->load(['resource', 'hospital']),
        ]);
    }

    /**
     * PATCH /api/requests/{request}/status
     *
     * Update a request's status (approve, reject, allocate, deliver, etc.).
     * Allowed transitions:
     *   pending      → approved | rejected
     *   approved     → allocated
     *   allocated    → in_transit
     *   in_transit   → delivered
     *   delivered    → verified
     */
    public function updateStatus(HttpRequest $httpRequest, Request $requestModel)
    {
        $validated = $httpRequest->validate([
            'status' => 'required|string|in:approved,rejected,allocated,in_transit,delivered,verified,under_review',
            'reason' => 'nullable|string|max:1000',
        ]);

        $allowed = [
            'pending'      => ['approved', 'rejected', 'under_review'],
            'under_review' => ['approved', 'rejected'],
            'approved'     => ['allocated'],
            'allocated'    => ['in_transit'],
            'in_transit'   => ['delivered'],
            'delivered'    => ['verified'],
        ];

        $currentStatus = $requestModel->status;
        $newStatus     = $validated['status'];

        if (!isset($allowed[$currentStatus]) || !in_array($newStatus, $allowed[$currentStatus], true)) {
            return response()->json([
                'error'          => "Cannot transition from '{$currentStatus}' to '{$newStatus}'",
                'current_status' => $currentStatus,
                'allowed'        => $allowed[$currentStatus] ?? [],
            ], 422);
        }

        return DB::transaction(function () use ($requestModel, $validated, $currentStatus) {
            $requestModel->update([
                'status'      => $validated['status'],
                'approved_by' => in_array($validated['status'], ['approved', 'rejected'], true) ? Auth::id() : $requestModel->approved_by,
                'approved_at' => $validated['status'] === 'approved' ? now() : $requestModel->approved_at,
            ]);

            $requestModel->auditLogs()->create([
                'action'     => "request_status_{$validated['status']}",
                'details'    => $validated['reason'] ?? "Status changed from {$currentStatus} to {$validated['status']}",
                'before'     => ['status' => $currentStatus],
                'after'      => ['status' => $validated['status']],
                'user_id'    => Auth::id(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->header('User-Agent'),
            ]);

            return response()->json([
                'message' => "Request status updated to {$validated['status']}",
                'request' => $requestModel->fresh()->load(['resource', 'hospital', 'creator']),
            ]);
        });
    }
}