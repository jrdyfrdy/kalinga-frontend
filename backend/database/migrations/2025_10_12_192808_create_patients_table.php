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
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('patient_id')->unique(); // PT-XXX format
            $table->string('name');
            $table->integer('age');
            $table->string('condition');
            $table->enum('triage', ['red', 'yellow', 'green', 'black'])->default('green'); // severity
            $table->integer('heart_rate')->nullable();
            $table->string('blood_pressure')->nullable();
            $table->integer('spo2')->nullable(); // oxygen saturation
            $table->string('destination')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('incident_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
