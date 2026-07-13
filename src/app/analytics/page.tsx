"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import {
  getTopModels,
  getDailyActivity,
  getTotalMessages,
  getUniqueModelsCount,
  getUsageByProvider,
  getSessionDays,
} from "@/lib/analytics";
import { fetchAnalyticsFromAPI } from "@/lib/analytics-db";
import type { AnalyticsData, AnalyticsEvent } from "@/types";
import Link from "next/link";
import {
  MessageSquare,
  MessageCircle,
  BarChart3,
  CalendarDays,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  Layers,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Hash,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchAnalyticsFromAPI().then((serverData) => {
      startTransition(() => { setMounted(true); setData(serverData); });
    });
  }, []);

  const refresh = useCallback(() => {
    fetchAnalyticsFromAPI().then((serverData) => setData(serverData));
  }, []);

  if (!mounted || !data) {
    return (
      <AppShell variant="user">
        <div className="h-full flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading analytics...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  const totalMessages = getTotalMessages(data);
  const uniqueModels = getUniqueModelsCount(data);
  const topModels = getTopModels(data);
  const dailyActivity = getDailyActivity(data, 14);
  const usageByProvider = getUsageByProvider(data);
  const sessionDays = getSessionDays(data);
  const maxDailyCount = Math.max(...dailyActivity.map((d) => d.count), 1);

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
  const fmtDate = (ts: number) => !ts ? "-" : new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <AppShell variant="user">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Usage Analytics</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </header>



        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><MessageSquare className="w-4 h-4 text-emerald-500" /></div>
                <span className="text-xs text-muted-foreground">Total Messages</span>
              </div>
              <div className="text-xl font-bold mb-0.5">{fmt(totalMessages)}</div>
              <div className="text-[10px] text-muted-foreground truncate">{fmt(data.totalUserMessages)} sent · {fmt(data.totalAssistantMessages)} received</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-blue-500" /></div>
                <span className="text-xs text-muted-foreground">Conversations</span>
              </div>
              <div className="text-xl font-bold mb-0.5">{fmt(data.totalConversations)}</div>
              <div className="text-[10px] text-muted-foreground">{data.totalConversationsDeleted} deleted</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center"><Layers className="w-4 h-4 text-violet-500" /></div>
                <span className="text-xs text-muted-foreground">Models Used</span>
              </div>
              <div className="text-xl font-bold mb-0.5">{fmt(uniqueModels)}</div>
              <div className="text-[10px] text-muted-foreground">Across {usageByProvider.length} providers</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><Activity className="w-4 h-4 text-amber-500" /></div>
                <span className="text-xs text-muted-foreground">Day Streak</span>
              </div>
              <div className="text-xl font-bold mb-0.5">{fmt(data.streakDays)}</div>
              <div className="text-[10px] text-muted-foreground">Active for {sessionDays} day{sessionDays > 1 ? "s" : ""}</div>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Activity */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Daily Activity</h2></div>
                  <span className="text-[10px] text-muted-foreground">Last 14 days</span>
                </div>
                <div className="flex items-end gap-1.5 h-32">
                  {dailyActivity.map((day) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full relative flex-1 flex flex-col justify-end">
                        <div
                          className={cn("w-full rounded-t-md transition-all duration-300 hover:opacity-80", day.isToday ? "bg-primary" : "bg-muted hover:bg-muted-foreground/20")}
                          style={{ height: `${Math.max((day.count / maxDailyCount) * 100, day.count > 0 ? 8 : 2)}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px]", day.isToday ? "text-primary font-medium" : "text-muted-foreground")}>{day.label}</span>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                        {day.count} message{day.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Models */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Top Models</h2></div>
                  <span className="text-[10px] text-muted-foreground">Most used</span>
                </div>
                {topModels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mb-2 opacity-30" /><p className="text-xs">No model usage yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topModels.map((model, i) => {
                      const barW = (model.count / topModels[0].count) * 100;
                      const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
                      return (
                        <div key={model.model} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground font-mono w-4">{i + 1}.</span>
                              <span className="truncate">{model.model}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{model.provider}</span>
                              <span className="text-muted-foreground font-medium w-10 text-right">{model.count}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", colors[i % colors.length])} style={{ width: `${barW}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Breakdown */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Provider Breakdown</h2></div>
                {usageByProvider.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">No provider data yet</div>
                ) : (
                  <div className="space-y-2.5">
                    {usageByProvider.map((p) => {
                      const barW = (p.count / usageByProvider[0].count) * 100;
                      const colors: Record<string, string> = { OpenAI: "bg-emerald-500", Anthropic: "bg-amber-500", Google: "bg-blue-500", DeepSeek: "bg-cyan-500", Meta: "bg-sky-500", Mistral: "bg-violet-500", Microsoft: "bg-teal-500" };
                      return (
                        <div key={p.provider} className="flex items-center gap-3">
                          <span className="text-xs w-20 shrink-0">{p.provider}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", colors[p.provider] || "bg-zinc-500")} style={{ width: `${barW}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right font-mono">{p.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4"><Hash className="w-4 h-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Summary</h2></div>
                <div className="grid grid-cols-2 gap-3">
                  <SummaryItem icon={<MessageSquare className="w-3.5 h-3.5" />} label="Avg Response Length" value={data.averageResponseLength > 0 ? `${fmt(data.averageResponseLength)} chars` : "-"} />
                  <SummaryItem icon={<Clock className="w-3.5 h-3.5" />} label="Peak Hour" value={data.peakHour ? `${data.peakHour}:00 - ${data.peakHour + 1}:00` : "-"} />
                  <SummaryItem icon={<CalendarDays className="w-3.5 h-3.5" />} label="First Activity" value={data.firstActive ? fmtDate(data.firstActive) : "-"} />
                  <SummaryItem icon={<Activity className="w-3.5 h-3.5" />} label="Last Activity" value={data.lastActive ? fmtDate(data.lastActive) : "-"} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          {data.events.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Recent Activity</h2></div>
                  <span className="text-[10px] text-muted-foreground">Last {Math.min(data.events.length, 50)} of {data.events.length}</span>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {data.events.slice(-50).reverse().map((event, i) => <ActivityRow key={i} event={event} />)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty */}
          {totalMessages === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="w-12 h-12 mb-4 text-muted-foreground/30" />
              <h3 className="text-sm font-medium text-muted-foreground mb-1">No Data Yet</h3>
              <p className="text-xs text-muted-foreground mb-4">Start chatting to see your usage analytics</p>
              <Link href="/dashboard">
                <Button variant="outline"><MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Go to Chat</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function ActivityRow({ event }: { event: AnalyticsEvent }) {
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const iconMap: Record<string, React.ReactNode> = {
    message_sent: <MessageSquare className="w-3 h-3 text-emerald-500" />,
    message_received: <MessageCircle className="w-3 h-3 text-blue-500" />,
    conversation_created: <MessageCircle className="w-3 h-3 text-violet-500" />,
    conversation_deleted: <Trash2 className="w-3 h-3 text-destructive" />,
    model_switched: <RefreshCw className="w-3 h-3 text-amber-500" />,
    image_generated: <Zap className="w-3 h-3 text-purple-500" />,
  };
  const labelMap: Record<string, string> = {
    message_sent: `Sent message${event.model ? ` using ${event.model}` : ""}`,
    message_received: `Received response (${event.messageLength || 0} chars)`,
    conversation_created: "New conversation started",
    conversation_deleted: "Conversation deleted",
    model_switched: `Switched to ${event.model || "unknown"}`,
    image_generated: "Image generated",
  };
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
      <span className="shrink-0">{iconMap[event.type] || <Activity className="w-3 h-3 text-muted-foreground" />}</span>
      <span className="text-xs flex-1 truncate">{labelMap[event.type] || event.type}</span>
      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{time}</span>
    </div>
  );
}
