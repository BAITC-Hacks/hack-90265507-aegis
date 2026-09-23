import type {
  ProductRequirements,
} from "./requirementParser.js";

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type ConversationState = {
  id: string;

  requirements:
    ProductRequirements;

  turns:
    ConversationTurn[];

  createdAt: number;
  updatedAt: number;
};

const conversations =
  new Map<
    string,
    ConversationState
  >();

const MAX_TURNS = 20;

function generateConversationId() {
  return (
    "conv_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}

function emptyRequirements():
  ProductRequirements {
  return {
    originalQuery: "",
  };
}

export function createConversation():
  ConversationState {
  const now = Date.now();

  const conversation:
    ConversationState = {
    id:
      generateConversationId(),

    requirements:
      emptyRequirements(),

    turns: [],

    createdAt: now,
    updatedAt: now,
  };

  conversations.set(
    conversation.id,
    conversation
  );

  return conversation;
}

export function getConversation(
  id: string
):
  | ConversationState
  | undefined {
  return conversations.get(
    id
  );
}

export function getOrCreateConversation(
  id?: string
): ConversationState {
  if (id) {
    const existing =
      getConversation(id);

    if (existing) {
      return existing;
    }
  }

  return createConversation();
}

export function addConversationTurn(
  conversation:
    ConversationState,

  role:
    | "user"
    | "assistant",

  content: string
) {
  conversation.turns.push({
    role,
    content,
    createdAt:
      Date.now(),
  });

  if (
    conversation.turns.length >
    MAX_TURNS
  ) {
    conversation.turns =
      conversation.turns.slice(
        -MAX_TURNS
      );
  }

  conversation.updatedAt =
    Date.now();
}

export function updateConversationRequirements(
  conversation:
    ConversationState,

  requirements:
    ProductRequirements
) {
  conversation.requirements =
    requirements;

  conversation.updatedAt =
    Date.now();
}

export function deleteConversation(
  id: string
) {
  return conversations.delete(
    id
  );
}