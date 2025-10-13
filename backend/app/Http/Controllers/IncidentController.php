<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use Illuminate\Http\Request;

class IncidentController extends Controller
{
    public function index()
    {
        $incidents = Incident::orderBy('last_update', 'desc')->get();
        return response()->json($incidents);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'incident_id' => 'required|unique:incidents',
            'label' => 'required|string',
            'location' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'severity' => 'required|in:critical,high,moderate,low',
            'status' => 'required|in:en-route,on-scene,handover,completed',
            'priority' => 'required|in:critical,high,moderate,routine',
        ]);

        $validated['assigned_units'] = json_encode($request->input('assigned_units', []));
        $validated['last_update'] = now();
        $incident = Incident::create($validated);
        
        return response()->json($incident, 201);
    }

    public function show(string $id)
    {
        $incident = Incident::findOrFail($id);
        return response()->json($incident);
    }

    public function update(Request $request, string $id)
    {
        $incident = Incident::findOrFail($id);
        $validated = $request->validate([
            'status' => 'sometimes|in:en-route,on-scene,handover,completed',
            'severity' => 'sometimes|in:critical,high,moderate,low',
            'patient_count' => 'sometimes|integer',
        ]);
        
        if ($request->has('assigned_units')) {
            $validated['assigned_units'] = json_encode($request->input('assigned_units'));
        }
        
        $validated['last_update'] = now();
        $incident->update($validated);
        
        return response()->json($incident);
    }

    public function destroy(string $id)
    {
        $incident = Incident::findOrFail($id);
        $incident->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function dashboardStats()
    {
        return response()->json([
            'total' => Incident::count(),
            'active' => Incident::whereIn('status', ['en-route', 'on-scene'])->count(),
            'critical' => Incident::where('severity', 'critical')->count(),
        ]);
    }
}
