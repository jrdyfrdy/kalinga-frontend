<?php

namespace App\Support;

/**
 * Handling classes are spelled differently across the schema:
 *   - requests.handling_class        : General | ColdChain | Narcotics | HighValue
 *   - allocations.handling_class     : General | Cold Chain | Narcotics | High-Value
 *   - assets.capabilities (json)     : general | cold_chain | narcotics | high_value
 *   - responders.handling_capabilities: General | ColdChain | Narcotics | HighValue
 *
 * This helper accepts any of those spellings and converts between them.
 */
final class HandlingClass
{
    public const GENERAL = 'General';
    public const COLD_CHAIN = 'ColdChain';
    public const NARCOTICS = 'Narcotics';
    public const HIGH_VALUE = 'HighValue';

    /** Every accepted input spelling (for validation rules). */
    public const ACCEPTED = [
        'General', 'general',
        'ColdChain', 'Cold Chain', 'cold_chain', 'cold-chain',
        'Narcotics', 'narcotics',
        'HighValue', 'High-Value', 'High Value', 'high_value', 'high-value',
    ];

    /** Canonical (request/responder) spelling. */
    public static function canonical(?string $value): string
    {
        $key = strtolower(preg_replace('/[\s_\-]+/', '', (string) $value));

        return match ($key) {
            'coldchain' => self::COLD_CHAIN,
            'highvalue' => self::HIGH_VALUE,
            'narcotics', 'narcotic' => self::NARCOTICS,
            default => self::GENERAL,
        };
    }

    /** Spelling stored in allocations.handling_class. */
    public static function forAllocation(?string $value): string
    {
        return match (self::canonical($value)) {
            self::COLD_CHAIN => 'Cold Chain',
            self::HIGH_VALUE => 'High-Value',
            self::NARCOTICS => 'Narcotics',
            default => 'General',
        };
    }

    /** Spelling stored in assets.capabilities. */
    public static function capability(?string $value): string
    {
        return match (self::canonical($value)) {
            self::COLD_CHAIN => 'cold_chain',
            self::HIGH_VALUE => 'high_value',
            self::NARCOTICS => 'narcotics',
            default => 'general',
        };
    }
}
