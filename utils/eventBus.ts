// 简单的事件总线，用于 content script 和 sidebar 之间的通信

type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);

    // 返回取消订阅函数
    return () => {
      this.off(event, callback);
    };
  }

  off<T = any>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit<T = any>(event: string, data?: T): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  once<T = any>(event: string, callback: EventCallback<T>): () => void {
    const wrappedCallback: EventCallback<T> = (data) => {
      callback(data);
      this.off(event, wrappedCallback as any);
    };
    return this.on(event, wrappedCallback as any);
  }

  clear(): void {
    this.events.clear();
  }
}

// 创建全局事件总线实例
export const messageEventBus = new EventBus();

// 事件名称常量
export const MESSAGES_EVENTS = {
  MESSAGES_UPDATED: 'messages:updated',
  CONVERSATION_CHANGED: 'conversation:changed',
} as const;
