import {
  Sparkles,
  MessageSquare,
  PanelLeftClose,
  Moon,
  Copy,
  Zap,
  Square,
  BookMarked,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Real-time Streaming",
    desc: "AI responses stream word-by-word as they're generated. You see the response as it happens, not after it's complete.",
    tip: { icon: Square, text: "Click the stop button to halt generation mid-response", color: "text-destructive" },
  },
  {
    icon: MessageSquare,
    title: "Multiple Conversations",
    desc: "Manage multiple chat threads simultaneously. Each conversation maintains its own message history and selected model.",
    bullets: [
      "Auto-saved to browser localStorage",
      "Each conversation tracks its own model selection",
      "Conversation titles auto-generate from your first message",
      "Delete old conversations with one click",
    ],
  },
  {
    icon: PanelLeftClose,
    title: "Collapsible Sidebar",
    desc: "The sidebar provides quick access to all your conversations. Collapse it when you need more screen space.",
    tip: { text: "Toggle the sidebar using the icon in the top-left corner" },
  },
  {
    icon: Search,
    title: "Model Selector",
    desc: "Browse, search, and select from 500+ AI models. The dropdown groups models by provider and includes context window information.",
    bullets: [
      "Search by model name or provider",
      "Models grouped by provider",
      "Context window size displayed for each model",
      "One-click refresh to fetch latest models",
    ],
  },
  {
    icon: Copy,
    title: "Copy & Markdown Support",
    desc: "AI responses support full markdown rendering including code blocks with syntax highlighting, tables, lists, and links.",
    bullets: [
      "Full GitHub-flavored markdown (GFM)",
      "Code blocks with language detection",
      "Tables with proper styling",
      "One-click copy button on hover",
    ],
  },
  {
    icon: Moon,
    title: "Dark Mode",
    desc: "Full dark mode support with a clean, modern aesthetic. Toggle between dark and light themes. Your preference is saved.",
    tip: { text: "Dark mode is the default — optimized for prolonged use" },
  },
  {
    icon: BookMarked,
    title: "Auto-save & Persistence",
    desc: "All conversations are automatically saved to your browser's localStorage. Close the tab — your chats will be there when you return.",
    tip: { text: "Data stays in your browser — nothing is sent to any server except for AI processing" },
  },
];

const roadmap = [
  { feature: "Image Generation", status: "In Development" },
  { feature: "Multi-backend Routing", status: "Done" },
  { feature: "User Packages & Plans", status: "Done" },
  { feature: "Admin Dashboard", status: "Done" },
  { feature: "System Prompt Customization", status: "Planned" },
  { feature: "Response Comparison Mode", status: "Planned" },
];

export default function FeaturesPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
        <Sparkles className="w-3 h-3" />
        Features
      </div>
      <h1 className="text-3xl font-bold mb-3">Features</h1>
      <p className="text-muted-foreground leading-relaxed mb-10">
        A comprehensive overview of everything AI Gateway offers — from
        real-time streaming to conversation management.
      </p>

      <div className="space-y-4 mb-10">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{f.desc}</p>
                    {f.bullets && (
                      <ul className="space-y-1.5">
                        {f.bullets.map((b, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-1 h-1 rounded-full bg-primary" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {f.tip && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 border border-border">
                        {f.tip.icon && <f.tip.icon className={f.tip.color ? `w-3.5 h-3.5 ${f.tip.color}` : "w-3.5 h-3.5"} />}
                        {f.tip.text}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h2 className="text-xl font-semibold mb-4">Roadmap</h2>
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roadmap.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">{item.feature}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "Done" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
