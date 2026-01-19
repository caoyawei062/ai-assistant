// 存储服务
import type { Message } from "../types/message";
import type { PluginConfig } from "../types/config";
import { defaultConfig } from "../types/config";

export class StorageService {
  private readonly STORAGE_KEYS = {
    MESSAGES: "ai_assistant_messages",
    CONFIG: "ai_assistant_config",
    JUMP_HISTORY: "ai_assistant_jump_history",
  };

  /**
   * 保存消息
   */
  async saveMessages(messages: Message[]): Promise<void> {
    await this.set(this.STORAGE_KEYS.MESSAGES, messages);
  }

  /**
   * 获取消息
   */
  async getMessages(): Promise<Message[]> {
    return (await this.get<Message[]>(this.STORAGE_KEYS.MESSAGES)) || [];
  }

  /**
   * 添加单条消息
   */
  async addMessage(message: Message): Promise<void> {
    const messages = await this.getMessages();
    messages.push(message);
    await this.saveMessages(messages);
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string): Promise<void> {
    const messages = await this.getMessages();
    const filtered = messages.filter((m) => m.id !== messageId);
    await this.saveMessages(filtered);
  }

  /**
   * 清空所有消息
   */
  async clearMessages(): Promise<void> {
    await this.remove(this.STORAGE_KEYS.MESSAGES);
  }

  /**
   * 保存配置
   */
  async saveConfig(config: PluginConfig): Promise<void> {
    await this.set(this.STORAGE_KEYS.CONFIG, config);
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<PluginConfig> {
    const config = await this.get<PluginConfig>(this.STORAGE_KEYS.CONFIG);
    return config || defaultConfig;
  }

  /**
   * 更新配置
   */
  async updateConfig(updates: Partial<PluginConfig>): Promise<PluginConfig> {
    const config = await this.getConfig();
    const updated = { ...config, ...updates };
    await this.saveConfig(updated);
    return updated;
  }

  /**
   * 重置配置
   */
  async resetConfig(): Promise<void> {
    await this.saveConfig(defaultConfig);
  }

  /**
   * 保存跳转历史
   */
  async saveJumpHistory(history: any[]): Promise<void> {
    await this.set(this.STORAGE_KEYS.JUMP_HISTORY, history);
  }

  /**
   * 获取跳转历史
   */
  async getJumpHistory(): Promise<any[]> {
    return (await this.get<any[]>(this.STORAGE_KEYS.JUMP_HISTORY)) || [];
  }

  /**
   * 导出数据
   */
  async exportData(
    format: "json" | "markdown" | "txt" = "json",
  ): Promise<void> {
    const messages = await this.getMessages();
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case "json":
        content = JSON.stringify(messages, null, 2);
        filename = `ai_assistant_export_${Date.now()}.json`;
        mimeType = "application/json";
        break;

      case "markdown":
        content = this.formatAsMarkdown(messages);
        filename = `ai_assistant_export_${Date.now()}.md`;
        mimeType = "text/markdown";
        break;

      case "txt":
        content = this.formatAsText(messages);
        filename = `ai_assistant_export_${Date.now()}.txt`;
        mimeType = "text/plain";
        break;
    }

    this.downloadFile(content, filename, mimeType);
  }

  /**
   * 格式化为 Markdown
   */
  private formatAsMarkdown(messages: Message[]): string {
    return messages
      .map((msg) => {
        const roleLabel = msg.role === "user" ? "用户" : "助手";
        const timestamp = new Date(msg.timestamp).toLocaleString("zh-CN");
        return `## ${roleLabel} (${timestamp})\n\n${msg.content}\n\n---\n\n`;
      })
      .join("");
  }

  /**
   * 格式化为纯文本
   */
  private formatAsText(messages: Message[]): string {
    return messages
      .map((msg) => {
        const roleLabel = msg.role === "user" ? "用户" : "助手";
        const timestamp = new Date(msg.timestamp).toLocaleString("zh-CN");
        return `[${roleLabel}] ${timestamp}\n${msg.content}\n\n`;
      })
      .join("");
  }

  /**
   * 下载文件
   */
  private downloadFile(
    content: string,
    filename: string,
    mimeType: string,
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  /**
   * 通用存储方法
   */
  private async set<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  /**
   * 通用获取方法
   */
  private async get<T>(key: string): Promise<T | undefined> {
    const result = await browser.storage.local.get(key);
    return result[key] as T;
  }

  /**
   * 通用删除方法
   */
  private async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await browser.storage.local.clear();
  }
}
