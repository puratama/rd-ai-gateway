import { Code, Terminal, Server, Shield, BarChart3, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function APIPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
        <Code className="w-3 h-3" />
        API Reference
      </div>
      <h1 className="text-3xl font-bold mb-3">API Reference</h1>
      <p className="text-muted-foreground leading-relaxed mb-2">
        AI Gateway provides a REST API that is <strong className="text-foreground">fully compatible with the OpenAI SDK</strong>.
        Just change <code className="text-primary">baseURL</code> and <code className="text-primary">apiKey</code>.
      </p>
      <p className="text-muted-foreground text-sm mb-10">
        Base URL: <code className="bg-muted px-2 py-0.5 rounded text-xs">http://localhost:3035/api/v1</code>
      </p>

      {/* Architecture */}
      <h2 className="text-xl font-semibold mb-4">How It Works</h2>
      <Card className="mb-10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-center p-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-2"><Terminal className="w-5 h-5 text-blue-500" /></div>
              <div className="font-medium">Your App</div>
              <div className="text-muted-foreground">OpenAI SDK / cURL</div>
            </div>
            <div className="text-muted-foreground text-2xl">&rarr;</div>
            <div className="text-center p-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2"><Server className="w-5 h-5 text-primary" /></div>
              <div className="font-medium">AI Gateway API</div>
              <div className="text-muted-foreground">Quota check + Routing</div>
            </div>
            <div className="text-muted-foreground text-2xl">&rarr;</div>
            <div className="text-center p-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mx-auto mb-2"><ExternalLink className="w-5 h-5 text-violet-500" /></div>
              <div className="font-medium">LLM Providers</div>
              <div className="text-muted-foreground">500+ AI Models</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auth */}
      <h2 className="text-xl font-semibold mb-4">Authentication</h2>
      <p className="text-sm text-muted-foreground mb-4">
        All endpoints (except model listing) require an API Key via header{" "}
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization: Bearer &lt;your-api-key&gt;</code>.
        Get a key from <Link href="/keys" className="text-primary hover:underline">/keys</Link>.
      </p>

      <Card className="mb-10">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold mb-1">Security Model</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />API Key format: <code>xpgw_&lt;random&gt;</code></li>
                <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />Keys stored in PostgreSQL with per-user isolation</li>
                <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />Each request tracked for usage analytics</li>
                <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />Keys can be revoked anytime from dashboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <h2 className="text-xl font-semibold mb-4">Endpoints</h2>
      <div className="space-y-6 mb-10">

        {/* POST /chat/completions */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-mono rounded">POST</span>
              <code className="text-sm font-mono">/api/v1/chat/completions</code>
            </div>
            <p className="text-xs text-muted-foreground">Chat completions endpoint. Fully compatible with OpenAI Chat Completion API. Supports streaming (SSE) and non-streaming.</p>
          </div>
          <CardContent className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Headers</h4>
              <div className="bg-muted rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center gap-3"><span className="text-muted-foreground w-32 shrink-0">Authorization</span><span className="font-mono">Bearer &lt;api_key&gt;</span><span className="text-muted-foreground">Required</span></div>
                <div className="flex items-center gap-3"><span className="text-muted-foreground w-32 shrink-0">Content-Type</span><span className="font-mono">application/json</span><span className="text-muted-foreground">Required</span></div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Request Body</h4>
              <div className="bg-muted rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] font-mono overflow-x-auto leading-relaxed">{`{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 2048
}`}</pre>
              </div>
              <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                <p><code>model</code> (string, required) &mdash; Model ID from models list</p>
                <p><code>messages</code> (array, required) &mdash; Array of message objects</p>
                <p><code>stream</code> (boolean, optional) &mdash; Enable SSE streaming, default false</p>
                <p><code>temperature</code> (number, optional) &mdash; Sampling temperature (0-2)</p>
                <p><code>max_tokens</code> (number, optional) &mdash; Max tokens in response</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Example &mdash; cURL</h4>
              <div className="bg-muted rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] font-mono overflow-x-auto">{`curl http://localhost:3035/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer xpgw_your-api-key" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'`}</pre>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Example &mdash; OpenAI SDK (Node.js)</h4>
              <div className="bg-muted rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] font-mono overflow-x-auto">{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3035/api/v1",
  apiKey: "xpgw_your-api-key",
});

