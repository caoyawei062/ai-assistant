// 消息解析工具函数

import type { Message } from "../types/message";
import { generateMessageId, extractConversationId } from "./url";

/**
 * 从元素中提取消息内容
 */
export function extractMessageContent(element: HTMLElement): string {
  // 统计 Gemini 生成的图片数量
  const generatedImages = element.querySelectorAll('generated-image');
  const imageCount = generatedImages.length;

  // 移除按钮、工具栏等干扰元素
  const clone = element.cloneNode(true) as HTMLElement;

  // 移除不需要的元素(包括图片相关的容器)
  const selectorsToRemove = [
    "button",
    '[role="button"]',
    ".toolbar",
    ".actions",
    ".copy-button",
    ".edit-button",
    // Gemini 图片相关元素
    "generated-image",
    ".generated-images",
    ".attachment-container",
  ];

  selectorsToRemove.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  const textContent = clone.textContent?.trim() || "";

  // 如果有生成的图片,添加 [图片] 或 [图片 x N] 标记
  if (imageCount > 0) {
    const imageLabel = imageCount > 1 ? `[图片 x ${imageCount}]` : "[图片]";
    return textContent ? `${textContent}\n${imageLabel}` : imageLabel;
  }

  return textContent;
}

/**
 * 解析消息元素
 */
export function parseMessageElement(
  element: HTMLElement,
  role: "user" | "assistant",
  site: string,
  index?: number,
): Message | null {
  const content = extractMessageContent(element);
  if (!content) return null;

  const conversationId =
    extractConversationId(window.location.href) || "unknown";

  // 使用稳定的消息 ID：
  // 1. 优先使用元素上已有的 data-message-id
  // 2. 否则基于内容、索引等信息生成稳定的哈希 ID
  let messageId = element.getAttribute("data-message-id");
  if (!messageId) {
    // 基于内容、角色和索引生成稳定的 ID(索引确保相同内容的消息不会重复)
    messageId = generateStableMessageId(content, role, site, index);
    // 立即设置到元素上，确保后续能找到
    element.setAttribute("data-message-id", messageId);
  }

  // 使用传入的索引作为 timestamp，如果没有传入则使用当前时间
  const timestamp = index !== undefined ? index : Date.now();

  return {
    id: messageId,
    role,
    content,
    timestamp,
    site,
    conversationId,
    element,
  };
}

/**
 * 生成稳定的消息 ID（基于内容哈希 + 索引）
 */
function generateStableMessageId(content: string, role: string, site: string, index?: number): string {
  // 使用简单的哈希算法生成稳定 ID
  // 加入 index 确保相同内容的消息也有不同的 ID
  const str = `${site}-${role}-${index ?? 0}-${content.substring(0, 100)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return `msg_${Math.abs(hash).toString(36)}`;
}

/**
 * 格式化消息为 Markdown
 */
export function formatMessageAsMarkdown(message: Message): string {
  const roleLabel = message.role === "user" ? "用户" : "助手";
  const timestamp = new Date(message.timestamp).toLocaleString("zh-CN");

  return `## ${roleLabel} (${timestamp})\n\n${message.content}\n\n---\n\n`;
}

/**
 * 格式化消息为 JSON
 */
export function formatMessageAsJSON(message: Message): string {
  return JSON.stringify(message, null, 2);
}

/**
 * 格式化消息为纯文本
 */
export function formatMessageAsText(message: Message): string {
  const roleLabel = message.role === "user" ? "用户" : "助手";
  const timestamp = new Date(message.timestamp).toLocaleString("zh-CN");

  return `[${roleLabel}] ${timestamp}\n${message.content}\n\n`;
}

/**
 * 清理消息内容（移除多余的空白）
 */
export function cleanMessageContent(content: string): string {
  return content
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

/**
 * 截断消息内容
 */
export function truncateMessage(content: string, maxLength = 100): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}
