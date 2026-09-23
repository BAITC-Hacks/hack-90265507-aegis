import {
  searchCatalog,
} from "./catalogService.js";

import {
  getProductById,
} from "./ektApi.js";

import {
  parseRequirements,
  type ProductRequirements,
} from "./requirementParser.js";

import {
  extractRequirementsWithAI,
  type AiIntent,
} from "./aiService.js";

import {
  evaluateProduct,
  type CompatibilityLevel,
  type ProductEvaluation,
} from "./constraintEngine.js";

import {
  addConversationTurn,
  getOrCreateConversation,
  updateConversationRequirements,
} from "./conversationService.js";

type AssistantProduct = {
  id: number;

  name: string;
  article: string;

  price: number;
  quantity: number;

  image?: string | null;
  brand?: string;

  evaluation:
    ProductEvaluation;
};

export type AssistantResponse = {
  conversationId:
    string;

  message: string;

  intent:
    AiIntent;

  requirements:
    ProductRequirements;

  products:
    AssistantProduct[];

  needsConfirmation:
    boolean;

  source:
    "ai" | "fallback";
};

function mergeRequirements(
  previous:
    ProductRequirements,

  current:
    ProductRequirements,

  fallback:
    ProductRequirements,

  providedFields:
    string[]
): ProductRequirements {
  const result:
    ProductRequirements = {
    ...previous,

    originalQuery:
      current.originalQuery ||
      fallback.originalQuery,
  };

  const fields = [
    "brand",
    "productType",
    "poles",
    "current",
    "voltage",
    "article",
  ] as const;

  for (
    const field of fields
  ) {
    /*
     * AI explicitly identified this
     * field in the current message.
     */
    if (
      providedFields.includes(
        field
      )
    ) {
      const aiValue =
        current[field];

      const fallbackValue =
        fallback[field];

      if (
        aiValue !==
        undefined
      ) {
        (result as any)[field] =
          aiValue;
      } else if (
        fallbackValue !==
        undefined
      ) {
        (result as any)[field] =
          fallbackValue;
      } else {
        delete (
          result as any
        )[field];
      }

      continue;
    }

    /*
     * On the first request there may
     * be no conversation state yet.
     */
    if (
      result[field] ===
        undefined &&
      current[field] !==
        undefined
    ) {
      (result as any)[field] =
        current[field];
    }

    if (
      result[field] ===
        undefined &&
      fallback[field] !==
        undefined
    ) {
      (result as any)[field] =
        fallback[field];
    }
  }

  return result;
}

function buildCatalogQuery(
  requirements:
    ProductRequirements
) {
  if (
    requirements.article
  ) {
    return requirements.article;
  }

  const parts:
    string[] = [];

  if (
    requirements.brand
  ) {
    parts.push(
      requirements.brand
    );
  }

  if (
    requirements.productType
  ) {
    parts.push(
      requirements.productType
    );
  }

  if (
    requirements.current !==
    undefined
  ) {
    parts.push(
      `${requirements.current}А`
    );
  }

  if (
    requirements.poles !==
    undefined
  ) {
    parts.push(
      `${requirements.poles}П`
    );
  }

  if (
    requirements.voltage !==
    undefined
  ) {
    parts.push(
      `${requirements.voltage}В`
    );
  }

  if (
    parts.length > 0
  ) {
    return parts.join(" ");
  }

  return (
    requirements
      .originalQuery
  );
}

function buildBroaderQuery(
  requirements:
    ProductRequirements
) {
  const parts:
    string[] = [];

  if (
    requirements.brand
  ) {
    parts.push(
      requirements.brand
    );
  }

  if (
    requirements.productType
  ) {
    parts.push(
      requirements.productType
    );
  }

  return parts.join(" ");
}

function levelPriority(
  level:
    CompatibilityLevel
) {
  switch (level) {
    case "exact":
      return 5;

    case "partial":
      return 4;

    case "unknown":
      return 3;

    case "mismatch":
      return 2;

    case "conflict":
      return 1;

    default:
      return 0;
  }
}

