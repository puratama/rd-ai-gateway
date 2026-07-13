import { Shield, Key, AlertTriangle, Server } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
        <Shield className="w-3 h-3" />
        Authentication
      </div>
      <h1 className="text-3xl font-bold mb-3">Authentication &amp; API Keys</h1>
      <p className="text-muted-foreground leading-relaxed mb-10">
        AI Gateway API uses <strong className="text-foreground">API Key-based authentication</strong>.
        Every request to the API endpoints (except model listings) must include an API Key.
      </p>

      {/* Flow Diagram */}
      <h2 className="text-xl font-semibold mb-4">Authentication Flow</h2>
      <Card className="mb-10">
        <CardContent className="p-6">
          <div className="space-y-4 text-xs">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">1</div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Generate API Key</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Go to the{" "}
                  <Link href="/keys" className="text-primary hover:underline">/keys</Link>{" "}
                  page and click <strong className="text-foreground">New Key</strong>. Give your key a name
                  (e.g., &ldquo;Production&rdquo; or &ldquo;Dev&rdquo;) and copy the key.
                  <strong className="text-amber-500"> Copy and save this key &mdash; it cannot be shown again once closed!</strong>
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center text-muted-foreground text-lg">&darr;</div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">2</div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Send API Request</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Send requests to the API endpoints with your API Key in the header:
                  <code className="text-foreground bg-muted px-1.5 py-0.5 rounded mx-1 font-mono text-[10px]">Authorization: Bearer &lt;your-api-key&gt;</code>
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center text-muted-foreground text-lg">&darr;</div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">3</div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Server Validates Key</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The gateway backend validates your key from the database.
                  If valid, active, and has remaining quota, the request is routed to the configured provider models.
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center text-muted-foreground text-lg">&darr;</div>

            {/* Step 4 */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">4</div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Usage Tracked</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Each request deducts tokens from your package or subscription quota.
                  Usage records and remaining balances are tracked in real-time.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Types */}
      <h2 className="text-xl font-semibold mb-4">Key Types</h2>
      <div className="space-y-3 mb-10">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">User API Key (xpgw_*)</h3>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">Developer</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                For developers accessing the AI Gateway. Can be generated from the /keys page.
              </p>
              <div className="text-[10px] text-muted-foreground space-y-0.5 font-mono">
                <p>Format: <code>xpgw_&lt;random-32-chars&gt;</code></p>
                <p>Prefix: <code>xpgw_</code> (Xperimne Gateway)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">Internal Admin Key</h3>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full">Admin</span>
              </div>
              <p className="text-xs text-muted-foreground">
                For system administration &mdash; manages models, aggregator settings, and plan packages.
                Configured via environment variables on the backend.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Using API Keys */}
      <h2 className="text-xl font-semibold mb-4">Using Your API Key</h2>
      <div className="space-y-4 mb-10">
        {/* OpenAI SDK */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">OpenAI SDK (Recommended)</h3>
            <div className="bg-muted rounded-lg overflow-hidden font-mono">
              <pre className="p-3 text-[10px] text-foreground overflow-x-auto">{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3035/api/v1",
  apiKey: "xpgw_your-api-key-here",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Python */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Python OpenAI Library</h3>
            <div className="bg-muted rounded-lg overflow-hidden font-mono">
              <pre className="p-3 text-[10px] text-foreground overflow-x-auto">{`from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3035/api/v1",
    api_key="xpgw_your-api-key-here"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* cURL */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">cURL</h3>
            <div className="bg-muted rounded-lg overflow-hidden font-mono">
              <pre className="p-3 text-[10px] text-foreground overflow-x-auto">{`curl http://localhost:3035/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer xpgw_your-api-key-here" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Best Practices */}
      <h2 className="text-xl font-semibold mb-4">Security Best Practices</h2>
      <Card className="mb-10">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <h3 className="text-xs font-semibold">Never hardcode API Keys in client-side code</h3>
              <p className="text-[10px] text-muted-foreground">API Keys are for server-side environments only. Client leaks can lead to quota depletion.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <h3 className="text-xs font-semibold">Use separate keys for environment isolation</h3>
              <p className="text-[10px] text-muted-foreground">Keep development and production environments strictly separated with distinct keys.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <h3 className="text-xs font-semibold">Revoke keys immediately if compromised</h3>
              <p className="text-[10px] text-muted-foreground">Monitor keys from your dashboard and revoke inactive or potentially leaked keys immediately.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
      <div className="space-y-3 mb-10">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <h3 className="text-xs font-semibold mb-1">401 Unauthorized</h3>
              <p className="text-[10px] text-muted-foreground">Make sure your API key is correctly formatted with prefix <code>xpgw_</code>, active, and has remaining quota.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-xs font-semibold mb-1">402 Payment Required / Out of Quota</h3>
              <p className="text-[10px] text-muted-foreground">You have consumed your available token limit. Purchase a package or subscribe to a plan to resume access.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next steps */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold mb-0.5">Ready to build?</h3>
            <p className="text-xs text-muted-foreground">Generate your first API key and start coding</p>
          </div>
          <Link href="/keys">
            <Button size="sm"><Key className="w-3.5 h-3.5 mr-1.5" /> Generate Key</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
