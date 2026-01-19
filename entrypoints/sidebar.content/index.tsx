import ReactDOM from "react-dom/client";
import { SidebarPanel } from "src/views/sidebar";
import "src/styles/global.css";

export default defineContentScript({
    matches: [
        "*://*.chatgpt.com/*",
        "*://*.chat.openai.com/*",
        "*://*.claude.ai/*",
        "*://*.gemini.google.com/*",
        "*://gemini.google.com/*",
    ],
    cssInjectionMode: "ui",

    async main(ctx) {
        console.log("[AI Assistant] Sidebar content script loaded");

        // 创建 UI 容器
        const ui = await createShadowRootUi(ctx, {
            name: "ai-assistant-sidebar",
            position: "inline",
            anchor: "body",
            onMount: (container) => {
                // 创建 React 根节点
                const wrapper = document.createElement("div");
                wrapper.id = "ai-assistant-sidebar-root";
                container.appendChild(wrapper);

                const root = ReactDOM.createRoot(wrapper);
                root.render(<SidebarPanel />);

                return { root, wrapper };
            },
            onRemove: (elements) => {
                elements?.root.unmount();
            },
        });

        // 显示 UI
        ui.mount();
    },
});
