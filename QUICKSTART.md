# 快速开始指南

## 📦 项目初始化

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
# Chrome
npm run dev

# Firefox
npm run dev:firefox
```

### 3. 加载插件到浏览器

#### Chrome

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目目录下的 `.output/chrome-mv3` 文件夹

#### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择项目目录下的 `.output/firefox-mv3` 文件夹中的 `.xpi` 文件

## 🎯 核心功能演示

### 功能 1: 消息跳转

1. 访问 [ChatGPT](https://chatgpt.com) 或 [Claude](https://claude.ai)
2. 进行一段对话
3. 点击浏览器工具栏中的插件图标
4. 在弹出的消息列表中，点击任意消息的"⬆️ 跳转"按钮
5. 页面会自动滚动到该消息并高亮显示

### 功能 2: 消息分享

1. 在消息列表中找到要分享的消息
2. 点击"🔗 分享"按钮
3. 跳转链接会自动复制到剪贴板
4. 分享链接格式：`https://site.com/conversation#messageId`
5. 其他人打开链接后会自动跳转到该消息

### 功能 3: 消息复制

1. 在消息列表中找到要复制的消息
2. 点击"📋 复制"按钮
3. 消息内容会自动复制到剪贴板

### 功能 4: 数据导出

1. 打开插件弹窗
2. 切换到"设置"标签
3. 选择导出格式：
   - **JSON**: 完整的消息数据结构
   - **Markdown**: 格式化的文档
   - **TXT**: 纯文本格式
4. 点击对应的导出按钮
5. 文件会自动下载

## 🔧 开发指南

### 添加新的 AI 站点支持

#### 步骤 1: 定义站点类型

在 `types/site.ts` 中添加新的站点类型：

```typescript
export type SiteType = "chatgpt" | "claude" | "gemini" | "yoursite";
```

#### 步骤 2: 创建检测器

在 `detectors/` 目录下创建新的检测器文件：

```typescript
// detectors/yoursite.ts
import type { SiteDetector, Message } from "../types/site";
import { parseMessageElement } from "../utils/messageParser";
import { findAll, waitForElement } from "../utils/dom";

export class YourSiteDetector implements SiteDetector {
  private readonly selectors = {
    user: "your-user-selector",
    assistant: "your-assistant-selector",
    container: "your-container-selector",
  };

  detect(): "yoursite" | null {
    const hostname = window.location.hostname;
    if (hostname.includes("yoursite.com")) {
      return "yoursite";
    }
    return null;
  }

  async getMessages(): Promise<Message[]> {
    // 实现消息提取逻辑
  }

  getMessageElement(messageId: string): HTMLElement | null {
    // 实现元素查找逻辑
  }

  scrollToMessage(messageId: string): boolean {
    // 实现滚动逻辑
  }
}
```

#### 步骤 3: 注册检测器

在 `detectors/index.ts` 中注册：

```typescript
import { YourSiteDetector } from "./yoursite";

export class DetectorFactory {
  private static detectors: SiteDetector[] = [
    new ChatGPTDetector(),
    new ClaudeDetector(),
    new GeminiDetector(),
    new YourSiteDetector(), // 添加新检测器
  ];
  // ...
}
```

#### 步骤 4: 更新匹配规则

在 `entrypoints/content.ts` 中添加 URL 匹配：

```typescript
export default defineContentScript({
  matches: [
    "*://*.chatgpt.com/*",
    "*://*.chat.openai.com/*",
    "*://*.claude.ai/*",
    "*://*.gemini.google.com/*",
    "*://*.yoursite.com/*", // 添加新站点
  ],
  // ...
});
```

### 添加新的消息操作

#### 步骤 1: 定义操作类型

在 `types/message.ts` 中添加：

```typescript
export type MessageAction =
  | "copy"
  | "quote"
  | "share"
  | "jump"
  | "export"
  | "youraction";
```

#### 步骤 2: 实现操作逻辑

在 `services/messageService.ts` 中添加处理逻辑：

```typescript
async performAction(messageId: string, action: MessageAction): Promise<boolean> {
  const message = this.getMessageById(messageId);
  if (!message) return false;

  switch (action) {
    // ... 现有操作
    case 'youraction':
      return this.yourCustomAction(message);
    default:
      return false;
  }
}

private yourCustomAction(message: Message): boolean {
  // 实现你的自定义操作
  return true;
}
```

#### 步骤 3: 添加 UI 按钮

在 `entrypoints/popup/App.tsx` 中添加按钮：

```tsx
<button
  className="action-button"
  onClick={() => handleAction(message.id, "youraction")}
  title="你的操作"
>
  🎯 你的操作
</button>
```

### 调试技巧

#### 1. 查看 Content Script 日志

1. 打开 AI 站点页面
2. 按 F12 打开开发者工具
3. 切换到 Console 标签
4. 查看插件输出的日志

#### 2. 查看 Background Script 日志

1. 打开 `chrome://extensions/`
2. 找到你的插件
3. 点击"检查视图: service worker"
4. 查看后台脚本日志

#### 3. 查看 Popup 日志

1. 点击插件图标打开弹窗
2. 右键点击弹窗
3. 选择"检查"
4. 查看弹窗日志

#### 4. 重新加载插件

开发过程中修改代码后：

- **Chrome**: 在 `chrome://extensions/` 中点击插件的"重新加载"按钮
- **Firefox**: 在 `about:debugging` 中点击"重新加载"

## 🐛 常见问题

### 问题 1: 插件无法加载

**解决方案**:

- 检查 `package.json` 中的依赖是否完整安装
- 确认 WXT 版本兼容性
- 查看浏览器控制台的错误信息

### 问题 2: 消息无法识别

**解决方案**:

- 检查站点选择器是否正确
- 使用浏览器开发者工具检查 DOM 结构
- 确认站点 URL 匹配规则

### 问题 3: 跳转功能不工作

**解决方案**:

- 确认消息元素已添加 `data-message-id` 属性
- 检查 URL hash 是否正确生成
- 验证滚动和高亮逻辑

### 问题 4: 存储数据丢失

**解决方案**:

- 检查浏览器存储配额
- 确认没有清除浏览器数据
- 查看存储服务的错误日志

## 📚 相关资源

- [WXT 官方文档](https://wxt.dev/)
- [Chrome Extension 开发指南](https://developer.chrome.com/docs/extensions/)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 添加必要的注释和文档

### 提交信息

使用约定式提交格式：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建/工具链更新
```

### 分支管理

- `main`: 主分支，稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `bugfix/*`: 修复分支
- `hotfix/*`: 紧急修复分支

## 🎓 学习路径

### 初级

1. 了解浏览器扩展基本概念
2. 学习 WXT 框架基础
3. 熟悉 React 和 TypeScript
4. 完成第一个功能开发

### 中级

1. 深入理解 Content Script
2. 掌握消息通信机制
3. 学习 DOM 操作和事件处理
4. 实现复杂功能

### 高级

1. 性能优化技巧
2. 安全最佳实践
3. 跨浏览器兼容性
4. 自动化测试

## 🚀 下一步

- [ ] 完善单元测试
- [ ] 添加 E2E 测试
- [ ] 实现更多 AI 站点支持
- [ ] 添加消息搜索功能
- [ ] 实现消息标签系统
- [ ] 添加快捷键支持
- [ ] 优化性能
- [ ] 发布到 Chrome Web Store

祝你开发愉快！🎉
