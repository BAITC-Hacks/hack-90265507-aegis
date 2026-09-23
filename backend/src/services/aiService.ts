import OpenAI from "openai";

import type {
  ProductRequirements,
} from "./requirementParser.js";

const apiKey =
  process.env.OPENAI_API_KEY;

const model =
  process.env.OPENAI_MODEL ||
  "gpt-5.6-luna";

let client:
  OpenAI | null = null;

function getClient() {
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing"
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
    });
  }

  return client;
}

export type AiIntent =
  | "product_search"
  | "product_question"
  | "greeting"
  | "unknown";

export type AiRequirementResult = {
  intent: AiIntent;

  requirements:
    ProductRequirements;

  /*
   * Fields explicitly changed or stated
   * in the current user message.
   */
  providedFields: string[];

  clarificationQuestion?:
    string;
};

function cleanJson(
  value: string
) {
  return value
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();
}

function optionalString(
  value: unknown
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const clean =
    value.trim();

  return clean
    ? clean
    : undefined;
}

function optionalNumber(
  value: unknown
): number | undefined {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return undefined;
  }

  return value;
}

function safeProvidedFields(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set([
    "brand",
    "productType",
    "poles",
    "current",
    "voltage",
    "article",
  ]);

  return value.filter(
    (item): item is string =>
      typeof item ===
        "string" &&
      allowed.has(item)
  );
}

export async function extractRequirementsWithAI(
  message: string,

  previousRequirements?:
    ProductRequirements
): Promise<AiRequirementResult> {
  const openai =
    getClient();

  const previous =
    previousRequirements ?? {
      originalQuery: "",
    };

  const input = `
PREVIOUS REQUIREMENTS:
${JSON.stringify(
  previous,
  null,
  2
)}

CURRENT USER MESSAGE:
${message}
  `.trim();

  const response =
    await openai.responses.create({
      model,

      instructions: `
You are the language understanding layer of EKTiQ,
an electrical procurement assistant for the EKT catalog.

The conversation can contain follow-up messages.

Your job is to understand ONLY what the user means.

You receive:
1. PREVIOUS REQUIREMENTS
2. CURRENT USER MESSAGE

IMPORTANT FOLLOW-UP RULE:

If the user changes only one requirement,
preserve the other previous requirements.

Example:

Previous:
{
  "brand": "Legrand",
  "productType": "Автоматический выключатель",
  "poles": 3,
  "current": 160,
  "voltage": 400
}

User:
"А Schneider?"

Result:
{
  "brand": "Schneider Electric",
  "productType": "Автоматический выключатель",
  "poles": 3,
  "current": 160,
  "voltage": 400
}

Do NOT preserve a field if the user explicitly
replaces or removes that field.

Never invent:
- products
- product IDs
- articles
- prices
- stock
- warehouse quantities
- certificates
- technical specifications

Those facts are verified by another system.

Return ONLY valid JSON.

Schema:

{
  "intent":
    "product_search" |
    "product_question" |
    "greeting" |
    "unknown",

  "requirements": {
    "brand": string | null,
    "productType": string | null,
    "poles": number | null,
    "current": number | null,
    "voltage": number | null,
    "article": string | null
  },

  "providedFields": [
    "brand",
    "productType",
    "poles",
    "current",
    "voltage",
    "article"
  ],

  "clarificationQuestion":
    string | null
}

providedFields must contain ONLY fields explicitly
stated, changed, replaced, or removed in the CURRENT
USER MESSAGE.

Examples:

"А Schneider?"
providedFields = ["brand"]

"Тогда на 125 ампер"
providedFields = ["current"]

"Нужен 3P автомат ABB"
providedFields =
["brand", "productType", "poles"]

Understand Russian, Kazakh and English.

Normalize common electrical terminology:

"автомат"
-> "Автоматический выключатель"

"автоматический выключатель"
-> "Автоматический выключатель"

"контактор"
-> "Контактор"

"розетка"
-> "Розетка"

"кабель"
-> "Кабель"

Understand:

"3P"
"3 полюса"
"трехполюсный"
"үш полюсты"

as poles = 3 when appropriate.

Understand:

"160А"
"160 A"
"160 ампер"

as current = 160.

Understand:

"400В"
"400 V"
"400 вольт"

as voltage = 400.

Do not guess missing technical values.

Do not answer the procurement question yourself.

Another verified system handles catalog facts.
      `.trim(),

      input,

      reasoning: {
        effort: "low",
      },
    });

  const output =
    response.output_text
      ?.trim();

  if (!output) {
    throw new Error(
      "OpenAI returned empty output"
    );
  }

  let parsed: any;

  try {
    parsed =
      JSON.parse(
        cleanJson(output)
      );
  } catch {
    console.error(
      "Invalid AI JSON:",
      output
    );

    throw new Error(
      "OpenAI returned invalid JSON"
    );
  }

  const allowedIntents:
    AiIntent[] = [
      "product_search",
      "product_question",
      "greeting",
      "unknown",
    ];

  const intent:
    AiIntent =
      allowedIntents.includes(
        parsed?.intent
      )
        ? parsed.intent
        : "unknown";

  const rawRequirements =
    parsed?.requirements ??
    {};

  return {
    intent,

    requirements: {
      originalQuery:
        message.trim(),

      brand:
        optionalString(
          rawRequirements.brand
        ),

      productType:
        optionalString(
          rawRequirements
            .productType
        ),

      poles:
        optionalNumber(
          rawRequirements.poles
        ),

      current:
        optionalNumber(
          rawRequirements.current
        ),

      voltage:
        optionalNumber(
          rawRequirements.voltage
        ),

      article:
        optionalString(
          rawRequirements.article
        ),
    },

    providedFields:
      safeProvidedFields(
        parsed
          ?.providedFields
      ),

    clarificationQuestion:
      optionalString(
        parsed
          ?.clarificationQuestion
      ),
  };
}