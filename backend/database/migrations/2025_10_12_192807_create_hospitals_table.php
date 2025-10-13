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
        Schema::create('hospitals', function (Blueprint $table) {
            $table->id();
            $table->string('hospital_id')->unique();
            $table->string('name');
            $table->string('contact');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->enum('status', ['operational', 'limited', 'closed'])->default('operational');
            $table->integer('bed_capacity')->default(0);
            $table->integer('available_beds')->default(0);
            $table->string('trauma_level')->nullable(); // Level I, II, III
            $table->boolean('has_icu')->default(false);
            $table->boolean('has_er')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hospitals');
    }
};
