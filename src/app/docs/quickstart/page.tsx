import { Terminal, MousePointer, MessageSquare, Copy, CheckCircle, Key, Code, Server, Cpu } from "lucide-react";
import Link from "next/link";

export default function QuickStart() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
        <Terminal className="w-3 h-3" />
        Guide
      </div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-3">Quick Start</h1>
      <p className="text-zinc-400 leading-relaxed mb-8">
        AI Gateway punya <strong className="text-zinc-200">dua cara penggunaan</strong>:</p>

      {/* Two Tracks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">👤 End User &mdash; Chat UI</h3>
          <p className="text-xs text-zinc-500 mb-3">
            Buka browser dan langsung chat dengan 500+ AI models. Tanpa API key, tanpa setup.
            Ideal untuk: <strong className="text-zinc-400">personal use, eksplorasi, demo</strong>.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            No API key needed
          </div>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center mb-3">
            <Code className="w-5 h-5 text-rose-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">🔧 Developer &mdash; API Gateway</h3>
          <p className="text-xs text-zinc-500 mb-3">
            Integrasikan AI ke aplikasi Anda via OpenAI-compatible API. Dapatkan API key dari dashboard.
            Ideal untuk: <strong className="text-zinc-400">aplikasi sendiri, bot, automation</strong>.
          </p>
          <Link href="/keys" className="inline-flex items-center gap-1 text-[10px] text-rose-400 hover:underline">
            <Key className="w-3 h-3" />
            Get API Key
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="relative mb-10">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-black text-xs text-zinc-600">END USER FLOW</span>
        </div>
      </div>

      {/* ====== END USER FLOW ====== */}
      <h2 className="text-lg font-semibold text-zinc-200 mb-5 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        Using the Chat Interface
      </h2>

      {/* Step 1 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">1</span>
          <h3 className="text-sm font-semibold text-zinc-200">Open the Chat</h3>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 ml-10">
          <p className="text-sm text-zinc-400">
            Navigate to the homepage. You&apos;ll see a clean chat interface with a model selector in the top bar and a text input at the bottom.
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">2</span>
          <h3 className="text-sm font-semibold text-zinc-200">Select a Model</h3>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 ml-10">
          <p className="text-sm text-zinc-400">
            Click the model selector in the top navbar. Browse or search through 500+ models organized by provider.
          </p>
        </div>
      </div>

      {/* Step 3 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">3</span>
          <h3 className="text-sm font-semibold text-zinc-200">Send Your First Message</h3>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 ml-10">
          <p className="text-sm text-zinc-400">
            Type your message and press <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-200 text-xs">Enter</kbd>.
            The AI response will stream in real-time through our backend proxy.
          </p>
          <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <p className="text-xs text-emerald-400/80">
              <strong>Architecture:</strong> Chat UI &rarr; Backend (/api/chat) &rarr; Puter API &rarr; AI Model
            </p>
            <p className="text-[10px] text-emerald-400/60 mt-1">
              Frontend tidak langsung panggil Puter API &mdash; semua request melewati backend kita.
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative mb-10 mt-10">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-black text-xs text-zinc-600">DEVELOPER FLOW</span>
        </div>
      </div>

      {/* ====== DEVELOPER FLOW ====== */}
      <h2 className="text-lg font-semibold text-zinc-200 mb-5 flex items-center gap-2">
        <Code className="w-4 h-4 text-rose-400" />
        Using the API Gateway
      </h2>

      {/* Step 1 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">1</span>
          <h3 className="text-sm font-semibold text-zinc-200">Get Your API Key</h3>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 ml-10">
          <p className="text-sm text-zinc-400 mb-3">
            Buka halaman <Link href="/keys" className="text-rose-400 hover:underline">/keys</Link> dan klik &ldquo;New Key&rdquo;.
            Beri nama key dan copy key yang muncul.
          </p>
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Simpan key dengan aman! Setelah modal ditutup, key tidak bisa dilihat lagi.
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">2</span>
          <h3 className="text-sm font-semibold text-zinc-200">Install OpenAI SDK</h3>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 ml-10">
          <p className="text-sm text-zinc-400 mb-3">
            API Gateway fully compatible dengan OpenAI SDK. Install library favorit Anda:
          </p>
          <div className="bg-black/30 rounded-lg p-3">
            <pre className="text-xs text-zinc-300 font-mono">npm install openai</pre>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">3</span>
          <h3 className="text-sm font-semibold text-zinc-200">Make Your First API Call</h3>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 ml-10">
          <p className="text-sm text-zinc-400 mb-3">
            Ganti <code className="text-zinc-300">baseURL</code> dan <code className="text-zinc-300">apiKey</code>, sisanya sama seperti OpenAI API:
          </p>
          <div className="bg-black/30 rounded-lg overflow-hidden">
            <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto">{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/api/v1",
  apiKey: "xpgw_your-api-key-here",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);`}</pre>
          </div>
        </div>
      </div>

      {/* Step 4 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">4</span>
          <h3 className="text-sm font-semibold text-zinc-200">Monitor Usage</h3>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 ml-10">
          <p className="text-sm text-zinc-400">
            Cek usage analytics di halaman{" "}
            <Link href="/analytics" className="text-emerald-400 hover:underline">/analytics</Link>{" "}
            untuk melihat jumlah request, token yang digunakan, model breakdown, dan daily activity.
            Untuk data per API key, gunakan endpoint{" "}
            <code className="text-zinc-300">GET /api/v1/usage</code>.
          </p>
        </div>
      </div>

      {/* Architecture Diagram */}
      <h2 className="text-lg font-semibold text-zinc-200 mb-4 mt-10">Architecture Overview</h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5 mb-10">
        <pre className="text-[10px] text-zinc-500 font-mono leading-relaxed">{`┌─────────────────────────────────────────────────────────┐
│                   AI GATEWAY ARCHITECTURE                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👤 END USER                    🔧 DEVELOPER            │
│  Browser Chat UI                 Your App / SDK         │
│        │                              │                 │
│        ▼                              ▼                 │
│  ┌──────────┐               ┌──────────────────┐        │
│  │ /api/chat │               │ /api/v1/chat/    │        │
│  │ (internal)│               │ completions      │        │
│  └─────┬────┘               └────────┬─────────┘        │
│        │                            │                   │
│        └──────────┬─────────────────┘                   │
│                   ▼                                     │
│        ┌──────────────────┐                             │
│        │  BACKEND PROXY   │                             │
│        │  (Next.js API)   │                             │
│        │  - Validasi key  │                             │
│        │  - Track usage   │                             │
│        │  - Forward req   │                             │
│        └────────┬─────────┘                             │
│                 │                                       │
│                 ▼                                       │
│        ┌──────────────────┐                             │
│        │   PUTER API      │                             │
│        │  500+ AI Models  │                             │
│        └──────────────────┘                             │
│                                                         │
│  🔒 PUTER_AUTH_TOKEN hanya di backend, tidak bocor     │
│  🔑 API Key (xpgw_*) untuk developer access             │
│  📊 Semua request tercatat untuk analytics              │
└─────────────────────────────────────────────────────────┘`}</pre>
      </div>

      {/* Tips */}
      <div className="p-5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Copy className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Pro Tips</h3>
        </div>
        <ul className="space-y-2 text-xs text-zinc-400">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            Gunakan <Link href="/pricing" className="text-emerald-400 hover:underline">/pricing</Link> untuk cek harga model sebelum dipakai
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            API Key bisa di-revoke kapan saja dari halaman <Link href="/keys" className="text-emerald-400 hover:underline">/keys</Link>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            Kalau ada error, cek endpoint <Link href="/docs/api" className="text-emerald-400 hover:underline">API Reference</Link> untuk detail error codes
          </li>
        </ul>
      </div>
    </div>
  );
}
