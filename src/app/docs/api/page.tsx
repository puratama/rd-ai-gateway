import { Code, Terminal, Server, Shield, BarChart3, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function APIPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
        <Code className="w-3 h-3" />
        API Reference
      </div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-3">API Reference</h1>
      <p className="text-zinc-400 leading-relaxed mb-2">
        AI Gateway menyediakan REST API yang <strong className="text-zinc-200">fully compatible dengan OpenAI SDK</strong>.
        Developer bisa menggunakan library OpenAI favorit mereka &mdash; cukup ganti <code className="text-emerald-400">baseURL</code> dan <code className="text-emerald-400">apiKey</code>.
      </p>
      <p className="text-zinc-500 text-sm mb-10">
        Base URL: <code className="text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded text-xs">http://localhost:3000/api/v1</code>
      </p>

      {/* Architecture Overview */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">How It Works</h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5 mb-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-center p-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-zinc-300 font-medium">Your App</div>
            <div className="text-zinc-500">OpenAI SDK / cURL</div>
          </div>
          <div className="text-zinc-600 text-2xl">&rarr;</div>
          <div className="text-center p-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-zinc-300 font-medium">AI Gateway API</div>
            <div className="text-zinc-500">Validasi API Key + Proxy</div>
          </div>
          <div className="text-zinc-600 text-2xl">&rarr;</div>
          <div className="text-center p-3">
            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
              <ExternalLink className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-zinc-300 font-medium">Puter API</div>
            <div className="text-zinc-500">500+ AI Models</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg">
          <p className="text-[10px] text-zinc-500 text-center">
            Puter Auth Token tersimpan aman di backend &mdash; tidak pernah bocor ke client
          </p>
        </div>
      </div>

      {/* Authentication */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Authentication</h2>
      <p className="text-sm text-zinc-400 mb-4">
        Semua endpoint (kecuali model listing) membutuhkan API Key yang dikirim via header{" "}
        <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">Authorization: Bearer &lt;your-api-key&gt;</code>.
        Dapatkan API Key dari halaman{" "}
        <Link href="/keys" className="text-emerald-400 hover:underline">/keys</Link>.
      </p>

      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 mb-10">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">Security Model</h3>
            <ul className="space-y-1.5 text-xs text-zinc-500">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                API Key format: <code className="text-zinc-300">xpgw_&lt;random&gt;</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                Keys disimpan terenkripsi di server (JSON file)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                Setiap request dicatat untuk usage tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                Keys bisa di-revoke kapan saja dari dashboard
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Endpoints</h2>
      <div className="space-y-6 mb-10">

        {/* POST /chat/completions */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded">POST</span>
              <code className="text-sm text-zinc-200 font-mono">/api/v1/chat/completions</code>
            </div>
            <p className="text-xs text-zinc-500">
              Chat completions endpoint. Fully compatible dengan OpenAI Chat Completion API.
              Mendukung streaming (SSE) dan non-streaming.
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Headers</h4>
              <div className="bg-black/30 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 w-32 shrink-0">Authorization</span>
                  <span className="text-zinc-300 font-mono">Bearer &lt;api_key&gt;</span>
                  <span className="text-zinc-600">Required</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 w-32 shrink-0">Content-Type</span>
                  <span className="text-zinc-300 font-mono">application/json</span>
                  <span className="text-zinc-600">Required</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Request Body</h4>
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto leading-relaxed">{`{
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
              <div className="mt-2 space-y-1 text-[10px] text-zinc-500">
                <p><code className="text-zinc-400">model</code> (string, required) &mdash; Model ID dari list models</p>
                <p><code className="text-zinc-400">messages</code> (array, required) &mdash; Array of message objects</p>
                <p><code className="text-zinc-400">stream</code> (boolean, optional) &mdash; Enable SSE streaming, default false</p>
                <p><code className="text-zinc-400">temperature</code> (number, optional) &mdash; Sampling temperature (0-2)</p>
                <p><code className="text-zinc-400">max_tokens</code> (number, optional) &mdash; Max tokens in response</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Example &mdash; cURL</h4>
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto">{`curl http://localhost:3000/api/v1/chat/completions \\
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
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Example &mdash; OpenAI SDK (Node.js)</h4>
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto">{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/api/v1",
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
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Response Format</h4>
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto leading-relaxed">{`{
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
          </div>
        </div>

        {/* GET /models */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-mono rounded">GET</span>
              <code className="text-sm text-zinc-200 font-mono">/api/v1/models</code>
            </div>
            <p className="text-xs text-zinc-500">
              List available models dari Puter API. Publik &mdash; tidak perlu API key.
              Response di-transform ke format OpenAI-compatible.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-black/30 rounded-lg p-3">
              <pre className="text-[10px] text-zinc-300 font-mono overflow-x-auto">{`curl http://localhost:3000/api/v1/models`}</pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Response</h4>
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto leading-relaxed">{`{
  "data": [
    {
      "id": "gpt-4o",
      "object": "model",
      "created": 1712345678,
      "owned_by": "openai",
      "name": "GPT-4o",
      "context": 128000,
      "provider": "OpenAI",
      "modalities": ["text", "image"],
      "pricing": {
        "prompt": 2.50,
        "completion": 10.00
      }
    }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* GET /usage */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-mono rounded">GET</span>
              <code className="text-sm text-zinc-200 font-mono">/api/v1/usage</code>
            </div>
            <p className="text-xs text-zinc-500">
              View usage statistics untuk API key Anda. Membutuhkan API key atau admin key.
              Untuk admin, bisa melihat semua keys usage.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-black/30 rounded-lg p-3">
              <pre className="text-[10px] text-zinc-300 font-mono overflow-x-auto">{`curl http://localhost:3000/api/v1/usage \\
  -H "Authorization: Bearer xpgw_your-api-key"`}</pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Response</h4>
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto leading-relaxed">{`{
  "totalRequests": 42,
  "totalTokens": 15234,
  "totalPromptTokens": 8234,
  "totalCompletionTokens": 7000,
  "modelBreakdown": {
    "gpt-4o": 10000,
    "claude-sonnet-4": 5234
  },
  "dailyUsage": {
    "2026-07-09": 5000,
    "2026-07-08": 10234
  },
  "apiKeyId": "abc123..."
}`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* KEY MANAGEMENT */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-1">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded">POST</span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-mono rounded">GET</span>
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-mono rounded">DELETE</span>
              </div>
              <code className="text-sm text-zinc-200 font-mono">/api/v1/keys</code>
            </div>
            <p className="text-xs text-zinc-500">
              API Key management. Membutuhkan admin key (<code className="text-zinc-400">INTERNAL_API_KEY</code>).
              Untuk manage keys dari UI, buka halaman{" "}
              <Link href="/keys" className="text-emerald-400 hover:underline">/keys</Link>.
            </p>
          </div>
          <div className="p-4 space-y-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-mono w-12">POST</span>
              <span className="text-zinc-300">Create a new API key</span>
              <span className="text-zinc-500">Body: <code className="text-zinc-400">{`{ "name": "my-key" }`}</code></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-blue-400 font-mono w-12">GET</span>
              <span className="text-zinc-300">List all API keys</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-red-400 font-mono w-12">DELETE</span>
              <span className="text-zinc-300">Revoke or delete a key</span>
              <span className="text-zinc-500">Query: <code className="text-zinc-400">?id=xxx&amp;action=revoke</code></span>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limits */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Rate Limits &amp; Constraints</h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div>
              <span className="text-zinc-300">Rate limiting</span>
              <p className="text-zinc-500">Belum ada rate limiting built-in &mdash; tergantung rate limit dari Puter API</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div>
              <span className="text-zinc-300">Token estimation</span>
              <p className="text-zinc-500">Estimasi sederhana: 4 karakter &asymp; 1 token (bukan tokenizer sesungguhnya)</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div>
              <span className="text-zinc-300">Streaming timeout</span>
              <p className="text-zinc-500">Mengikuti timeout browser/HTTP client (tidak ada timeout khusus di backend)</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div>
              <span className="text-zinc-300">Model availability</span>
              <p className="text-zinc-500">Tergantung Puter API &mdash; jika model tidak available, coba model lain</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Codes */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Error Codes</h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden mb-10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Meaning</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Solution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            <tr className="hover:bg-zinc-800/20">
              <td className="px-4 py-3 text-red-400 font-mono">400</td>
              <td className="text-zinc-300">Bad Request</td>
              <td className="text-zinc-500">Check request body &mdash; messages dan model required</td>
            </tr>
            <tr className="hover:bg-zinc-800/20">
              <td className="px-4 py-3 text-red-400 font-mono">401</td>
              <td className="text-zinc-300">Unauthorized</td>
              <td className="text-zinc-500">API Key tidak valid atau sudah di-revoke</td>
            </tr>
            <tr className="hover:bg-zinc-800/20">
              <td className="px-4 py-3 text-red-400 font-mono">500</td>
              <td className="text-zinc-300">Server Error</td>
              <td className="text-zinc-500">Puter API error atau konfigurasi server kurang</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Note */}
      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            <strong className="text-zinc-400">Note:</strong> API ini adalah proxy ke{" "}
            <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Puter.com</a>.
            Kualitas, kecepatan, dan availability tergantung pada infrastruktur Puter.
            Untuk production scale, pertimbangkan untuk menambahkan provider langsung sebagai fallback.
          </p>
        </div>
      </div>
    </div>
  );
}
