// 导出辅助函数
import type { MessagePair } from "../types/message";

/**
 * 格式化并导出数据
 */
export async function formatAndExportData(
  pairs: MessagePair[],
  format: "json" | "markdown" | "txt" = "json",
): Promise<void> {
  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case "json":
      content = formatAsJSON(pairs);
      filename = `ai_assistant_export_${Date.now()}.json`;
      mimeType = "application/json";
      break;

    case "markdown":
      content = formatAsMarkdown(pairs);
      filename = `ai_assistant_export_${Date.now()}.md`;
      mimeType = "text/markdown";
      break;

    case "txt":
      content = formatAsText(pairs);
      filename = `ai_assistant_export_${Date.now()}.txt`;
      mimeType = "text/plain";
      break;
  }

  downloadFile(content, filename, mimeType);
}

/**
 * 格式化为 JSON
 */
function formatAsJSON(pairs: MessagePair[]): string {
  return JSON.stringify(pairs, null, 2);
}

/**
 * 格式化为 Markdown
 */
function formatAsMarkdown(pairs: MessagePair[]): string {
  return pairs
    .map((pair, index) => {
      const timestamp = new Date(pair.timestamp).toLocaleString("zh-CN");
      let md = `## Q&A ${index + 1} (${timestamp})\n\n`;

      md += `### 用户\n\n${pair.user.content}\n\n`;

      if (pair.assistant) {
        md += `### 助手\n\n${pair.assistant.content}\n\n`;
      }

      md += `---\n\n`;
      return md;
    })
    .join("");
}

/**
 * 格式化为纯文本
 */
function formatAsText(pairs: MessagePair[]): string {
  return pairs
    .map((pair, index) => {
      const timestamp = new Date(pair.timestamp).toLocaleString("zh-CN");
      let text = `[Q&A ${index + 1}] ${timestamp}\n\n`;

      text += `[用户]\n${pair.user.content}\n\n`;

      if (pair.assistant) {
        text += `[助手]\n${pair.assistant.content}\n\n`;
      }

      text += `---\n\n`;
      return text;
    })
    .join("");
}

/**
 * 下载文件
 */
function downloadFile(
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
