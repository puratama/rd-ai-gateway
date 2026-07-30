// Model alias resolver — map user-facing model names to actual provider model IDs
// ponytail: static alias map + prefix matching
// Upgrade path: load from DB, wildcard patterns, provider-specific translation

export interface AliasEntry {
  aliases: string[];       // user-facing names
  target: string;          // actual model ID sent to provider
  provider?: string;       // optional provider-specific alias
}

// ─── Built-in aliases ──────────────────────────────────────────────────────

const BUILTIN_ALIASES: AliasEntry[] = [
  // GPT family
  { aliases: ["gpt-4o", "gpt4o", "gpt-4o-mini"], target: "gpt-4o" },
  { aliases: ["gpt-4", "gpt4", "gpt-4-turbo"], target: "gpt-4-turbo" },
  { aliases: ["gpt-3.5", "gpt3.5", "gpt-3.5-turbo"], target: "gpt-3.5-turbo" },
  { aliases: ["o1", "o1-preview"], target: "o1-preview" },
  { aliases: ["o3", "o3-mini"], target: "o3-mini" },
  { aliases: ["gpt-5", "gpt5"], target: "gpt-5" },

  // Claude family
  { aliases: ["claude-sonnet-4", "claude-sonnet", "sonnet"], target: "claude-sonnet-4" },
  { aliases: ["claude-opus-4", "claude-opus", "opus"], target: "claude-opus-4" },
  { aliases: ["claude-haiku", "haiku"], target: "claude-haiku" },
  { aliases: ["claude-3.5-sonnet", "claude-3.5"], target: "claude-3.5-sonnet" },

  // Gemini
  { aliases: ["gemini-2.5-flash", "gemini-flash"], target: "gemini-2.5-flash" },
  { aliases: ["gemini-2.5-pro", "gemini-pro"], target: "gemini-2.5-pro" },

  // DeepSeek
  { aliases: ["deepseek-v3", "ds-v3", "deepseek-chat"], target: "deepseek-chat" },
  { aliases: ["deepseek-r1", "ds-r1", "deepseek-reasoner"], target: "deepseek-reasoner" },

  // Meta / LLaMA
  { aliases: ["llama-3.3-70b", "llama-70b", "meta-llama-70b"], target: "llama-3.3-70b" },
  { aliases: ["llama-4", "meta-llama-4"], target: "llama-4" },

  // Mistral
  { aliases: ["mistral-large", "mistral-large-3"], target: "mistral-large-3" },
  { aliases: ["mixtral", "mixtral-8x7b"], target: "mixtral-8x7b" },

  // Universal shorthand
  { aliases: ["auto", "best", "fast"], target: "auto" },
];

// ─── Runtime alias map ─────────────────────────────────────────────────────

const aliasMap = new Map<string, string>();

// Build reverse map: alias → target
function buildAliasMap(): void {
  aliasMap.clear();
  for (const entry of BUILTIN_ALIASES) {
    for (const alias of entry.aliases) {
      const normalized = alias.toLowerCase().replace(/[^a-z0-9.-]/g, "");
      aliasMap.set(normalized, entry.target);
    }
  }
}

// Build on load
buildAliasMap();

// ─── Public API ────────────────────────────────────────────────────────────

/** Resolve a user-facing model name to the actual model ID.
 *  Returns the original model if no alias matches (passthrough).
 *
 *  Rules:
 *  - Model names with "/" are treated as fully-qualified paths — NOT aliased.
 *  - Short names like "sonnet", "haiku", "gpt-4o" ARE resolved.
 */
export function resolveModelAlias(model: string): string {
  if (!model) return model;

  const normalized = model.toLowerCase().trim();

  // Models with "/" are fully-qualified paths (e.g. "nvidia/deepseek-ai/deepseek-v4-flash").
  // Only apply exact alias match for these — skip prefix/keyword matching.
  if (normalized.includes("/")) {
    // Exact alias match only (rare edge case for known path aliases)
    const exact = aliasMap.get(normalized);
    if (exact) return exact;
    return model; // passthrough — don't mess with fully-qualified paths
  }

  // 1. Exact match in alias map
  const exact = aliasMap.get(normalized);
  if (exact) return exact;

  // 2. Prefix match: e.g. "gpt-4o-xyz" → "gpt-4o"
  for (const [key, target] of aliasMap) {
    if (normalized.startsWith(key)) return target;
  }

  // 3. Keyword match: only for short names (no "/")
  if (normalized.includes("claude")) return "claude-sonnet-4";
  if (normalized.includes("gemini")) return "gemini-2.5-flash";
  if (normalized.includes("gpt")) return "gpt-4o";
  if (normalized.includes("o1")) return "o1-preview";
  if (normalized.includes("o3")) return "o3-mini";
  if (normalized.includes("deepseek")) return "deepseek-chat";
  if (normalized.includes("llama") || normalized.includes("meta")) return "llama-3.3-70b";
  if (normalized.includes("mistral") || normalized.includes("mixtral")) return "mistral-large-3";

  // 4. No match — return original
  return model;
}

