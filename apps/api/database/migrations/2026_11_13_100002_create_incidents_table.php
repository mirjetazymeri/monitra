<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('endpoint_id')->constrained()->cascadeOnDelete();
            $table->string('state', 16)->default('open'); // open | resolved
            $table->timestamp('started_at');
            $table->timestamp('resolved_at')->nullable();
            $table->string('error_category', 32)->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->unsignedInteger('failed_checks')->default(1);
            $table->boolean('is_simulated')->default(false);
            $table->timestamps();

            // Database-level guarantee of at most one open incident per endpoint:
            // the generated column is NULL for resolved incidents (NULLs never collide).
            $table->unsignedBigInteger('open_endpoint_id')
                ->nullable()
                ->virtualAs("CASE WHEN state = 'open' THEN endpoint_id ELSE NULL END");
            $table->unique('open_endpoint_id');

            $table->index(['endpoint_id', 'started_at']);
            $table->index(['state', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
