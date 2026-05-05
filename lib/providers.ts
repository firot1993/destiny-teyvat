import type { LLMRequest, AnthropicResponse } from "@/types";
import { MAX_RETRIES, RETRY_BASE_DELAY_MS } from "@/lib/constants";

interface UpstreamError {
  error?: string | { message?: string };
  message?: string;
}

function extractUpstreamError(data: UpstreamError | null): string {
  if (!data) return "";
  if (typeof data.error === "string") return data.error;
  if (typeof data.message === "string") return data.message;
  if (typeof data.error?.message === "string") return data.error.message;
  return "";
}

function extractGeminiText(data: Record<string, unknown>): string {
  const candidates = data?.candidates as Array<{
    content?: { parts?: Array<{ text?: string }> };
  }> | undefined;
  const parts = candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n")
    .trim();
}

function extractOpenRouterText(
  data: Record<string, unknown>
): string {
  const choices = data?.choices as Array<{
    message?: { content?: string | Array<{ type?: string; text?: string }> };
  }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text" && typeof part.text === "string") return part.text;
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Whether an error status code is retryable (server errors and rate limits). */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProviderConfig {
  apiUrl: string;
  headers: Record<string, string>;
  apiBody: string;
}

/**
 * Build the upstream request config for a given provider.
 * Extracted so it can be reused by both the non-streaming and streaming paths.
 */
export function buildProviderConfig(
  req: LLMRequest,
  opts?: { enableGeminiSearch?: boolean }
): ProviderConfig {
  const { provider, ...body } = req as LLMRequest & { provider: string };
  const enableSearch = opts?.enableGeminiSearch ?? true;

  if (provider === "gemini") {
    const model = body.model || "gemini-3-flash-preview";
    return {
      apiUrl: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      apiBody: JSON.stringify({
        contents: (body.messages || []).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        ...(enableSearch ? { tools: [{ google_search: {} }] } : {}),
      }),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GOOGLE_API_KEY ?? "",
      },
    };
  }

  if (provider === "xai") {
    return {
      apiUrl: "https://api.x.ai/v1/chat/completions",
      apiBody: JSON.stringify({
        model: body.model || "grok-4-1-fast-non-reasoning",
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature ?? 1.0,
        messages: (body.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY ?? ""}`,
      },
    };
  }

  if (provider === "deepseek") {
    return {
      apiUrl: "https://api.deepseek.com/chat/completions",
      apiBody: JSON.stringify({
        model: body.model || "deepseek-v4-flash",
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature ?? 1.0,
        messages: (body.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY ?? ""}`,
      },
    };
  }

  if (provider === "openrouter") {
    return {
      apiUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiBody: JSON.stringify({
        model: body.model || "anthropic/claude-sonnet-4-20250514",
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature ?? 1.0,
        messages: (body.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
        "HTTP-Referer": process.env.SITE_URL || "https://localhost:3000",
        "X-Title": "Life Trajectory Diffusion",
      },
    };
  }

  // Default: Anthropic direct
  return {
    apiUrl: "https://api.anthropic.com/v1/messages",
    apiBody: JSON.stringify({
      model: body.model || "claude-sonnet-4-20250514",
      max_tokens: body.max_tokens || 1000,
      temperature: body.temperature ?? 1.0,
      messages: body.messages || [],
    }),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
  };
}

function parseProviderResponse(
  provider: string,
  data: Record<string, unknown> | null
): AnthropicResponse {
  if (provider === "gemini") {
    const text = data ? extractGeminiText(data) : "";
    if (!text) {
      throw new ProviderError(
        extractUpstreamError(data as UpstreamError | null) ||
          "Upstream API returned no text content.",
        502
      );
    }
    return { content: [{ type: "text", text }] };
  }

  if (provider === "xai" || provider === "openrouter" || provider === "deepseek") {
    const text = data ? extractOpenRouterText(data) : "";
    if (!text) {
      throw new ProviderError(
        extractUpstreamError(data as UpstreamError | null) ||
          "Upstream API returned no text content.",
        502
      );
    }
    return { content: [{ type: "text", text }] };
  }

  // Anthropic: return as-is
  return data as unknown as AnthropicResponse;
}

/**
 * Call a provider with automatic retry + exponential backoff.
 */
export async function callProvider(
  req: LLMRequest,
  opts?: { enableGeminiSearch?: boolean }
): Promise<AnthropicResponse> {
  const { provider } = req;
  const config = buildProviderConfig(req, opts);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }

    try {
      const apiRes = await fetch(config.apiUrl, {
        method: "POST",
        headers: config.headers,
        body: config.apiBody,
      });

      const rawText = await apiRes.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        // non-JSON upstream error
      }

      if (!apiRes.ok) {
        const msg =
          extractUpstreamError(data as UpstreamError | null) ||
          rawText.slice(0, 300) ||
          `Upstream API error (${apiRes.status})`;
        const error = new ProviderError(msg, apiRes.status);

        if (isRetryable(apiRes.status) && attempt < MAX_RETRIES) {
          lastError = error;
          continue;
        }
        throw error;
      }

      return parseProviderResponse(provider, data);
    } catch (err) {
      if (err instanceof ProviderError) {
        if (isRetryable(err.status) && attempt < MAX_RETRIES) {
          lastError = err;
          continue;
        }
        throw err;
      }
      // Network errors are retryable
      if (attempt < MAX_RETRIES) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new ProviderError("All retry attempts exhausted.", 502);
}

/**
 * Try calling the primary provider, then fall through to fallback providers.
 */
export async function callProviderWithFallbacks(
  req: LLMRequest,
  fallbackProviders: string[],
  opts?: { enableGeminiSearch?: boolean }
): Promise<AnthropicResponse> {
  try {
    return await callProvider(req, opts);
  } catch (primaryErr) {
    if (
      !(primaryErr instanceof ProviderError) ||
      !isRetryable(primaryErr.status) ||
      fallbackProviders.length === 0
    ) {
      throw primaryErr;
    }

    // Try fallback providers in order
    for (const fallbackProvider of fallbackProviders) {
      try {
        return await callProvider(
          { ...req, provider: fallbackProvider },
          opts
        );
      } catch {
        // Try next fallback
      }
    }

    // All fallbacks failed — throw original error
    throw primaryErr;
  }
}

// ---------------------------------------------------------------------------
// Enhancement 2: Streaming support
// ---------------------------------------------------------------------------

/**
 * Build a streaming request config for OpenAI-compatible APIs.
 * Gemini and Anthropic have different streaming shapes — only OpenAI-compat is
 * supported in this initial pass.
 */
export function buildStreamingProviderConfig(
  req: LLMRequest
): ProviderConfig | null {
  const { provider, ...body } = req as LLMRequest & { provider: string };

  if (provider === "openrouter") {
    return {
      apiUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiBody: JSON.stringify({
        model: body.model || "anthropic/claude-sonnet-4-20250514",
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature ?? 1.0,
        stream: true,
        messages: (body.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
        "HTTP-Referer": process.env.SITE_URL || "https://localhost:3000",
        "X-Title": "Life Trajectory Diffusion",
      },
    };
  }

  if (provider === "xai") {
    return {
      apiUrl: "https://api.x.ai/v1/chat/completions",
      apiBody: JSON.stringify({
        model: body.model || "grok-4-1-fast-non-reasoning",
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature ?? 1.0,
        stream: true,
        messages: (body.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY ?? ""}`,
      },
    };
  }

  if (provider === "deepseek") {
    return {
      apiUrl: "https://api.deepseek.com/chat/completions",
      apiBody: JSON.stringify({
        model: body.model || "deepseek-v4-flash",
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature ?? 1.0,
        stream: true,
        messages: (body.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY ?? ""}`,
      },
    };
  }

  // Gemini and Anthropic streaming not supported in this initial pass
  return null;
}

/**
 * Call a provider in streaming mode and return the upstream Response for SSE
 * forwarding. Returns null if the provider doesn't support streaming.
 */
export async function callProviderStreaming(
  req: LLMRequest
): Promise<Response | null> {
  const config = buildStreamingProviderConfig(req);
  if (!config) return null;

  const apiRes = await fetch(config.apiUrl, {
    method: "POST",
    headers: config.headers,
    body: config.apiBody,
  });

  if (!apiRes.ok) {
    const rawText = await apiRes.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      // ignore
    }
    const msg =
      extractUpstreamError(data as UpstreamError | null) ||
      rawText.slice(0, 300) ||
      `Upstream streaming API error (${apiRes.status})`;
    throw new ProviderError(msg, apiRes.status);
  }

  return apiRes;
}
