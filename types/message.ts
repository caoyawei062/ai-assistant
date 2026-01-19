// 消息类型定义
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  site: string;
  conversationId: string;
  element?: HTMLElement;
}

// 消息对（一次对话往返）
export interface MessagePair {
  id: string;
  user: Message;
  assistant?: Message;
  timestamp: number;
  site: string;
}


// 消息跳转信息
export interface JumpInfo {
  messageId: string;
  conversationId: string;
  site: string;
  url: string;
  timestamp: number;
}

// 消息操作类型
export type MessageAction = "copy" | "quote" | "share" | "jump" | "export";

// 消息操作配置
export interface MessageActionConfig {
  type: MessageAction;
  label: string;
  icon: string;
  enabled: boolean;
}
