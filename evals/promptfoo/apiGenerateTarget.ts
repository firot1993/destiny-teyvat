type PromptfooContext = {
  vars?: Record<string, unknown>;
};

type ProviderOptions = {
  id?: string;
  config?: Record<string, unknown>;
};

type TargetResponse = {
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function extractOutput(data: unknown): string {
  const content = (data as { content?: Array<{ type?: string; text?: string }> })?.content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
  }

  const output = (data as { output?: unknown; text?: unknown; error?: unknown })?.output;
  if (typeof output === "string") return output.trim();
  const text = (data as { text?: unknown })?.text;
  if (typeof text === "string") return text.trim();
  return "";
}

export default class ApiGenerateTarget {
  private providerId: string;
  private config: Record<string, unknown>;

  constructor(options: ProviderOptions = {}) {
    this.providerId = options.id ?? "destiny-api-generate";
    this.config = options.config ?? {};
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string, context?: PromptfooContext): Promise<TargetResponse> {
    const vars = context?.vars ?? {};
    const adversarialPrompt = readString(
      vars.prompt,
      readString(vars.message, readString(prompt, ""))
    );
    const baseUrl = trimTrailingSlash(
      readString(
        vars.baseUrl,
        readString(
          this.config.baseUrl,
          process.env.PROMPTFOO_TARGET_BASE_URL || "http://127.0.0.1:3000"
        )
      )
    );
    const provider = readString(
      vars.provider,
      readString(
        this.config.provider,
        process.env.PROMPTFOO_TARGET_PROVIDER || "openrouter"
      )
    );
    const model = readString(
      vars.model,
      readString(this.config.model, process.env.PROMPTFOO_TARGET_MODEL || "")
    );
    const maxTokens = readNumber(vars.maxTokens, readNumber(this.config.maxTokens, 800));
    const temperature = readNumber(
      vars.temperature,
      readNumber(this.config.temperature, 0.4)
    );

    const body = {
      provider,
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: "user",
          content: adversarialPrompt,
        },
      ],
      enableGeminiSearch: false,
    };

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await response.text();
      let parsed: unknown = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        // Keep raw text below for error reporting.
      }

      if (!response.ok) {
        const errorMessage =
          typeof (parsed as { error?: unknown })?.error === "string"
            ? (parsed as { error: string }).error
            : raw.slice(0, 300);
        return {
          error: `Target API ${response.status}: ${errorMessage}`,
          metadata: { provider, model, baseUrl },
        };
      }

      const output = extractOutput(parsed);
      return {
        output,
        metadata: {
          provider,
          model,
          baseUrl,
          status: response.status,
        },
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        metadata: { provider, model, baseUrl },
      };
    }
  }
}
