# AI 助手增强插件 - 架构设计文档

## 1. 系统概述

本插件是一个基于 WXT 框架开发的浏览器扩展，旨在增强主流 AI 对话站点的用户体验。核心功能是为每条对话消息提供唯一标识，支持快速跳转、复制、分享和导出等操作。

## 2. 技术栈

- **框架**: WXT (Web Extension Tools)
- **前端**: React 19 + TypeScript
- **构建工具**: Vite (通过 WXT)
- **存储**: browser.storage.local
- **通信**: Chrome Extension Messaging API

## 3. 架构分层

### 3.1 表现层 (Presentation Layer)

#### Popup 界面

- **位置**: `entrypoints/popup/`
- **职责**:
  - 展示消息列表
  - 提供操作按钮
  - 显示设置界面
  - 与用户交互

#### Content Script 注入

- **位置**: `entrypoints/content.ts`
- **职责**:
  - 注入到目标页面
  - 监听页面变化
  - 执行 DOM 操作
  - 与 Background Script 通信

#### Background Script

- **位置**: `entrypoints/background.ts`
- **职责**:
  - 管理插件生命周期
  - 处理跨标签页通信
  - 管理全局状态
  - 处理数据持久化

### 3.2 业务逻辑层 (Business Logic Layer)

#### MessageService

- **位置**: `services/messageService.ts`
- **职责**:
  - 消息识别和提取
  - 消息状态管理
  - 消息操作执行
  - 消息元素管理

#### JumpService

- **位置**: `services/jumpService.ts`
- **职责**:
  - 跳转 URL 生成
  - URL hash 处理
  - 跳转历史管理
  - 滚动和高亮控制

#### StorageService

- **位置**: `services/storageService.ts`
- **职责**:
  - 数据持久化
  - 配置管理
  - 数据导出
  - 数据清理

### 3.3 检测层 (Detector Layer)

#### SiteDetector 接口

```typescript
interface SiteDetector {
  detect(): SiteType | null;
  getMessages(): Message[];
  getMessageElement(messageId: string): HTMLElement | null;
  scrollToMessage(messageId: string): boolean;
}
```

#### 具体实现

- **ChatGPTDetector**: 针对 ChatGPT 站点的检测器
- **ClaudeDetector**: 针对 Claude 站点的检测器
- **GeminiDetector**: 针对 Gemini 站点的检测器

#### DetectorFactory

- **位置**: `detectors/index.ts`
- **职责**:
  - 管理所有检测器
  - 自动检测当前站点
  - 提供检测器查询接口

### 3.4 工具层 (Utility Layer)

#### DOM 工具

- **位置**: `utils/dom.ts`
- **功能**:
  - 元素查找和等待
  - 元素创建和操作
  - 滚动控制
  - 高亮效果

#### 消息解析工具

- **位置**: `utils/messageParser.ts`
- **功能**:
  - 内容提取
  - 格式转换
  - 内容清理
  - 截断处理

#### URL 工具

- **位置**: `utils/url.ts`
- **功能**:
  - URL 解析
  - ID 生成
  - 跳转 URL 构建
  - 查询参数处理

## 4. 数据流设计

### 4.1 消息识别流程

```
页面加载
    ↓
Content Script 初始化
    ↓
DetectorFactory.detectCurrentSite()
    ↓
返回对应的 SiteDetector
    ↓
MessageService.initialize()
    ↓
detector.getMessages()
    ↓
遍历消息元素
    ↓
parseMessageElement()
    ↓
生成唯一 messageId
    ↓
添加 data-message-id 属性
    ↓
存储到 messages Map
    ↓
observeNewMessages()
    ↓
监听 DOM 变化
```

### 4.2 消息跳转流程

```
用户点击跳转按钮
    ↓
Popup 发送 JUMP_TO_MESSAGE 消息
    ↓
Content Script 接收消息
    ↓
JumpService.jumpToMessage(messageId)
    ↓
查找消息元素
    ↓
element.scrollIntoView()
    ↓
highlightElement()
    ↓
recordJump()
    ↓
返回成功响应
    ↓
Popup 关闭
```

### 4.3 消息操作流程

```
用户点击操作按钮
    ↓
Popup 发送 PERFORM_ACTION 消息
    ↓
Content Script 接收消息
    ↓
MessageService.performAction(messageId, action)
    ↓
switch (action) {
  case 'copy': copyMessage()
  case 'share': shareMessage()
  case 'export': exportMessage()
}
    ↓
执行对应操作
    ↓
返回结果
    ↓
Popup 显示提示
```

## 5. 消息通信设计

