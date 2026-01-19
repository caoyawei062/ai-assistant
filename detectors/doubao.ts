// 豆包站点检测器
import type { SiteDetector } from "../types/site";
import type { Message } from "../types/message";
import { parseMessageElement } from "../utils/messageParser";
import { findAll, waitForElement } from "../utils/dom";

export class DoubaoDetector implements SiteDetector {
  private readonly selectors = {
    // 豆包的 DOM 结构（需要根据实际页面调整）
    user: '[data-testid="send_message"] [data-testid="message_text_content"]',
    assistant: '[data-testid="receive_message"], .bot-message, .message-assistant',
    container: 'body',
  };

  detect(): "doubao" | null {
    const hostname = window.location.hostname;
    if (hostname.indexOf("doubao.com") !== -1) {
      return "doubao";
    }
    return null;
  }

  async getMessages(): Promise<Message[]> {
    console.log("[AI Assistant] Doubao detector - searching for messages...");

    // 等待页面加载
    const container = await waitForElement(this.selectors.container);
    console.log("[AI Assistant] Container found:", container);

    let userElements = findAll(this.selectors.user);
    let assistantElements = findAll(this.selectors.assistant);

    console.log("[AI Assistant] User elements found:", userElements.length);
    console.log("[AI Assistant] Assistant elements found:", assistantElements.length);

    // 如果没找到，尝试其他选择器
    if (userElements.length === 0 && assistantElements.length === 0) {
      console.log("[AI Assistant] Trying alternative selectors...");
      // 尝试通过文本内容或类名查找
      userElements = findAll('[class*="user"], [class*="User"]');
      assistantElements = findAll('[class*="bot"], [class*="assistant"], [class*="Bot"], [class*="Assistant"]');
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
      const message = parseMessageElement(item.element, item.role, "doubao", index);
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
