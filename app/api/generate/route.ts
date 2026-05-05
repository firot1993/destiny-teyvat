import { NextResponse } from "next/server";
import { callProviderWithFallbacks, ProviderError, callProviderStreaming } from "@/lib/providers";
import { checkPerIpLimit, checkAndConsumeDaily } from "@/lib/rateLimit";
import { recordLlmCall, type LlmPhase } from "@/lib/telemetry";
import { FALLBACK_PROVIDERS } from "@/lib/constants";
import type { LLMRequest, Message } from "@/types";

const MAX_REQUESTS_PER_DAY = parseInt(
  process.env.MAX_REQUESTS_PER_DAY ?? "1000",
  10
);

interface TelemetryMeta {
  sessionId?: string;
  phase?: LlmPhase;
  stepIndex?: number;
}

type RequestBody = LLMRequest & {
  telemetry?: TelemetryMeta;
  stream?: boolean;
  enableGeminiSearch?: boolean;
};

function dailyHeaders(limit: number, remaining: number) {
  return {
    "X-Daily-Limit": String(limit),
    "X-Daily-Remaining": String(Math.max(0, remaining)),
  };
}

function extractResponseText(response: { content?: Array<{ type: string; text: string }> }): string {
  if (!response?.content) return "";
  return response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

function joinUserPrompt(messages: Message[]): string {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");
}

export async function POST(request: Request) {
  // Per-IP rate limit
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipCheck = await checkPerIpLimit(ip);
  if (!ipCheck.allowed) {
    const daily = await checkAndConsumeDaily(MAX_REQUESTS_PER_DAY).catch(() => ({
      allowed: true,
      limit: MAX_REQUESTS_PER_DAY,
      remaining: MAX_REQUESTS_PER_DAY,
    }));
    return NextResponse.json(
      { error: "Rate limited. Try again later." },
      { status: 429, headers: dailyHeaders(daily.limit, daily.remaining) }
    );
  }

  // Global daily limit
  const daily = await checkAndConsumeDaily(MAX_REQUESTS_PER_DAY);
  if (!daily.allowed) {
    return NextResponse.json(
      { error: "Daily request limit reached. Try again tomorrow." },
      { status: 429, headers: dailyHeaders(daily.limit, daily.remaining) }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: dailyHeaders(daily.limit, daily.remaining) }
    );
  }

  const telemetry = body.telemetry;
  const providerRequest: LLMRequest = {
    provider: body.provider,
    model: body.model,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    messages: body.messages,
  };

  // ---------------------------------------------------------------------------
  // Streaming path (Enhancement 2)
  // ---------------------------------------------------------------------------
  if (body.stream) {
    try {
      const upstreamRes = await callProviderStreaming(providerRequest);

      if (!upstreamRes || !upstreamRes.body) {
        // Streaming not supported for this provider — fall back to non-streaming
        const response = await callProviderWithFallbacks(
          providerRequest,
          FALLBACK_PROVIDERS,
          { enableGeminiSearch: body.enableGeminiSearch }
        );
        return NextResponse.json(response, {
          status: 200,
          headers: dailyHeaders(daily.limit, daily.remaining),
        });
      }

      // Forward SSE stream to client
      return new Response(upstreamRes.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...dailyHeaders(daily.limit, daily.remaining),
        },
      });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status, headers: dailyHeaders(daily.limit, daily.remaining) }
        );
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return NextResponse.json(
        { error: message },
        { status: 500, headers: dailyHeaders(daily.limit, daily.remaining) }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Standard non-streaming path (with retry + fallback)
  // ---------------------------------------------------------------------------
  try {
    const startedAt = Date.now();
    const response = await callProviderWithFallbacks(
      providerRequest,
      FALLBACK_PROVIDERS,
      { enableGeminiSearch: body.enableGeminiSearch }
    );
    const latencyMs = Date.now() - startedAt;

    if (telemetry?.sessionId && telemetry.phase) {
      // Fire-and-forget — never block the user-facing response on DB latency.
      void recordLlmCall({
        sessionId: telemetry.sessionId,
        phase: telemetry.phase,
        stepIndex: telemetry.stepIndex,
        userPrompt: joinUserPrompt(providerRequest.messages),
        responseText: extractResponseText(response),
        provider: providerRequest.provider,
        model: providerRequest.model,
        temperature: providerRequest.temperature,
        maxTokens: providerRequest.max_tokens,
        latencyMs,
      });
    }

    return NextResponse.json(response, {
      status: 200,
      headers: dailyHeaders(daily.limit, daily.remaining),
    });
  } catch (err) {
    if (err instanceof ProviderError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status, headers: dailyHeaders(daily.limit, daily.remaining) }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: dailyHeaders(daily.limit, daily.remaining) }
    );
  }
}
