import { Terminal, MessageSquare, Copy, CheckCircle, Key, Code, Server } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuickStart() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
        <Terminal className="w-3 h-3" />
        Guide
      </div>
      <h1 className="text-3xl font-bold mb-3">Quick Start</h1>
      <p className="text-muted-foreground leading-relaxed mb-8">
        AI Gateway supports two primary access paths:
      </p>

      {/* Two Tracks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Card className="bg-card/50">
          <CardContent className="p-5">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold mb-1">👤 Chat UI</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Start chatting immediately with 500+ AI models. No API keys, no setup required. Free tier included.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Free tier ready
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-5">
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center mb-3">
              <Code className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="text-sm font-semibold mb-1">🔧 API Gateway</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Integrate AI into your applications via OpenAI-compatible API. Monitor quotas and purchase packages.
            </p>
            <Link href="/keys">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] p-0 text-rose-500 hover:text-rose-600">
                <Key className="w-3 h-3 mr-1" /> Get API Key &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Divider */}
      <div className="relative mb-10">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="px-3 bg-background text-xs text-muted-foreground">CHAT UI FLOW</span></div>
      </div>

      <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-emerald-500" />
        Using the Chat Interface
      </h2>

      {/* Steps */}
      <div className="space-y-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
            <h3 className="text-sm font-semibold">Open Dashboard</h3>
          </div>
          <Card className="ml-10 bg-muted/30"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Go to your user dashboard. You&apos;ll see a clean interface with a prompt input, sidebar, and model selector.</p>
          </CardContent></Card>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
            <h3 className="text-sm font-semibold">Select a Model</h3>
          </div>
          <Card className="ml-10 bg-muted/30"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Click the model selector dropdown in the top navbar. Search models filtered by provider name.</p>
          </CardContent></Card>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
            <h3 className="text-sm font-semibold">Send Message</h3>
          </div>
          <Card className="ml-10 bg-muted/30"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Type your message and press <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs">Enter</kbd>. The response streams back instantly.</p>
          </CardContent></Card>
        </div>
      </div>

      {/* Divider */}
      <div className="relative mb-10 mt-10">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="px-3 bg-background text-xs text-muted-foreground">DEVELOPER FLOW</span></div>
      </div>

      <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
        <Code className="w-4 h-4 text-rose-500" />
        Using the API Gateway
      </h2>

      <div className="space-y-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
            <h3 className="text-sm font-semibold">Generate API Key</h3>
          </div>
          <Card className="ml-10 bg-muted/30"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">Go to <Link href="/keys" className="text-primary hover:underline">/keys</Link> and click &ldquo;New Key&rdquo;. Save the key securely.</p>
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              Copy your key before closing the modal &mdash; it cannot be retrieved again!
            </div>
          </CardContent></Card>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
            <h3 className="text-sm font-semibold">Install OpenAI SDK</h3>
          </div>
          <Card className="ml-10 bg-muted/30"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">API Gateway is OpenAI SDK compatible. Install your preferred SDK:</p>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs">npm install openai</div>
          </CardContent></Card>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
            <h3 className="text-sm font-semibold">Run API Call</h3>
          </div>
          <Card className="ml-10 bg-muted/30"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">Change <code>baseURL</code> and <code>apiKey</code>, keep other codes identical:</p>
            <div className="bg-muted rounded-lg overflow-hidden font-mono">
              <pre className="p-3 text-[10px] overflow-x-auto">{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3035/api/v1",
  apiKey: "xpgw_your-api-key-here",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});`}</pre>
            </div>
          </CardContent></Card>
        </div>
      </div>

      {/* Pro Tips */}
      <Card className="p-5 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <Copy className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Pro Tips</h3>
        </div>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />Use <Link href="/pricing" className="text-primary hover:underline">/pricing</Link> to inspect model pricing before dispatching calls.</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />Revoke inactive keys instantly from <Link href="/keys" className="text-primary hover:underline">/keys</Link> to minimize security liabilities.</li>
        </ul>
      </Card>
    </div>
  );
}
