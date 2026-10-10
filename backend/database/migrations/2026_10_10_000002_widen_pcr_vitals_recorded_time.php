<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The PCR form auto-fills vitals time with an ISO-8601 timestamp
 * (e.g. 2026-10-10T17:35:42.417Z, 24 chars) and validation allows 80 chars,
 * but the column was varchar(20), so saving a report failed with a 500.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_care_report_vitals', function (Blueprint $table) {
            $table->string('recorded_time', 80)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Narrowing could truncate stored timestamps; keep the wider column.
    }
};