// Non-streaming
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(response.choices[0].message.content);

// Streaming
const stream = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`}</pre>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Response Format</h4>
              <div className="bg-muted rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] font-mono overflow-x-auto leading-relaxed">{`{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1712345678,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 9,
    "total_tokens": 19
  }
}`}</pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GET /models */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-mono rounded">GET</span>
              <code className="text-sm font-mono">/api/v1/models</code>
            </div>
            <p className="text-xs text-muted-foreground">List available models. Public &mdash; no API key required. Returns OpenAI-compatible format.</p>
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="bg-muted rounded-lg p-3">
              <pre className="text-[10px] font-mono overflow-x-auto">{`curl http://localhost:3035/api/v1/models`}</pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Response</h4>
              <div className="bg-muted rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] font-mono overflow-x-auto leading-relaxed">{`{
  "data": [
    {
      "id": "gpt-4o",
      "object": "model",
      "created": 1712345678,
      "owned_by": "openai",
      "name": "GPT-4o",
      "context": 128000,
      "provider": "OpenAI"
    }
  ]
}`}</pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GET /usage */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-mono rounded">GET</span>
              <code className="text-sm font-mono">/api/v1/usage</code>
            </div>
            <p className="text-xs text-muted-foreground">View usage statistics for your API key. Requires API key in header.</p>
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="bg-muted rounded-lg p-3">
              <pre className="text-[10px] font-mono overflow-x-auto">{`curl http://localhost:3035/api/v1/usage \\
  -H "Authorization: Bearer xpgw_your-api-key"`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* KEY MANAGEMENT */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-1">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-mono rounded">POST</span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-mono rounded">GET</span>
                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-mono rounded">DELETE</span>
              </div>
              <code className="text-sm font-mono">/api/v1/keys</code>
            </div>
            <p className="text-xs text-muted-foreground">API Key management. For managing keys from UI, visit <Link href="/keys" className="text-primary hover:underline">/keys</Link>.</p>
          </div>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="flex items-center gap-3"><span className="text-emerald-500 font-mono w-12">POST</span><span>Create a new API key</span><span className="text-muted-foreground">Body: <code>{`{ "name": "my-key" }`}</code></span></div>
            <div className="flex items-center gap-3"><span className="text-blue-500 font-mono w-12">GET</span><span>List all API keys</span></div>
            <div className="flex items-center gap-3"><span className="text-red-500 font-mono w-12">DELETE</span><span>Revoke or delete a key</span><span className="text-muted-foreground">Query: <code>?id=xxx</code></span></div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limits */}
      <h2 className="text-xl font-semibold mb-4">Limits &amp; Notes</h2>
      <Card className="mb-10">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /><div><span className="font-medium">Token estimation</span><p className="text-muted-foreground">~4 chars per token (approximate)</p></div></div>
            <div className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /><div><span className="font-medium">Quota enforcement</span><p className="text-muted-foreground">Checked per request against your plan/package limits</p></div></div>
            <div className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /><div><span className="font-medium">Streaming timeout</span><p className="text-muted-foreground">Follows browser/HTTP client timeout settings</p></div></div>
            <div className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /><div><span className="font-medium">Model availability</span><p className="text-muted-foreground">Depends on configured providers; try another model if unavailable</p></div></div>
          </div>
        </CardContent>
      </Card>

      {/* Error Codes */}
      <h2 className="text-xl font-semibold mb-4">Error Codes</h2>
      <Card className="overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Meaning</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/50"><td className="px-4 py-3 text-destructive font-mono">400</td><td>Bad Request</td><td className="text-muted-foreground">Check request body</td></tr>
              <tr className="hover:bg-muted/50"><td className="px-4 py-3 text-destructive font-mono">401</td><td>Unauthorized</td><td className="text-muted-foreground">API Key invalid or revoked</td></tr>
              <tr className="hover:bg-muted/50"><td className="px-4 py-3 text-amber-500 font-mono">402</td><td>Out of Quota</td><td className="text-muted-foreground">Purchase a package or upgrade plan</td></tr>
              <tr className="hover:bg-muted/50"><td className="px-4 py-3 text-destructive font-mono">500</td><td>Server Error</td><td className="text-muted-foreground">Provider error or misconfiguration</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Note */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Note:</strong> This API routes to multiple backend providers including Puter and self-hosted aggregators.
              Quality, speed, and availability depend on the specific provider.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
