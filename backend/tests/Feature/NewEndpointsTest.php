<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Database\Seeders\EvacuationCenterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Endpoints the frontend already called but that did not exist (404/405).
 */
class NewEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'patient', array $attrs = []): User
    {
        return User::factory()->create(array_merge(['role' => $role, 'verification_status' => 'verified'], $attrs));
    }

    public function test_notifications_list_mark_read_and_mark_all(): void
    {
        $user = $this->user();
        $other = $this->user();
        $a = Notification::create(['user_id' => $user->id, 'title' => 'A', 'description' => 'a']);
        Notification::create(['user_id' => $user->id, 'title' => 'B', 'description' => 'b']);
        $foreign = Notification::create(['user_id' => $other->id, 'title' => 'C', 'description' => 'c']);
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(2);
        $this->patchJson("/api/notifications/{$a->id}/read")->assertOk();
        $this->assertNotNull($a->fresh()->read_at);
        $this->patchJson("/api/notifications/{$foreign->id}/read")->assertNotFound();
        $this->postJson('/api/notifications/mark-all-read')->assertOk()->assertJsonPath('updated', 1);
    }

    public function test_admin_broadcast_accepts_console_payload(): void
    {
        $admin = $this->user('admin');
        $this->user('patient');
        $this->user('responder');
        Sanctum::actingAs($admin);

        $this->postJson('/api/notifications', ['title' => 'Typhoon', 'message' => 'Stay indoors', 'type' => 'emergency'])
            ->assertCreated()
            ->assertJsonPath('recipients', 3);

        $this->assertSame(3, Notification::where('title', 'Typhoon')->where('type', 'emergency')->count());
    }

    public function test_settings_round_trip_and_mute(): void
    {
        Sanctum::actingAs($this->user());

        $this->getJson('/api/notifications/other-settings')->assertOk()->assertJsonPath('lab_results_availability', true);
        $this->postJson('/api/notifications/other-settings', ['lab_results_availability' => false])->assertOk();
        $this->getJson('/api/notifications/other-settings')->assertJsonPath('lab_results_availability', false);

        $this->postJson('/api/appointments/settings', ['appointment_reminders' => ['1_day'], 'cancellation_notifications' => false])->assertOk();
        $this->getJson('/api/appointments/settings')->assertJsonPath('appointment_reminders.0', '1_day');

        $this->postJson('/api/notification-tone', ['tone' => 'loud'])->assertOk();
        $this->getJson('/api/notification-tone')->assertJsonPath('tone', 'loud');

        $this->postJson('/api/notifications/mute', ['duration' => 2, 'unit' => 'hours'])->assertOk()->assertJsonPath('muted', true);
        $this->getJson('/api/notifications/mute')->assertJsonPath('muted', true);
    }

    public function test_change_password_and_devices(): void
    {
        $user = $this->user('patient', ['password' => Hash::make('oldpassword')]);
        $other = $user->createToken('auth_token');
        $current = $user->createToken('auth_token');

        $this->withToken($current->plainTextToken)
            ->getJson('/api/devices')
            ->assertOk()
            ->assertJsonCount(2);

        $this->withToken($current->plainTextToken)
            ->postJson("/api/devices/{$current->accessToken->id}/logout")
            ->assertStatus(422);

        $this->withToken($current->plainTextToken)
            ->postJson('/api/change-password', [
                'current_password' => 'wrong',
                'new_password' => 'newpassword1',
                'new_password_confirmation' => 'newpassword1',
            ])->assertStatus(422);

        $this->withToken($current->plainTextToken)
            ->postJson('/api/change-password', [
                'current_password' => 'oldpassword',
                'new_password' => 'newpassword1',
                'new_password_confirmation' => 'newpassword1',
            ])->assertOk();

        $this->assertTrue(Hash::check('newpassword1', $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $other->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->accessToken->id]);
    }

    public function test_patient_sos_creates_incident(): void
    {
        $patient = $this->user('patient');
        Sanctum::actingAs($patient);

        $this->postJson('/api/incidents', [
            'location' => ['latitude' => 14.6, 'longitude' => 121.0, 'accuracy' => 12],
            'triggeredAt' => now()->toIso8601String(),
        ])->assertCreated()->assertJsonPath('incident.user_id', $patient->id);

        $this->assertDatabaseHas('incidents', ['user_id' => $patient->id, 'latlng' => '14.600000,121.000000']);

        // A second SOS while one is active returns the existing incident.
        $this->postJson('/api/incidents', ['locationError' => 'denied'])
            ->assertOk()
            ->assertJsonPath('existing', true);
        $this->assertSame(1, DB::table('incidents')->where('user_id', $patient->id)->count());
    }

    public function test_maintenance_crud(): void
    {
        $user = $this->user('logistics');
        Sanctum::actingAs($user);
        DB::table('assets')->insert([
            'asset_code' => 'GEN-1', 'type' => 'Generator', 'category' => 'Power',
            'status' => 'Operational', 'capabilities' => json_encode(['general']),
            'created_by' => $user->id, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $item = $this->postJson('/api/maintenance', [
            'asset_id' => 'GEN-1',
            'scheduled_date' => now()->subDay()->toDateString(),
            'description' => 'Oil change',
            'priority' => 'high',
        ])->assertCreated()->json();

        $this->getJson('/api/maintenance')->assertOk()
            ->assertJsonCount(1, 'overdue')
            ->assertJsonPath('overdue.0.assetId', 'GEN-1');

        $this->postJson("/api/maintenance/{$item['id']}/reschedule", ['newDate' => now()->addWeek()->toDateString()])->assertOk();
        $this->getJson('/api/maintenance')->assertJsonCount(1, 'upcoming');

        $this->postJson("/api/maintenance/{$item['id']}/complete")->assertOk()->assertJsonPath('status', 'completed');
        $this->assertNull(DB::table('assets')->where('asset_code', 'GEN-1')->value('next_maintenance'));
    }

    public function test_admin_logistics_lists_resource_stats_and_connectivity(): void
    {
        Sanctum::actingAs($this->user('admin'));

        $this->getJson('/api/incoming-requests')->assertOk();
        $this->getJson('/api/outgoing-requests')->assertOk();
        $this->getJson('/api/allocation-history')->assertOk();
        $this->getJson('/api/resources/stats')->assertOk()->assertJsonStructure(['total', 'critical', 'lowStock']);
        $this->getJson('/api/resources/by-facility')->assertOk();
        $this->getJson('/api/admin/connectivity/status')->assertOk()
            ->assertJsonPath('services.0.name', 'Primary database')
            ->assertJsonPath('services.0.status', 'online');
    }

    public function test_evacuation_centers(): void
    {
        $this->seed(EvacuationCenterSeeder::class);
        Sanctum::actingAs($this->user('patient'));

        $list = $this->getJson('/api/evacuation-centers?lat=14.59&lng=120.96')->assertOk()->json();
        $this->assertCount(3, $list);
        $this->assertSame('Baseco Evacuation Center', $list[0]['name']);
        $this->assertArrayHasKey('distance_km', $list[0]);

        $this->putJson("/api/evacuation-centers/{$list[0]['id']}", ['occupied' => 10])->assertForbidden();

        Sanctum::actingAs($this->user('admin'));
        $this->putJson("/api/evacuation-centers/{$list[0]['id']}", ['capacity' => 10, 'occupied' => 10])
            ->assertOk()
            ->assertJsonPath('status', 'full')
            ->assertJsonPath('available', 0);
    }

    public function test_chat_attachment_upload_archive_and_signed_download(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $patient = $this->user('patient');
        $responder = $this->user('responder');
        Sanctum::actingAs($responder);

        $response = $this->post('/api/chat/messages', [
            'receiver_id' => $patient->id,
            'attachment' => \Illuminate\Http\UploadedFile::fake()->image('wound.jpg'),
        ], ['Accept' => 'application/json'])->assertSuccessful();

        $url = $response->json('data.message.attachments.0.url') ?? $response->json('message.attachments.0.url')
            ?? collect($response->json())->dot()->first(fn ($v, $k) => str_ends_with($k, 'attachments.0.url'));
        $this->assertNotEmpty($url, 'attachment url missing: ' . json_encode($response->json()));

        $this->get($url)->assertOk();
        $this->get(preg_replace('/signature=[^&]+/', 'signature=bad', $url))->assertForbidden();

        $conversationId = DB::table('conversations')->value('id');
        $this->patchJson("/api/chat/conversations/{$conversationId}/archive", ['archived' => true])
            ->assertOk()
            ->assertJsonPath('isArchived', true);

        Sanctum::actingAs($this->user('patient'));
        $this->patchJson("/api/chat/conversations/{$conversationId}/archive")->assertNotFound();
    }
}
