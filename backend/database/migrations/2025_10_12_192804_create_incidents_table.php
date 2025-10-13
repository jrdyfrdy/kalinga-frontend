<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->string('incident_id')->unique(); // INC-XXXX format
            $table->string('label'); // Flash flood, Landslide, etc.
            $table->string('location');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->enum('severity', ['critical', 'high', 'moderate', 'low'])->default('moderate');
            $table->enum('status', ['en-route', 'on-scene', 'handover', 'completed'])->default('en-route');
            $table->enum('priority', ['critical', 'high', 'moderate', 'routine'])->default('moderate');
            $table->string('eta')->nullable();
            $table->integer('patient_count')->default(0);
            $table->string('commander')->nullable();
            $table->json('assigned_units')->nullable(); // array of unit names
            $table->string('reporters')->nullable();
            $table->timestamp('last_update')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
