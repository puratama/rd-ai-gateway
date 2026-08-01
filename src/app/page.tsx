"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  Shield,
  CreditCard,
  Globe,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "500+ AI Models",
    description: "Access GPT-4, Claude, Gemini, Llama, and hundreds more through a single API endpoint.",
  },
  {
    icon: CreditCard,
    title: "Pay-As-You-Go",
    description: "No monthly commitments. Top up your wallet and only pay for what you use.",
  },
  {
    icon: Shield,
    title: "Unified API Key",
    description: "One API key for all providers. No need to manage multiple accounts or keys.",
  },
  {
    icon: Globe,
    title: "Multi-Provider Failover",
    description: "Automatic failover between providers ensures 99.9% uptime for your AI workloads.",
  },
];

const stats = [
  { value: "500+", label: "AI Models", dynamic: true },
  { value: "99.9%", label: "Uptime" },
  { value: "<100ms", label: "Latency" },
  { value: "10K+", label: "Developers" },
];

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

const FALLBACK_TIERS: PricingTier[] = [
  { name: "Starter", price: "Free", description: "For trying out the platform", features: ["1,000 tokens/day", "Basic models", "Community support", "1 API key"], cta: "Get Started", popular: false },
  { name: "Pro", price: "Rp 99K", period: "/month", description: "For serious developers", features: ["1M tokens/month", "All models", "Priority support", "10 API keys", "Streaming", "Analytics"], cta: "Start Pro", popular: true },
  { name: "Enterprise", price: "Custom", description: "For teams and businesses", features: ["Unlimited tokens", "Custom models", "Dedicated support", "Unlimited keys", "SLA", "On-prem option"], cta: "Contact Sales", popular: false },
];

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

interface PlanRaw {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingPeriod: string;
  features: Record<string, unknown>;
  isActive: boolean;
}

function planToTier(p: PlanRaw): PricingTier {
  const features: string[] = [];
  const f = p.features;
  if (f.maxTokensPerMonth) features.push(`${Number(f.maxTokensPerMonth).toLocaleString()} tokens/${p.billingPeriod}`);
  if (f.streaming) features.push("Streaming");
  if (f.imageGeneration) features.push("Image generation");
  if (f.apiAccess) features.push("API access");
  if (f.priority && f.priority !== "normal") features.push(`${f.priority} priority`);
  if (f.allowedModels && Array.isArray(f.allowedModels) && f.allowedModels.length > 0) features.push(`${f.allowedModels.length} models`);
  else features.push("All models");

  return {
    name: p.name,
    price: p.price === 0 ? "Free" : formatRupiah(p.price),
    period: p.price > 0 ? `/${p.billingPeriod}` : undefined,
    description: p.description || p.name,
    features,
    cta: p.price === 0 ? "Get Started" : "Subscribe",
    popular: p.name.toLowerCase().includes("pro"),
  };
}

export default function LandingPage() {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(FALLBACK_TIERS);
  const [modelCount, setModelCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.plans && data.plans.length > 0) {
          setPricingTiers(data.plans.map(planToTier));
        }
      })
      .catch(() => {});

    fetch("/api/models")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (Array.isArray(data)) setModelCount(data.length); })
      .catch(() => {});

    fetch("/api/auth/session")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setIsAuthenticated(Boolean(data?.authenticated)))
      .catch(() => setIsAuthenticated(false));
  }, []);
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent_32rem),linear-gradient(180deg,var(--color-background),color-mix(in_oklch,var(--color-background)_82%,var(--color-card)))] text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-card/85 backdrop-blur-lg border-b border-border shadow-lg shadow-primary/5">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold">xPerimne</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm">Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Now with GPT-4o, Claude 4, and Gemini 2.5
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            One API for{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              500+ AI Models
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop juggling multiple API keys and providers. xPerimne gives you a single endpoint to access
            every major AI model — with pay-as-you-go pricing and automatic failover.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Link href={isAuthenticated ? "/dashboard" : "/register"}>
              <Button size="lg" className="gap-2 text-base px-8">
                {isAuthenticated ? "Go to Dashboard" : "Start Building"} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button variant="outline" size="lg" className="gap-2 text-base px-8">
                View Pricing
              </Button>
            </a>
          </div>

          {/* Code snippet */}
          <div className="max-w-xl mx-auto bg-card/95 border border-border rounded-xl overflow-hidden text-left shadow-2xl shadow-primary/10">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">quickstart.ts</span>
            </div>
            <pre className="p-4 text-sm font-mono overflow-x-auto">
              <code>
                <span className="text-secondary">const</span> response = <span className="text-secondary">await</span> <span className="text-accent">fetch</span>(<span className="text-green-400">&quot;https://api.xperimne.com/v1/chat/completions&quot;</span>,{"\n"}
                {"  "}{"{"}{"\n"}
                {"    "}headers: {"{"} Authorization: <span className="text-green-400">`Bearer $&#123;API_KEY&#125;`</span> {"}"}{","}{"\n"}
                {"    "}body: JSON.stringify({"{"}{"\n"}
                {"      "}model: <span className="text-green-400">&quot;gpt-4o&quot;</span>,{"\n"}
                {"      "}messages: [{"{"} role: <span className="text-green-400">&quot;user&quot;</span>, content: <span className="text-green-400">&quot;Hello!&quot;</span> {"}"}]{"\n"}
                {"    "}{"}"}),{"\n"}
                {"  "}{"}"}{"}"});{"\n"}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border bg-muted/45">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                {stat.dynamic && modelCount > 0 ? `${modelCount}+` : stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A complete AI gateway built for developers who want simplicity without sacrificing power.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border bg-card/95 shadow-lg shadow-primary/5 hover:border-primary/40 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-muted/45">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={`border-border bg-card ${tier.popular ? "border-primary ring-1 ring-primary/20" : ""}`}
              >
                <CardContent className="p-6">
                  {tier.popular && (
                    <div className="text-xs font-medium text-primary mb-4">Most Popular</div>
                  )}
                  <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="block">
                    <Button
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden border-t border-border bg-[radial-gradient(circle_at_18%_0%,color-mix(in_oklch,var(--color-primary)_20%,transparent),transparent_28rem),linear-gradient(180deg,color-mix(in_oklch,var(--color-card)_62%,transparent),var(--color-background))] px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        <div className="mx-auto grid max-w-6xl gap-10 py-14 md:grid-cols-[1.2fr_.8fr_.8fr]">
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight">xPerimne</span>
            </Link>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              One gateway for model routing, wallet usage, and API access — built for teams that ship AI products without provider sprawl.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_14px_var(--color-accent)]" />
              API gateway online
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Platform</h3>
            <div className="grid gap-3 text-sm">
              <Link href="/models" className="text-muted-foreground transition hover:text-foreground">Models</Link>
              <Link href="/login" className="text-muted-foreground transition hover:text-foreground">Sign in</Link>
              <Link href="/register" className="text-muted-foreground transition hover:text-foreground">Create account</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Connect</h3>
            <div className="grid gap-3 text-sm">
              <a href="#" className="text-muted-foreground transition hover:text-foreground">GitHub</a>
              <a href="#" className="text-muted-foreground transition hover:text-foreground">Twitter</a>
              <a href="mailto:hello@xperimne.com" className="text-muted-foreground transition hover:text-foreground">hello@xperimne.com</a>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-border/70 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>&copy; 2025 xPerimne. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Jakarta / UTC+7</span>
            <span>99.9% target uptime</span>
            <span>No provider lock-in</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
