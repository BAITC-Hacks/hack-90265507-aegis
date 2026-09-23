import type {
  ProductRequirements,
} from "./requirementParser.js";

import {
  extractTechnicalFacts,
  type EktProductDetail,
  type TechnicalFact,
  type TechnicalFacts,
} from "./technicalFacts.js";

export type RequirementStatus =
  | "match"
  | "mismatch"
  | "unknown"
  | "conflict";

export type RequirementCheck = {
  field: string;
  label: string;

  requested?:
    | string
    | number;

  actual?:
    | string
    | number;

  source?: string;

  status:
    RequirementStatus;

  propertyValue?:
    | string
    | number;

  textValue?:
    | string
    | number;
};

export type CompatibilityLevel =
  | "exact"
  | "partial"
  | "mismatch"
  | "unknown"
  | "conflict";

export type ProductEvaluation = {
  score: number;

  level:
    CompatibilityLevel;

  matchCount: number;
  mismatchCount: number;
  unknownCount: number;
  conflictCount: number;

  requestedCount: number;

  checks:
    RequirementCheck[];

  compatible: boolean;

  hasConflicts: boolean;

  facts:
    TechnicalFacts;
};

function normalizeText(
  value: string
) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim();
}

function textMatches(
  requested: string,
  actual: string
) {
  const a =
    normalizeText(requested);

  const b =
    normalizeText(actual);

  return (
    a === b ||
    a.includes(b) ||
    b.includes(a)
  );
}

function numbersMatch(
  requested: number,
  actual: number
) {
  return (
    Math.abs(
      requested - actual
    ) < 0.01
  );
}

function checkStringFact(
  field: string,
  label: string,
  requested:
    | string
    | undefined,
  fact: TechnicalFact<string>
): RequirementCheck | null {
  if (!requested) {
    return null;
  }

  if (
    fact.source === "conflict"
  ) {
    return {
      field,
      label,
      requested,

      status: "conflict",

      source:
        fact.source,

      propertyValue:
        fact.propertyValue,

      textValue:
        fact.textValue,
    };
  }

  if (!fact.value) {
    return {
      field,
      label,
      requested,

      status: "unknown",

      source:
        fact.source,
    };
  }

  return {
    field,
    label,

    requested,
    actual:
      fact.value,

    source:
      fact.source,

    status:
      textMatches(
        requested,
        fact.value
      )
        ? "match"
        : "mismatch",
  };
}

function checkNumberFact(
  field: string,
  label: string,

  requested:
    | number
    | undefined,

  fact: TechnicalFact<number>
): RequirementCheck | null {
  if (
    requested === undefined
  ) {
    return null;
  }

  if (
    fact.source === "conflict"
  ) {
    return {
      field,
      label,
      requested,

      status: "conflict",

      source:
        fact.source,

      propertyValue:
        fact.propertyValue,

      textValue:
        fact.textValue,
    };
  }

  if (
    fact.value === undefined
  ) {
    return {
      field,
      label,
      requested,

      status: "unknown",

      source:
        fact.source,
    };
  }

  return {
    field,
    label,

    requested,
    actual:
      fact.value,

    source:
      fact.source,

    status:
      numbersMatch(
        requested,
        fact.value
      )
        ? "match"
        : "mismatch",
  };
}

export function evaluateProduct(
  product: EktProductDetail,

  requirements:
    ProductRequirements
): ProductEvaluation {
  /*
   * First normalize all technical information
   * into one fact model.
   */
  const facts =
    extractTechnicalFacts(
      product
    );

  const checks:
    RequirementCheck[] = [];

  const brandCheck =
    checkStringFact(
      "brand",
      "Бренд",
      requirements.brand,
      facts.brand
    );

  if (brandCheck) {
    checks.push(
      brandCheck
    );
  }

  const polesCheck =
    checkNumberFact(
      "poles",
      "Количество полюсов",
      requirements.poles,
      facts.poles
    );

  if (polesCheck) {
    checks.push(
      polesCheck
    );
  }

  const currentCheck =
    checkNumberFact(
      "current",
      "Номинальный ток",
      requirements.current,
      facts.current
    );

  if (currentCheck) {
    checks.push(
      currentCheck
    );
  }

  const voltageCheck =
    checkNumberFact(
      "voltage",
      "Номинальное напряжение",
      requirements.voltage,
      facts.voltage
    );

  if (voltageCheck) {
    checks.push(
      voltageCheck
    );
  }

  const requestedCount =
    checks.length;

  const matchCount =
    checks.filter(
      (check) =>
        check.status ===
        "match"
    ).length;

  const mismatchCount =
    checks.filter(
      (check) =>
        check.status ===
        "mismatch"
    ).length;

  const unknownCount =
    checks.filter(
      (check) =>
        check.status ===
        "unknown"
    ).length;

  const conflictCount =
    checks.filter(
      (check) =>
        check.status ===
        "conflict"
    ).length;

  /*
   * Scoring:
   *
   * known technical matches are strongly rewarded;
   * known mismatches are strongly rejected;
   * conflicts are dangerous;
   * missing data is not a match.
   */
  const score =
    matchCount * 30 -
    mismatchCount * 45 -
    conflictCount * 35 -
    unknownCount * 8;

  let level:
    CompatibilityLevel;

  /*
   * A product with four UNKNOWN values is NOT
   * compatible anymore.
   */

  if (
    conflictCount > 0
  ) {
    level = "conflict";
  } else if (
    mismatchCount > 0
  ) {
    level = "mismatch";
  } else if (
    requestedCount === 0
  ) {
    level = "unknown";
  } else if (
    matchCount ===
    requestedCount
  ) {
    level = "exact";
  } else if (
    matchCount > 0 &&
    unknownCount > 0
  ) {
    level = "partial";
  } else {
    level = "unknown";
  }

  /*
   * IMPORTANT:
   *
   * Only a complete exact match is called
   * compatible.
   *
   * We do not claim compatibility when required
   * technical data is missing.
   */
  const compatible =
    level === "exact";

  return {
    score,

    level,

    matchCount,
    mismatchCount,
    unknownCount,
    conflictCount,

    requestedCount,

    checks,

    compatible,

    hasConflicts:
      conflictCount > 0,

    facts,
  };
}