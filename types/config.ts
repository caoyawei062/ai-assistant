// 插件配置
import type { SiteType } from "./site";
import type { MessageAction, MessageActionConfig } from "./message";

export interface PluginConfig {
  // 启用的站点
  enabledSites: SiteType[];

  // 消息操作配置
  messageActions: MessageActionConfig[];

  // 跳转功能配置
  jumpConfig: {
    enabled: boolean;
    showJumpButton: boolean;
    jumpButtonPosition:
      | "top-right"
      | "bottom-right"
      | "top-left"
      | "bottom-left";
  };

  // 存储配置
  storageConfig: {
    maxMessages: number;
    autoExport: boolean;
    exportFormat: "json" | "markdown" | "txt";
  };

  // UI 配置
  uiConfig: {
    theme: "light" | "dark" | "auto";
    showMessageCount: boolean;
    showTimestamp: boolean;
  };
}

// 默认配置
export const defaultConfig: PluginConfig = {
  enabledSites: ["chatgpt", "claude", "gemini"],
  messageActions: [
    { type: "copy", label: "复制", icon: "📋", enabled: true },
    { type: "quote", label: "引用", icon: "💬", enabled: true },
    { type: "share", label: "分享", icon: "🔗", enabled: true },
    { type: "jump", label: "跳转", icon: "⬆️", enabled: true },
    { type: "export", label: "导出", icon: "📥", enabled: true },
  ],
  jumpConfig: {
    enabled: true,
    showJumpButton: true,
    jumpButtonPosition: "top-right",
  },
  storageConfig: {
    maxMessages: 1000,
    autoExport: false,
    exportFormat: "markdown",
  },
  uiConfig: {
    theme: "auto",
    showMessageCount: true,
    showTimestamp: true,
  },
};
