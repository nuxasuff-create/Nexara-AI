/// <reference types="vite/client" />

// Centralized OpenRouter 4-Key API Registration & Failover Engine Configuration

const RAW_KEYS = [
  import.meta.env.VITE_OPENROUTER_API_KEY_1 || import.meta.env.VITE_OPENROUTER_API_KEY || "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",
  import.meta.env.VITE_OPENROUTER_API_KEY_2 || "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",
  import.meta.env.VITE_OPENROUTER_API_KEY_3 || "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",
  import.meta.env.VITE_OPENROUTER_API_KEY_4 || "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"
];

// Filter out empty or unconfigured strings so only valid active keys remain
export const OPENROUTER_API_KEYS = RAW_KEYS.filter(
  (key): key is string => typeof key === 'string' && key.trim().length > 0
);

let currentKeyIndex = 0;

/**
 * Returns the currently active OpenRouter API key from the failover pool.
 */
export function getActiveOpenRouterKey(): string {
  if (OPENROUTER_API_KEYS.length === 0) return "";
  return OPENROUTER_API_KEYS[currentKeyIndex % OPENROUTER_API_KEYS.length];
}

/**
 * Automatically switches to the next available API key in the failover pool upon rate limit / quota detection.
 */
export function rotateOpenRouterKey(): string {
  if (OPENROUTER_API_KEYS.length <= 1) {
    return getActiveOpenRouterKey();
  }
  const prevIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % OPENROUTER_API_KEYS.length;
  console.log(
    `[Nexara Failover Engine] Key #${prevIndex + 1} exhausted. Auto-switching to Key #${currentKeyIndex + 1}...`
  );
  return getActiveOpenRouterKey();
}