// ─── Model Fallback Groups ──────────────────────────────────────────────────
// Adopted from OmniRoute's combo resolver concept.
// When a model fails with a permanent error, try alternatives in the same group.
// Groups are ordered by priority (index 0 = preferred).

const FALLBACK_GROUPS: Record<string, string[]> = {
  // GPT family
  "gpt-4o":          ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  "gpt-4o-mini":     ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  "gpt-4-turbo":     ["gpt-4-turbo", "gpt-4o", "gpt-4o-mini"],
  "gpt-4":           ["gpt-4-turbo", "gpt-4o", "gpt-4o-mini"],
  "gpt-3.5-turbo":   ["gpt-3.5-turbo", "gpt-4o-mini"],

  // Claude family
  "claude-sonnet-4": ["claude-sonnet-4", "claude-haiku", "claude-3.5-sonnet"],
  "claude-opus-4":   ["claude-opus-4", "claude-sonnet-4", "claude-haiku"],
  "claude-haiku":    ["claude-haiku", "claude-sonnet-4", "claude-3.5-sonnet"],
  "claude-3.5-sonnet": ["claude-3.5-sonnet", "claude-sonnet-4", "claude-haiku"],

  // Gemini family
  "gemini-2.5-flash": ["gemini-2.5-flash", "gemini-2.5-pro"],
  "gemini-2.5-pro":   ["gemini-2.5-pro", "gemini-2.5-flash"],

  // DeepSeek family
  "deepseek-chat":     ["deepseek-chat", "deepseek-reasoner"],
  "deepseek-reasoner": ["deepseek-reasoner", "deepseek-chat"],
  "deepseek-v3":       ["deepseek-chat", "deepseek-reasoner"],
  "deepseek-r1":       ["deepseek-reasoner", "deepseek-chat"],

  // LLaMA family
  "llama-3.3-70b": ["llama-3.3-70b", "llama-4"],
  "llama-4":       ["llama-4", "llama-3.3-70b"],

  // Mistral family
  "mistral-large-3": ["mistral-large-3", "mixtral-8x7b"],
  "mixtral-8x7b":    ["mixtral-8x7b", "mistral-large-3"],
};

// Also index by common prefixes so `deepseek-v4` → `deepseek-chat` group
function resolveFallbackGroup(model: string): string | undefined {
  // Exact match
  if (FALLBACK_GROUPS[model]) return model;

  // Prefix match — find first group that starts with the model prefix
  // e.g. "deepseek-v4" → find group starting with "deepseek"
  const normalized = model.toLowerCase();
  const keys = Object.keys(FALLBACK_GROUPS);
  for (const key of keys) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return key;
    }
  }
  return undefined;
}

/** Get fallback models to try when the primary model fails.
 *  Returns empty array if no fallback group is configured. */
export function getModelFallbacks(model: string): string[] {
  const groupKey = resolveFallbackGroup(model);
  if (!groupKey) return [];

  const group = FALLBACK_GROUPS[groupKey];
  // Return models AFTER the current one in the group
  const idx = group.indexOf(model);
  if (idx === -1) {
    // Model isn't in the group directly — return whole group minus current
    return group.filter((m) => m !== model);
  }
  return group.slice(idx + 1);
}

/** Add a custom fallback group at runtime. */
export function addFallbackGroup(primary: string, alternatives: string[]): void {
  FALLBACK_GROUPS[primary] = [primary, ...alternatives];
  // Also add reverse entries for each alternative
  for (const alt of alternatives) {
    if (!FALLBACK_GROUPS[alt]) {
      FALLBACK_GROUPS[alt] = [alt, primary, ...alternatives.filter((a) => a !== alt)];
    }
  }
}

/** Get all fallback groups (for admin UI). */
export function getFallbackGroups(): Record<string, string[]> {
  return { ...FALLBACK_GROUPS };
}

/** Add a custom alias at runtime (e.g., from admin config). */
export function addAlias(alias: string, target: string): void {
  const normalized = alias.toLowerCase().replace(/[^a-z0-9.-]/g, "");
  aliasMap.set(normalized, target);
}

/** Add multiple aliases from the format used in DB config. */
export function addAliasEntries(entries: { alias: string; target: string }[]): void {
  for (const e of entries) addAlias(e.alias, e.target);
}
