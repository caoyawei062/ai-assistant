import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Message, MessagePair } from "types/message";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { ScrollArea } from "src/components/ui/scroll-area";
import { Badge } from "src/components/ui/badge";
import { Separator } from "src/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "src/components/ui/sonner";
import {
    MessageSquare,
    Settings,
    Copy,
    ArrowUp,
    Download,
    Trash2,
    FileJson,
    FileText,
    FileCode,
    Loader2,
    RefreshCw,
    Sparkles
} from "lucide-react";

export function PopupApp() {
    const [pairs, setPairs] = useState<MessagePair[]>([]);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // 获取配置
            const configResponse = await browser.runtime.sendMessage({
                type: "GET_CONFIG",
            });
            if (configResponse.success) {
                setConfig(configResponse.data);
            }

            // 获取当前标签页的消息
            const [tab] = await browser.tabs.query({
                active: true,
                currentWindow: true,
            });
            if (tab.id) {
                const pairsResponse = await browser.tabs.sendMessage(tab.id, {
                    type: "GET_MESSAGE_PAIRS",
                });
                if (pairsResponse.success) {
                    setPairs(pairsResponse.data);
                }
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (messageId: string, action: string) => {
        try {
            const [tab] = await browser.tabs.query({
                active: true,
                currentWindow: true,
            });
            if (tab.id) {
                const response = await browser.tabs.sendMessage(tab.id, {
                    type: "PERFORM_ACTION",
                    messageId,
                    action,
                });

                if (response.success) {
                    switch (action) {
                        case "copy":
                            toast.success("复制成功", {
                                description: "消息内容已复制到剪贴板",
                            });
                            break;
                        case "share":
                            toast.success("分享链接已复制", {
                                description: "粘贴 (Ctrl+V / Cmd+V) 即可查看链接",
                            });
                            break;
                        default:
                            toast.success("操作成功");
                    }
                } else {
                    toast.error("操作失败", {
                        description: "请查看控制台日志",
                    });
                }
            }
        } catch (error) {
            console.error("Failed to perform action:", error);
            toast.error("操作失败", {
                description: (error as Error).message,
            });
        }
    };

    const handleJump = async (messageId: string) => {
        try {
            const [tab] = await browser.tabs.query({
                active: true,
                currentWindow: true,
            });
            if (tab.id) {
                const response = await browser.tabs.sendMessage(tab.id, {
                    type: "JUMP_TO_MESSAGE",
                    messageId,
                });

                if (response.success) {
                    window.close();
                } else {
                    toast.error("跳转失败");
                }
            }
        } catch (error) {
            console.error("Failed to jump:", error);
            toast.error("跳转失败");
        }
    };

    const handleExport = async (format: "json" | "markdown" | "txt") => {
        try {
            const response = await browser.runtime.sendMessage({
                type: "EXPORT_DATA",
                format,
            });

            if (!response.success) {
                toast.error("导出失败", {
                    description: response.error || "未知错误",
                });
            }
            // 成功时文件会自动下载，不需要提示
        } catch (error) {
            console.error("Failed to export:", error);
            toast.error("导出失败");
        }
    };

    const handleClearData = async () => {
        if (confirm("确定要重置插件配置吗？这会将所有设置恢复为默认值。")) {
            const response = await browser.runtime.sendMessage({
                type: "CLEAR_DATA",
            });
            if (response.success) {
                toast.success("配置已重置", {
                    description: "所有设置已恢复为默认值",
                });
                // 重新加载配置
                loadData();
            } else {
                toast.error("重置失败");
            }
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] w-[400px] gap-4 bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">加载中...</p>
            </div>
        );
    }

    return (
        <div className="w-[360px] min-h-[500px] bg-background overflow-x-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 px-3 py-3 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-md">
                            <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <h1 className="text-base font-bold text-gray-900 dark:text-zinc-100 tracking-tight">AI 助手增强</h1>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-gray-400 hover:text-primary hover:bg-accent transition-colors"
                        onClick={loadData}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="messages" className="w-full flex-1 flex flex-col min-h-0">
                <div className="px-3 py-2 bg-white dark:bg-zinc-900 shrink-0">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-xl">
                        <TabsTrigger
                            value="messages"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all text-xs"
                        >
                            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                            消息
                        </TabsTrigger>
                        <TabsTrigger
                            value="settings"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all text-xs"
                        >
                            <Settings className="h-3.5 w-3.5 mr-1.5" />
                            设置
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="messages" className="mt-0 flex-1 min-h-0 border-none">
                    <ScrollArea className="h-[430px] w-full">
                        <div className="py-3 space-y-3 flex flex-col items-center">
                            {pairs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                    <p className="text-muted-foreground font-medium">暂无消息</p>
                                    <p className="text-sm text-muted-foreground/70 mt-1">请先在支持的 AI 站点进行对话</p>
                                </div>
                            ) : (
                                <div className="space-y-3 pb-4">
                                    {pairs.map((pair) => (
                                        <Card
                                            key={pair.id}
                                            className="group transition-all duration-300 hover:ring-1 hover:ring-primary/20 border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm w-[320px]"
                                        >
                                            <CardContent className="p-3 space-y-2.5">
                                                {/* 消息对：用户询问 + 助手回复 */}
                                                <div className="space-y-2">
                                                    {/* 用户询问 */}
                                                    <div className="flex items-start gap-2">
                                                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px] h-5 px-1.5 shrink-0 mt-0.5">
                                                            用户
                                                        </Badge>
                                                        <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed flex-1 line-clamp-3 overflow-hidden text-ellipsis">
                                                            {pair.user.content}
                                                        </p>
                                                    </div>

                                                    {/* 助手回复 (如果有) */}
                                                    {pair.assistant && (
                                                        <div className="flex items-start gap-2">
                                                            <Badge variant="secondary" className="bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-gray-100 text-[10px] h-5 px-1.5 shrink-0 mt-0.5">
                                                                助手
                                                            </Badge>
                                                            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed flex-1 line-clamp-3 overflow-hidden text-ellipsis">
                                                                {pair.assistant.content}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 时间戳和操作按钮 */}
                                                <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-zinc-800/50">
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(pair.user.timestamp).toLocaleTimeString("zh-CN", { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleJump(pair.id)}
                                                            className="text-[10px] h-6 px-2 hover:bg-accent text-gray-600 hover:text-primary"
                                                        >
                                                            <ArrowUp className="h-2.5 w-2.5 mr-1" />
                                                            跳转
                                                        </Button>
                                                        {pair.assistant && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleAction(pair.assistant!.id, "copy")}
                                                                className="text-[10px] h-6 px-2 hover:bg-accent text-gray-600 hover:text-primary"
                                                            >
                                                                <Copy className="h-2.5 w-2.5 mr-1" />
                                                                复制
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="mt-0 flex-1 min-h-0">
                    <ScrollArea className="h-[400px]">
                        <div className="p-4 space-y-4">
                            {/* 导出数据 */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Download className="h-4 w-4" />
                                        导出数据
                                    </CardTitle>
                                    <CardDescription>
                                        将对话数据导出为不同格式
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => handleExport("json")}
                                    >
                                        <FileJson className="h-4 w-4 mr-2 text-yellow-500" />
                                        导出 JSON
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => handleExport("markdown")}
                                    >
                                        <FileCode className="h-4 w-4 mr-2 text-blue-500" />
                                        导出 Markdown
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => handleExport("txt")}
                                    >
                                        <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                        导出 TXT
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* 数据管理 */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        数据管理
                                    </CardTitle>
                                    <CardDescription>
                                        重置插件配置
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={handleClearData}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        重置配置
                                    </Button>
                                </CardContent>
                            </Card>

                            <Separator />

                            {/* 关于 */}
                            <Card className="border-none shadow-none bg-muted/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">关于</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground space-y-1">
                                    <p>AI 助手增强插件 v1.0.0</p>
                                    <p>支持 ChatGPT、Claude、Gemini 等主流 AI 对话站点</p>
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
            <Toaster />
        </div>
    );
}
