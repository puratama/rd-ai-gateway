import { Locale } from "./site-config";

const DICTIONARY: Record<Locale, Record<string, string>> = {
  id: {
    // Shared
    "sign_in": "Masuk",
    "sign_up": "Daftar",
    "start_free": "Mulai Gratis",
    "settings": "Pengaturan",
    "dashboard": "Dashboard",
    "chat": "Chat",
    "api_keys": "API Keys",
    "pricing": "Harga",
    "usage": "Penggunaan",
    "analytics": "Analitik",
    "wallet": "Dompet",
    "admin": "Admin",
    "logout": "Keluar",
    "back_to_app": "Kembali ke Aplikasi",
    "light": "Terang",
    "dark": "Gelap",
    "system": "Sistem",
    "language": "Bahasa",

    // Landing
    "hero_title": "37+ Model AI Premium. Satu API.",
    "hero_sub": "Drop-in OpenAI replacement untuk developer Indonesia. Akses Claude, GPT, Gemini, DeepSeek, dan model AI premium lainnya langsung dari IDE favoritmu. Setup 2 menit, langsung bisa pakai.",
    "free_no_card": "Gratis tanpa kartu kredit",
    "setup_2min": "Setup 2 menit",
    "support_id": "Support Bahasa Indonesia",
    "models_count": "Banyak model AI",
    "providers_count": "Provider",
    "starting_price": "Mulai Dari",
    "setup_time": "Waktu Setup",

    // Features
    "dev_first_title": "Developer-First, Indonesia-Ready",
    "feature_unified": "Satu API untuk semua model",
    "feature_dropin": "Drop-in OpenAI Replacement",
    "feature_dash": "Dashboard & Analitik Penggunaan",
    "feature_localprice": "Harga dalam Rupiah",
    "feature_support": "Support Bahasa Indonesia",
    "feature_secure": "Data Aman & Privat",

    // How it works
    "how_title": "3 Langkah, Langsung Pakai",
    "step1_title": "Daftar & Generate Key",
    "step1_desc": "Bikin akun, generate API key dari dashboard. Free credit langsung aktif.",
    "step2_title": "Setup di Tool Kamu",
    "step2_desc": "Paste Base URL dan API Key di Cursor, VS Code, atau aplikasi OpenAI-compatible.",
    "step3_title": "Mulai Pakai AI",
    "step3_desc": "Pilih model favorit langsung dari chat atau API. Manage key, monitor usage dari dashboard.",

    // Models
    "models_title": "Model Tersedia",
    "models_sub": "Akses semua model dari provider terbaik dunia. Tinggal ganti nama model.",

    // Compatibility
    "compat_title": "Drop-in OpenAI Replacement",
    "compat_sub": "Hanya ganti Base URL dan API Key. Selesai.",

    // Pricing
    "pricing_title": "Harga Terjangkau",
    "pricing_sub": "Mulai gratis, upgrade sesuai kebutuhan.",
    "pricing_free": "Gratis",
    "pricing_custom": "Custom",
    "pricing_popular": "Paling Populer",
    "pricing_best_value": "Best Value",

    // Testimonials
    "testimonials_title": "Dipercaya Developer",
    "testimonials_sub": "Cerita dari developer yang sudah pakai.",

    // FAQ
    "faq_title": "Pertanyaan yang Sering Ditanyakan",
    "faq_sub": "Belum ketemu jawabannya?",

    // CTA
    "cta_title": "Mulai Pakai AI Premium Sekarang",
    "cta_sub": "Klaim akses gratis. Daftar, langsung dapat API key, langsung mulai.",

    // Dashboard Hub
    "hub_welcome": "Selamat datang, ",
    "hub_next_step": "Langkah Selanjutnya",
    "hub_generate_key": "Generate API Key",
    "hub_open_chat": "Buka Chat",
    "hub_base_url": "Base URL",
    "hub_copy": "Salin",
    "hub_copied": "Disalin",
    "hub_stats_tokens": "Total Token",
    "hub_stats_cost": "Total Biaya",
    "hub_stats_requests": "Total Request",
    "hub_active_key": "API Key Aktif",
    "hub_no_key": "Belum ada key",

    // Auth
    "auth_welcome": "Selamat datang",
    "auth_welcome_back": "Selamat datang kembali",
    "auth_create": "Buat Akun",
    "auth_signin_to": "Masuk ke dashboard kamu",
    "auth_start_build": "Mulai pakai model AI terbaik",
    "auth_have_account": "Sudah punya akun?",
    "auth_no_account": "Belum punya akun?",
    "auth_name": "Nama",
    "auth_email": "Email",
    "auth_password": "Kata Sandi",
    "auth_login": "Masuk",
    "auth_create_account": "Buat Akun",
    "auth_claim_free": "Klaim Token Gratis",
    "auth_or_manual": "atau daftar manual",

    // Chat
    "new_chat": "Chat Baru",
  },

  en: {
    "sign_in": "Sign In",
    "sign_up": "Sign Up",
    "start_free": "Start Free",
    "settings": "Settings",
    "dashboard": "Dashboard",
    "chat": "Chat",
    "api_keys": "API Keys",
    "pricing": "Pricing",
    "usage": "Usage",
    "analytics": "Analytics",
    "wallet": "Wallet",
    "admin": "Admin",
    "logout": "Sign Out",
    "back_to_app": "Back to App",
    "light": "Light",
    "dark": "Dark",
    "system": "System",
    "language": "Language",

    "hero_title": "Premium AI Models. One API.",
    "hero_sub": "OpenAI-compatible gateway for developers. Access Claude, GPT, Gemini, DeepSeek, and top AI models directly from your favorite IDE. 2-minute setup, start coding immediately.",
    "free_no_card": "Free, no credit card",
    "setup_2min": "2-minute setup",
    "support_id": "ID Support",

    "dev_first_title": "Developer-First",
    "feature_unified": "One API for all models",
    "feature_dropin": "Drop-in OpenAI Replacement",
    "feature_dash": "Usage Dashboard & Analytics",
    "feature_localprice": "Pay in Rupiah",
    "feature_support": "Indo Language Support",
    "feature_secure": "Secure & Private",

    "how_title": "3 Steps to Start",
    "step1_title": "Register & Generate Key",
    "step1_desc": "Create an account, generate your API key. Free credit instantly active.",
    "step2_title": "Set Up Your Tool",
    "step2_desc": "Paste Base URL and API Key into Cursor, VS Code, or any OpenAI-compatible tool.",
    "step3_title": "Start Coding with AI",
    "step3_desc": "Pick your model from chat or API. Manage keys, monitor usage from dashboard.",

    "models_title": "Available Models",
    "models_sub": "Access models from the world's best providers. Just change the model name.",

    "compat_title": "Drop-in OpenAI Replacement",
    "compat_sub": "Just replace Base URL and API Key. Done.",

    "pricing_title": "Affordable Pricing",
    "pricing_sub": "Start free, upgrade as needed.",

    "testimonials_title": "Trusted by Developers",
    "faq_title": "Frequently Asked Questions",
    "faq_sub": "Still have questions?",

    "cta_title": "Start Using Premium AI Now",
    "cta_sub": "Claim free access. Register, get an API key, start immediately.",

    "hub_welcome": "Welcome, ",
    "hub_next_step": "Next Steps",
    "hub_generate_key": "Generate API Key",
    "hub_open_chat": "Open Chat",
    "hub_copy": "Copy",
    "hub_copied": "Copied",

    "auth_welcome": "Welcome",
    "auth_welcome_back": "Welcome back",
    "auth_create": "Create Account",
    "auth_signin_to": "Sign in to your dashboard",
    "auth_have_account": "Already have an account?",
    "auth_no_account": "Don't have an account?",
    "auth_name": "Name",
    "auth_email": "Email",
    "auth_password": "Password",
    "auth_login": "Sign In",
    "auth_create_account": "Create Account",
    "auth_claim_free": "Claim Free Tokens",
    "auth_or_manual": "or sign up manually",

    "new_chat": "New Chat",
  },
};

export function t(locale: Locale, key: string, fallback?: string): string {
  const lang = DICTIONARY[locale] || DICTIONARY.id;
  return lang[key] || fallback || key;
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return "id";
  const stored = localStorage.getItem("xperimne-locale");
  if (stored === "en") return "en";
  return "id";
}

export function setLocale(locale: Locale) {
  localStorage.setItem("xperimne-locale", locale);
}