<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Brings the schema in line with what the controllers already read/write:
 *  - requests.approved_by / approved_at + 'approved'/'archived' statuses
 *  - allocations 'archived' status
 *  - hospitals.emergency_services (selected by /reports/doh-hospital)
 *  - notification_logs and vitals tables (their original migrations were
 *    skipped by an incorrect early-return guard)
 *  - users.settings json for notification/appointment preferences
 *  - active_devices (used by node-backend login device tracking)
 */
return new class extends Migration
{
    public function up(): void
    {
        $isPgsql = DB::getDriverName() === 'pgsql';

        if (!Schema::hasColumn('requests', 'approved_by')) {
            Schema::table('requests', function (Blueprint $table) {
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
            });
        }

        if ($isPgsql) {
            DB::statement('ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check');
            DB::statement("ALTER TABLE requests ADD CONSTRAINT requests_status_check CHECK (status IN (
                'draft','pending','under_review','approved','matched','allocated','in_transit',
                'delivered','verified','rejected','failed','archived'))");

            DB::statement('ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_status_check');
            DB::statement("ALTER TABLE allocations ADD CONSTRAINT allocations_status_check CHECK (status IN (
                'planned','confirmed','logistics_assigned','in_transit','delivered','verified',
                'failed','cancelled','archived'))");
        }

        if (!Schema::hasColumn('hospitals', 'emergency_services')) {
            Schema::table('hospitals', function (Blueprint $table) {
                $table->boolean('emergency_services')->default(true);
            });
        }

        if (!Schema::hasTable('notification_logs')) {
            Schema::create('notification_logs', function (Blueprint $table) {
                $table->id();
                $table->string('type');
                $table->foreignId('recipient_id')->nullable()->constrained('users')->nullOnDelete();
                $table->nullableMorphs('notifiable');
                $table->text('message');
                $table->string('channel')->default('database');
                $table->string('status')->default('pending');
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('read_at')->nullable();
                $table->json('meta')->nullable();
                $table->timestamps();

                $table->index(['type', 'created_at']);
                $table->index('status');
            });
        }

        if (!Schema::hasTable('vitals')) {
            Schema::create('vitals', function (Blueprint $table) {
                $table->id();
                $table->string('user_uuid')->index();
                $table->decimal('heart_rate', 6, 2)->nullable();
                $table->string('blood_pressure', 20)->nullable();
                $table->decimal('temperature', 5, 2)->nullable();
                $table->decimal('respiratory_rate', 6, 2)->nullable();
                $table->decimal('oxygen_saturation', 5, 2)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasColumn('users', 'settings')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('settings')->nullable();
            });
        }

        if (!Schema::hasTable('active_devices')) {
            Schema::create('active_devices', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('device_name')->nullable();
                $table->string('device_type')->nullable();
                $table->string('location')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamp('last_active')->nullable();
                $table->boolean('is_current_device')->default(false);
                $table->timestamp('created_at')->nullable();

                $table->unique(['user_id', 'device_name', 'ip_address']);
            });
        }
    }

    public function down(): void
    {
        // Non-destructive repair migration: columns/tables added here may hold
        // production data, so they are intentionally not dropped.
    }
};
