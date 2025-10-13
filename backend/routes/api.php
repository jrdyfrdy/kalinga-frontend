<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\IncidentController;
use App\Http\Controllers\EmergencyReportController;
use App\Http\Controllers\EvacuationCenterController;
use App\Http\Controllers\HospitalController;
use App\Http\Controllers\ResponderController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\SupplyItemController;
use App\Http\Controllers\NotificationController;

// Health check
Route::get('/status', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Kalinga backend is running',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Public routes
Route::prefix('public')->group(function () {
    Route::get('evacuation-centers', [EvacuationCenterController::class, 'index']);
    Route::get('hospitals', [HospitalController::class, 'index']);
});

// Resident routes
Route::prefix('resident')->group(function () {
    Route::post('emergency-reports', [EmergencyReportController::class, 'store']);
    Route::get('emergency-reports/{id}', [EmergencyReportController::class, 'show']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
});

// Admin routes
Route::prefix('admin')->group(function () {
    Route::apiResource('incidents', IncidentController::class);
    Route::apiResource('evacuation-centers', EvacuationCenterController::class);
    Route::apiResource('hospitals', HospitalController::class);
    Route::get('dashboard/stats', [IncidentController::class, 'dashboardStats']);
});

// Responder routes
Route::prefix('responder')->group(function () {
    Route::get('incidents', [IncidentController::class, 'index']);
    Route::get('incidents/{id}', [IncidentController::class, 'show']);
    Route::patch('incidents/{id}', [IncidentController::class, 'update']);
    Route::get('roster', [ResponderController::class, 'index']);
    Route::get('patients', [PatientController::class, 'index']);
    Route::post('patients', [PatientController::class, 'store']);
    Route::get('hospitals/nearby', [HospitalController::class, 'nearby']);
});

// Logistics routes
Route::prefix('logistics')->group(function () {
    Route::apiResource('assets', AssetController::class);
    Route::apiResource('supplies', SupplyItemController::class);
    Route::get('dashboard/stats', [AssetController::class, 'dashboardStats']);
});

// Patient portal routes
Route::prefix('patient')->group(function () {
    Route::get('appointments', [PatientController::class, 'appointments']);
    Route::get('health-records', [PatientController::class, 'healthRecords']);
    Route::get('messages', [PatientController::class, 'messages']);
});
