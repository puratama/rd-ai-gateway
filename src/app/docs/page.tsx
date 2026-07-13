import { Sparkles, Zap, Grid3X3, BookOpen, Globe, Shield, Key, Code, Server, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DocsOverview() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
          <Sparkles className="w-3 h-3" />
          AI Gateway v0.1
        </div>
        <h1 className="text-3xl font-bold mb-3">Welcome to AI Gateway</h1>
        <p className="text-muted-foreground leading-relaxed text-base">
          A unified AI platform with two access modes: a <strong className="text-foreground">Chat UI</strong> for
          end users and an <strong className="text-foreground">OpenAI-compatible API</strong> for developers.
        </p>
      </div>

      {/* Two Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="border border-border rounded-xl p-5 bg-card/50">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3">
            <Globe className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className="text-base font-semibold mb-1">Chat UI</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Pick a model and start chatting. No API key, no setup required. Perfect for personal use, model exploration, and demos.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            No API key needed
          </div>
        </div>
        <div className="border border-border rounded-xl p-5 bg-card/50">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center mb-3">
            <Code className="w-5 h-5 text-rose-500" />
          </div>
          <h2 className="text-base font-semibold mb-1">API Gateway</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Integrate AI into your app via OpenAI-compatible REST API. Get an API key, track usage, and scale as needed.
          </p>
          <Link href="/keys" className="inline-flex items-center gap-1 text-[10px] text-rose-500 hover:underline">
            <Key className="w-3 h-3" />
            Get your API key
          </Link>
        </div>
      </div>

      {/* Architecture */}
      <div className="border border-border rounded-xl p-5 mb-10 bg-card/30">
        <h2 className="text-sm font-semibold mb-3">Architecture</h2>
        <pre className="text-[10px] text-muted-foreground font-mono leading-relaxed">{`┌─────────────────────────────────────────────┐
│              AI GATEWAY SYSTEM               │
├─────────────────────────────────────────────┤
│  Chat UI         │  OpenAI SDK / cURL       │
│       │               │                     │
│       ▼               ▼                     │
│  /api/chat      /api/v1/chat/completions    │
│       │               │                     │
│       └───────┬───────┘                     │
│               ▼                             │
│       LLM Router (multi-backend)            │
│       - Quota check & deduction             │
│       - Provider selection                  │
│       - Streaming relay                     │
│               │                             │
│       ┌───────┴───────┐                     │
│       ▼               ▼                     │
│  Puter API     DB Aggregators               │
│  (500+ models) (self-hosted)                │
└─────────────────────────────────────────────┘`}</pre>
      </div>

      {/* Quick Start */}
      <div className="border border-border rounded-xl p-6 mb-10 bg-card/50">
        <h2 className="text-lg font-semibold mb-2">Get Started</h2>
        <p className="text-sm text-muted-foreground mb-4">Choose your path:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/dashboard" className="flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl transition-colors">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="text-sm font-medium">Chat UI</span>
                <p className="text-[10px] text-muted-foreground">Start chatting immediately</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-500" />
          </Link>
          <Link href="/docs/quickstart" className="flex items-center justify-between px-4 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition-colors">
            <div className="flex items-center gap-3">
              <Code className="w-4 h-4 text-rose-500" />
              <div>
                <span className="text-sm font-medium">API Gateway</span>
                <p className="text-[10px] text-muted-foreground">Integrate with OpenAI SDK</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-500" />
          </Link>
        </div>
      </div>

      {/* Key Features */}
      <h2 className="text-xl font-semibold mb-5">Key Features</h2>
      <div className="space-y-3 mb-10">
        {[
          { icon: Grid3X3, title: "500+ AI Models", desc: "From GPT-4 and Claude to Gemini and DeepSeek." },
          { icon: Zap, title: "Real-time Streaming", desc: "Responses stream word-by-word via SSE." },
          { icon: Key, title: "API Key Management", desc: "Generate, revoke, and monitor API keys." },
          { icon: Server, title: "OpenAI-compatible API", desc: "Use any OpenAI SDK — just change baseURL." },
          { icon: BookOpen, title: "Multiple Conversations", desc: "Organize chats with automatic saving." },
          { icon: Sparkles, title: "Usage Analytics", desc: "Track messages, models, daily activity." },
        ].map((f, i) => (
          <div key={i} className="flex items-start gap-3 border border-border rounded-xl p-4 bg-card/20">
            <f.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tech Stack */}
      <h2 className="text-xl font-semibold mb-5">Technology Stack</h2>
      <div className="border border-border rounded-xl p-6 bg-card/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { name: "Next.js 16", desc: "React Framework" },
            { name: "TypeScript", desc: "Type Safety" },
            { name: "Tailwind CSS v4", desc: "Styling" },
            { name: "PostgreSQL", desc: "Database" },
          ].map((t, i) => (
            <div key={i} className="p-3">
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
