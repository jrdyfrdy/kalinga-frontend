<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\MaintenanceLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class MaintenanceController extends Controller
{
    private const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    private const PRIORITIES = ['low', 'medium', 'high'];

    /**
     * GET /api/maintenance
     * Returns { upcoming, overdue, completed, all } — each a plain list.
     */
    public function index(Request $request)
    {
        $query = MaintenanceLog::with('asset')->orderBy('scheduled_date');

        if ($request->filled('asset_id')) {
            $asset = $this->resolveAsset($request->input('asset_id'));
            $query->where('asset_id', $asset?->id ?? 0);
        }

        $today = today();
        $items = $query->get()->map(fn (MaintenanceLog $log) => $this->transform($log, $today));

        $open = $items->filter(fn ($i) => !in_array($i['status'], ['completed', 'cancelled'], true));

        return response()->json([
            'upcoming'  => $open->filter(fn ($i) => !$i['isOverdue'])->values(),
            'overdue'   => $open->filter(fn ($i) => $i['isOverdue'])->values(),
            'completed' => $items->where('status', 'completed')->values(),
            'all'       => $items->values(),
        ]);
    }

    /**
     * POST /api/maintenance
     * asset_id may be the numeric id or the asset_code shown in the registry.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_id'       => 'required',
            'scheduled_date' => 'required|date',
            'description'    => 'nullable|string|max:2000',
            'priority'       => ['nullable', Rule::in(self::PRIORITIES)],
            'technician'     => 'nullable|string|max:255',
            'cost'           => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string|max:2000',
        ]);

        $asset = $this->resolveAsset($validated['asset_id']);
        if (!$asset) {
            return response()->json(['errors' => ['asset_id' => ['Asset not found.']]], 422);
        }

        $log = MaintenanceLog::create([
            'asset_id'       => $asset->id,
            'scheduled_date' => $validated['scheduled_date'],
            'description'    => $validated['description'] ?? 'Scheduled maintenance',
            'status'         => 'scheduled',
            'priority'       => $validated['priority'] ?? 'medium',
            'technician'     => $validated['technician'] ?? null,
            'cost'           => $validated['cost'] ?? null,
            'notes'          => $validated['notes'] ?? null,
            'created_by'     => Auth::id(),
        ]);
        $log->forceFill(['maintenance_code' => 'MTN-' . str_pad((string) $log->id, 5, '0', STR_PAD_LEFT)])->save();

        $this->syncAssetNextMaintenance($asset);

        return response()->json($this->transform($log->load('asset'), today()), 201);
    }

    /** POST /api/maintenance/{id}/reschedule  { newDate } */
    public function reschedule($id, Request $request)
    {
        $validated = $request->validate([
            'newDate' => 'required_without:scheduled_date|date',
            'scheduled_date' => 'required_without:newDate|date',
        ]);

        $log = $this->findLog($id);
        if ($log->status === 'completed') {
            return response()->json(['message' => 'Completed maintenance cannot be rescheduled.'], 422);
        }

        $log->update(['scheduled_date' => $validated['newDate'] ?? $validated['scheduled_date']]);
        $this->syncAssetNextMaintenance($log->asset);

        return response()->json($this->transform($log->fresh('asset'), today()));
    }

    /** POST /api/maintenance/{id}/complete  { notes? } */
    public function complete($id, Request $request)
    {
        $log = $this->findLog($id);
        $notes = $request->input('notes');

        $log->update([
            'status'         => 'completed',
            'completed_date' => today(),
            'notes'          => $notes ? trim(($log->notes ? $log->notes . "\n" : '') . $notes) : $log->notes,
        ]);

        if ($log->asset) {
            $log->asset->update(['last_maintenance' => today()]);
            $this->syncAssetNextMaintenance($log->asset);
        }

        return response()->json($this->transform($log->fresh('asset'), today()));
    }

    /** PATCH /api/maintenance/{id}/status  { status, notes? } */
    public function updateStatus($id, Request $request)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
            'notes'  => 'nullable|string|max:2000',
        ]);

        if ($validated['status'] === 'completed') {
            return $this->complete($id, $request);
        }

        $log = $this->findLog($id);
        $log->update([
            'status' => $validated['status'],
            'notes'  => $validated['notes'] ?? $log->notes,
        ]);
        $this->syncAssetNextMaintenance($log->asset);

        return response()->json($this->transform($log->fresh('asset'), today()));
    }

    private function findLog($id): MaintenanceLog
    {
        return MaintenanceLog::with('asset')
            ->where(function ($q) use ($id) {
                $q->where('maintenance_code', (string) $id);
                if (ctype_digit((string) $id)) {
                    $q->orWhere('id', (int) $id);
                }
            })
            ->firstOrFail();
    }

    private function resolveAsset($idOrCode): ?Asset
    {
        if ($idOrCode === null || $idOrCode === '') {
            return null;
        }

        return Asset::where('asset_code', (string) $idOrCode)->first()
            ?? (ctype_digit((string) $idOrCode) ? Asset::find((int) $idOrCode) : null);
    }

    /** Keep assets.next_maintenance in sync with the earliest open schedule. */
    private function syncAssetNextMaintenance(?Asset $asset): void
    {
        if (!$asset) {
            return;
        }

        $next = MaintenanceLog::where('asset_id', $asset->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->min('scheduled_date');

        $asset->update(['next_maintenance' => $next]);
    }

    private function transform(MaintenanceLog $log, $today): array
    {
        $open = !in_array($log->status, ['completed', 'cancelled'], true);

        return [
            'id'             => $log->id,
            'code'           => $log->maintenance_code ?? 'MTN-' . str_pad((string) $log->id, 5, '0', STR_PAD_LEFT),
            'assetId'        => $log->asset?->asset_code,
            'assetDbId'      => $log->asset_id,
            'assetName'      => $log->asset?->type,
            'assetType'      => $log->asset?->type,
            'assetLocation'  => $log->asset?->location,
            'assetCategory'  => $log->asset?->category,
            'assetCondition' => $log->asset?->condition,
            'scheduledDate'  => $log->scheduled_date?->format('Y-m-d'),
            'completedDate'  => $log->completed_date?->format('Y-m-d'),
            'description'    => $log->description,
            'status'         => $log->status,
            'priority'       => $log->priority,
            'technician'     => $log->technician,
            'cost'           => $log->cost !== null ? (float) $log->cost : null,
            'notes'          => $log->notes,
            'isOverdue'      => $open && $log->scheduled_date && $log->scheduled_date->lt($today),
        ];
    }
}
