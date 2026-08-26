"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Copy } from "lucide-react";
import { Fraunces, Figtree, IBM_Plex_Mono } from "next/font/google";
import { BrandLogo } from "@/components/BrandLogo";
import { useSiteConfig } from "@/lib/use-site-config";

/* ---------------------------------- fonts ---------------------------------- */

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

const serif = "[font-family:var(--font-fraunces),Georgia,serif]";
const mono = "[font-family:var(--font-plex),ui-monospace,monospace]";

/* ----------------------------------- data ---------------------------------- */

const steps = [
  {
    n: "01",
    title: "Daftar & isi wallet",
    desc: "Buat akun, isi saldo prabayar via transfer, e-wallet, atau QRIS. Tanpa langganan bulanan, tanpa biaya tersembunyi.",
  },
  {
    n: "02",
    title: "Terbitkan API key",
    desc: "Satu key untuk seluruh katalog model. Disimpan sebagai hash kriptografis dan hanya tampil sekali saat dibuat.",
  },
  {
    n: "03",
    title: "Kirim request pertama",
    desc: "Arahkan SDK OpenAI ke base URL gateway. Ubah satu baris kode — aplikasi yang sudah ada tetap berjalan.",
  },
];

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

const FALLBACK_TIERS: PricingTier[] = [
  { name: "Starter", price: "Gratis", description: "Untuk mencoba platform", features: ["1.000 token/hari", "Model dasar", "Community support"], cta: "Mulai", popular: false },
  { name: "Pro", price: "Rp 99K", description: "Untuk developer serius", features: ["1 juta token / 30 hari", "Semua model", "Streaming & analytics"], cta: "Beli Paket", popular: true },
  { name: "Enterprise", price: "Custom", description: "Untuk tim dan bisnis", features: ["Volume besar", "Dukungan khusus", "SLA"], cta: "Hubungi Kami", popular: false },
];

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
  const f = p.features;
  const feats: string[] = [];
  if (f.maxTokensPerMonth) feats.push(`${Number(f.maxTokensPerMonth).toLocaleString("id-ID")} token`);
  if (f.streaming) feats.push("Streaming");
  if (f.imageGeneration) feats.push("Image generation");
  if (f.allowedModels && Array.isArray(f.allowedModels) && f.allowedModels.length > 0) feats.push(`${f.allowedModels.length} model`);
  else feats.push("Semua model");

  return {
    name: p.name,
    price: p.price === 0 ? "Gratis" : `Rp ${Number(p.price).toLocaleString("id-ID")}`,
    description: p.description || p.name,
    features: feats,
    cta: p.price === 0 ? "Mulai" : "Beli Paket",
    popular: p.name.toLowerCase().includes("pro"),
  };
}

const HEALTH_META = {
  checking: { label: "Memeriksa status…", cls: "text-neutral-500", dot: "bg-neutral-400" },
  ok: { label: "Semua sistem beroperasi", cls: "text-emerald-700", dot: "bg-emerald-600" },
  degraded: { label: "Performa menurun", cls: "text-amber-700", dot: "bg-amber-600" },
  down: { label: "Gangguan terdeteksi", cls: "text-red-700", dot: "bg-red-600" },
} as const;

const faqs = [
  {
    q: "Apa itu AI gateway?",
    a: "Gateway adalah perantara antara aplikasi Anda dan penyedia model AI. Alih-alih mendaftar dan mengelola banyak layanan, Anda cukup satu akun, satu API key, dan satu titik masuk untuk semua model.",
  },
  {
    q: "Bagaimana cara pembayarannya?",
    a: "Semuanya prabayar. Isi saldo wallet lewat transfer bank, e-wallet, atau QRIS, lalu beli paket token atau biarkan pemakaian dipotong langsung dari saldo. Tidak ada langganan dan tidak ada biaya bulanan.",
  },
  {
    q: "Apa yang terjadi jika saldo habis di tengah pemakaian?",
    a: "Paket token aktif akan dipakai lebih dulu; sisanya otomatis fallback ke saldo wallet. Jika keduanya tidak cukup, permintaan ditolak dengan jelas — tidak ada tagihan mengejutkan.",
  },
  {
    q: "Apakah API key saya aman?",
    a: "Key disimpan dalam bentuk yang tidak dapat dibaca dan hanya ditampilkan sekali saat dibuat. Anda bisa membatasi model yang boleh diakses, mengatur masa berlaku, dan me-regenerate kapan saja.",
  },
  {
    q: "Apakah kode saya harus diubah untuk pindah ke sini?",
    a: "Hampir tidak. Gateway menggunakan format API standar industri — umumnya cukup mengganti base URL dan API key pada SDK yang sudah ada.",
  },
  {
    q: "Model apa saja yang tersedia?",
    a: "Katalog mencakup puluhan hingga ratusan model dari berbagai penyedia besar. Daftar lengkap beserta tarif per model dapat dilihat pada bagian Model di halaman ini atau halaman katalog.",
  },
];

