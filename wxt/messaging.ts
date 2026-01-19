import { defineExtensionMessaging } from "@webext-core/messaging";
import type { MessagePair } from "../types/message";

// 定义消息类型
export interface MessagingDefinitions {
  // Content Script 消息
  "messages/getAll": {
    input?: never;
    response: MessagePair[];
  };

  "messages/onUpdate": {
    input: { count: number };
    response: void;
  };

  "conversation/changed": {
    input: { conversationId: string | null };
    response: void;
  };

  // Popup 消息
  "popup/getData": {
    input?: never;
    response: { pairs: MessagePair[] };
  };
}

// 创建类型安全的消息实例
export const messaging = defineExtensionMessaging<MessagingDefinitions>();
