import { useState, useEffect, useCallback, useRef } from "react";
import { ScrollArea } from "src/components/ui/scroll-area";
import { Button } from "src/components/ui/button";
import { Card, CardContent } from "src/components/ui/card";
import {
    RefreshCw,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Sparkles
} from "lucide-react";

import { MessagePair } from "types/message";

export function SidebarPanel() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [pairs, setPairs] = useState<MessagePair[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [eventBusReady, setEventBusReady] = useState(false);
    const leaveTimerRef = useRef<number | null>(null);

    // 处理鼠标进入
    const handleMouseEnter = useCallback(() => {
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }
        setIsExpanded(true);
    }, []);

    // 处理鼠标离开（添加延迟防抖）
    const handleMouseLeave = useCallback(() => {
        leaveTimerRef.current = window.setTimeout(() => {
            setIsExpanded(false);
        }, 300);
    }, []);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (leaveTimerRef.current) {
                clearTimeout(leaveTimerRef.current);
            }
        };
    }, []);

    // 加载消息
    const loadMessages = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        try {
            // 优先使用本地 API（更快）
            const api = (window as any).__AI_ASSISTANT_API__;
            if (api && api.getMessagePairs) {
                console.log("[Sidebar] Loading messages via local API");
                const pairs = await api.getMessagePairs();
                setPairs(pairs || []);
                setHasLoaded(true);
            } else {
                console.log("[Sidebar] API not ready, retrying...");
                // API 还没准备好，稍后重试
                setTimeout(() => loadMessages(), 500);
            }
        } catch (error) {
            console.error("[AI Assistant] Failed to load messages:", error);
        } finally {
            setLoading(false);
        }
    }, [loading]);

    // hover 时加载消息（仅首次）
    useEffect(() => {
        if (isExpanded && !hasLoaded) {
            loadMessages();
        }
    }, [isExpanded, hasLoaded, loadMessages]);

    // 检查 EventBus 是否准备好
    useEffect(() => {
        const checkEventBus = () => {
            const eventBus = (window as any).__AI_ASSISTANT_EVENT_BUS__;
            const api = (window as any).__AI_ASSISTANT_API__;

            if (eventBus && api && api.getEvents) {
                console.log("[Sidebar] EventBus is ready!");
                setEventBusReady(true);
                return true;
            }
            return false;
        };

        // 立即检查一次
        if (checkEventBus()) return;

        // 如果没准备好，定期检查
        const interval = setInterval(() => {
            if (checkEventBus()) {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    // 监听对话切换和消息更新事件
    useEffect(() => {
        if (!eventBusReady) {
            console.log("[Sidebar] Waiting for EventBus to be ready...");
            return;
        }

        console.log("[Sidebar] Setting up event listeners");

        // 从 window 获取共享的 EventBus
        const eventBus = (window as any).__AI_ASSISTANT_EVENT_BUS__;
        const api = (window as any).__AI_ASSISTANT_API__;
        const MESSAGES_EVENTS = api.getEvents();

        // 1. 监听 browser.runtime 消息（来自 background，用于 Popup）
        const handleRuntimeMessage = (message: any) => {
            if (message.type === "CONVERSATION_CHANGED") {
                console.log("[Sidebar] Conversation changed (runtime), clearing messages");
                setPairs([]);
                setHasLoaded(false);
            } else if (message.type === "MESSAGES_UPDATED") {
                console.log("[Sidebar] Messages updated (runtime), reloading");
                loadMessages();
            }
        };

        browser.runtime.onMessage.addListener(handleRuntimeMessage);

        // 2. 使用共享的 EventBus 监听本地事件（更可靠）
        const unsubscribeMessagesUpdated = eventBus.on(
            MESSAGES_EVENTS.MESSAGES_UPDATED,
            // @ts-ignore - EventBus 类型推断问题
            (data: { conversationId: string | null; messageCount: number }) => {
                console.log("[Sidebar] Messages updated (eventBus), reloading:", data);
                loadMessages();
            }
        );

        const unsubscribeConversationChanged = eventBus.on(
            MESSAGES_EVENTS.CONVERSATION_CHANGED,
            // @ts-ignore - EventBus 类型推断问题
            (data: { conversationId: string | null }) => {
                console.log("[Sidebar] Conversation changed (eventBus), clearing messages:", data);
                setPairs([]);
                setHasLoaded(false);
            }
        );

        console.log("[Sidebar] Event listeners registered successfully");

        return () => {
            console.log("[Sidebar] Cleaning up event listeners");
            browser.runtime.onMessage.removeListener(handleRuntimeMessage);
            unsubscribeMessagesUpdated();
            unsubscribeConversationChanged();
        };
    }, [eventBusReady, loadMessages]);

    // 跳转到消息
    const handleJump = (messageId: string) => {
        const element = document.querySelector(
            `[data-message-id="${messageId}"]`
        ) as HTMLElement;

        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });

            const originalBg = element.style.backgroundColor;
            const originalTransition = element.style.transition;

            element.style.transition = "background-color 0.3s ease, box-shadow 0.3s ease";
            element.style.backgroundColor = "oklch(var(--primary) / 0.1)";
            element.style.boxShadow = "0 0 0 2px oklch(var(--primary) / 0.2)";

            setTimeout(() => {
                element.style.backgroundColor = originalBg;
                element.style.boxShadow = "";
                setTimeout(() => {
                    element.style.transition = originalTransition;
                }, 300);
            }, 2000);
        }
    };

    // 截断文本
    const truncate = (text: string, maxLength = 30) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    return (
        <div
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[999999] flex flex-row"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* 收起状态的触发区域 */}
            <div
                className={`
          flex flex-col items-center gap-1.5 py-4 px-2
          bg-white/95 dark:bg-zinc-900/95
          backdrop-blur-md rounded-l-2xl
          shadow-[-4px_0_24px_rgba(0,0,0,0.08)]
          border-l border-t border-b border-gray-200 dark:border-zinc-800
          transition-all duration-300 ease-out
          ${isExpanded ? "opacity-0 w-0 p-0 overflow-hidden scale-95" : "w-10 hover:w-12"}
          cursor-pointer group
        `}
            >
                {/* Logo/指示器 */}
                <div className="flex flex-col items-center gap-3">
                    <Sparkles className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />

                    {/* 消息点指示器 */}
                    <div className="flex flex-col gap-2">
                        {pairs.slice(0, 4).map((pair, index) => (
                            <div
                                key={pair.id}
                                className="relative cursor-pointer group/dot"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleJump(pair.id);
                                }}
                                title={pair.user.content}
                            >
                                <span
                                    className={`
                    block w-1.5 h-1.5 rounded-full
                    bg-gray-300 dark:bg-zinc-600
                    transition-all duration-200 ease-out
                    group-hover/dot:scale-150 group-hover/dot:bg-primary
                  `}
                                    style={{
                                        opacity: 1 - index * 0.15,
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {pairs.length > 4 && (
                        <span className="text-[10px] text-gray-400 font-medium">
                            +{pairs.length - 4}
                        </span>
                    )}
                </div>

                {/* 展开提示箭头 */}
                <ChevronLeft className="h-4 w-4 text-gray-400 mt-auto group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
            </div>

            {/* 展开状态的消息列表面板 */}
            <div
                className={`
          flex flex-col max-h-[70vh] min-h-[200px]
          bg-white/95 dark:bg-zinc-900/95
          backdrop-blur-xl rounded-l-2xl
          shadow-[-8px_0_32px_rgba(0,0,0,0.15)] dark:shadow-[-8px_0_32px_rgba(0,0,0,0.5)]
          border-l border-t border-b border-gray-200/50 dark:border-zinc-700/50
          overflow-hidden transition-all duration-300 ease-out
          ${isExpanded ? "w-72 opacity-100" : "w-0 opacity-0"}
        `}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-accent/50 dark:bg-zinc-800 rounded-lg">
                            <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <span className="text-gray-900 dark:text-zinc-100 text-sm font-semibold">对话历史</span>
                            <span className="text-gray-400 text-xs ml-2">
                                {pairs.length}
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 text-gray-400 hover:text-primary hover:bg-accent rounded-lg transition-colors"
                        onClick={loadMessages}
                        title="刷新"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>

                {/* 内容区域 */}
                <ScrollArea className="flex-1 min-h-0 w-full">
                    <div className="px-3 py-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <RefreshCw className="h-6 w-6 animate-spin mb-3 text-violet-500" />
                                <span className="text-sm">加载中...</span>
                            </div>
                        ) : pairs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4 text-center">
                                <div className="p-4 bg-muted/50 rounded-full mb-4">
                                    <MessageSquare className="h-8 w-8 opacity-40" />
                                </div>
                                <span className="text-sm font-medium">暂无对话</span>
                                <span className="text-xs mt-1 opacity-70">在此站点开始对话后会自动抓取</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {pairs.map((pair, index) => (
                                    <div
                                        key={pair.id}
                                        className={`
                                            group relative flex flex-col gap-1
                                            px-3 py-2.5 cursor-pointer
                                            rounded-xl transition-all duration-200
                                            hover:bg-accent/50 dark:hover:bg-zinc-800/50
                                            border border-transparent hover:border-gray-100 dark:hover:border-zinc-800
                                        `}
                                        onClick={() => handleJump(pair.id)}
                                        title={pair.user.content}
                                    >
                                        <div className="flex items-center justify-between min-w-0">
                                            <p className="text-[13px] text-gray-700 dark:text-zinc-300 group-hover:text-primary transition-colors truncate flex-1 font-medium">
                                                {truncate(pair.user.content, 22)}
                                            </p>

                                            {/* 右侧指示条 */}
                                            <div className="flex items-center ml-2 shrink-0">
                                                <div
                                                    className={`
                                                        w-3 h-1 rounded-full
                                                        transition-all duration-300
                                                        ${index === 0
                                                            ? "bg-primary shadow-[0_0_8px_oklch(var(--primary)/0.4)]"
                                                            : "bg-gray-200 dark:bg-zinc-700 group-hover:bg-primary/30"
                                                        }
                                                    `}
                                                />
                                            </div>
                                        </div>
                                        {pair.assistant && (
                                            <p className="text-[11px] text-gray-400 dark:text-zinc-500 italic truncate opacity-80 pl-1 border-l border-gray-100 dark:border-zinc-800/50 ml-0.5 mt-0.5">
                                                {truncate(pair.assistant.content, 28)}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* 底部操作区 */}
                <div className="px-3 py-2 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[11px] text-gray-400 hover:text-primary hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setIsExpanded(false)}
                    >
                        <ChevronRight className="h-3 w-3 mr-1.5" />
                        收起
                    </Button>
                </div>
            </div>
        </div>
    );
}
