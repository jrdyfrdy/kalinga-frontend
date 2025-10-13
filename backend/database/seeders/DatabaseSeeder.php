<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Incident;
use App\Models\EvacuationCenter;
use App\Models\Hospital;
use App\Models\Responder;
use App\Models\Patient;
use App\Models\Asset;
use App\Models\SupplyItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create test users for different roles
        $resident = User::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'resident@kalinga.com',
            'password' => Hash::make('password'),
            'role' => 'resident',
            'phone' => '+63 912 345 6789',
            'is_verified' => true,
        ]);

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@kalinga.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_verified' => true,
        ]);

        $responderUser = User::create([
            'name' => 'Maria Santos',
            'email' => 'responder@kalinga.com',
            'password' => Hash::make('password'),
            'role' => 'responder',
            'is_verified' => true,
        ]);

        $logistics = User::create([
            'name' => 'Pedro Garcia',
            'email' => 'logistics@kalinga.com',
            'password' => Hash::make('password'),
            'role' => 'logistics',
            'is_verified' => true,
        ]);

        // Create incidents
        $incidents = [
            [
                'incident_id' => 'INC-4821',
                'label' => 'Flash flood',
                'location' => 'Barangay San Roque Creek',
                'latitude' => 14.6557,
                'longitude' => 121.0296,
                'severity' => 'critical',
                'status' => 'en-route',
                'priority' => 'critical',
                'eta' => '08 min',
                'patient_count' => 3,
                'commander' => 'Lt. Ramos',
                'assigned_units' => json_encode(['Medic 12', 'Rescue 4']),
                'reporters' => 'Team Bravo',
                'last_update' => now()->subMinutes(2),
            ],
            [
                'incident_id' => 'INC-4818',
                'label' => 'Landslide watch',
                'location' => 'Riverbank North Access',
                'latitude' => 14.6593,
                'longitude' => 121.0417,
                'severity' => 'high',
                'status' => 'on-scene',
                'priority' => 'high',
                'eta' => 'On scene',
                'patient_count' => 1,
                'commander' => 'Sgt. Bernardo',
                'assigned_units' => json_encode(['Scout Echo']),
                'reporters' => 'LGU quick response',
                'last_update' => now()->subMinutes(5),
            ],
            [
                'incident_id' => 'INC-4804',
                'label' => 'Heat exhaustion',
                'location' => 'Sta. Elena Covered Court',
                'latitude' => 14.6661,
                'longitude' => 121.0440,
                'severity' => 'moderate',
                'status' => 'handover',
                'priority' => 'moderate',
                'eta' => 'Handover',
                'patient_count' => 2,
                'commander' => 'PO3 Salcedo',
                'assigned_units' => json_encode(['Medic 7']),
                'reporters' => 'Scout volunteers',
                'last_update' => now()->subMinutes(14),
            ],
        ];

        foreach ($incidents as $incident) {
            Incident::create($incident);
        }

        // Create evacuation centers
        $evacuationCenters = [
            [
                'name' => 'Baseco Evacuation Center',
                'address' => 'HXR5+4M8, Port Area, Manila, Metro Manila',
                'contact' => '+0991 052 6395',
                'capacity' => 500,
                'occupied' => 201,
                'available' => 299,
                'distance' => 4.0,
                'status' => 'AVAILABLE',
                'latitude' => 14.5875,
                'longitude' => 120.9872,
            ],
            [
                'name' => 'Delpan Evacuation Center',
                'address' => 'Manila, Metro Manila',
                'contact' => '(02) 8241 4165',
                'capacity' => 100,
                'occupied' => 98,
                'available' => 2,
                'distance' => 21.0,
                'status' => 'AVAILABLE',
                'latitude' => 14.6042,
                'longitude' => 120.9822,
            ],
            [
                'name' => 'San Isidro Multi-Purpose Hall',
                'address' => 'San Isidro, Quezon City',
                'contact' => '(02) 8123 4567',
                'capacity' => 300,
                'occupied' => 0,
                'available' => 300,
                'distance' => 8.5,
                'status' => 'AVAILABLE',
                'latitude' => 14.6481,
                'longitude' => 121.0252,
            ],
        ];

        foreach ($evacuationCenters as $center) {
            EvacuationCenter::create($center);
        }

        // Create hospitals
        $hospitals = [
            [
                'hospital_id' => 'HSP-QUEZONMED',
                'name' => 'Quezon City General Hospital',
                'contact' => '(02) 8921-0704',
                'latitude' => 14.6760,
                'longitude' => 121.0437,
                'status' => 'operational',
                'bed_capacity' => 300,
                'available_beds' => 45,
                'trauma_level' => 'Level I',
                'has_icu' => true,
                'has_er' => true,
            ],
            [
                'hospital_id' => 'HSP-EASTAVE',
                'name' => 'East Avenue Medical Center',
                'contact' => '(02) 8928-0611',
                'latitude' => 14.6507,
                'longitude' => 121.0498,
                'status' => 'operational',
                'bed_capacity' => 650,
                'available_beds' => 108,
                'trauma_level' => 'Level I',
                'has_icu' => true,
                'has_er' => true,
            ],
            [
                'hospital_id' => 'HSP-FAIRVIEW',
                'name' => 'Fairview General Hospital',
                'contact' => '(02) 8806-2020',
                'latitude' => 14.7233,
                'longitude' => 121.0608,
                'status' => 'operational',
                'bed_capacity' => 150,
                'available_beds' => 22,
                'trauma_level' => 'Level II',
                'has_icu' => false,
                'has_er' => true,
            ],
        ];

        foreach ($hospitals as $hospital) {
            Hospital::create($hospital);
        }

        // Create responders
        $responders = [
            [
                'user_id' => $responderUser->id,
                'team_name' => 'Team Alpha',
                'members' => 4,
                'status' => 'on-scene',
                'location' => 'Landslide Sector 2',
                'latitude' => 14.6563,
                'longitude' => 121.0430,
                'vitals' => 'All stable',
                'last_ping' => now()->subMinutes(1),
            ],
        ];

        foreach ($responders as $responder) {
            Responder::create($responder);
        }

        // Create patients
        $patients = [
            [
                'patient_id' => 'PT-209',
                'name' => 'Ramon Villarin',
                'age' => 42,
                'condition' => 'Crush injury',
                'triage' => 'red',
                'heart_rate' => 118,
                'blood_pressure' => '90/60',
                'spo2' => 94,
                'destination' => 'General Hospital',
                'notes' => 'Stabilized limb, IV fluids running',
                'incident_id' => 1,
            ],
            [
                'patient_id' => 'PT-214',
                'name' => 'Jenny Laxamana',
                'age' => 9,
                'condition' => 'Asthma attack',
                'triage' => 'yellow',
                'heart_rate' => 104,
                'blood_pressure' => '104/68',
                'spo2' => 96,
                'destination' => 'Sta. Elena Clinic',
                'notes' => 'Neb treatment responded, monitor breathing',
                'incident_id' => 2,
            ],
        ];

        foreach ($patients as $patient) {
            Patient::create($patient);
        }

        // Create assets
        $assets = [
            [
                'asset_id' => 'AMB-001',
                'name' => 'Ambulance Unit 12',
                'category' => 'Vehicle',
                'type' => 'Ambulance',
                'status' => 'deployed',
                'location' => 'En-route to San Roque',
                'quantity' => 1,
                'last_maintenance' => now()->subMonths(2),
                'next_maintenance' => now()->addMonth(),
            ],
            [
                'asset_id' => 'FIRE-003',
                'name' => 'Fire Truck Alpha',
                'category' => 'Vehicle',
                'type' => 'Fire Truck',
                'status' => 'available',
                'location' => 'Station 5',
                'quantity' => 1,
                'last_maintenance' => now()->subMonth(),
                'next_maintenance' => now()->addMonths(2),
            ],
        ];

        foreach ($assets as $asset) {
            Asset::create($asset);
        }

        // Create supply items
        $supplies = [
            [
                'supply_id' => 'MED-001',
                'name' => 'Medical Kits',
                'category' => 'Medical',
                'quantity' => 150,
                'unit' => 'boxes',
                'status' => 'in-stock',
                'location' => 'Warehouse A',
            ],
            [
                'supply_id' => 'FOOD-002',
                'name' => 'Relief Goods Packs',
                'category' => 'Food',
                'quantity' => 500,
                'unit' => 'packs',
                'status' => 'in-stock',
                'location' => 'Warehouse B',
            ],
            [
                'supply_id' => 'WATER-003',
                'name' => 'Bottled Water',
                'category' => 'Water',
                'quantity' => 50,
                'unit' => 'cases',
                'status' => 'low-stock',
                'location' => 'Warehouse A',
            ],
        ];

        foreach ($supplies as $supply) {
            SupplyItem::create($supply);
        }
    }
}
