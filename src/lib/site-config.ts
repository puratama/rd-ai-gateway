export const siteConfig = {
  brandName: "xPerimne",
  shortName: "xPerimne",
  tagline: {
    id: "Banyak model AI premium. Satu API. Harga lokal.",
    en: "Premium AI models. One API. Local pricing.",
  },
  description: {
    id: "Gateway OpenAI-compatible untuk developer Indonesia. Akses model terbaik, kelola API key, pantau usage, dan mulai integrasi dalam hitungan menit.",
    en: "OpenAI-compatible gateway for developers. Access top models, manage API keys, track usage, and integrate in minutes.",
  },
  baseUrl: "https://api.xperimne.com/v1",
  supportUrl: "https://t.me/",
  defaultLocale: "id",
  logoMode: "bolt",
} as const;

export type Locale = keyof typeof siteConfig.tagline;
