// 支持的 AI 站点类型
export type SiteType =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "doubao"
  | "perplexity"
  | "deepseek";

// 站点配置
export interface SiteConfig {
  type: SiteType;
  name: string;
  domain: string;
  patterns: string[];
  messageSelectors: {
    user: string;
    assistant: string;
    container: string;
  };
  enabled: boolean;
}

// 站点检测器接口
export interface SiteDetector {
  detect(): SiteType | null;
  getMessages(): Promise<any[]>;
  getMessageElement(messageId: string): HTMLElement | null;
  scrollToMessage(messageId: string): boolean;
}
