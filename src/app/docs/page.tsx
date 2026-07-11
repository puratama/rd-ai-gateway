import { Sparkles, Zap, Grid3X3, BookOpen, Globe, Shield, Key, Code, Server, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DocsOverview() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
          <Sparkles className="w-3 h-3" />
          AI Gateway v0.1
        </div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-3">
          Welcome to AI Gateway
        </h1>
        <p className="text-zinc-400 leading-relaxed text-base">
          A unified AI platform with two access modes: a <strong className="text-emerald-400">Chat UI</strong> for
          end users and an <strong className="text-rose-400">OpenAI-compatible API</strong> for developers.
          Powered by <strong className="text-emerald-400">Puter.js</strong> &mdash; 500+ AI models through one gateway.
        </p>
      </div>

      {/* Two Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3">
            <Globe className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-200 mb-1">👤 End User &mdash; Chat UI</h2>
          <p className="text-xs text-zinc-500 mb-3">
            Buka browser, pilih model, dan langsung chat. Tanpa API key, tanpa setup.
            Cocok untuk chatting pribadi, eksplorasi model, dan demo.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            No API key needed
          </div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center mb-3">
            <Code className="w-5 h-5 text-rose-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-200 mb-1">🔧 Developer &mdash; API Gateway</h2>
          <p className="text-xs text-zinc-500 mb-3">
            Integrasikan AI ke aplikasi Anda via OpenAI-compatible REST API.
            Dapatkan API key, track usage, dan scale sesuai kebutuhan.
          </p>
          <Link
            href="/keys"
            className="inline-flex items-center gap-1 text-[10px] text-rose-400 hover:underline"
          >
            <Key className="w-3 h-3" />
            Get your API key &rarr;
          </Link>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5 mb-10">
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Architecture</h2>
        <pre className="text-[10px] text-zinc-500 font-mono leading-relaxed">{`┌─────────────────────────────────────────────┐
│              AI GATEWAY SYSTEM               │
├─────────────────────────────────────────────┤
│                                             │
│  👤 END USER         🔧 DEVELOPER           │
│  Browser Chat UI     OpenAI SDK / cURL      │
│       │                     │               │
│       ▼                     ▼               │
│  ┌──────────┐      ┌─────────────────┐      │
│  │ /api/chat│      │ /api/v1/chat/   │      │
│  │(internal)│      │  completions     │      │
│  └────┬─────┘      └────────┬────────┘      │
│       │                     │               │
│       └──────────┬──────────┘               │
│                  ▼                          │
│       ┌──────────────────┐                  │
│       │  BACKEND PROXY   │                  │
│       │  (Next.js API)   │                  │
│       │  - Validasi key  │                  │
│       │  - Track usage   │                  │
│       │  - Forward req   │                  │
│       └────────┬─────────┘                  │
│                │                            │
│                ▼                            │
│       ┌──────────────────┐                  │
│       │   PUTER API      │                  │
│       │  500+ AI Models  │                  │
│       └──────────────────┘                  │
│                                             │
│  🔒 PUTER_AUTH_TOKEN hanya di backend       │
│  🔑 API Key (xpgw_) untuk developer access  │
│  📊 Semua request tercatat untuk analytics  │
└─────────────────────────────────────────────┘`}</pre>
      </div>

      {/* Quick Start Card */}
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 mb-10">
        <h2 className="text-lg font-semibold text-zinc-200 mb-2">
          🚀 Get Started
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          Pilih jalur yang sesuai dengan kebutuhan Anda:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/"
            className="flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-sm font-medium text-zinc-200">Chat UI</span>
                <p className="text-[10px] text-zinc-500">Start chatting immediately</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </Link>
          <Link
            href="/docs/quickstart"
            className="flex items-center justify-between px-4 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <Code className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-sm font-medium text-zinc-200">API Gateway</span>
                <p className="text-[10px] text-zinc-500">Integrate with OpenAI SDK</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-400" />
          </Link>
        </div>
      </div>

      {/* Key Features */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-5">Key Features</h2>
      <div className="space-y-3 mb-10">
        {[
          {
            icon: Grid3X3,
            title: "500+ AI Models",
            desc: "From GPT-4 and Claude to Gemini and DeepSeek. Accessible through Chat UI and API.",
          },
          {
            icon: Zap,
            title: "Real-time Streaming",
            desc: "Responses stream word-by-word via SSE. Works both in Chat UI and API (stream: true).",
          },
          {
            icon: Key,
            title: "API Key Management",
            desc: "Generate, revoke, and monitor API keys. Each key has its own usage tracking.",
          },
          {
            icon: Server,
            title: "OpenAI-compatible API",
            desc: "Use any OpenAI SDK — just change baseURL and apiKey. Full chat completions support.",
          },
          {
            icon: BookOpen,
            title: "Multiple Conversations",
            desc: "Keep multiple chats organized with automatic saving to browser localStorage.",
          },
          {
            icon: Sparkles,
            title: "Usage Analytics",
            desc: "Track total messages, models used, daily activity, provider breakdown, and more.",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-zinc-800/20 border border-zinc-800 rounded-xl p-4"
          >
            <feature.icon className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">
                {feature.title}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Technology Stack */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-5">Technology Stack</h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { name: "Next.js 16", desc: "React Framework + API Routes" },
            { name: "TypeScript", desc: "Type Safety" },
            { name: "Tailwind CSS v4", desc: "Styling" },
            { name: "Puter API", desc: "AI Model Gateway" },
          ].map((tech, i) => (
            <div key={i} className="p-3">
              <div className="text-sm font-semibold text-zinc-200">
                {tech.name}
              </div>
              <div className="text-xs text-zinc-500">{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
