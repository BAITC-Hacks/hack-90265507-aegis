export type ProductRequirements = {
  originalQuery: string;

  brand?: string;
  productType?: string;

  poles?: number;
  current?: number;
  voltage?: number;

  article?: string;
};

const BRANDS = [
  "Legrand",
  "Schneider Electric",
  "ABB",
  "IEK",
  "EKF",
];

const PRODUCT_TYPES = [
  {
    value: "Автоматический выключатель",
    keywords: [
      "автоматический выключатель",
      "автомат",
      "автоматы",
    ],
  },

  {
    value: "Контактор",
    keywords: [
      "контактор",
      "контакторы",
    ],
  },

  {
    value: "Розетка",
    keywords: [
      "розетка",
      "розетки",
    ],
  },

  {
    value: "Выключатель",
    keywords: [
      "выключатель",
      "выключатели",
    ],
  },

  {
    value: "Кабель",
    keywords: [
      "кабель",
      "кабеля",
      "кабели",
    ],
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBrand(
  normalized: string
): string | undefined {
  return BRANDS.find((brand) =>
    normalized.includes(
      brand.toLowerCase()
    )
  );
}

function extractProductType(
  normalized: string
): string | undefined {
  for (const type of PRODUCT_TYPES) {
    const found =
      type.keywords.some((keyword) =>
        normalized.includes(keyword)
      );

    if (found) {
      return type.value;
    }
  }

  return undefined;
}

function extractPoles(
  normalized: string
): number | undefined {
  const patterns = [
    /(\d+)\s*(?:p|полюс|полюса|полюсов)(?=\s|$|[,.;])/i,

    /(\d+)\s*[- ]?полюсн/i,
  ];

  for (const pattern of patterns) {
    const match =
      normalized.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return undefined;
}

function extractCurrent(
  normalized: string
): number | undefined {
  const match = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(?:a|а|ампер(?:а|ов)?)(?=\s|$|[,.;])/i
  );

  if (!match) {
    return undefined;
  }

  const value = Number(
    match[1].replace(",", ".")
  );

  if (!Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function extractVoltage(
  normalized: string
): number | undefined {
  const match = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(?:v|в|вольт(?:а|ов)?)(?=\s|$|[,.;])/i
  );

  if (!match) {
    return undefined;
  }

  const value = Number(
    match[1].replace(",", ".")
  );

  if (!Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function extractArticle(
  original: string
): string | undefined {
  const match = original.match(
    /(?:арт(?:икул)?\.?\s*[:#-]?\s*)([A-Za-zА-Яа-я0-9_-]+)/i
  );

  if (match?.[1]) return match[1];

  const bareArticle = original.match(/\b\d{5,}\b/);
  return bareArticle?.[0];
}

export function parseRequirements(
  message: string
): ProductRequirements {
  const normalized =
    normalize(message);

  return {
    originalQuery:
      message.trim(),

    brand:
      extractBrand(normalized),

    productType:
      extractProductType(
        normalized
      ),

    poles:
      extractPoles(normalized),

    current:
      extractCurrent(normalized),

    voltage:
      extractVoltage(normalized),

    article:
      extractArticle(message),
  };
}
