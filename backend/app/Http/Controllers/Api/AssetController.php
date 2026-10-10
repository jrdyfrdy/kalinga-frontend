<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Support\HandlingClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class AssetController extends Controller
{
    public function available(Request $request)
    {
        // assets.capabilities stores snake_case values (cold_chain, high_value, ...)
        $capability = HandlingClass::capability($request->query('handling_class', 'general'));

        $query = Asset::where('status', 'Operational');

        if ($capability !== 'general') {
            $query->whereJsonContains('capabilities', $capability);
        }


        return response()->json([
            'data' => $query->orderBy('plate_number')->get()
        ]);
    }

public function index(Request $request)
{
    $query = Asset::query();

    // Search (Postgres ILIKE)
    if ($request->filled('search')) {
        $search = $request->search;
        $query->where(function ($q) use ($search) {
            $q->whereRaw('asset_code ILIKE ?', ["%$search%"])
              ->orWhereRaw('type ILIKE ?', ["%$search%"])
              ->orWhereRaw('plate_number ILIKE ?', ["%$search%"])
              ->orWhereRaw('location ILIKE ?', ["%$search%"]);
        });
    }

    // Filters
    if ($request->filled('status')) {
        $status = $request->status === 'available' ? 'Operational' : $request->status;
        $query->where('status', $status);
    }
    if ($request->filled('category')) $query->where('category', $request->category);
    if ($request->filled('location')) $query->where('location', $request->location);

    // Capabilities filter
    if ($request->filled('capabilities')) {
        $query->whereJsonContains('capabilities', $request->capabilities);
    }

    $assets = $query->get();

    return response()->json($assets->map(function ($asset) {
        return [
            'id'           => $asset->asset_code,
            'name'         => $asset->type,
            'category'     => $asset->category,
            'location'     => $asset->location,
            'status'       => $asset->status === 'Standby' ? 'Operational' : $asset->status,
            'personnel'    => $asset->personnel,
            'fuelLevel'    => (int) $asset->current_fuel_level,
            'value'        => $asset->value ? '$' . number_format($asset->value, 0) : null,
            'year'         => $asset->year,
            'plateNumber'  => $asset->plate_number,
            'condition'    => $asset->condition,
            'nextMaintenance' => $asset->next_maintenance,
            'capabilities' => $asset->capabilities,
            'temperatureControl' => $asset->capabilities && in_array('temperature_control', $asset->capabilities),
        ];
    }));
}



        public function show($code)
        {
            $asset = Asset::where('asset_code', $code)->firstOrFail();

            return response()->json([
                'id'           => $asset->asset_code,
                'name'         => $asset->type,
                'category'     => $asset->category,
                'capacity'     => $asset->capacity,
                'status'       => $asset->status === 'Standby' ? 'Operational' : $asset->status,
                'location'     => $asset->location,
                'personnel'    => $asset->personnel,
                'plateNumber'  => $asset->plate_number,
                'manufacturer' => $asset->manufacturer,
                'model'        => $asset->model,
                'year'         => $asset->year,
                'fuelLevel'    => (int) $asset->current_fuel_level,
                'mileage'      => $asset->mileage,
                'value'        => $asset->value ? '$' . number_format($asset->value, 0) : null,
                'purchaseDate'  => $asset->purchase_date?->format('Y-m-d'),
                'condition'    => $asset->condition,
                'capabilities' => $asset->capabilities,
                'lastMaintenance' => $asset->last_maintenance,
                'nextMaintenance' => $asset->next_maintenance,
            ]);
        }

        /**
         * Map the various field spellings the registry UI sends (list/detail
         * shape vs. form shape) onto real columns, and clean empty strings.
         */
        private function normalizeAssetPayload(Request $request): array
        {
            $data = $request->all();

            $aliases = [
                'name'            => 'type',
                'plateNumber'     => 'plate_number',
                'nextMaintenance' => 'next_maintenance',
                'lastMaintenance' => 'last_maintenance',
                'purchaseDate'    => 'purchase_date',
                'current_personnel' => 'personnel',
            ];
            foreach ($aliases as $from => $to) {
                if (array_key_exists($from, $data) && !array_key_exists($to, $data)) {
                    $data[$to] = $data[$from];
                }
            }

            // The list endpoint returns fuel level as the numeric `fuelLevel`.
            if (!array_key_exists('current_fuel_level', $data) && isset($data['fuelLevel']) && is_numeric($data['fuelLevel'])) {
                $data['current_fuel_level'] = (int) $data['fuelLevel'];
            }

            // `value` may come back formatted from the list view ("$185,000").
            if (isset($data['value']) && is_string($data['value'])) {
                $clean = preg_replace('/[^0-9.\-]/', '', $data['value']);
                $data['value'] = $clean === '' ? null : (float) $clean;
            }

            // Capabilities: accept a list or a {key: bool} map; store a list.
            if (array_key_exists('capabilities', $data)) {
                $caps = $data['capabilities'];
                if (is_array($caps) && !array_is_list($caps)) {
                    $caps = array_keys(array_filter($caps));
                }
                $data['capabilities'] = array_values(array_unique(array_map(
                    fn ($c) => in_array(strtolower((string) $c), ['cold_chain', 'coldchain', 'cold chain', 'high_value', 'highvalue', 'high-value', 'narcotics', 'general'], true)
                        ? HandlingClass::capability((string) $c)
                        : (string) $c,
                    (array) ($caps ?? [])
                )));
            }

            // Empty strings break date/integer/decimal columns in Postgres.
            foreach ($data as $key => $value) {
                if ($value === '') {
                    $data[$key] = null;
                }
            }

            // Fields the API returns but the table doesn't have.
            unset($data['id'], $data['temperatureControl']);

            return $data;
        }

        public function store(Request $request)
        {
            $data = $this->normalizeAssetPayload($request);

            validator($data, [
                'asset_code' => 'required|string|max:255|unique:assets,asset_code',
                'type'       => 'required|string|max:255',
                'category'   => 'required|string|max:255',
                'status'     => 'nullable|string|max:255',
                'year'       => 'nullable|integer',
                'value'      => 'nullable|numeric',
                'current_fuel_level' => 'nullable|integer|min:0|max:100',
                'last_maintenance'   => 'nullable|date',
                'next_maintenance'   => 'nullable|date',
                'purchase_date'      => 'nullable|date',
            ])->validate();

            $data['created_by'] = Auth::id();
            $data['status'] = $data['status'] ?? 'Standby';
            $data['capabilities'] = $data['capabilities'] ?? ['general'];

            $asset = Asset::create($data);
            
            return response()->json([
                'id'     => $asset->asset_code,
                'name'   => $asset->type,
                'status' => $asset->status === 'Standby' ? 'Operational' : $asset->status,
               
            ], 201);
        }

  
        public function update(Request $request, $code)
        {
            $asset = Asset::where('asset_code', $code)->firstOrFail();

            $data = $this->normalizeAssetPayload($request);
            unset($data['created_by']);

            validator($data, [
                'asset_code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('assets', 'asset_code')->ignore($asset->id)],
                'year'       => 'nullable|integer',
                'value'      => 'nullable|numeric',
                'current_fuel_level' => 'nullable|integer|min:0|max:100',
                'last_maintenance'   => 'nullable|date',
                'next_maintenance'   => 'nullable|date',
                'purchase_date'      => 'nullable|date',
            ])->validate();

            $asset->update($data);

            return response()->json([
                'id'   => $asset->asset_code,
                'name' => $asset->type,
                'status' => $asset->status === 'Standby' ? 'Operational' : $asset->status,
            ]);
        }

        public function destroy($code)
        {
            $asset = Asset::where('asset_code', $code)->firstOrFail();
            $asset->delete();

            return response()->json(['message' => 'Asset deleted']);
        }

        public function metrics()
        {
            $total = Asset::count();

            $active = Asset::whereIn('status', ['Operational', 'Standby'])->count();

            $underRepair = Asset::where('status', 'Under Repair')->count();

            // Optional: assets not assigned to any allocation (if you have allocation table)
            // Assets not currently attached to an active allocation.
            $unassigned = Asset::whereDoesntHave('allocationVehicles', function ($q) {
                $q->whereHas('allocation', fn ($a) => $a->whereIn('status', ['logistics_assigned', 'in_transit']));
            })->count();

            return response()->json([
                'total_assets'         => $total,
                'active_assets'        => $active,
                'vehicles_under_repair'=> $underRepair,
                'assets_unassigned'    => $unassigned,
            ]);
        }


        /**
         * Assets are individual units (vehicles/equipment), not stock. Stock
         * movements are tracked per resource via POST /resources/{id}/adjust-stock.
         */
        public function adjustStock(Request $request, $code)
        {
            Asset::where('asset_code', $code)->firstOrFail();

            return response()->json([
                'message' => 'Assets are not stock-tracked. Use /resources/{id}/adjust-stock for inventory items.',
            ], 422);
        }
   
        public function exportCsv()
        {
            $assets = Asset::all();
            $csv = "Asset Code,Name,Category,Status,Location,Fuel Level,Next Maintenance\n";
            foreach ($assets as $a) {
                $csv .= "\"{$a->asset_code}\",\"{$a->type}\",\"{$a->category}\",\"{$a->status}\",\"{$a->location}\",\"{$a->current_fuel_level}%\",\"{$a->next_maintenance}\"\n";
            }

            return response($csv)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="assets-'.date('Y-m-d').'.csv"');
        }
}