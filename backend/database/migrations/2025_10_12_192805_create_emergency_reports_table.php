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
        Schema::create('emergency_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('incident_id')->nullable()->constrained()->onDelete('set null');
            $table->string('emergency_type'); // Medical, Fire, Natural Disaster, etc.
            $table->string('location');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('description');
            $table->enum('severity', ['critical', 'high', 'moderate', 'low'])->default('moderate');
            $table->enum('status', ['pending', 'dispatched', 'resolved', 'cancelled'])->default('pending');
            $table->string('vehicle_type')->nullable(); // ambulance, fire truck, etc.
            $table->json('photos')->nullable(); // array of photo paths
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emergency_reports');
    }
};
