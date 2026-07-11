import { Shield, Key, Copy, Check, AlertTriangle, Server, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
        <Shield className="w-3 h-3" />
        Authentication
      </div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-3">Authentication &amp; API Keys</h1>
      <p className="text-zinc-400 leading-relaxed mb-10">
        AI Gateway API menggunakan <strong className="text-zinc-200">API Key-based authentication</strong>.
        Setiap request ke endpoint API (kecuali model listing) harus menyertakan API Key.
      </p>

      {/* Flow Diagram */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Authentication Flow</h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5 mb-10">
        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">1</div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Generate API Key</h3>
              <p className="text-zinc-500 leading-relaxed">
                Buka halaman{" "}
                <Link href="/keys" className="text-emerald-400 hover:underline">/keys</Link>{" "}
                dan klik <strong className="text-zinc-300">New Key</strong>. Beri nama key
                (misalnya &ldquo;Production&rdquo; atau &ldquo;Dev&rdquo;) dan copy key yang muncul.
                <strong className="text-amber-400"> Simpan key ini &mdash; setelah ditutup, tidak bisa dilihat lagi!</strong>
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-zinc-700 text-lg">&darr;</div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">2</div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Send API Request</h3>
              <p className="text-zinc-500 leading-relaxed">
                Kirim request ke endpoint API dengan menyertakan API Key di header
                <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded mx-1">Authorization: Bearer &lt;your-api-key&gt;</code>
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-zinc-700 text-lg">&darr;</div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">3</div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Server Validates Key</h3>
              <p className="text-zinc-500 leading-relaxed">
                Backend memvalidasi key dari file <code className="text-zinc-400">data/api-keys.json</code>.
                Jika valid dan aktif, request diteruskan ke Puter API. Jika tidak valid, return 401.
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-zinc-700 text-lg">&darr;</div>

          {/* Step 4 */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">4</div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Usage Tracked</h3>
              <p className="text-zinc-500 leading-relaxed">
                Setiap request dicatat: model yang digunakan, jumlah token, timestamp.
                Data tersedia di endpoint <code className="text-zinc-300">/api/v1/usage</code> dan dashboard /keys.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Types */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Key Types</h2>
      <div className="space-y-3 mb-10">
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-zinc-200">API Key (xpgw_*)</h3>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">User</span>
              </div>
              <p className="text-xs text-zinc-500 mb-2">
                Untuk developer yang mengakses API Gateway. Bisa generate dari halaman /keys.
              </p>
              <div className="text-[10px] text-zinc-600 space-y-0.5">
                <p>Format: <code className="text-zinc-400">xpgw_&lt;random-32-chars&gt;</code></p>
                <p>Prefix: <code className="text-zinc-400">xpgw_</code> (Xperimne Gateway)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-zinc-200">Internal Admin Key</h3>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">Admin</span>
              </div>
              <p className="text-xs text-zinc-500 mb-2">
                Untuk admin panel &mdash; bisa melihat semua keys, usage stats, dan manage keys.
                Diset via environment variable <code className="text-zinc-300">INTERNAL_API_KEY</code> dan <code className="text-zinc-300">NEXT_PUBLIC_INTERNAL_KEY</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Server className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-zinc-200">Puter Auth Token</h3>
                <span className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-full">Backend Only</span>
              </div>
              <p className="text-xs text-zinc-500">
                Token dari Puter.com yang digunakan backend untuk memanggil Puter API.
                Disimpan di <code className="text-zinc-300">.env.local</code> sebagai <code className="text-zinc-300">PUTER_AUTH_TOKEN</code>.
                <strong className="text-amber-400"> Tidak pernah terekspos ke client!</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Using API Keys */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Using Your API Key</h2>
      <div className="space-y-4 mb-10">

        {/* OpenAI SDK */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">OpenAI SDK (Recommended)</h3>
          <div className="bg-black/30 rounded-lg overflow-hidden">
            <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto">{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/api/v1",
  apiKey: "xpgw_your-api-key-here",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});`}</pre>
          </div>
        </div>

        {/* Python */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Python OpenAI Library</h3>
          <div className="bg-black/30 rounded-lg overflow-hidden">
            <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto">{`from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/api/v1",
    api_key="xpgw_your-api-key-here"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`}</pre>
          </div>
        </div>

        {/* cURL */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">cURL</h3>
          <div className="bg-black/30 rounded-lg overflow-hidden">
            <pre className="p-3 text-[10px] text-zinc-300 font-mono overflow-x-auto">{`curl http://localhost:3000/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer xpgw_your-api-key-here" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</pre>
          </div>
        </div>
      </div>

      {/* Security Best Practices */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Security Best Practices</h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5 mb-10">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Jangan pernah hardcode API Key di client-side code</h3>
              <p className="text-[10px] text-zinc-500">API Key hanya untuk server-side. Jika digunakan di browser, key bisa dicuri.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Buat key terpisah untuk setiap environment</h3>
              <p className="text-[10px] text-zinc-500">Punya 3 key: Development, Staging, Production. Kalau satu bocor, revoke saja yang itu.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Revoke key yang tidak digunakan</h3>
              <p className="text-[10px] text-zinc-500">Cek halaman /keys secara berkala dan revoke key yang sudah tidak aktif.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Pantau usage secara rutin</h3>
              <p className="text-[10px] text-zinc-500">Cek endpoint /api/v1/usage untuk melihat pemakaian per key. Deteksi anomali sejak dini.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">Troubleshooting</h2>
      <div className="space-y-3 mb-10">
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-200 mb-1">401 Unauthorized</h3>
              <p className="text-[10px] text-zinc-500">Pastikan API Key benar dan belum di-revoke. Cek di halaman /keys. Key prefix harus <code className="text-zinc-300">xpgw_</code>.</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-200 mb-1">500 Internal Server Error</h3>
              <p className="text-[10px] text-zinc-500">Puter API sedang bermasalah atau token tidak valid. Coba beberapa saat lagi atau cek <code className="text-zinc-300">PUTER_AUTH_TOKEN</code> di .env.local.</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-200 mb-1">Model not found</h3>
              <p className="text-[10px] text-zinc-500">Beberapa model mungkin tidak available di Puter. Coba list models via <code className="text-zinc-300">GET /api/v1/models</code> untuk melihat model yang tersedia.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-0.5">Ready to build?</h3>
          <p className="text-xs text-zinc-500">Generate your first API key and start coding</p>
        </div>
        <Link
          href="/keys"
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-black font-medium rounded-lg text-xs transition-colors"
        >
          <Key className="w-3.5 h-3.5" />
          Generate API Key
        </Link>
      </div>
    </div>
  );
}
