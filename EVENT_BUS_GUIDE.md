# 使用事件总线优化 Sidebar 自动更新

## 问题背景

Sidebar 作为 content script 注入到页面中，需要实时接收消息更新通知。之前的实现使用了复杂的消息传递链路：

```
MessageService → browser.runtime.sendMessage → Background → browser.runtime.onMessage → Sidebar
```

这个链路存在以下问题：
1. **时序问题**：Sidebar 可能在消息发送前就注册了监听器
2. **消息丢失**：通过 background 转发可能丢失消息
3. **延迟明显**：多重消息传递导致延迟
4. **复杂度高**：需要维护多个消息处理逻辑

## 解决方案：事件总线 (EventBus)

### 核心思路

创建一个简单的事件总线系统，让 MessageService 和 Sidebar 在同一个上下文中直接通信：

```typescript
MessageService → EventBus.emit() → EventBus → Sidebar (通过 EventBus.on())
```

### 实现细节

#### 1. EventBus 类 ([utils/eventBus.ts](utils/eventBus.ts))

```typescript
class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  // 订阅事件
  on<T = any>(event: string, callback: EventCallback<T>): () => void;

  // 取消订阅
  off<T = any>(event: string, callback: EventCallback<T>): void;

  // 触发事件
  emit<T = any>(event: string, data?: T): void;

  // 一次性订阅
  once<T = any>(event: string, callback: EventCallback<T>): () => void;

  // 清空所有事件
  clear(): void;
}
```

**特点**：
- ✅ 类型安全
- ✅ 自动清理订阅
- ✅ 错误处理
- ✅ 简单易用

#### 2. 事件常量定义

```typescript
export const MESSAGES_EVENTS = {
  MESSAGES_UPDATED: 'messages:updated',
  CONVERSATION_CHANGED: 'conversation:changed',
} as const;
```

#### 3. MessageService 集成 ([services/messageService.ts](services/messageService.ts))

```typescript
import { messageEventBus, MESSAGES_EVENTS } from "../utils/eventBus";

// 发送消息更新通知
private notifyMessagesUpdated(): void {
  // 1. 发送到 background（用于 Popup）
  browser.runtime.sendMessage({
    type: "MESSAGES_UPDATED",
    conversationId: this.currentConversationId,
    messageCount: this.messages.size,
  });

  // 2. 发送到本地事件总线（用于 Sidebar）
  messageEventBus.emit(MESSAGES_EVENTS.MESSAGES_UPDATED, {
    conversationId: this.currentConversationId,
    messageCount: this.messages.size,
  });
}
```

#### 4. Sidebar 集成 ([src/views/sidebar/SidebarPanel.tsx](src/views/sidebar/SidebarPanel.tsx))

```typescript
import { messageEventBus, MESSAGES_EVENTS } from "../../../utils/eventBus";

// 监听消息更新
useEffect(() => {
  // 方式1: browser.runtime（备用）
  const handleRuntimeMessage = (message: any) => {
    if (message.type === "MESSAGES_UPDATED") {
      loadMessages();
    }
  };
  browser.runtime.onMessage.addListener(handleRuntimeMessage);

  // 方式2: EventBus（主要方式）
  const unsubscribe = messageEventBus.on<{
    conversationId: string | null;
    messageCount: number;
  }>(
    MESSAGES_EVENTS.MESSAGES_UPDATED,
    (data) => {
      console.log("[Sidebar] Messages updated, reloading:", data);
      loadMessages();
    }
  );

  return () => {
    browser.runtime.onMessage.removeListener(handleRuntimeMessage);
    unsubscribe(); // 清理 EventBus 订阅
  };
}, [loadMessages]);
```

## 优势对比

| 特性 | 旧方案 (browser.runtime) | 新方案 (EventBus) |
|------|------------------------|-------------------|
| **延迟** | 高 (需要经过 background) | 低 (直接调用) |
| **可靠性** | 可能丢失消息 | 不会丢失 |
| **复杂度** | 高 (多重消息处理) | 低 (简单 API) |
| **类型安全** | 否 | 是 |
| **调试难度** | 高 (需要追踪消息流) | 低 (直接在同一上下文) |