export async function processAssistantMessage(
  message: string,
  conversationId?: string
): Promise<AssistantResponse> {
  const cleanMessage =
    message.trim();

  const conversation =
    getOrCreateConversation(
      conversationId
    );

  if (!cleanMessage) {
    return {
      conversationId:
        conversation.id,

      message:
        "Опишите, какое оборудование вам нужно.",

      intent:
        "unknown",

      requirements:
        conversation
          .requirements,

      products: [],

      needsConfirmation:
        false,

      source:
        "fallback",
    };
  }

  addConversationTurn(
    conversation,
    "user",
    cleanMessage
  );

  const fallbackRequirements =
    parseRequirements(
      cleanMessage
    );

  let requirements:
    ProductRequirements = {
    ...conversation
      .requirements,

    originalQuery:
      cleanMessage,
  };

  let intent:
    AiIntent =
      "product_search";

  let source:
    "ai" | "fallback" =
      "fallback";

  let clarificationQuestion:
    string | undefined;

  try {
    const aiResult =
      await extractRequirementsWithAI(
        cleanMessage,
        conversation
          .requirements
      );

    requirements =
      mergeRequirements(
        conversation
          .requirements,

        aiResult.requirements,

        fallbackRequirements,

        aiResult
          .providedFields
      );

    intent =
      aiResult.intent;

    clarificationQuestion =
      aiResult
        .clarificationQuestion;

    source = "ai";
  } catch (error) {
    console.error(
      "AI extraction failed. Using fallback parser:",
      error
    );

    requirements =
      mergeRequirements(
        conversation
          .requirements,

        fallbackRequirements,

        fallbackRequirements,

        [
          "brand",
          "productType",
          "poles",
          "current",
          "voltage",
          "article",
        ].filter(
          (field) =>
            (
              fallbackRequirements as any
            )[field] !==
            undefined
        )
      );
  }

  updateConversationRequirements(
    conversation,
    requirements
  );

  if (
    intent === "greeting"
  ) {
    const answer =
      "Здравствуйте! Я EKTiQ. Опишите, какое электротехническое оборудование вам нужно.";

    addConversationTurn(
      conversation,
      "assistant",
      answer
    );

    return {
      conversationId:
        conversation.id,

      message:
        answer,

      intent,

      requirements,

      products: [],

      needsConfirmation:
        false,

      source,
    };
  }

  if (
    clarificationQuestion &&
    !requirements
      .productType &&
    !requirements.article
  ) {
    addConversationTurn(
      conversation,
      "assistant",
      clarificationQuestion
    );

    return {
      conversationId:
        conversation.id,

      message:
        clarificationQuestion,

      intent,

      requirements,

      products: [],

      needsConfirmation:
        false,

      source,
    };
  }

  const catalogQuery =
    buildCatalogQuery(
      requirements
    );

  let candidates =
    searchCatalog({
      query:
        catalogQuery,

      page: 1,

      limit: 100,
    }).items;

  /*
   * Specific electrical notation may
   * not exist in every catalog title,
   * so retry broader retrieval.
   */
  if (
    candidates.length <
    10
  ) {
    const broaderQuery =
      buildBroaderQuery(
        requirements
      );

    if (
      broaderQuery &&
      broaderQuery !==
        catalogQuery
    ) {
      const broader =
        searchCatalog({
          query:
            broaderQuery,

          page: 1,

          limit: 100,
        }).items;

      const combined =
        new Map<
          number,
          (typeof broader)[number]
        >();

      for (
        const product of [
          ...candidates,
          ...broader,
        ]
      ) {
        combined.set(
          product.id,
          product
        );
      }

      candidates = [
        ...combined.values(),
      ];
    }
  }

  if (
    candidates.length ===
    0
  ) {
    const answer =
      "По этим требованиям я не нашёл товары в каталоге EKT. Попробуйте изменить один из параметров.";

    addConversationTurn(
      conversation,
      "assistant",
      answer
    );

    return {
      conversationId:
        conversation.id,

      message:
        answer,

      intent:
        "product_search",

      requirements,

      products: [],

      needsConfirmation:
        false,

      source,
    };
  }

  const verificationCandidates =
    candidates.slice(
      0,
      30
    );

  const verifiedResults =
    await Promise.allSettled(
      verificationCandidates.map(
        async (
          candidate
        ) => {
          const detail =
            await getProductById(
              candidate.id
            );

          const evaluation =
            evaluateProduct(
              detail,
              requirements
            );

          const product:
            AssistantProduct = {
            id:
              detail.id ??
              candidate.id,

            name:
              detail.name ??
              candidate.name,

            article:
              detail.article ??
              candidate.article,

            price:
              typeof detail
                .price ===
              "number"
                ? detail.price
                : candidate
                    .price ??
                  0,

            quantity:
              typeof detail
                .quantity ===
              "number"
                ? detail.quantity
                : 0,

            image:
              detail.image ??
              candidate.image ??
              null,

            brand:
              detail.brand ??
              detail.properties
                ?.TORGOVAYA_MARKA ??
              evaluation
                .facts
                .brand
                .value ??
              undefined,

            evaluation,
          };

          return product;
        }
      )
    );

  let products =
    verifiedResults.flatMap(
      (result) => {
        if (
          result.status ===
          "fulfilled"
        ) {
          return [
            result.value,
          ];
        }

        console.error(
          "Failed to verify EKT product:",
          result.reason
        );

        return [];
      }
    );

  products.sort(
    (a, b) => {
      const levelDifference =
        levelPriority(
          b.evaluation
            .level
        ) -
        levelPriority(
          a.evaluation
            .level
        );

      if (
        levelDifference !==
        0
      ) {
        return levelDifference;
      }

      const scoreDifference =
        b.evaluation
          .score -
        a.evaluation
          .score;

      if (
        scoreDifference !==
        0
      ) {
        return scoreDifference;
      }

      const aAvailable =
        a.quantity > 0;

      const bAvailable =
        b.quantity > 0;

      if (
        aAvailable !==
        bAvailable
      ) {
        return bAvailable
          ? 1
          : -1;
      }

      return 0;
    }
  );

  products =
    products.slice(
      0,
      8
    );

  const exact =
    products.filter(
      (product) =>
        product.evaluation
          .level ===
        "exact"
    );

  const exactAvailable =
    exact.filter(
      (product) =>
        product.quantity >
        0
    );

  const partial =
    products.filter(
      (product) =>
        product.evaluation
          .level ===
        "partial"
    );

  const conflicts =
    products.filter(
      (product) =>
        product.evaluation
          .level ===
        "conflict"
    );

  let answer: string;

  if (
    exactAvailable.length >
    0
  ) {
    answer =
      `Нашёл ${exactAvailable.length} точных вариантов по вашим требованиям в наличии.`;
  } else if (
    exact.length > 0
  ) {
    answer =
      `Нашёл ${exact.length} точных вариантов, но сейчас у них нет подтверждённого остатка.`;
  } else if (
    partial.length > 0
  ) {
    answer =
      `Точного совпадения пока не нашёл. Есть ${partial.length} частично подтверждённых вариантов.`;
  } else {
    answer =
      "Среди проверенных товаров точного совпадения нет. Ниже ближайшие проверенные варианты.";
  }

  if (
    conflicts.length > 0
  ) {
    answer +=
      ` У ${conflicts.length} товаров обнаружены противоречивые характеристики.`;
  }

  addConversationTurn(
    conversation,
    "assistant",
    answer
  );

  return {
    conversationId:
      conversation.id,

    message:
      answer,

    intent:
      "product_search",

    requirements,

    products,

    needsConfirmation:
      false,

    source,
  };
}