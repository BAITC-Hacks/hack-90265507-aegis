import type {
  ProductRequirements,
} from "./requirementParser.js";

import { randomUUID } from "node:crypto";

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
  lastProductIds: number[];
};

const conversations =
  new Map<
    string,
    ConversationState
  >();

const MAX_TURNS = 20;
const CONVERSATION_TTL_MS = 30 * 60 * 1000;

function generateConversationId() {
  return `conv_${randomUUID()}`;
}

function removeExpiredConversations(now = Date.now()) {
  for (const [id, conversation] of conversations) {
    if (now - conversation.updatedAt > CONVERSATION_TTL_MS) conversations.delete(id);
  }
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
  removeExpiredConversations(now);
  if (conversations.size >= 1000) conversations.delete(conversations.keys().next().value!);

  const conversation:
    ConversationState = {
    id:
      generateConversationId(),

    requirements:
      emptyRequirements(),

    turns: [],

    createdAt: now,
    updatedAt: now,

    lastProductIds: [],
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
  removeExpiredConversations();
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

export function updateConversationProducts(
  conversation: ConversationState,
  productIds: number[]
) {
  conversation.lastProductIds = productIds.slice(0, 8);
  conversation.updatedAt = Date.now();
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
