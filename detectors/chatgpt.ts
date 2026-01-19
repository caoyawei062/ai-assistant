// ChatGPT 站点检测器
import type { SiteDetector } from "../types/site";
import type { Message } from "../types/message";
import { parseMessageElement } from "../utils/messageParser";
import { findAll, waitForElement } from "../utils/dom";

export class ChatGPTDetector implements SiteDetector {
  // ChatGPT 的 DOM 结构会经常更新，可能需要调整这些选择器
  private readonly selectors = {
    // 尝试多种可能的选择器
    user: '[data-message-author-role="user"]',
    assistant: '[data-turn="assistant"]',
    container: '[data-testid="conversation-turn"], article[data-testid]',
    // 备用选择器
    alternativeUser: '[data-testid^="user-"]',
    alternativeAssistant: '[data-testid^="assistant-"]',
  };

  detect(): "chatgpt" | null {
    const hostname = window.location.hostname;
    if (
      hostname.indexOf("chatgpt.com") !== -1 ||
      hostname.indexOf("chat.openai.com") !== -1
    ) {
      return "chatgpt";
    }
    return null;
  }

  async getMessages(): Promise<Message[]> {
    console.log("[AI Assistant] ChatGPT detector - searching for messages...");
    console.log("[AI Assistant] Selectors:", this.selectors);

    // 等待消息容器加载
    const container = await waitForElement(this.selectors.container);
    console.log("[AI Assistant] Container found:", container);

    // 尝试主选择器
    let userElements = findAll(this.selectors.user);
    let assistantElements = findAll(this.selectors.assistant);

    console.log("[AI Assistant] User elements found:", userElements.length);
    console.log("[AI Assistant] Assistant elements found:", assistantElements.length);

    // 如果主选择器没找到，尝试备用选择器
    if (userElements.length === 0 && assistantElements.length === 0) {
      console.log("[AI Assistant] Trying alternative selectors...");
      userElements = findAll(this.selectors.alternativeUser);
      assistantElements = findAll(this.selectors.alternativeAssistant);
      console.log("[AI Assistant] Alternative user elements:", userElements.length);
      console.log("[AI Assistant] Alternative assistant elements:", assistantElements.length);
    }

    // 合并所有消息元素并按 DOM 顺序排序
    const allElements: Array<{ element: HTMLElement; role: "user" | "assistant" }> = [];

    userElements.forEach((element) => allElements.push({ element, role: "user" }));
    assistantElements.forEach((element) => allElements.push({ element, role: "assistant" }));

    // 按 DOM 顺序排序
    allElements.sort((a, b) => {
      const aRect = a.element.getBoundingClientRect();
      const bRect = b.element.getBoundingClientRect();
      return aRect.top - bRect.top;
    });

    const messages: Message[] = [];
    allElements.forEach((item, index) => {
      const message = parseMessageElement(item.element, item.role, "chatgpt", index);
      if (message) {
        console.log(`[AI Assistant] Parsed ${item.role} message [${index}]:`, message.content.substring(0, 50));
        messages.push(message);
      }
    });

    console.log("[AI Assistant] Total messages found:", messages.length);

    return messages;
  }

  getMessageElement(messageId: string): HTMLElement | null {
    // 通过 data-message-id 属性查找
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

