// 消息服务
import type { Message, MessagePair, MessageAction } from "../types/message";
import { DetectorFactory } from "../detectors";
import { generateMessageId, extractConversationId } from "../utils/url";
import { createElement, highlightElement } from "../utils/dom";
import { messageEventBus, MESSAGES_EVENTS } from "../utils/eventBus";

export class MessageService {
  private detector = DetectorFactory.detectCurrentSite();
  private messages: Map<string, Message> = new Map();
  private messageElements: Map<string, HTMLElement> = new Map();
  private currentConversationId: string | null = null;
  private lastUrlCheck: string = "";
  private messageUpdateTimer: number | null = null;

  /**
   * 初始化消息服务
   */
  async initialize(): Promise<void> {
    if (!this.detector) {
      console.warn("No site detector found");
      return;
    }

    // 记录当前对话ID
    this.currentConversationId = this.extractConversationId();

    await this.loadMessages();
    this.observeNewMessages();
    this.observeUrlChanges();
  }

  /**
   * 提取当前对话ID
   */
  private extractConversationId(): string | null {
    return extractConversationId(window.location.href);
  }

  /**
   * 监听URL变化
   */
  private observeUrlChanges(): void {
    // 定期检查URL变化（作为备用方案）
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrlCheck) {
        console.log("[AI Assistant] URL change detected via polling");
        this.handleUrlChange();
        this.lastUrlCheck = currentUrl;
      }
    }, 500); // 每500ms检查一次

    // 初始化当前URL
    this.lastUrlCheck = window.location.href;

    // 使用 popstate 事件监听浏览器前进/后退
    window.addEventListener("popstate", () => {
      console.log("[AI Assistant] URL change detected via popstate");
      this.handleUrlChange();
      this.lastUrlCheck = window.location.href;
    });

    // 监听 pushState 和 replaceState (SPA 路由)
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPushState(...args);
      console.log("[AI Assistant] URL change detected via pushState");
      setTimeout(() => {
        this.handleUrlChange();
        this.lastUrlCheck = window.location.href;
      }, 100);
    };

    history.replaceState = (...args) => {
      originalReplaceState(...args);
      console.log("[AI Assistant] URL change detected via replaceState");
      setTimeout(() => {
        this.handleUrlChange();
        this.lastUrlCheck = window.location.href;
      }, 100);
    };
  }

  /**
   * 处理URL变化
   */
  private async handleUrlChange(): Promise<void> {
    const newConversationId = this.extractConversationId();

    // 如果对话ID发生变化,重新加载消息
    if (newConversationId !== this.currentConversationId) {
      console.log("[AI Assistant] Conversation changed:", {
        old: this.currentConversationId,
        new: newConversationId,
      });

      this.currentConversationId = newConversationId;

      // 清空旧消息缓存
      this.clearMessages();

      // 通知 background 和 popup 清空消息列表
      this.notifyConversationChanged();

      // 等待 DOM 加载完成(SPA 页面切换需要时间渲染)
      await new Promise(resolve => setTimeout(resolve, 800));

      // 重新加载消息
      await this.loadMessages();

      // 通知消息已更新
      this.notifyMessagesUpdated();
    }
  }

  /**
   * 通知对话已切换
   */
  private notifyConversationChanged(): void {
    try {
      // 发送消息到 background script
      browser.runtime.sendMessage({
        type: "CONVERSATION_CHANGED",
        conversationId: this.currentConversationId,
      }).catch((error) => {
        console.log("[AI Assistant] Failed to notify conversation change:", error);
      });

      // 使用事件总线通知本地组件（Sidebar）
      messageEventBus.emit(MESSAGES_EVENTS.CONVERSATION_CHANGED, {
        conversationId: this.currentConversationId,
      });
    } catch (error) {
      console.log("[AI Assistant] Failed to notify conversation change:", error);
    }
  }

  /**
   * 通知消息已更新
   */
  private notifyMessagesUpdated(): void {
    try {
      const updateData = {
        conversationId: this.currentConversationId,
        messageCount: this.messages.size,
      };

      // 发送消息到 background script（用于 Popup）
      browser.runtime.sendMessage({
        type: "MESSAGES_UPDATED",
        ...updateData,
      }).catch((error) => {
        console.log("[AI Assistant] Failed to notify messages update:", error);
      });

      // 使用事件总线通知本地组件（Sidebar）
      messageEventBus.emit(MESSAGES_EVENTS.MESSAGES_UPDATED, updateData);
    } catch (error) {
      console.log("[AI Assistant] Failed to notify messages update:", error);
    }
  }

  /**
   * 清空消息缓存
   */
  private clearMessages(): void {
    this.messages.clear();
    this.messageElements.clear();
    console.log("[AI Assistant] Message cache cleared");
  }

  /**
   * 加载所有消息
   */
  private async loadMessages(): Promise<void> {
    if (!this.detector) return;

    // 每次加载前先清空,避免追加旧对话的消息
    this.messages.clear();
    this.messageElements.clear();

    const messages = await this.detector.getMessages();
    messages.forEach((message) => {
      this.messages.set(message.id, message);
      if (message.element) {
        this.messageElements.set(message.id, message.element);
      }
    });

    console.log("[AI Assistant] Messages loaded:", this.messages.size);
  }

  /**
   * 为消息元素添加 ID 属性（已在 parseMessageElement 中处理）
   */
  private addMessageIdAttribute(element: HTMLElement, messageId: string): void {
    if (!element.hasAttribute("data-message-id")) {
      element.setAttribute("data-message-id", messageId);
    }
  }

  /**
   * 观察新消息
   */
  private observeNewMessages(): void {
    let debounceTimer: number | null = null;

    const observer = new MutationObserver((mutations) => {
      // 防抖处理，避免频繁触发
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = window.setTimeout(() => {
        this.handleMutations(mutations);
        debounceTimer = null;
      }, 300); // 300ms 防抖
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * 处理DOM变化
   */
  private handleMutations(mutations: MutationRecord[]): void {
    // 清除之前的定时器
    if (this.messageUpdateTimer) {
      clearTimeout(this.messageUpdateTimer);
    }

    // 设置新的定时器（防抖）
    this.messageUpdateTimer = window.setTimeout(async () => {
      let hasNewMessages = false;

      // 检查是否有新的消息元素
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // 检查是否是消息容器或包含消息的元素
            if (this.isMessageElement(node)) {
              hasNewMessages = true;
            }
          }
        });

        if (hasNewMessages) break;
      }

      // 如果检测到新消息，重新加载并通知UI
      if (hasNewMessages) {
        console.log("[AI Assistant] New messages detected, reloading...");

        const previousCount = this.messages.size;

        // 重新加载消息
        await this.loadMessages();

        const newCount = this.messages.size;

        // 只有消息数量变化时才通知UI
        if (newCount !== previousCount) {
          console.log(`[AI Assistant] Messages updated: ${previousCount} -> ${newCount}`);
          this.notifyMessagesUpdated();
        }
      }

      this.messageUpdateTimer = null;
    }, 500); // 500ms 防抖
  }

  /**
   * 检查元素是否是消息元素
   */
  private isMessageElement(element: HTMLElement): boolean {
    // 根据当前站点使用不同的选择器
    const site = this.detector?.detect();

    const selectors: Record<string, string[]> = {
      chatgpt: [
        '[data-message-author-role]',
        '[data-turn="assistant"]',
        '[data-testid="conversation-turn"]',
        'article[data-testid]',
      ],
      claude: [
        '[data-is-streaming]',
        '.font-claude-message',
        '[data-testimonial="message"]',
      ],
      gemini: [
        '[data-test-id="chat-turn"]',
        '.model-turn',
        '.conversation-turn',
      ],
      doubao: [
        '[data-message-id]',
        '.message-item',
        '.chat-message',
      ],
    };

    const siteSelectors = selectors[site || ""] || [];

    // 检查元素本身或其子元素是否匹配选择器
    for (const selector of siteSelectors) {
      try {
        if (element.matches(selector) || element.querySelector(selector)) {
          return true;
        }
      } catch (e) {
        // 忽略无效选择器
        console.warn("[AI Assistant] Invalid selector:", selector);
      }
    }

    return false;
  }

  /**
   * 获取所有消息（每次调用时重新扫描页面）
   */
  async getAllMessages(): Promise<Message[]> {
    // 每次调用时重新扫描页面获取最新消息
    await this.loadMessages();
    return Array.from(this.messages.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取消息对（将用户和助手的消息配对）
   */
  async getMessagePairs(): Promise<MessagePair[]> {
    const messages = await this.getAllMessages();
    const pairs: MessagePair[] = [];

    let currentUserMessage: Message | null = null;

    for (const msg of messages) {
      if (msg.role === "user") {
        // 如果之前有待处理的用户消息，先处理（只有有助手回复才添加）
        if (currentUserMessage) {
          // 跳过，因为之前的用户消息没有助手回复
        }
        currentUserMessage = msg;
      } else if (msg.role === "assistant") {
        if (currentUserMessage) {
          // 找到配对，添加到列表
          pairs.push({
            id: currentUserMessage.id,
            user: currentUserMessage,
            assistant: msg,
            timestamp: currentUserMessage.timestamp,
            site: currentUserMessage.site
          });
          currentUserMessage = null;
        }
        // 忽略没有对应用户的助手消息
      }
    }

    // 忽略最后没有助手回复的用户消息

    return pairs;
  }

  /**
   * 同步获取缓存的消息（用于不需要刷新的场景）
   */
  getCachedMessages(): Message[] {
    return Array.from(this.messages.values());
  }

  /**
   * 根据 ID 获取消息
   */
  getMessageById(messageId: string): Message | undefined {
    return this.messages.get(messageId);
  }

  /**
   * 获取消息元素
   */
  getMessageElement(messageId: string): HTMLElement | undefined {
    return this.messageElements.get(messageId);
  }

  /**
   * 执行消息操作
   */
  async performAction(
    messageId: string,
    action: MessageAction,
  ): Promise<boolean> {
    console.log("[AI Assistant] Performing action:", action, "on message:", messageId);

    // 确保消息缓存是最新的
    await this.loadMessages();

    const message = this.getMessageById(messageId);
    console.log("[AI Assistant] Found message:", message ? "yes" : "no");

    if (!message) {
      console.error("[AI Assistant] Message not found:", messageId);
      console.log("[AI Assistant] Available messages:", Array.from(this.messages.keys()));
      return false;
    }

    switch (action) {
      case "copy":
        return this.copyMessage(message);
      case "quote":
        return this.quoteMessage(message);
      case "share":
        return this.shareMessage(message);
      case "jump":
        return this.jumpToMessage(messageId);
      case "export":
        return this.exportMessage(message);
      default:
        return false;
    }
  }

  /**
   * 复制消息
   */
  private async copyMessage(message: Message): Promise<boolean> {
    try {
      console.log("[AI Assistant] Copying message content:", message.content.substring(0, 50));
      await this.copyToClipboard(message.content);
      console.log("[AI Assistant] Copy successful");
      return true;
    } catch (error) {
      console.error("[AI Assistant] Failed to copy message:", error);
      return false;
    }
  }

  /**
   * 引用消息
   */
  private quoteMessage(message: Message): boolean {
    const quote = `> ${message.content}`;
    // 这里可以实现将引用插入到输入框
    console.log("Quote:", quote);
    return true;
  }

  /**
   * 分享消息
   */
  private async shareMessage(message: Message): Promise<boolean> {
    try {
      const shareUrl = `${window.location.href.split('#')[0]}#${message.id}`;
      console.log("[AI Assistant] Share URL:", shareUrl);
      await this.copyToClipboard(shareUrl);
      console.log("[AI Assistant] Share URL copied to clipboard");
      return true;
    } catch (error) {
      console.error("[AI Assistant] Failed to share message:", error);
      return false;
    }
  }

  /**
   * 复制文本到剪贴板（兼容多种方式）
   */
  private async copyToClipboard(text: string): Promise<void> {
    // 首先尝试使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (e) {
        console.log("[AI Assistant] Clipboard API failed, trying fallback");
      }
    }

    // 备用方法：使用临时 textarea
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // 避免影响页面布局
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (!successful) {
        throw new Error("execCommand copy failed");
      }
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * 跳转到消息
   */
  private jumpToMessage(messageId: string): boolean {
    const element = this.getMessageElement(messageId);
    if (!element) return false;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    highlightElement(element);
    return true;
  }

  /**
   * 导出消息
   */
  private exportMessage(message: Message): boolean {
    const data = JSON.stringify(message, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `message_${message.id}.json`;
    a.click();

    URL.revokeObjectURL(url);
    return true;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.messages.clear();
    this.messageElements.clear();
  }
}
