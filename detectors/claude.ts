// Claude 站点检测器
import type { SiteDetector } from "../types/site";
import type { Message } from "../types/message";
import { parseMessageElement } from "../utils/messageParser";
import { findAll, waitForElement } from "../utils/dom";

export class ClaudeDetector implements SiteDetector {
  // Claude 的 DOM 结构可能会更新，需要调整选择器
  private readonly selectors = {
    // 主选择器（更通用的选择器）
    user: '[data-author="user"]',
    assistant: '[data-author="assistant"]',
    // 容器选择器（等待页面加载）
    container: 'body',
  };

  detect(): "claude" | null {
    const hostname = window.location.hostname;
    if (hostname.indexOf("claude.ai") !== -1) {
      return "claude";
    }
    return null;
  }

  async getMessages(): Promise<Message[]> {
    console.log("[AI Assistant] Claude detector - searching for messages...");

    // 等待消息容器加载
    const container = await waitForElement(this.selectors.container);
    console.log("[AI Assistant] Container found:", container);

    let userElements = findAll(this.selectors.user);
    let assistantElements = findAll(this.selectors.assistant);

    console.log("[AI Assistant] User elements found:", userElements.length);
    console.log("[AI Assistant] Assistant elements found:", assistantElements.length);

    // 合并所有消息元素并按 DOM 顺序排序
    const allElements: Array<{ element: HTMLElement; role: "user" | "assistant" }> = [];

    userElements.forEach((element) => allElements.push({ element, role: "user" }));
    assistantElements.forEach((element) => allElements.push({ element, role: "assistant" }));

    // 按 DOM 顺序排序（使用 document.compareDocumentPosition 或 getBoundingClientRect）
    allElements.sort((a, b) => {
      const aRect = a.element.getBoundingClientRect();
      const bRect = b.element.getBoundingClientRect();
      return aRect.top - bRect.top;
    });

    const messages: Message[] = [];
    allElements.forEach((item, index) => {
      const message = parseMessageElement(item.element, item.role, "claude", index);
      if (message) {
        console.log(`[AI Assistant] Parsed ${item.role} message [${index}]:`, message.content.substring(0, 50));
        messages.push(message);
      }
    });

    console.log("[AI Assistant] Total messages found:", messages.length);

    return messages;
  }

  getMessageElement(messageId: string): HTMLElement | null {
    return document.querySelector(
      `[data-message-id="${messageId}"]`,
    ) as HTMLElement;
  }

  scrollToMessage(messageId: string): boolean {
    const element = this.getMessageElement(messageId);
    if (!element) return false;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }
}

