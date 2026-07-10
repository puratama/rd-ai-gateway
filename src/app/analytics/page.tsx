"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import {
  loadAnalytics,
  getTopModels,
  getDailyActivity,
  getTotalMessages,
  getUniqueModelsCount,
  getUsageByProvider,
  resetAnalytics,
  getSessionDays,
} from "@/lib/analytics";
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
  ArrowLeft,
  Hash,
} from "lucide-react";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
      setData(loadAnalytics());
    });
  }, []);

  const refresh = useCallback(() => {
    setData(loadAnalytics());
  }, []);

  const handleReset = useCallback(() => {
    const fresh = resetAnalytics();
    setData(fresh);
    setShowResetConfirm(false);
  }, []);

  if (!mounted || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="flex items-center gap-3 text-zinc-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading analytics...</span>
        </div>
      </div>
    );
  }

  const totalMessages = getTotalMessages(data);
  const uniqueModels = getUniqueModelsCount(data);
  const topModels = getTopModels(data);
  const dailyActivity = getDailyActivity(data, 14);
  const usageByProvider = getUsageByProvider(data);
  const sessionDays = getSessionDays(data);
  const maxDailyCount = Math.max(...dailyActivity.map((d) => d.count), 1);

  // Format numbers
  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  // Format date
  const formatDate = (ts: number) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">Usage Analytics</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Reset Analytics?</h3>
                <p className="text-xs text-zinc-400 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<MessageSquare className="w-4 h-4" />}
            label="Total Messages"
            value={formatNumber(totalMessages)}
            sub={`${formatNumber(data.totalUserMessages)} sent · ${formatNumber(data.totalAssistantMessages)} received`}
            gradient="from-emerald-400 to-emerald-600"
          />
          <StatCard
            icon={<MessageCircle className="w-4 h-4" />}
            label="Conversations"
            value={formatNumber(data.totalConversations)}
            sub={`${data.totalConversationsDeleted} deleted`}
            gradient="from-blue-400 to-blue-600"
          />
          <StatCard
            icon={<Layers className="w-4 h-4" />}
            label="Models Used"
            value={formatNumber(uniqueModels)}
            sub={`Across ${usageByProvider.length} providers`}
            gradient="from-violet-400 to-violet-600"
          />
          <StatCard
            icon={<Activity className="w-4 h-4" />}
            label="Day Streak"
            value={formatNumber(data.streakDays)}
            sub={`Active for ${sessionDays} day${sessionDays > 1 ? "s" : ""}`}
            gradient="from-amber-400 to-amber-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Activity Chart */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Daily Activity</h2>
              </div>
              <span className="text-[10px] text-zinc-500">Last 14 days</span>
            </div>
            <div className="flex items-end gap-1.5 h-32 md:h-40">
              {dailyActivity.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  {/* Bar */}
                  <div className="w-full relative flex-1 flex flex-col justify-end">
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 hover:opacity-80 ${
                        day.isToday
                          ? "bg-gradient-to-t from-emerald-500 to-emerald-400"
                          : "bg-zinc-700/50 hover:bg-zinc-600/50"
                      }`}
                      style={{ height: `${Math.max((day.count / maxDailyCount) * 100, day.count > 0 ? 8 : 2)}%` }}
                    />
                  </div>
                  {/* Label */}
                  <span className={`text-[10px] ${day.isToday ? "text-emerald-400 font-medium" : "text-zinc-500"}`}>
                    {day.label}
                  </span>
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {day.count} message{day.count !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Models */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Top Models</h2>
              </div>
              <span className="text-[10px] text-zinc-500">Most used</span>
            </div>

            {topModels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
                <BarChart3 className="w-8 h-8 mb-2" />
                <p className="text-xs">No model usage yet</p>
                <p className="text-[10px] mt-1">Start chatting to see stats</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topModels.map((model, index) => {
                  const maxCount = topModels[0].count;
                  const barWidth = (model.count / maxCount) * 100;
                  const colors = [
                    "from-emerald-500 to-emerald-400",
                    "from-blue-500 to-blue-400",
                    "from-violet-500 to-violet-400",
                    "from-amber-500 to-amber-400",
                    "from-rose-500 to-rose-400",
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div key={model.model} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-zinc-500 font-mono w-4">{index + 1}.</span>
                          <span className="text-zinc-300 truncate">{model.model}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                            {model.provider}
                          </span>
                          <span className="text-zinc-400 font-medium w-10 text-right">
                            {model.count}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider Breakdown */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Provider Breakdown</h2>
            </div>

            {usageByProvider.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
                <p className="text-xs">No provider data yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {usageByProvider.map((provider) => {
                  const maxCount = usageByProvider[0].count;
                  const barWidth = (provider.count / maxCount) * 100;
                  const providerColors: Record<string, string> = {
                    OpenAI: "from-emerald-500 to-emerald-400",
                    Anthropic: "from-amber-500 to-amber-400",
                    Google: "from-blue-500 to-blue-400",
                    DeepSeek: "from-cyan-500 to-cyan-400",
                    Meta: "from-sky-500 to-sky-400",
                    Mistral: "from-violet-500 to-violet-400",
                    Microsoft: "from-teal-500 to-teal-400",
                  };
                  const color = providerColors[provider.provider] || "from-zinc-500 to-zinc-400";

                  return (
                    <div key={provider.provider} className="flex items-center gap-3">
                      <div className="w-20 shrink-0">
                        <span className="text-xs text-zinc-300">{provider.provider}</span>
                      </div>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 w-10 text-right font-mono">
                        {provider.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Summary</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SummaryItem
                icon={<MessageSquare className="w-3.5 h-3.5" />}
                label="Avg Response Length"
                value={data.averageResponseLength > 0 ? `${formatNumber(data.averageResponseLength)} chars` : "-"}
                color="text-emerald-400"
              />
              <SummaryItem
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Peak Hour"
                value={data.peakHour ? `${data.peakHour}:00 - ${data.peakHour + 1}:00` : "-"}
                color="text-blue-400"
              />
              <SummaryItem
                icon={<CalendarDays className="w-3.5 h-3.5" />}
                label="First Activity"
                value={data.firstActive ? formatDate(data.firstActive) : "-"}
                color="text-violet-400"
              />
              <SummaryItem
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Last Activity"
                value={data.lastActive ? formatDate(data.lastActive) : "-"}
                color="text-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        {data.events.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Recent Activity</h2>
              </div>
              <span className="text-[10px] text-zinc-500">
                Last {Math.min(data.events.length, 50)} of {data.events.length} events
              </span>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {data.events.slice(-50).reverse().map((event, i) => (
                <ActivityRow key={i} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalMessages === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <BarChart3 className="w-12 h-12 mb-4 text-zinc-700" />
            <h3 className="text-sm font-medium text-zinc-400 mb-1">No Data Yet</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Start chatting to see your usage analytics
            </p>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Go to Chat
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  gradient: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <div className="text-xl md:text-2xl font-bold text-zinc-100 mb-0.5">{value}</div>
      <div className="text-[10px] text-zinc-500 truncate">{sub}</div>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-zinc-800/30 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={color}>{icon}</span>
        <span className="text-[10px] text-zinc-500">{label}</span>
      </div>
      <span className="text-xs text-zinc-300 font-medium">{value}</span>
    </div>
  );
}

function ActivityRow({ event }: { event: AnalyticsEvent }) {
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const getEventIcon = () => {
    switch (event.type) {
      case "message_sent":
        return <MessageSquare className="w-3 h-3 text-emerald-400" />;
      case "message_received":
        return <MessageCircle className="w-3 h-3 text-blue-400" />;
      case "conversation_created":
        return <MessageCircle className="w-3 h-3 text-violet-400" />;
      case "conversation_deleted":
        return <Trash2 className="w-3 h-3 text-red-400" />;
      case "model_switched":
        return <RefreshCw className="w-3 h-3 text-amber-400" />;
      case "image_generated":
        return <Zap className="w-3 h-3 text-purple-400" />;
      default:
        return <Activity className="w-3 h-3 text-zinc-400" />;
    }
  };

  const getEventLabel = () => {
    switch (event.type) {
      case "message_sent":
        return `Sent message${event.model ? ` using ${event.model}` : ""}`;
      case "message_received":
        return `Received response (${event.messageLength || 0} chars)`;
      case "conversation_created":
        return "New conversation started";
      case "conversation_deleted":
        return "Conversation deleted";
      case "model_switched":
        return `Switched to ${event.model || "unknown model"}`;
      case "image_generated":
        return "Image generated";
      default:
        return event.type;
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors">
      <div className="shrink-0">{getEventIcon()}</div>
      <span className="text-xs text-zinc-300 flex-1 truncate">{getEventLabel()}</span>
      <span className="text-[10px] text-zinc-500 shrink-0 font-mono">{time}</span>
    </div>
  );
}
