// Gemini 站点检测器
import type { SiteDetector } from "../types/site";
import type { Message } from "../types/message";
import { parseMessageElement } from "../utils/messageParser";
import { findAll, waitForElement } from "../utils/dom";

export class GeminiDetector implements SiteDetector {
  private readonly selectors = {
    user: "user-query",
    assistant: "model-response",
    container: ".conversation-container",
    history: "infinite-scroller.chat-history",
  };

  detect(): "gemini" | null {
    const hostname = window.location.hostname;
    if (hostname.indexOf("gemini.google.com") !== -1) {
      return "gemini";
    }
    return null;
  }

  async getMessages(): Promise<Message[]> {
    // 等待历史容器加载
    try {
      await waitForElement(this.selectors.history, 5000);
    } catch (e) {
      console.warn("Gemini history container not found, continuing anyway");
    }

    // 获取所有对话容器，并按顺序处理
    const containers = findAll(this.selectors.container);
    console.log(`[GeminiDetector] Found ${containers.length} containers`);

    // 收集所有消息元素
    const allElements: Array<{ element: HTMLElement; role: "user" | "assistant" }> = [];

    containers.forEach((container) => {
      // 按 DOM 顺序查找所有用户和助理的消息
      const turns = container.querySelectorAll(`${this.selectors.user}, ${this.selectors.assistant}`);

      turns.forEach((el) => {
        const tagName = el.tagName.toLowerCase();
        const role = tagName === this.selectors.user ? "user" : "assistant";
        allElements.push({ element: el as HTMLElement, role });
      });
    });

    // 如果没有找到容器（可能是结构变化），则尝试直接查找所有消息元素
    if (allElements.length === 0) {
      console.log("[GeminiDetector] No containers found, trying direct element search");
      const elements = findAll(`${this.selectors.user}, ${this.selectors.assistant}`);

      elements.forEach((el) => {
        const role = el.tagName.toLowerCase() === this.selectors.user ? "user" : "assistant";
        allElements.push({ element: el, role });
      });
    }

    // 按 DOM 顺序排序
    allElements.sort((a, b) => {
      const aRect = a.element.getBoundingClientRect();
      const bRect = b.element.getBoundingClientRect();
      return aRect.top - bRect.top;
    });

    const messages: Message[] = [];
    allElements.forEach((item, index) => {
      const message = parseMessageElement(item.element, item.role, "gemini", index);
      if (message) {
        console.log(`[GeminiDetector] Parsed ${item.role} message [${index}]:`, message.content.substring(0, 20));
        messages.push(message);
      }
    });

    console.log(`[GeminiDetector] Total messages found: ${messages.length}`);
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
