export default defineBackground(() => {
  console.log("AI Assistant background script loaded", {
    id: browser.runtime.id,
  });

  // 插件安装时初始化
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log("Extension installed:", details.reason);

    if (details.reason === "install") {
      // 首次安装，设置默认配置
      await initializeDefaultConfig();
    }
  });

  // 初始化默认配置
  async function initializeDefaultConfig() {
    const { StorageService } = await import("../services/storageService");
    const storageService = new StorageService();
    await storageService.saveConfig({
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
    });
  }

  // 监听来自 content script 和 popup 的消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message);

    handleBackgroundMessage(message, sender)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true; // 保持消息通道开放
  });

  // 处理后台消息
  async function handleBackgroundMessage(message: any, sender: any) {
    switch (message.type) {
      case "GET_CONFIG":
        const { StorageService } = await import("../services/storageService");
        const storageService = new StorageService();
        const config = await storageService.getConfig();
        return { success: true, data: config };

      case "UPDATE_CONFIG":
        const { StorageService: StorageService2 } =
          await import("../services/storageService");
        const storageService2 = new StorageService2();
        const updatedConfig = await storageService2.updateConfig(
          message.config,
        );
        return { success: true, data: updatedConfig };

      case "EXPORT_DATA":
        try {
          // 从当前标签页的 content script 获取消息对
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tab?.id) {
            const pairsResponse = await browser.tabs.sendMessage(tab.id, {
              type: "GET_MESSAGE_PAIRS",
            });
            if (pairsResponse.success && pairsResponse.data) {
              // 将导出请求转发到 content script 执行
              const exportResponse = await browser.tabs.sendMessage(tab.id, {
                type: "EXPORT_DATA",
                data: pairsResponse.data,
                format: message.format,
              });
              return exportResponse;
            }
          }
          return { success: false, error: "无法获取消息数据" };
        } catch (error) {
          console.error("Export failed:", error);
          return { success: false, error: (error as Error).message };
        }

      case "CLEAR_DATA":
        const { StorageService: StorageService4 } =
          await import("../services/storageService");
        const storageService4 = new StorageService4();
        // 重置为默认配置
        await storageService4.resetConfig();
        await storageService4.saveJumpHistory([]);
        return { success: true };

      case "GET_MESSAGES_FROM_PAGE":
        // 从当前标签页的 content script 获取消息
        try {
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tab?.id) {
            return await browser.tabs.sendMessage(tab.id, {
              type: "GET_MESSAGES",
            });
          }
        } catch (error) {
          console.error("Failed to get messages from page:", error);
        }
        return { success: false, data: [] };

      case "GET_MESSAGE_PAIRS_FROM_PAGE":
        // 从当前标签页的 content script 获取消息对
        try {
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tab?.id) {
            return await browser.tabs.sendMessage(tab.id, {
              type: "GET_MESSAGE_PAIRS",
            });
          }
        } catch (error) {
          console.error("Failed to get message pairs from page:", error);
        }
        return { success: false, data: [] };

      default:
        return { success: false, error: "Unknown message type" };
    }
  }

  // 监听标签页更新
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      console.log("Tab updated:", tab.url);
      // 可以在这里添加逻辑来检测新页面并通知 content script
    }
  });
});
