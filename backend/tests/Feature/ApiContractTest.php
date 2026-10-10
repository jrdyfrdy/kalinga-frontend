<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regression tests for frontend ↔ API contract bugs found in the full-stack audit.
 */
class ApiContractTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'patient', array $attrs = []): User
    {
        return User::factory()->create(array_merge(['role' => $role, 'verification_status' => 'verified'], $attrs));
    }

    private function makeHospital(array $attrs = []): int
    {
        return DB::table('hospitals')->insertGetId(array_merge([
            'name' => 'Hospital ' . uniqid(),
            'latitude' => 14.6,
            'longitude' => 121.0,
            'bed_capacity' => 100,
            'current_occupancy' => 40,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ], $attrs));
    }

    private function makeResource(int $hospitalId, array $attrs = []): int
    {
        return DB::table('resources')->insertGetId(array_merge([
            'name' => 'Paracetamol',
            'category' => 'Medicine',
            'unit' => 'box',
            'quantity' => 100,
            'location' => 'Main',
            'hospital_id' => $hospitalId,
            'created_at' => now(),
            'updated_at' => now(),
        ], $attrs));
    }

    public function test_register_cannot_create_admin(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Eve',
            'email' => 'eve@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'role' => 'admin',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('users', ['email' => 'eve@example.com']);

        $ok = $this->postJson('/api/register', [
            'name' => 'Pat',
            'email' => 'pat@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);
        $ok->assertCreated();
        $this->assertSame('patient', $ok->json('user.role'));
    }

    public function test_logistics_status_route_requires_auth(): void
    {
        $this->patchJson('/api/logistics/requests/1/status', ['status' => 'archived'])
            ->assertUnauthorized();
    }

    public function test_magic_link_token_is_exchanged_for_session_token(): void
    {
        $user = $this->makeUser('patient');
        $magic = $user->createToken('magic-link');
        $magic->accessToken->forceFill(['expires_at' => now()->addMinutes(30)])->save();

        $response = $this->withToken($magic->plainTextToken)->postJson('/api/magic-login/exchange');

        $response->assertOk()->assertJsonStructure(['token', 'user']);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $magic->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $user->id, 'name' => 'auth_token']);
    }

    public function test_request_routes_bind_the_model_and_submit_draft(): void
    {
        $hospitalId = $this->makeHospital();
        $resourceId = $this->makeResource($hospitalId);
        $user = $this->makeUser('logistics');
        DB::table('hospital_user')->insert(['hospital_id' => $hospitalId, 'user_id' => $user->id]);
        Sanctum::actingAs($user);

        $draft = $this->postJson('/api/requests/draft', [
            'resource_id' => $resourceId,
            'quantity' => 5,
            'urgency_level' => 'High',
            'handling_class' => 'Cold Chain',
        ])->assertCreated()->json('request');

        $this->assertSame('ColdChain', $draft['handling_class']);

        $this->getJson("/api/requests/{$draft['id']}")
            ->assertOk()
            ->assertJsonPath('id', $draft['id']);

        $this->postJson("/api/requests/{$draft['id']}/submit")
            ->assertOk()
            ->assertJsonPath('request.status', 'pending');

        $this->postJson("/api/requests/{$draft['id']}/under-review")
            ->assertOk()
            ->assertJsonPath('request.status', 'under_review');

        $this->patchJson("/api/requests/{$draft['id']}/status", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('request.status', 'approved');
        $this->assertDatabaseHas('requests', ['id' => $draft['id'], 'approved_by' => $user->id]);
    }

    public function test_request_store_without_hospital_returns_422(): void
    {
        $hospitalId = $this->makeHospital();
        $resourceId = $this->makeResource($hospitalId);
        Sanctum::actingAs($this->makeUser('logistics'));

        $this->postJson('/api/requests', [
            'resource_id' => $resourceId,
            'quantity' => 1,
            'urgency_level' => 'Low',
            'handling_class' => 'General',
        ])->assertStatus(422);

        $this->postJson('/api/requests', [
            'resource_id' => $resourceId,
            'hospital_id' => $hospitalId,
            'quantity' => 1,
            'urgency_level' => 'Low',
            'handling_class' => 'General',
        ])->assertCreated();
    }

    public function test_allocation_endpoints_load_without_server_errors(): void
    {
        $dest = $this->makeHospital();
        $source = $this->makeHospital();
        $resourceId = $this->makeResource($dest);
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        $requestId = DB::table('requests')->insertGetId([
            'hospital_id' => $dest,
            'resource_id' => $resourceId,
            'resource_name' => 'Paracetamol',
            'quantity' => 5,
            'urgency_level' => 'High',
            'handling_class' => 'ColdChain',
            'status' => 'pending',
            'created_by' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $allocation = $this->postJson('/api/allocations', [
            'request_id' => $requestId,
            'source_hospital_id' => $source,
            'quantity' => 5,
            'handling_class' => 'ColdChain',
        ])->assertCreated()->json();

        $this->assertSame('Cold Chain', $allocation['handling_class']);

        $this->getJson("/api/allocations/{$allocation['id']}")->assertOk();
        $this->getJson("/api/allocations/{$allocation['id']}/assignment")->assertOk();
        $this->getJson("/api/allocations/{$allocation['id']}/assignment-details")->assertOk();
        $this->getJson("/api/allocations/{$allocation['id']}/suggest-responder")->assertOk();
        $this->getJson('/api/allocations/pending/count')->assertOk()->assertJsonPath('count', 1);
        $this->getJson('/api/assets/metrics')->assertOk();

        $this->patchJson("/api/logistics/requests/{$requestId}/status", ['status' => 'archived'])
            ->assertOk();
        $this->assertDatabaseHas('allocations', ['id' => $allocation['id'], 'status' => 'archived']);
    }

    public function test_asset_create_maps_frontend_fields(): void
    {
        Sanctum::actingAs($this->makeUser('logistics'));

        $this->postJson('/api/assets', [
            'asset_code' => 'AMB-001',
            'type' => 'Ambulance',
            'category' => 'Vehicle',
            'personnel' => 'Team A',
            'current_fuel_level' => 80,
            'next_maintenance' => '',
            'capabilities' => ['general' => true, 'cold_chain' => true, 'refrigerated' => false],
        ])->assertCreated();

        $row = DB::table('assets')->where('asset_code', 'AMB-001')->first();
        $this->assertSame('Team A', $row->personnel);
        $this->assertSame(80, (int) $row->current_fuel_level);
        $this->assertEqualsCanonicalizing(['general', 'cold_chain'], json_decode($row->capabilities, true));

        $this->putJson('/api/assets/AMB-001', ['value' => '$185,000', 'plateNumber' => 'ABC 123'])->assertOk();
        $row = DB::table('assets')->where('asset_code', 'AMB-001')->first();
        $this->assertEquals(185000, (float) $row->value);
        $this->assertSame('ABC 123', $row->plate_number);
    }

    public function test_patient_distribution_is_not_shadowed_and_uses_real_occupancy(): void
    {
        $this->makeHospital(['name' => 'Real', 'bed_capacity' => 200, 'current_occupancy' => 50]);

        $this->getJson('/api/hospitals/patient-distribution')
            ->assertOk()
            ->assertJsonPath('source', 'database')
            ->assertJsonPath('data.0.patients', 50)
            ->assertJsonPath('data.0.occupancy_pct', 25);

        $this->getJson('/api/reports/doh-hospital')
            ->assertOk()
            ->assertJsonPath('data.0.occupancy_pct', 25);
    }

    public function test_patient_can_open_conversation_for_own_incident_only(): void
    {
        $patient = $this->makeUser('patient');
        $other = $this->makeUser('patient');
        $responder = $this->makeUser('responder');

        $incidentId = DB::table('incidents')->insertGetId([
            'type' => 'Medical',
            'location' => 'Somewhere',
            'latlng' => '14.6,121.0',
            'description' => 'Help',
            'status' => 'reported',
            'user_id' => $patient->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('incident_responder_assignments')->insert([
            'incident_id' => $incidentId,
            'responder_id' => $responder->id,
            'status' => 'assigned',
            'assigned_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($other);
        $this->getJson("/api/incidents/{$incidentId}/conversation")->assertForbidden();

        Sanctum::actingAs($patient);
        $this->getJson("/api/incidents/{$incidentId}/conversation")
            ->assertOk()
            ->assertJsonStructure(['conversation']);
    }

    public function test_profile_update_cannot_change_role(): void
    {
        $user = $this->makeUser('patient');
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', [
            'name' => 'Still Patient',
            'email' => $user->email,
            'role' => 'admin',
        ])->assertOk();

        $this->assertSame('patient', $user->fresh()->role);
        $this->assertSame('Still Patient', $user->fresh()->name);
    }
}
