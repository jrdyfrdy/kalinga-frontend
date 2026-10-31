<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Broadcast category (info/warning/emergency/update) shown in admin UI.
        if (!Schema::hasColumn('notifications', 'type')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->string('type', 30)->default('info');
            });
        }

        // Lets /devices show where each session (Sanctum token) came from.
        if (!Schema::hasColumn('personal_access_tokens', 'ip_address')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
            });
        }

        if (!Schema::hasTable('evacuation_centers')) {
            Schema::create('evacuation_centers', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('address')->nullable();
                $table->string('contact')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->unsignedInteger('capacity')->default(0);
                $table->unsignedInteger('occupied')->default(0);
                $table->string('status', 30)->default('open'); // open | full | closed
                $table->json('resources')->nullable();        // { "Food": { "distribution": "..." } }
                $table->boolean('is_active')->default(true);
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('evacuation_centers');
    }
};
