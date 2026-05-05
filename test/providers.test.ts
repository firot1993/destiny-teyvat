import { afterEach, describe, expect, it, vi } from "vitest";
import { PROVIDERS } from "@/lib/constants";
import {
  buildProviderConfig,
  buildStreamingProviderConfig,
  callProvider,
} from "@/lib/providers";
import type { LLMRequest } from "@/types";

const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;

function deepSeekRequest(overrides: Partial<LLMRequest> = {}): LLMRequest {
  return {
    provider: "deepseek",
    model: "deepseek-v4-pro",
    max_tokens: 1234,
    temperature: 0.7,
    messages: [{ role: "user", content: "Show me a possible future." }],
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
});

describe("DeepSeek provider", () => {
  it("offers current DeepSeek model presets in the provider picker", () => {
    expect(PROVIDERS.deepseek).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-pro",
    ]);
  });

  it("builds a DeepSeek chat completions request", () => {
    process.env.DEEPSEEK_API_KEY = "ds-test-key";

    const config = buildProviderConfig(deepSeekRequest());
    const body = JSON.parse(config.apiBody);

    expect(config.apiUrl).toBe("https://api.deepseek.com/chat/completions");
    expect(config.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer ds-test-key",
    });
    expect(body).toEqual({
      model: "deepseek-v4-pro",
      max_tokens: 1234,
      temperature: 0.7,
      messages: [{ role: "user", content: "Show me a possible future." }],
    });
  });

  it("builds a DeepSeek streaming request", () => {
    process.env.DEEPSEEK_API_KEY = "ds-stream-key";

    const config = buildStreamingProviderConfig(deepSeekRequest());
    const body = JSON.parse(config?.apiBody ?? "{}");

    expect(config?.apiUrl).toBe("https://api.deepseek.com/chat/completions");
    expect(config?.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer ds-stream-key",
    });
    expect(body).toEqual({
      model: "deepseek-v4-pro",
      max_tokens: 1234,
      temperature: 0.7,
      stream: true,
      messages: [{ role: "user", content: "Show me a possible future." }],
    });
  });

  it("normalizes DeepSeek chat completions into text content blocks", async () => {
    process.env.DEEPSEEK_API_KEY = "ds-normalize-key";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                reasoning_content: "private chain of thought",
                content: "A concrete future arrives.",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await callProvider(deepSeekRequest());

    expect(response).toEqual({
      content: [{ type: "text", text: "A concrete future arrives." }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer ds-normalize-key",
        }),
      })
    );
  });
});
