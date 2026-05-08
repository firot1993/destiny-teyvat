export const DEFAULT_PROVIDER = "openrouter";

export const PROVIDERS: Record<string, string[]> = {
  openrouter: [
    "anthropic/claude-sonnet-4.6",
    "openai/gpt-5.4",
  ],
  deepseek: [
    "deepseek-v4-flash",
    "deepseek-v4-pro",
  ],
  xai: [
    "grok-4.20-experimental-beta-0304-reasoning",
    "grok-4.20-multi-agent-experimental-beta-0304",
    "grok-4-1-fast-reasoning",
  ],
};

export const DAILY_USAGE_STORAGE_PREFIX = "destiny-daily-usage";
export const API_ROUTE = "/api/generate";
export const STREAMING_API_ROUTE = "/api/generate/stream";

/**
 * Fallback provider chain — tried in order when the primary provider fails
 * with a retryable error. Configurable via env at build time.
 */
export const FALLBACK_PROVIDERS: string[] = (
  process.env.NEXT_PUBLIC_FALLBACK_PROVIDERS ?? ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Maximum retry attempts per LLM call (exponential backoff). */
export const MAX_RETRIES = 2;

/** Base delay in ms for exponential backoff between retries. */
export const RETRY_BASE_DELAY_MS = 1000;

/** Whether Gemini web-search grounding is enabled by default. */
export const GEMINI_SEARCH_GROUNDING_DEFAULT = false;

export const ADVENTURE_STORAGE_KEY = "destiny-adventure-state";
export const LIBRARY_STORAGE_KEY = "destiny-adventure-library";
export const LAST_ANSWERS_STORAGE_KEY = "destiny-last-answers";
export const LAST_REVEAL_STORAGE_KEY = "destiny-last-reveal";
export const LAST_FATED_STORAGE_KEY = "destiny-last-fated";
export const MAX_SCENES = 10;
export const REVEAL_MAX_TOKENS = 1500;
export const SCENE_MAX_TOKENS = 1200;