## 双重保障机制

为了确保最大的可靠性，Sidebar 同时监听两种方式：

```typescript
// 1. EventBus（主要，快速响应）
messageEventBus.on(MESSAGES_EVENTS.MESSAGES_UPDATED, callback);

// 2. browser.runtime（备用，兼容性保障）
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "MESSAGES_UPDATED") {
    callback();
  }
});
```

**好处**：
- ✅ EventBus 提供快速、可靠的本地通信
- ✅ browser.runtime 作为备用方案
- ✅ 即使一种失败，另一种也能工作

## 测试验证

### 1. 发送新消息
1. 打开 ChatGPT/Claude
2. 鼠标悬停到 Sidebar（展开）
3. 发送一条新消息
4. **预期**：Sidebar 自动更新，显示新消息

### 2. 接收 AI 回复
1. 打开 ChatGPT/Claude
2. 鼠标悬停到 Sidebar（展开）
3. 等待 AI 回复
4. **预期**：Sidebar 自动更新，显示回复

### 3. 切换对话
1. 在对话 A 中展开 Sidebar
2. 切换到对话 B
3. **预期**：
   - Sidebar 先清空消息列表
   - 然后自动加载对话 B 的消息

### 4. 查看控制台日志

```bash
# MessageService 发送事件
[AI Assistant] Messages updated: 5 -> 6

# Sidebar 接收事件
[Sidebar] Messages updated (eventBus), reloading: { conversationId: "...", messageCount: 6 }
[Sidebar] Loading messages via local API
```

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Content Script                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │MessageService│────────>│  EventBus    │             │
│  └──────────────┘ emit()  └──────────────┘             │
│                                   │                     │
│                                   │ on()                │
│                                   ↓                     │
│                           ┌──────────────┐             │
│                           │   Sidebar    │             │
│                           └──────────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           │
                           │ browser.runtime.sendMessage
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    Background Script                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                     broadcast messages                   │
│                           │                              │
│                           │                              │
│                           ↓                              │
│                    ┌──────────────┐                     │
│                    │    Popup     │                     │
│                    └──────────────┘                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 未来优化

### 1. 增加更多事件类型

```typescript
export const MESSAGES_EVENTS = {
  MESSAGES_UPDATED: 'messages:updated',
  CONVERSATION_CHANGED: 'conversation:changed',
  MESSAGE_ADDED: 'message:added',           // 新增：单条消息添加
  MESSAGE_UPDATED: 'message:updated',       // 新增：消息内容更新
  LOADING_START: 'loading:start',          // 新增：开始加载
  LOADING_END: 'loading:end',              // 新增：加载完成
} as const;
```

### 2. 添加事件历史

记录最近的事件，用于调试和重放：

```typescript
class EventBus {
  private history: Array<{ event: string; data: any; timestamp: number }> = [];

  emit<T = any>(event: string, data?: T): void {
    // 记录历史
    this.history.push({ event, data, timestamp: Date.now() });

    // 只保留最近 100 条
    if (this.history.length > 100) {
      this.history.shift();
    }

    // 触发回调...
  }
}
```

### 3. 添加事件优先级

```typescript
emit<T = any>(event: string, data?: T, priority: 'high' | 'normal' | 'low' = 'normal'): void {
  if (priority === 'high') {
    // 立即执行
  } else {
    // 加入队列
  }
}
```

## 总结

通过引入事件总线，我们实现了：

1. ✅ **更快的响应**：本地直接调用，无延迟
2. ✅ **更高的可靠性**：不会丢失消息
3. ✅ **更简单的代码**：易于理解和维护
4. ✅ **更好的类型安全**：TypeScript 类型检查
5. ✅ **双重保障**：EventBus + browser.runtime

现在 Sidebar 和 Popup 都能自动更新消息列表了！🎉
