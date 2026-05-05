import { getDb } from "@/lib/db";

export type SessionStatus =
  | "questionnaire"
  | "revealing"
  | "adventuring"
  | "complete"
  | "abandoned";

export type LlmPhase =
  | "reveal"
  | "scene";

export type UserRating = "like" | "dislike";

export interface CreateSessionPayload {
  sessionUuid: string;
  language?: string;
  provider?: string;
  model?: string;
  questionnaireAnswers?: Record<string, string>;
  adventureState?: unknown;
}

export interface RecordLlmCallPayload {
  sessionId: string;
  phase: LlmPhase;
  stepIndex?: number;
  systemPrompt?: string;
  userPrompt: string;
  responseText: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  latencyMs?: number;
}

export interface UpdateCurationPayload {
  sessionId: string;
  stateSnapshot?: unknown;
}

/** Best-effort — never throws; DB writes must not break the user-facing flow. */
function warn(op: string, err: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[telemetry] ${op} failed:`, err);
  }
}

export async function createSession(
  payload: CreateSessionPayload
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from("sessions")
      .insert({
        session_uuid: payload.sessionUuid,
        status: "questionnaire",
        language: payload.language ?? null,
        provider: payload.provider ?? null,
        model: payload.model ?? null,
        questionnaire_answers: payload.questionnaireAnswers ?? null,
        normalized_fields: payload.adventureState ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    warn("createSession", err);
    return null;
  }
}

export async function recordLlmCall(
  payload: RecordLlmCallPayload
): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    const { error } = await db.from("llm_calls").insert({
      session_id: payload.sessionId,
      phase: payload.phase,
      step_index: payload.stepIndex ?? 0,
      system_prompt: payload.systemPrompt ?? null,
      user_prompt: payload.userPrompt,
      response_text: payload.responseText,
      provider: payload.provider ?? null,
      model: payload.model ?? null,
      temperature: payload.temperature ?? null,
      max_tokens: payload.maxTokens ?? null,
      latency_ms: payload.latencyMs ?? null,
    });
    if (error) throw error;
  } catch (err) {
    warn("recordLlmCall", err);
  }
}

export async function updateSessionCuration(
  payload: UpdateCurationPayload
): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    const { error } = await db
      .from("sessions")
      .update({
        status: "adventuring",
        scan_fragments: payload.stateSnapshot ?? null,
      })
      .eq("id", payload.sessionId);
    if (error) throw error;
  } catch (err) {
    warn("updateSessionCuration", err);
  }
}

export async function completeSession(
  sessionId: string,
  finalStory: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    const { error } = await db
      .from("sessions")
      .update({ status: "complete", final_story: finalStory })
      .eq("id", sessionId);
    if (error) throw error;
  } catch (err) {
    warn("completeSession", err);
  }
}

export async function rateSession(
  sessionId: string,
  rating: UserRating,
  feedback?: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    const { error } = await db
      .from("sessions")
      .update({
        user_rating: rating,
        user_feedback: feedback ?? null,
        rated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (error) throw error;
  } catch (err) {
    warn("rateSession", err);
  }
}
