<?php

namespace Database\Seeders;

use App\Models\EvacuationCenter;
use Illuminate\Database\Seeder;

/**
 * Initial evacuation centers (previously hardcoded in the patient UI).
 * Occupancy is maintained by admins via the /evacuation-centers API.
 */
class EvacuationCenterSeeder extends Seeder
{
    public function run(): void
    {
        $standardResources = [
            'Food' => ['distribution' => 'Ask shelter staff'],
            'Water' => ['distribution' => 'Ask shelter staff'],
            'Medicine' => ['distribution' => 'On request at clinic'],
            'First Aid Kits' => ['distribution' => 'On request at clinic'],
            'Hygiene Kits' => ['distribution' => 'Ask shelter staff'],
            'Blankets & Mats' => ['distribution' => 'Ask shelter staff'],
        ];

        $centers = [
            ['name' => 'Baseco Evacuation Center', 'address' => 'HXR5+4M8, Port Area, Manila, Metro Manila', 'contact' => '+0991 052 6395', 'latitude' => 14.5906, 'longitude' => 120.9590, 'capacity' => 500],
            ['name' => 'Delpan Evacuation Center', 'address' => 'Tondo, Manila, Metro Manila', 'contact' => '+(02) 8241 4165', 'latitude' => 14.6033, 'longitude' => 120.9667, 'capacity' => 200],
            ['name' => 'Mandaluyong Evacuation Center', 'address' => 'H38F+84V, Pasig, Metro Manila', 'contact' => null, 'latitude' => 14.5794, 'longitude' => 121.0359, 'capacity' => 100],
        ];

        foreach ($centers as $center) {
            EvacuationCenter::firstOrCreate(
                ['name' => $center['name']],
                $center + ['occupied' => 0, 'status' => 'open', 'resources' => $standardResources]
            );
        }
    }
}