### 5.1 Popup ↔ Content Script

```typescript
// Popup 发送消息
browser.tabs.sendMessage(tabId, {
  type: 'GET_MESSAGES' | 'PERFORM_ACTION' | 'JUMP_TO_MESSAGE',
  messageId?: string,
  action?: string
})

// Content Script 响应
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理消息
  sendResponse({ success: boolean, data?: any })
})
```

### 5.2 Popup ↔ Background Script

```typescript
// Popup 发送消息
browser.runtime.sendMessage({
  type: 'GET_CONFIG' | 'UPDATE_CONFIG' | 'EXPORT_DATA' | 'CLEAR_DATA',
  config?: PluginConfig,
  format?: string
})

// Background Script 响应
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理消息
  sendResponse({ success: boolean, data?: any })
})
```

## 6. 数据存储设计

### 6.1 存储结构

```typescript
{
  "ai_assistant_messages": Message[],      // 消息列表
  "ai_assistant_config": PluginConfig,      // 插件配置
  "ai_assistant_jump_history": JumpInfo[]   // 跳转历史
}
```

### 6.2 消息数据结构

```typescript
interface Message {
  id: string; // 唯一标识
  role: "user" | "assistant"; // 角色
  content: string; // 内容
  timestamp: number; // 时间戳
  site: string; // 站点
  conversationId: string; // 对话 ID
  element?: HTMLElement; // DOM 元素引用
}
```

### 6.3 配置数据结构

```typescript
interface PluginConfig {
  enabledSites: SiteType[];
  messageActions: MessageActionConfig[];
  jumpConfig: {
    enabled: boolean;
    showJumpButton: boolean;
    jumpButtonPosition: string;
  };
  storageConfig: {
    maxMessages: number;
    autoExport: boolean;
    exportFormat: string;
  };
  uiConfig: {
    theme: string;
    showMessageCount: boolean;
    showTimestamp: boolean;
  };
}
```

## 7. 扩展性设计

### 7.1 添加新站点支持

1. 在 `types/site.ts` 中添加新的 SiteType
2. 创建新的 Detector 类实现 SiteDetector 接口
3. 在 `DetectorFactory` 中注册新的检测器
4. 在 `content.ts` 的 matches 中添加新的 URL 模式

### 7.2 添加新消息操作

1. 在 `types/message.ts` 中添加新的 MessageAction
2. 在 MessageService.performAction 中添加处理逻辑
3. 在 Popup UI 中添加对应的按钮

### 7.3 添加新导出格式

1. 在 StorageService.exportData 中添加新的格式处理
2. 实现对应的格式化函数
3. 在 Popup UI 中添加导出选项

## 8. 性能优化

### 8.1 消息识别优化

- 使用 MutationObserver 监听 DOM 变化，避免轮询
- 只处理可见的消息元素
- 使用 Map 数据结构快速查找消息

### 8.2 存储优化

- 限制最大消息数量
- 定期清理过期数据
- 使用批量操作减少 I/O

### 8.3 UI 优化

- 虚拟滚动处理大量消息
- 懒加载消息内容
- 防抖处理用户操作

## 9. 安全考虑

### 9.1 XSS 防护

- 使用 textContent 而非 innerHTML
- 对用户输入进行转义
- 使用 CSP 策略

### 9.2 数据隐私

- 数据仅存储在本地
- 不上传任何用户数据
- 提供数据清理功能

### 9.3 权限最小化

- 只请求必要的权限
- 限制访问的站点范围
- 使用 contentScripts 而非 hostPermissions

## 10. 测试策略

### 10.1 单元测试

- 测试工具函数
- 测试服务逻辑
- 测试检测器

### 10.2 集成测试

- 测试消息流程
- 测试跳转功能
- 测试存储操作

### 10.3 E2E 测试

- 测试完整用户流程
- 测试多站点兼容性
- 测试边界情况

## 11. 部署流程

### 11.1 开发环境

```bash
npm run dev
```

### 11.2 生产构建

```bash
npm run build
npm run zip
```

### 11.3 发布流程

1. 更新版本号
2. 构建插件包
3. 提交到 Chrome Web Store
4. 等待审核
5. 发布更新

## 12. 监控和日志

### 12.1 错误监控

- 捕获运行时错误
- 记录错误堆栈
- 提供错误反馈

### 12.2 使用统计

- 记录功能使用频率
- 统计活跃用户数
- 分析用户行为

### 12.3 日志级别

- ERROR: 错误信息
- WARN: 警告信息
- INFO: 一般信息
- DEBUG: 调试信息
