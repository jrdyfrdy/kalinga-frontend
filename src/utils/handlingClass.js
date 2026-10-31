/**
 * Handling classes are spelled differently across the API:
 *   requests:    General | ColdChain | Narcotics | HighValue
 *   allocations: General | Cold Chain | Narcotics | High-Value
 *   assets:      general | cold_chain | narcotics | high_value
 * Mirrors backend/app/Support/HandlingClass.php.
 */
const keyOf = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

/** Canonical (request) spelling. */
export const canonicalHandlingClass = (value) => {
  switch (keyOf(value)) {
    case "coldchain":
      return "ColdChain";
    case "highvalue":
      return "HighValue";
    case "narcotic":
    case "narcotics":
      return "Narcotics";
    default:
      return "General";
  }
};

/** Snake-case capability used by assets / availability filters. */
export const handlingCapability = (value) =>
  ({
    ColdChain: "cold_chain",
    HighValue: "high_value",
    Narcotics: "narcotics",
    General: "general",
  })[canonicalHandlingClass(value)];

/** Human label. */
export const handlingLabel = (value) =>
  ({
    ColdChain: "Cold Chain",
    HighValue: "High Value",
    Narcotics: "Narcotics",
    General: "General",
  })[canonicalHandlingClass(value)];
