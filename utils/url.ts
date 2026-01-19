// URL 处理工具函数

/**
 * 获取当前域名
 */
export function getDomain(): string {
  return window.location.hostname;
}

/**
 * 获取当前 URL 路径
 */
export function getPathname(): string {
  return window.location.pathname;
}

/**
 * 获取查询参数
 */
export function getQueryParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * 从 URL 中提取对话 ID
 */
export function extractConversationId(url: string): string | null {
  // ChatGPT: /c/[conversation-id]
  const chatgptMatch = url.match(/\/c\/([a-f0-9-]+)/);
  if (chatgptMatch) return chatgptMatch[1];

  // Claude: /chat/[conversation-id]
  const claudeMatch = url.match(/\/chat\/([a-f0-9-]+)/);
  if (claudeMatch) return claudeMatch[1];

  // Gemini: /app/[conversation-id] (支持16进制字符)
  const geminiMatch = url.match(/\/app\/([a-f0-9]+)/);
  if (geminiMatch) return geminiMatch[1];

  return null;
}

/**
 * 生成消息唯一 ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成对话唯一 ID
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 构建跳转 URL
 */
export function buildJumpUrl(
  site: string,
  conversationId: string,
  messageId: string,
): string {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#${messageId}`;
}

/**
 * 解析跳转 URL
 */
export function parseJumpUrl(url: string): {
  conversationId: string | null;
  messageId: string | null;
} {
  const hash = url.split("#")[1];
  if (!hash) {
    return { conversationId: null, messageId: null };
  }

  return {
    conversationId: extractConversationId(url),
    messageId: hash,
  };
}
