import {
  Sparkles,
  MessageSquare,
  Sidebar,
  Moon,
  Copy,
  Zap,
  Square,
  BookMarked,
  Search,
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
        <Sparkles className="w-3 h-3" />
        Features
      </div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-3">Features</h1>
      <p className="text-zinc-400 leading-relaxed mb-10">
        A comprehensive overview of everything AI Gateway offers. From
        real-time streaming to conversation management, here&apos;s what you can
        do.
      </p>

      {/* Feature Cards */}
      <div className="space-y-4 mb-10">
        {/* Streaming */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-200 mb-1">
                Real-time Streaming
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                AI responses stream word-by-word as they&apos;re generated. You
                see the response as it happens, not after it&apos;s complete.
                This provides a much faster and more interactive experience.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800">
                <Square className="w-3.5 h-3.5 text-red-400" />
                Click the stop button to halt generation mid-response
              </div>
            </div>
          </div>
        </div>

        {/* Multiple Conversations */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-200 mb-1">
                Multiple Conversations
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                Manage multiple chat threads simultaneously. Each conversation
                maintains its own message history and selected model. Switch
                between them instantly from the sidebar.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Auto-saved to browser localStorage",
                  "Each conversation tracks its own model selection",
                  "Conversation titles auto-generate from your first message",
                  "Delete old conversations with one click",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-zinc-500"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sidebar className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-200 mb-1">
                Collapsible Sidebar
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                The sidebar provides quick access to all your conversations.
                Collapse it when you need more screen space for chatting. The
                sidebar automatically shows/hides based on your preference.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800">
                Toggle the sidebar using the icon in the top-left corner
              </div>
            </div>
          </div>
        </div>

        {/* Model Selector */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-200 mb-1">
                Model Selector
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                Browse, search, and select from 500+ AI models. The dropdown
                groups models by provider and includes context window
                information. You can even refresh the model list to get the
                latest additions.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Search by model name or provider",
                  "Models grouped by provider (OpenAI, Anthropic, etc.)",
                  "Context window size displayed for each model",
                  "One-click refresh to fetch latest models",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-zinc-500"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Copy & Markdown */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Copy className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-200 mb-1">
                Copy & Markdown Support
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                AI responses support full markdown rendering including code
                blocks with syntax highlighting, tables, lists, blockquotes, and
                links. Hover over any response to copy its content.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Full GitHub-flavored markdown (GFM)",
                  "Code blocks with language detection",
                  "Tables with proper styling",
                  "One-click copy button on hover",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-zinc-500"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Dark Mode */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Moon className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-200 mb-1">
                Dark Mode
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                Full dark mode support with a clean, modern aesthetic. Toggle
                between dark and light themes using the sun/moon icon in the
                top-right corner. Your preference is saved for future visits.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800">
                Dark mode is the default &mdash; optimized for prolonged use
              </div>
            </div>
          </div>
        </div>

        {/* Auto-save */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookMarked className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-200 mb-1">
                Auto-save & Persistence
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                All conversations are automatically saved to your browser&apos;s
                localStorage. Close the tab, restart your computer &mdash; your
                chats will be there when you return. No server-side storage
                required.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800">
                Data stays in your browser &mdash; nothing is sent to any server
                (except Puter for AI processing)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">
        Coming Soon
      </h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { feature: "Image Generation", status: "In Development" },
            { feature: "Usage Analytics", status: "Planned" },
            { feature: "Auto-fallback Models", status: "Planned" },
            { feature: "Public API Endpoint", status: "Planned" },
            { feature: "System Prompt Customization", status: "Planned" },
            { feature: "Response Comparison Mode", status: "Planned" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">{item.feature}</span>
              <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
