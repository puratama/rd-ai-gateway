"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ExternalLink, Key, Server, Shield } from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    q: "Do I need an API key to use AI Gateway?",
    a: "It depends on how you use it. For the Chat UI (browser), no API key is needed — just open the app and start chatting. For programmatic access via the API, yes, you need an API key. Generate one from the /keys page.",
  },
  {
    q: "How is the API different from OpenAI's API?",
    a: "Our API is fully compatible with the OpenAI SDK. You just need to change the baseURL to http://localhost:3000/api/v1 and use your API key. All standard parameters (model, messages, stream, temperature, max_tokens) work the same way.",
  },
  {
    q: "What models are available through the API?",
    a: "Over 500 models from major providers including OpenAI (GPT-4, GPT-4o), Anthropic (Claude 3.5, Claude 4), Google (Gemini 2.5 Pro/Flash), DeepSeek, Mistral, xAI (Grok), Meta (Llama), and many more. Use GET /api/v1/models to see the full list.",
  },
  {
    q: "How does the backend architecture work?",
    a: "There are two request paths: (1) Chat UI sends requests to /api/chat (internal endpoint), which proxies to Puter API. No API key needed. (2) External developers send requests to /api/v1/chat/completions with their API key. The backend validates the key, tracks usage, then forwards to Puter API. All Puter auth tokens stay server-side.",
  },
  {
    q: "Is this free to use?",
    a: "The AI Gateway app itself is free. However, AI model usage requires a Puter.com account. Puter accounts are free to create, and you only pay for the tokens you actually consume through your Puter account.",
  },
  {
    q: "How do I get an API key?",
    a: "Go to the /keys page, click 'New Key', give it a name, and copy the generated key. The key starts with 'xpgw_' prefix. Store it safely — you won't be able to see it again after closing the dialog.",
  },
  {
    q: "Can I revoke an API key?",
    a: "Yes! Go to /keys, find the key you want to revoke, and click the delete button. Revoked keys immediately stop working. You can create a new key anytime.",
  },
  {
    q: "How do I track my API usage?",
    a: "There are two ways: (1) Check the /keys page which shows usage stats per key (requests, tokens, last used). (2) Use the GET /api/v1/usage endpoint with your API key for detailed analytics including model breakdown and daily usage.",
  },
  {
    q: "Where are my conversations stored?",
    a: "All conversations are stored locally in your browser using localStorage. Nothing is saved on any server. Clearing your browser data will delete your conversation history.",
  },
  {
    q: "What is Puter and how does it work?",
    a: "Puter is an AI platform that aggregates 500+ models from multiple providers. We use Puter's API behind the scenes — our backend proxies requests to Puter's OpenAI-compatible API. The Puter auth token is stored server-side in .env.local and never exposed to the client.",
  },
  {
    q: "What if a model stops working?",
    a: "Model availability depends on Puter's infrastructure. If a model fails, try a different model from the same provider. You can list available models via GET /api/v1/models. The frontend has a fallback mechanism — if the backend fails, it falls back to the Puter.js client SDK.",
  },
  {
    q: "Can I use this in production?",
    a: "The current version is a proof-of-concept. For production use, consider: (1) Adding direct provider API keys (OpenAI, Anthropic) as fallback, (2) Implementing rate limiting, (3) Using a proper database instead of JSON files, (4) Adding a billing/payment system.",
  },
  {
    q: "How is this different from OpenRouter?",
    a: "Key differences: (1) Our backend uses Puter API (user-pays model) vs OpenRouter (developer-pays). (2) For Chat UI, no API key is needed. (3) The API is OpenAI-compatible but routes through Puter. (4) We're in early stage — OpenRouter has more production features like auto-fallback, load balancing, and billing.",
  },
  {
    q: "Can I contribute or customize this project?",
    a: "Yes! This is a Next.js open-source project. You can fork it, customize the UI, add features, or deploy it anywhere. The code structure is modular with separate API routes, components, and libraries.",
  },
];

function FAQItem({
  question,
  answer,
  defaultOpen,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || false);

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-200 pr-4">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-zinc-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
        <HelpCircle className="w-3 h-3" />
        FAQ
      </div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-3">
        Frequently Asked Questions
      </h1>
      <p className="text-zinc-400 leading-relaxed mb-8">
        Everything you need to know about AI Gateway. Can&apos;t find what
        you&apos;re looking for? Check the{" "}
        <Link href="/docs/api" className="text-emerald-400 hover:underline underline-offset-2">
          API Reference
        </Link>{" "}
        or{" "}
        <a
          href="https://docs.puter.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline underline-offset-2"
        >
          Puter docs
        </a>
        .
      </p>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "API Reference", href: "/docs/api", icon: Server },
          { label: "Auth Guide", href: "/docs/auth", icon: Shield },
          { label: "Get API Key", href: "/keys", icon: Key },
          { label: "Puter.js Docs", href: "https://docs.puter.com", icon: ExternalLink },
        ].map((link, i) => {
          const Icon = link.icon;
          return (
            <Link
              key={i}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors text-xs text-zinc-400 hover:text-zinc-200"
            >
              <Icon className="w-3 h-3" />
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* FAQ Category: Getting Started */}
      <h2 className="text-sm font-semibold text-zinc-200 mb-3">Getting Started</h2>
      <div className="space-y-3 mb-8">
        {faqs.slice(0, 4).map((faq, i) => (
          <FAQItem key={i} question={faq.q} answer={faq.a} defaultOpen={i === 0} />
        ))}
      </div>

      {/* FAQ Category: API & Keys */}
      <h2 className="text-sm font-semibold text-zinc-200 mb-3">API &amp; Keys</h2>
      <div className="space-y-3 mb-8">
        {faqs.slice(4, 8).map((faq, i) => (
          <FAQItem key={i} question={faq.q} answer={faq.a} />
        ))}
      </div>

      {/* FAQ Category: Technical */}
      <h2 className="text-sm font-semibold text-zinc-200 mb-3">Technical</h2>
      <div className="space-y-3 mb-8">
        {faqs.slice(8, 14).map((faq, i) => (
          <FAQItem key={i} question={faq.q} answer={faq.a} />
        ))}
      </div>

      {/* Still have questions */}
      <div className="mt-10 p-5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-center">
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">
          Still have questions?
        </h3>
        <p className="text-xs text-zinc-500 mb-3">
          Check the documentation or start a conversation to learn more.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg text-xs transition-colors"
          >
            Start Chatting
          </Link>
          <Link
            href="/keys"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg text-xs transition-colors"
          >
            <Key className="w-3 h-3" />
            Get API Key
          </Link>
        </div>
      </div>
    </div>
  );
}
