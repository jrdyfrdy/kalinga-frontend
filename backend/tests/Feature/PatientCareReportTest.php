<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientCareReportTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_stores_a_fully_filled_patient_care_report()
    {
        // Simulate an authenticated responder
        $user = User::factory()->create(['role' => 'responder']);
        $this->actingAs($user);

        $incidentId = \Illuminate\Support\Facades\DB::table('incidents')->insertGetId([
            'type' => 'Medical',
            'location' => 'Test location',
            'latlng' => '14.6,121.0',
            'description' => 'Test incident',
            'status' => 'reported',
            'user_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Prepare a fully-filled PCR payload
        $payload = [
            'is_draft' => false,
            'incident_id' => $incidentId,
            'patient_user_id' => $user->id,
            'case_no' => 'CASE-001',
            'mobile_unit' => 'AMB-01',
            'patient_details' => ['name' => 'Juan Dela Cruz'],
            'physiological_status' => ['chiefComplaint' => 'Chest pain'],
            'management_transport' => ['transportedTo' => 'General Hospital'],
            'client_submission_id' => 'test-uuid',
            'dispatch_date' => now()->toISOString(),
            'response_times' => [
                'dispatch' => now()->subMinutes(10)->toISOString(),
                'arrival' => now()->subMinutes(5)->toISOString(),
                'back_to_base' => now()->toISOString(),
            ],
            'vitals_entries' => [
                [
                    'time' => now()->toISOString(),
                    'bp' => '120/80',
                    'temp' => 36.5,
                    'rr' => 16,
                    'spo2' => 98,
                    'pulse' => 72,
                    'source' => 'manual',
                    'gcs' => [
                        'eyes' => 4,
                        'verbal' => 5,
                        'motor' => 6,
                    ],
                ],
            ],
            'waivers' => [
                'consentForTreatment' => true,
                'refusalOfTreatment' => false,
                'equipmentLiabilityAgreement' => true,
                'signer_name' => 'John Doe',
                'signed_at' => now()->toISOString(),
                'signature_base64' => 'data:image/png;base64,iVBORw0...',
            ],
        ];

        // Perform the POST request
        $response = $this->postJson('/api/patient-care-reports', $payload);

        // Assert the response is successful
        $response->assertStatus(201);

        // Assert the data is stored in the database
        $this->assertDatabaseHas('patient_care_reports', [
            'client_submission_id' => 'test-uuid',
        ]);
    }
}