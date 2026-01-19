// 跳转服务
import type { JumpInfo } from "../types/message";
import { buildJumpUrl, parseJumpUrl } from "../utils/url";
import { highlightElement } from "../utils/dom";

export class JumpService {
  private jumpHistory: JumpInfo[] = [];
  private maxHistorySize = 100;

  /**
   * 初始化跳转服务
   */
  initialize(): void {
    this.handleUrlHash();
    this.observeUrlChanges();
  }

  /**
   * 处理 URL hash
   */
  private handleUrlHash(): void {
    const hash = window.location.hash.slice(1);
    if (hash) {
      this.jumpToMessage(hash);
    }
  }

  /**
   * 观察 URL 变化
   */
  private observeUrlChanges(): void {
    // 使用 hashchange 事件
    window.addEventListener("hashchange", () => {
      this.handleUrlHash();
    });

    // 使用 popstate 事件
    window.addEventListener("popstate", () => {
      this.handleUrlHash();
    });
  }

  /**
   * 跳转到指定消息
   */
  jumpToMessage(messageId: string): boolean {
    const element = document.querySelector(
      `[data-message-id="${messageId}"]`,
    ) as HTMLElement;
    if (!element) {
      console.warn(`Message element not found: ${messageId}`);
      return false;
    }

    // 滚动到消息
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // 高亮消息
    highlightElement(element, 3000);

    // 记录跳转历史
    this.recordJump(messageId);

    return true;
  }

  /**
   * 记录跳转历史
   */
  private recordJump(messageId: string): void {
    const jumpInfo: JumpInfo = {
      messageId,
      conversationId: this.extractConversationId(),
      site: window.location.hostname,
      url: window.location.href,
      timestamp: Date.now(),
    };

    this.jumpHistory.unshift(jumpInfo);

    // 限制历史记录大小
    if (this.jumpHistory.length > this.maxHistorySize) {
      this.jumpHistory = this.jumpHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 提取对话 ID
   */
  private extractConversationId(): string {
    // 从 URL 中提取对话 ID
    const match = window.location.pathname.match(/\/([a-f0-9-]+)/);
    return match ? match[1] : "unknown";
  }

  /**
   * 生成跳转 URL
   */
  generateJumpUrl(messageId: string): string {
    return buildJumpUrl(
      window.location.hostname,
      this.extractConversationId(),
      messageId,
    );
  }

  /**
   * 获取跳转历史
   */
  getJumpHistory(): JumpInfo[] {
    return [...this.jumpHistory];
  }

  /**
   * 清除跳转历史
   */
  clearJumpHistory(): void {
    this.jumpHistory = [];
  }

  /**
   * 返回上一个跳转位置
   */
  jumpBack(): boolean {
    if (this.jumpHistory.length < 2) return false;

    // 移除当前位置
    this.jumpHistory.shift();

    // 跳转到上一个位置
    const previousJump = this.jumpHistory[0];
    return this.jumpToMessage(previousJump.messageId);
  }

  /**
   * 创建跳转按钮
   */
  createJumpButton(messageId: string): HTMLElement {
    const button = document.createElement("button");
    button.className = "ai-assistant-jump-button";
    button.innerHTML = "⬆️";
    button.title = "跳转到此消息";
    button.setAttribute("data-message-id", messageId);

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const jumpUrl = this.generateJumpUrl(messageId);
      navigator.clipboard.writeText(jumpUrl);
      alert("跳转链接已复制到剪贴板");
    });

    return button;
  }

  /**
   * 为消息添加跳转按钮
   */
  addJumpButtonToMessage(messageElement: HTMLElement, messageId: string): void {
    const existingButton = messageElement.querySelector(
      ".ai-assistant-jump-button",
    );
    if (existingButton) return;

    const jumpButton = this.createJumpButton(messageId);
    messageElement.appendChild(jumpButton);
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.jumpHistory = [];
  }
}
