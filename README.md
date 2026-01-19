# AI 助手增强插件

一个基于 WXT 框架开发的浏览器插件，用于增强 AI 对话站点的功能，主要提供消息跳转、复制、分享、导出等功能。

## 🎯 核心功能

### 1. 消息跳转系统

- 为每条消息生成唯一标识符
- 支持通过 URL hash 快速跳转到指定消息
- 自动高亮目标消息
- 记录跳转历史，支持返回上一位置

### 2. 消息管理

- 自动识别和记录对话消息
- 支持复制消息内容
- 支持生成分享链接
- 支持导出为 JSON/Markdown/TXT 格式

### 3. 多站点支持

- ChatGPT (chatgpt.com, chat.openai.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- 可扩展支持更多站点

## 📁 项目结构

```
ai-assistant/
├── entrypoints/              # 入口文件
│   ├── background.ts         # 后台脚本 - 处理插件生命周期和跨标签页通信
│   ├── content.ts            # 内容脚本 - 注入到 AI 站点页面
│   ├── popup/                # 弹窗界面
│   │   ├── App.tsx           # 主组件
│   │   ├── App.css           # 样式文件
│   │   ├── index.html        # HTML 模板
│   │   └── main.tsx          # 入口文件
│   └── options/              # 选项页面（待实现）
├── components/               # 共享组件（待实现）
│   ├── MessageAction.tsx     # 消息操作组件
│   ├── JumpButton.tsx        # 跳转按钮
│   └── MessageMenu.tsx       # 消息菜单
├── services/                 # 业务逻辑层
│   ├── messageService.ts     # 消息处理服务
│   ├── jumpService.ts        # 跳转服务
│   └── storageService.ts     # 存储服务
├── detectors/                # 站点检测器
│   ├── chatgpt.ts            # ChatGPT 检测器
│   ├── claude.ts             # Claude 检测器
│   ├── gemini.ts             # Gemini 检测器
│   └── index.ts              # 检测器工厂
├── utils/                    # 工具函数
│   ├── dom.ts                # DOM 操作工具
│   ├── messageParser.ts      # 消息解析工具
│   └── url.ts                # URL 处理工具
├── types/                    # TypeScript 类型定义
│   ├── message.ts            # 消息类型
│   ├── site.ts               # 站点类型
│   └── config.ts             # 配置类型
└── assets/                   # 静态资源
```

## 🏗️ 架构设计

### 分层架构

```
┌─────────────────────────────────────────┐
│           UI Layer (Popup)               │
│  - 消息列表展示                          │
│  - 操作按钮                              │
│  - 设置界面                              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                   │
│  - MessageService: 消息管理             │
│  - JumpService: 跳转功能                │
│  - StorageService: 数据持久化           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        Detector Layer                   │
│  - SiteDetector: 站点检测接口           │
│  - ChatGPTDetector: ChatGPT 实现         │
│  - ClaudeDetector: Claude 实现          │
│  - GeminiDetector: Gemini 实现          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Utility Layer                   │
│  - DOM 操作                              │
│  - 消息解析                              │
│  - URL 处理                              │
└─────────────────────────────────────────┘
```

### 核心模块说明

#### 1. MessageService (消息服务)

- 负责消息的识别、提取和管理
- 监听 DOM 变化，自动捕获新消息
- 为每条消息生成唯一 ID
- 提供消息操作接口（复制、分享、导出等）

#### 2. JumpService (跳转服务)

- 管理消息跳转功能
- 处理 URL hash 变化
- 记录跳转历史
- 提供返回上一位置功能

#### 3. StorageService (存储服务)

- 使用 browser.storage.local 持久化数据
- 管理插件配置
- 支持数据导出功能
- 提供数据清理接口

#### 4. SiteDetector (站点检测器)

- 定义统一的站点检测接口
- 每个站点实现自己的检测逻辑
- 提供消息元素选择器
- 支持滚动到指定消息

### 消息流程

```
用户访问 AI 站点
    ↓
Content Script 加载
    ↓
DetectorFactory 检测当前站点
    ↓
MessageService 初始化
    ↓
扫描页面消息元素
    ↓
为每条消息生成唯一 ID
    ↓
添加 data-message-id 属性
    ↓
监听 DOM 变化捕获新消息
    ↓
用户点击插件图标
    ↓
Popup 显示消息列表
    ↓
用户执行操作（跳转/复制/分享）
    ↓
Content Script 处理请求
    ↓
返回结果给 Popup
```

## 🚀 开发指南

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# Chrome
npm run dev

# Firefox
npm run dev:firefox
```

### 构建

```bash
# Chrome
npm run build

# Firefox
npm run build:firefox
```

### 打包

```bash
# Chrome
npm run zip

# Firefox
npm run zip:firefox
```

## 🔧 配置说明

插件配置存储在 `browser.storage.local` 中，包含以下选项：

```typescript
{
  enabledSites: string[];           // 启用的站点列表
  messageActions: MessageActionConfig[]; // 消息操作配置
  jumpConfig: {
    enabled: boolean;               // 是否启用跳转功能
    showJumpButton: boolean;        // 是否显示跳转按钮
    jumpButtonPosition: string;     // 跳转按钮位置
  };
  storageConfig: {
    maxMessages: number;            // 最大消息数量
    autoExport: boolean;            // 是否自动导出
    exportFormat: string;           // 导出格式
  };
  uiConfig: {
    theme: string;                  // 主题设置
    showMessageCount: boolean;     // 是否显示消息数量
    showTimestamp: boolean;         // 是否显示时间戳
  };
}
```

## 📝 使用说明

### 消息跳转

1. 在支持的 AI 站点进行对话
2. 点击插件图标打开弹窗
3. 在消息列表中找到目标消息
4. 点击"⬆️ 跳转"按钮
5. 页面会自动滚动到该消息并高亮显示

### 分享消息

1. 在消息列表中点击"🔗 分享"按钮
2. 跳转链接会自动复制到剪贴板
3. 分享链接格式：`https://site.com/conversation#messageId`

### 导出数据

1. 打开插件弹窗
2. 切换到"设置"标签
3. 选择导出格式（JSON/Markdown/TXT）
4. 点击对应的导出按钮

## 🔮 未来计划

- [ ] 添加更多 AI 站点支持
- [ ] 实现消息搜索功能
- [ ] 添加消息标签和分类
- [ ] 支持消息收藏功能
- [ ] 实现消息对比功能
- [ ] 添加快捷键支持
- [ ] 实现消息统计和分析
- [ ] 支持多语言界面

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