function Pulse({ className }: { className?: string }) {
  return <div className="animate-pulse rounded-sm bg-neutral-200" />;
}

function formatPrice(n: number): string {
  return n === 0 ? "Gratis" : n % 1 === 0 ? n.toLocaleString("id-ID") : n.toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

function priceLabel(n: number | null): string {
  return !n ? "Gratis" : `Rp ${formatPrice(n)}`;
}

/* Label seksi gaya Swiss: nomor di margin kiri */
function SectionMark({ no, label }: { no: string; label: string }) {
  return (
    <p className={`flex items-baseline gap-3 text-sm uppercase tracking-[0.24em] text-neutral-400 ${mono}`}>
      <span className="text-red-600">{no}</span>
      {label}
    </p>
  );
}

/* --------------------------------- component -------------------------------- */

export default function LandingPage() {
  const siteCfg = useSiteConfig();
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(FALLBACK_TIERS);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [health, setHealth] = useState<keyof typeof HEALTH_META>("checking");
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHealth(d?.status ?? "down"))
      .catch(() => setHealth("down"));
    fetch("/api/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plans?.length > 0) setPricingTiers(data.plans.map(planToTier));
      })
      .catch(() => {});
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsAuthenticated(Boolean(data?.authenticated)))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Reveal-on-scroll untuk elemen .reveal
  // Dipicu ulang saat data asinkron termuat agar elemen yang baru dirender ikut diobservasi.
  const revealKey = `${siteCfg.loaded}-${pricingTiers.length}-${siteCfg.models.length}`;
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);

  const base = siteCfg.baseUrl || "/api/v1";
  const snippetText = `const openai = new OpenAI({\n  baseURL: "${base}",\n  apiKey: process.env.API_KEY,\n});\n\nawait openai.chat.completions.create({\n  model: "gpt-4o",\n  messages: [{ role: "user", content: "Halo!" }],\n});`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const hm = HEALTH_META[health];
  const ctaHref = isAuthenticated ? "/dashboard" : "/register";

  return (
    <div className={`${fraunces.variable} ${figtree.variable} ${plex.variable} min-h-screen bg-white font-(family-name:--font-figtree) text-neutral-900 antialiased selection:bg-neutral-900 selection:text-white`}>
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .rise { opacity: 0; animation: rise .8s cubic-bezier(.22,.61,.36,1) forwards; }
        @keyframes marquee { to { transform: translateX(-50%); } }
        @keyframes pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(5,150,105,.35)} 50%{box-shadow:0 0 0 6px transparent} }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        /* Reveal on scroll */
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s cubic-bezier(.22,.61,.36,1), transform .7s cubic-bezier(.22,.61,.36,1); }
        .reveal.is-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }
        /* Hero: pola kotak-kotak (grid) halus pada background */
        .hero-grid {
          background-image:
            linear-gradient(to right, rgba(23,23,23,.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(23,23,23,.05) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: grid-drift 6s linear infinite;
        }
      `}</style>

      {/* ============================== Navigation ============================== */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-neutral-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {siteCfg.loaded ? (
              <>
                {siteCfg.logoMode !== "name" && <BrandLogo siteCfg={siteCfg} />}
                {siteCfg.logoMode !== "logo" && <span className={`text-base tracking-tight ${mono}`}>{siteCfg.siteName}</span>}
              </>
            ) : (
              <>
                <Pulse className="h-7 w-7" />
                <Pulse className="h-4 w-24" />
              </>
            )}
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {[["Cara kerja", "#cara-kerja"], ["Model", "#model"], ["Harga", "#harga"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a key={href} href={href} className="text-sm text-neutral-500 transition-colors hover:text-neutral-900">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link href="/dashboard" className="inline-flex h-9 items-center rounded-full border border-neutral-900 px-5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden h-9 items-center rounded-full px-4 text-sm text-neutral-500 transition-colors hover:text-neutral-900 sm:inline-flex">
                  Masuk
                </Link>
                <Link href="/register" className={`inline-flex h-9 items-center gap-1.5 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-700`}>
                  Daftar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================================= Hero ================================= */}
      <section className="hero-grid relative px-6 pb-20 pt-44">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-white via-white/70 to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className={`rise inline-flex items-center gap-3 text-sm uppercase tracking-[0.28em] text-neutral-400 ${mono}`} style={{ animationDelay: "0ms" }}>
            <span className={`h-1.5 w-1.5 rounded-full ${hm.dot} ${health === "ok" ? "pulse-dot" : ""}`} />
            <span className={hm.cls}>{hm.label}</span>
          </p>

          <h1 className={`rise mx-auto mt-8 max-w-3xl text-4xl leading-[1.06] tracking-tight md:text-6xl ${serif}`} style={{ animationDelay: "80ms", fontWeight: 340 }}>
            Satu endpoint,{" "}
            <em className="text-red-700">semua model.</em>
            <br />
            Harga lokal.
          </h1>

          {siteCfg.loaded ? (
            <p className="rise mx-auto mt-8 max-w-xl text-lg leading-relaxed text-neutral-500" style={{ animationDelay: "160ms" }}>
              {siteCfg.description}
            </p>
          ) : (
            <div className="rise mx-auto mt-10 max-w-xl space-y-2" style={{ animationDelay: "160ms" }}>
              <Pulse className="h-5 w-full" />
              <Pulse className="h-5 w-3/4" />
            </div>
          )}

          <div className="rise mt-10 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: "240ms" }}>
            <Link href={ctaHref} className="group inline-flex h-12 items-center gap-2 rounded-full bg-neutral-900 px-8 text-sm font-medium text-white transition-colors hover:bg-neutral-700">
              {isAuthenticated ? "Buka Dashboard" : "Mulai Gratis"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#harga" className="inline-flex h-12 items-center rounded-full border border-neutral-200 px-8 text-sm text-neutral-700 transition-colors hover:border-neutral-900">
              Lihat harga
            </a>
          </div>
        </div>
      </section>

      {/* ============================ Ticker model ============================= */}
      {siteCfg.models.length > 0 && (
        <section aria-hidden className="overflow-hidden border-y border-neutral-200 py-4">
          {/* Duplikasi list hingga cukup panjang untuk marquee mulus, lalu gandakan lagi untuk loop -50% */}
          {(() => {
            const base = siteCfg.models;
            const reps = Math.max(2, Math.ceil((typeof window !== "undefined" ? window.innerWidth : 1920) / (base.length * 120)) + 1);
            const half = Array.from({ length: reps }, () => base).flat();
            return (
              <div className="flex w-max animate-[marquee_10s_linear_infinite] whitespace-nowrap" style={{ animationDuration: `${Math.min(60, half.length * 1.5)}s` }}>
                {[...half, ...half].map((m, i) => (
                  <span key={i} className={`flex items-center text-sm text-neutral-400 ${mono}`}>
                    <span className="px-6">{m.name}</span>
                    <span className="text-red-300">·</span>
                  </span>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      {/* ============================== Cara kerja ============================== */}
      <section id="cara-kerja" className="reveal scroll-mt-24 px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <SectionMark no="01" label="Cara kerja" />
          <h2 className={`mt-4 max-w-xl text-3xl tracking-tight md:text-4xl ${serif}`}>
            Integrasi dalam <em>tiga langkah</em>
          </h2>

          <ol className="mt-16 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.n} className="group border border-neutral-200 bg-white p-10 transition-colors hover:bg-neutral-50 reveal" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className={`text-sm text-red-600 ${mono}`}>{s.n}</span>
                <h3 className={`mt-4 text-xl tracking-tight ${serif}`}>{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-500">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================================= Model ================================ */}
      {siteCfg.models.length > 0 && (
        <section id="model" className="reveal scroll-mt-24 border-t border-neutral-200 px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <SectionMark no="02" label="Model" />
            <h2 className={`mt-4 max-w-xl text-3xl tracking-tight md:text-4xl ${serif}`}>
              Katalog <em>{siteCfg.models.length} model</em>
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-500">
              Semua model aktif beserta tarifnya. Harga dalam rupiah per 1.000 token.
            </p>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {siteCfg.models.map((m, i) => (
                <article key={m.modelId} className="flex flex-col border border-neutral-200 bg-white p-6 transition-colors hover:bg-neutral-50 reveal" style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
                  <h3 className={`text-xl leading-snug tracking-tight ${serif}`}>{m.name}</h3>
                  <p className={`mt-1 truncate text-sm text-neutral-400 ${mono}`}>{m.modelId}</p>

                  <dl className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm">
                    {m.maxOutputTokens != null && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-neutral-400">Maks. output</dt>
                        <dd className={mono}>{m.maxOutputTokens.toLocaleString("id-ID")}</dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-neutral-400">Input / 1K</dt>
                      <dd className={mono}>{priceLabel(m.paygPrompt)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-neutral-400">Output / 1K</dt>
                      <dd className={mono}>{priceLabel(m.paygCompletion)}</dd>
                    </div>
                  </dl>

                  <p className={`mt-3 text-sm text-neutral-400 ${mono}`}>
                    {priceLabel(m.planPrompt) === "Gratis" ? "Termasuk dalam paket token" : `Paket token: Rp ${formatPrice(m.planPrompt ?? 0)} / 1K input`}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================= Harga ================================ */}
      <section id="harga" className="reveal scroll-mt-24 border-t border-neutral-200 px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <SectionMark no="03" label="Harga" />
          <h2 className={`mt-4 max-w-xl text-3xl tracking-tight md:text-4xl ${serif}`}>
            Prabayar. <em>Tanpa langganan.</em>
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-500">
            Isi wallet, beli paket token, atau bayar per pemakaian. Setiap paket berlaku 30 hari.
          </p>

          <ul className="mt-16 grid gap-6 md:grid-cols-3">
            {pricingTiers.map((t, i) => (
              <li
                key={t.name}
                className={`flex flex-col border border-neutral-200 p-8 transition-colors reveal ${
                  t.popular ? "bg-neutral-950 text-white" : "bg-white hover:bg-neutral-50"
                }`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl tracking-tight ${serif}`}>{t.name}</h3>
                  {t.popular && <span className={`bg-red-600 px-2 py-0.5 text-sm uppercase tracking-[0.18em] text-white ${mono}`}>Populer</span>}
                </div>

                <p className={`mt-1 text-sm ${t.popular ? "text-neutral-400" : "text-neutral-500"}`}>{t.description}</p>

                <div className={`mt-5 text-4xl tracking-tight lg:text-5xl ${serif}`}>{t.price}</div>

                <ul className={`mt-5 space-y-3 border-t pt-5 text-sm ${t.popular ? "border-white/10" : "border-neutral-100"}`}>
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${t.popular ? "text-red-400" : "text-red-600"}`} />
                      <span className={t.popular ? "text-neutral-300" : "text-neutral-600"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={isAuthenticated ? "/my/plan" : "/register"}
                  className={
                    t.popular
                      ? "mt-7 inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
                      : "mt-7 inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-neutral-200 text-sm text-neutral-700 transition-colors hover:border-neutral-900"
                  }
                >
                  {t.cta} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================================== FAQ ================================= */}
      <section id="faq" className="reveal scroll-mt-24 border-t border-neutral-200 px-6 py-28">
        <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-[1fr_1.6fr]">
          <div>
            <SectionMark no="04" label="FAQ" />
            <h2 className={`mt-4 text-3xl tracking-tight md:text-4xl ${serif}`}>
              Pertanyaan yang <em>sering diajukan</em>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Ada pertanyaan lain?{" "}
              <Link href="/support" className="underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-900">
                Hubungi tim dukungan
              </Link>
              .
            </p>
          </div>

          <dl className="divide-y divide-neutral-100 border-y border-neutral-100">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt>
                  <button
                    onClick={() => setOpenFaq(openFaq === f.q ? null : f.q)}
                    aria-expanded={openFaq === f.q}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className={`text-lg tracking-tight transition-colors group-hover:text-neutral-500 ${serif}`}>{f.q}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300 ${openFaq === f.q ? "rotate-180" : ""}`} />
                  </button>
                </dt>
                {openFaq === f.q && <dd className="pb-6 pr-10 text-sm leading-relaxed text-neutral-500">{f.a}</dd>}
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* =============================== CTA akhir =============================== */}
      <section className="reveal border-t border-neutral-200 px-6 py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`text-3xl leading-tight tracking-tight md:text-4xl ${serif}`}>
            Request pertama Anda <em className="text-red-700">lima menit</em> dari sekarang.
          </h2>
          <div className="mt-12">
            <Link href={ctaHref} className="group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-9 py-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700">
              {isAuthenticated ? "Buka Dashboard" : "Daftar Sekarang"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================ Footer ================================ */}
      <footer className="border-t border-neutral-200 bg-neutral-50 px-6">
        <div className="mx-auto grid max-w-6xl gap-12 py-16 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              {siteCfg.loaded ? (
                <>
                  {siteCfg.logoMode !== "name" && <BrandLogo size="lg" siteCfg={siteCfg} />}
                  {siteCfg.logoMode !== "logo" && <span className={`text-base tracking-tight ${mono}`}>{siteCfg.siteName}</span>}
                </>
              ) : (
                <>
                  <Pulse className="h-8 w-8" />
                  <Pulse className="h-4 w-24" />
                </>
              )}
            </Link>
            {siteCfg.loaded && <p className="mt-5 max-w-xs text-sm leading-relaxed text-neutral-500">{siteCfg.tagline}</p>}

            <p className={`mt-6 inline-flex items-center gap-2 border border-neutral-200 bg-white px-3.5 py-1.5 text-sm ${mono}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${hm.dot} ${health === "ok" ? "pulse-dot" : ""}`} />
              <span className={hm.cls}>{hm.label}</span>
            </p>

            <address className={`mt-6 text-sm not-italic leading-relaxed text-neutral-400 ${mono}`}>
              Jakarta, Indonesia&nbsp;·&nbsp;UTC+7
            </address>
          </div>

          <nav aria-label="Produk">
            <h3 className={`text-sm uppercase tracking-[0.24em] text-neutral-400 ${mono}`}>Produk</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                ["Model AI", "/models"],
                ["Paket & Harga", "/plan"],
                ["Masuk", "/login"],
                ["Daftar", "/register"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-neutral-600 transition-colors hover:text-neutral-900">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Dukungan">
            <h3 className={`text-sm uppercase tracking-[0.24em] text-neutral-400 ${mono}`}>Dukungan</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                ["Pusat Bantuan", "/support"],
                ["Usage & Tagihan", "/usage"],
                ["Hubungi Kami", "mailto:hello@xperimne.com"],
              ].map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("mailto:") ? (
                    <a href={href} className="text-neutral-600 transition-colors hover:text-neutral-900">{label}</a>
                  ) : (
                    <Link href={href} className="text-neutral-600 transition-colors hover:text-neutral-900">{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-neutral-200 py-6 text-sm text-neutral-400 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} {siteCfg.siteName || "xPerimne"}. Semua hak dilindungi.</p>
          <p className={`uppercase tracking-[0.18em] ${mono}`}>OpenAI-compatible&nbsp;·&nbsp;API v1</p>
        </div>
      </footer>
    </div>
  );
}
