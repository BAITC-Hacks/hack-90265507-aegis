export type FactSource =
  | "property"
  | "text"
  | "conflict"
  | "unknown";

export type TechnicalFact<T> = {
  value?: T;
  source: FactSource;

  propertyValue?: T;
  textValue?: T;

  conflict?: boolean;
};

export type TechnicalFacts = {
  brand: TechnicalFact<string>;
  poles: TechnicalFact<number>;
  current: TechnicalFact<number>;
  voltage: TechnicalFact<number>;
};

export type EktProductDetail = {
  id?: number;
  name?: string;
  article?: string;

  description?: string;

  price?: number;
  quantity?: number;

  brand?: string;

  properties?: Record<
    string,
    unknown
  >;
};

function normalizeText(
  value: unknown
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumber(
  value: unknown
): number | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const match = String(value)
    .replace(",", ".")
    .match(/\d+(?:\.\d+)?/);

  if (!match) {
    return undefined;
  }

  const number =
    Number(match[0]);

  return Number.isFinite(number)
    ? number
    : undefined;
}

function getProperty(
  product: EktProductDetail,
  key: string
) {
  return product.properties?.[key];
}

function sameNumber(
  a: number,
  b: number
) {
  return Math.abs(a - b) < 0.01;
}

function createNumberFact(
  propertyValue:
    | number
    | undefined,

  textValue:
    | number
    | undefined
): TechnicalFact<number> {
  if (
    propertyValue !== undefined &&
    textValue !== undefined
  ) {
    if (
      sameNumber(
        propertyValue,
        textValue
      )
    ) {
      return {
        value: propertyValue,
        source: "property",
        propertyValue,
        textValue,
        conflict: false,
      };
    }

    return {
      /*
       * Do NOT silently choose either source.
       */
      source: "conflict",
      propertyValue,
      textValue,
      conflict: true,
    };
  }

  if (
    propertyValue !== undefined
  ) {
    return {
      value: propertyValue,
      source: "property",
      propertyValue,
      conflict: false,
    };
  }

  if (
    textValue !== undefined
  ) {
    return {
      value: textValue,
      source: "text",
      textValue,
      conflict: false,
    };
  }

  return {
    source: "unknown",
    conflict: false,
  };
}

function extractPolesFromText(
  text: string
): number | undefined {
  /*
   * Examples:
   *
   * 3П
   * 3P
   * 3 полюса
   * 3-полюсный
   */
  const patterns = [
    /(?:^|\s)(\d+)\s*(?:п|p)(?=\s|$|[,.;])/i,

    /(\d+)\s*(?:полюс|полюса|полюсов)(?=\s|$|[,.;])/i,

    /(\d+)\s*[- ]?полюсн/i,
  ];

  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return undefined;
}

function extractCurrentFromText(
  text: string
): number | undefined {
  /*
   * Examples:
   *
   * 40А
   * 160 А
   * 250A
   */
  const match = text.match(
    /(?:^|[\s,;()])(\d+(?:[.,]\d+)?)\s*(?:а|a)(?=\s|$|[,.;)])/i
  );

  if (!match) {
    return undefined;
  }

  return Number(
    match[1].replace(",", ".")
  );
}

function extractVoltageFromText(
  text: string
): number | undefined {
  /*
   * Examples:
   *
   * 230В
   * 400 В
   * 400V
   */
  const match = text.match(
    /(?:^|[\s,;()])(\d+(?:[.,]\d+)?)\s*(?:в|v)(?=\s|$|[,.;)])/i
  );

  if (!match) {
    return undefined;
  }

  return Number(
    match[1].replace(",", ".")
  );
}

function extractBrandFromText(
  text: string
): string | undefined {
  const brands = [
    "Legrand",
    "Schneider Electric",
    "Schneider",
    "ABB",
    "IEK",
    "EKF",
    "DEKraft",
  ];

  const normalized =
    normalizeText(text);

  return brands.find((brand) =>
    normalized.includes(
      brand.toLowerCase()
    )
  );
}

function createBrandFact(
  propertyValue:
    | string
    | undefined,

  textValue:
    | string
    | undefined
): TechnicalFact<string> {
  if (
    propertyValue &&
    textValue
  ) {
    const propertyNormalized =
      normalizeText(propertyValue);

    const textNormalized =
      normalizeText(textValue);

    /*
     * "Schneider" and
     * "Schneider Electric"
     * should not become a false conflict.
     */
    const same =
      propertyNormalized ===
        textNormalized ||
      propertyNormalized.includes(
        textNormalized
      ) ||
      textNormalized.includes(
        propertyNormalized
      );

    if (same) {
      return {
        value: propertyValue,
        source: "property",
        propertyValue,
        textValue,
        conflict: false,
      };
    }

    return {
      source: "conflict",
      propertyValue,
      textValue,
      conflict: true,
    };
  }

  if (propertyValue) {
    return {
      value: propertyValue,
      source: "property",
      propertyValue,
      conflict: false,
    };
  }

  if (textValue) {
    return {
      value: textValue,
      source: "text",
      textValue,
      conflict: false,
    };
  }

  return {
    source: "unknown",
    conflict: false,
  };
}

export function extractTechnicalFacts(
  product: EktProductDetail
): TechnicalFacts {
  const text = [
    product.name ?? "",
    product.description ?? "",
  ].join(" ");

  const propertyBrandRaw =
    product.brand ??
    getProperty(
      product,
      "TORGOVAYA_MARKA"
    );

  const propertyBrand =
    typeof propertyBrandRaw ===
    "string"
      ? propertyBrandRaw.trim()
      : undefined;

  const propertyPoles =
    extractNumber(
      getProperty(
        product,
        "KOLICHESTVO_POLYUSOV"
      )
    );

  const propertyCurrent =
    extractNumber(
      getProperty(
        product,
        "NOMINALNYY_TOK"
      )
    );

  const propertyVoltage =
    extractNumber(
      getProperty(
        product,
        "NOMINALNOE_NAPRYAZHENIE"
      )
    );

  const textBrand =
    extractBrandFromText(text);

  const textPoles =
    extractPolesFromText(text);

  const textCurrent =
    extractCurrentFromText(text);

  const textVoltage =
    extractVoltageFromText(text);

  return {
    brand:
      createBrandFact(
        propertyBrand,
        textBrand
      ),

    poles:
      createNumberFact(
        propertyPoles,
        textPoles
      ),

    current:
      createNumberFact(
        propertyCurrent,
        textCurrent
      ),

    voltage:
      createNumberFact(
        propertyVoltage,
        textVoltage
      ),
  };
}