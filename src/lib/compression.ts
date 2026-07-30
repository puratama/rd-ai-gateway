// Prompt compression — reduce token count before sending to provider
// ponytail: whitespace + repeated-char + role-grouping compression only
// Upgrade path: add semantic compression (LLMLingua-style) when token savings justify infra cost

export interface CompressionConfig {
  enabled: boolean;
  stripExtraWhitespace: boolean;   // collapse multiple spaces/newlines
  trimMessages: boolean;            // trim leading/trailing whitespace per message
  groupConsecutiveRoles: boolean;   // merge adjacent messages with same role
  maxRepeatedChars: number;         // collapse repeated chars beyond this (0 = disable)
}

const DEFAULT_CONFIG: CompressionConfig = {
  enabled: true,
  stripExtraWhitespace: true,
  trimMessages: true,
  groupConsecutiveRoles: true,
  maxRepeatedChars: 50,
}

let config: CompressionConfig = { ...DEFAULT_CONFIG };

export function setCompressionConfig(partial: Partial<CompressionConfig>) {
  Object.assign(config, partial);
}

export interface CompressedMessage {
  role: string;
  content: string;
}

export interface CompressionResult {
  messages: CompressedMessage[];
  originalChars: number;
  compressedChars: number;
  savedChars: number;
  savedPercent: number;
}

/** Compress an array of chat messages. Returns compressed messages + stats. */
export function compressMessages(
  messages: { role: string; content: string }[]
): CompressionResult {
  if (!config.enabled) {
    return {
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      originalChars: countChars(messages),
      compressedChars: countChars(messages),
      savedChars: 0,
      savedPercent: 0,
    };
  }

  let working = messages.map((m) => ({ role: m.role, content: m.content }));
  const originalChars = countChars(working);

  // 1. Trim each message content
  if (config.trimMessages) {
    working = working.map((m) => ({ ...m, content: m.content.trim() }));
  }

  // 2. Collapse consecutive same-role messages
  if (config.groupConsecutiveRoles) {
    const grouped: CompressedMessage[] = [];
    for (const msg of working) {
      const last = grouped[grouped.length - 1];
      if (last && last.role === msg.role) {
        last.content += "\n" + msg.content;
      } else {
        grouped.push({ ...msg });
      }
    }
    working = grouped;
  }

  // 3. Strip extra whitespace
  if (config.stripExtraWhitespace) {
    working = working.map((m) => ({
      ...m,
      content: m.content
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{3,}/g, "  ")
        .trim(),
    }));
  }

  // 4. Collapse repeated chars
  if (config.maxRepeatedChars > 0) {
    const re = new RegExp(`(.)\\1{${config.maxRepeatedChars},}`, "g");
    working = working.map((m) => ({
      ...m,
      content: m.content.replace(re, (match) => match.slice(0, config.maxRepeatedChars + 1)),
    }));
  }

  const compressedChars = countChars(working);
  const savedChars = originalChars - compressedChars;

  return {
    messages: working,
    originalChars,
    compressedChars,
    savedChars,
    savedPercent: originalChars > 0 ? Math.round((savedChars / originalChars) * 10000) / 100 : 0,
  };
}

function countChars(messages: { role: string; content: string }[]): number {
  return messages.reduce((sum, m) => sum + m.role.length + 2 + m.content.length, 0);
}

/** Estimate tokens from characters (~4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.ceil((text?.length || 0) / 4);
}
