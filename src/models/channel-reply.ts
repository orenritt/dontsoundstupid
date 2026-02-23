import type { DeliveryChannelType } from "./composer";
import type { BriefingItem } from "./briefing";

export type ReplyIntent =
  | "deep-dive"
  | "tune-more"
  | "tune-less"
  | "already-knew"
  | "follow-up"
  | "unrecognized";

export interface InboundReply {
  id: string;
  userId: string;
  messageText: string;
  channelType: DeliveryChannelType;
  threadRef: string | null;
  receivedAt: string;
}

export interface IntentClassification {
  intent: ReplyIntent;
  itemNumber: number | null;
  confidence: number;
  freeText: string;
}

export interface ConversationEntry {
  role: "user" | "system";
  text: string;
  timestamp: string;
}

export interface ReplySession {
  id: string;
  userId: string;
  briefingId: string;
  briefingItems: BriefingItem[];
  channelType: DeliveryChannelType;
  conversationHistory: ConversationEntry[];
  createdAt: string;
  expiresAt: string;
}

export type ReplyResponseType =
  | "deep-dive"
  | "acknowledgment"
  | "clarification"
  | "help"
  | "expired";

export interface ReplyResponse {
  channelType: DeliveryChannelType;
  responseText: string;
  itemRef: number | null;
  responseType: ReplyResponseType;
}
