export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  provider: string;
  model: string;
  max_tokens: number;
  temperature: number;
  messages: Message[];
}

export interface AnthropicResponse {
  content: Array<{ type: "text"; text: string }>;
}

export interface DailyQuota {
  limit: number;
  remaining: number;
}
export type Language = "en" | "zh";

/** Streaming request body extends the normal LLM request with a stream flag. */
export interface StreamingLLMRequest extends LLMRequest {
  stream?: boolean;
}
