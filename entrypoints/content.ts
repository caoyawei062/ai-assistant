import { MessageService } from "../services/messageService";
import { JumpService } from "../services/jumpService";
import { StorageService } from "../services/storageService";
import { DetectorFactory } from "../detectors";
import { messageEventBus, MESSAGES_EVENTS } from "../utils/eventBus";

export default defineContentScript({
  matches: [
    "*://*.chatgpt.com/*",
    "*://*.chat.openai.com/*",
    "*://*.claude.ai/*",
    "*://*.gemini.google.com/*",
    "*://gemini.google.com/*",
    "*://*.doubao.com/*",
    "*://doubao.com/*",
  ],
  main() {
    console.log("AI Assistant content script loaded");

    // 初始化服务
    const messageService = new MessageService();
    const jumpService = new JumpService();
    const storageService = new StorageService();

    // 🔑 关键：将 EventBus 挂载到 window 对象，使其在所有 content scripts 中共享
    (window as any).__AI_ASSISTANT_EVENT_BUS__ = messageEventBus;
    console.log("[AI Assistant] EventBus mounted to window");

    // 暴露全局 API 供 Sidebar 使用
    (window as any).__AI_ASSISTANT_API__ = {
      getMessagePairs: async () => {
        const pairs = await messageService.getMessagePairs();
        // 移除 HTMLElement 属性
        return pairs.map((pair) => {
          const { user, assistant, ...rest } = pair;
          const { element: userElement, ...userRest } = user;
          const assistantRest = assistant ? (() => {
            const { element: assistantElement, ...aRest } = assistant;
            return aRest;
          })() : undefined;
          return {
            ...rest,
            user: userRest,
            assistant: assistantRest
          };
        });
      },
      getEventBus: () => {
        return messageEventBus;
      },
      getEvents: () => {
        return MESSAGES_EVENTS;
      }
    };

    console.log("[AI Assistant] Global API mounted to window");

    // 检测当前站点
    const detector = DetectorFactory.detectCurrentSite();
    if (!detector) {
      console.warn("No supported site detected");
      return;
    }

    console.log(`Detected site: ${detector.detect()}`);

    // 初始化服务
    async function initialize() {
      try {
        await messageService.initialize();
        jumpService.initialize();

        console.log("AI Assistant services initialized successfully");

        // 监听来自 popup 的消息
        browser.runtime.onMessage.addListener(
          (message, sender, sendResponse) => {
            handleMessage(message, sendResponse);
            return true; // 保持消息通道开放
          },
        );
      } catch (error) {
        console.error("Failed to initialize services:", error);
      }
    }

    // 处理来自 popup 的消息
    async function handleMessage(
      message: any,
      sendResponse: (response?: any) => void,
    ) {
      console.log("Received message:", message);

      switch (message.type) {
        case "GET_MESSAGES":
          const messages = await messageService.getAllMessages();
          // 移除 HTMLElement 属性，因为它无法通过消息 API 序列化
          const serializableMessages = messages.map(({ element, ...rest }: { element?: HTMLElement;[key: string]: any }) => rest);
          sendResponse({ success: true, data: serializableMessages });
          break;

        case "REGISTER_MESSAGE_UPDATE_CALLBACK":
          // 注册 Sidebar 的消息更新回调
          const callbackId = message.callbackId;
          (window as any).__AI_ASSISTANT_MESSAGE_CALLBACKS__ = (window as any).__AI_ASSISTANT_MESSAGE_CALLBACKS__ || {};
          (window as any).__AI_ASSISTANT_MESSAGE_CALLBACKS__[callbackId] = message.callback;
          sendResponse({ success: true });
          break;

        case "GET_MESSAGE_PAIRS":
          const pairs = await messageService.getMessagePairs();
          // 移除 HTMLElement 属性
          const serializablePairs = pairs.map((pair) => {
            const { user, assistant, ...rest } = pair;
            const { element: userElement, ...userRest } = user;
            const assistantRest = assistant ? (() => {
              const { element: assistantElement, ...aRest } = assistant;
              return aRest;
            })() : undefined;
            return {
              ...rest,
              user: userRest,
              assistant: assistantRest
            };
          });
          sendResponse({ success: true, data: serializablePairs });
          break;

        case "PERFORM_ACTION":
          const result = await messageService.performAction(
            message.messageId,
            message.action,
          );
          sendResponse({ success: result });
          break;

        case "JUMP_TO_MESSAGE":
          const jumped = jumpService.jumpToMessage(message.messageId);
          sendResponse({ success: jumped });
          break;

        case "GET_JUMP_HISTORY":
          const history = jumpService.getJumpHistory();
          sendResponse({ success: true, data: history });
          break;

        case "EXPORT_DATA":
          // 在 content script 中执行导出（可以访问 DOM 和 URL 对象）
          try {
            const { formatAndExportData } = await import("../utils/exportHelper");
            await formatAndExportData(message.data, message.format);
            sendResponse({ success: true });
          } catch (error) {
            console.error("Export failed:", error);
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    }

    // 页面加载完成后初始化
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize);
    } else {
      initialize();
    }

    // 页面卸载时清理
    window.addEventListener("beforeunload", () => {
      messageService.destroy();
      jumpService.destroy();
    });
  },
});
