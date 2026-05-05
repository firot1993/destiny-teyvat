import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdventure } from "@/hooks/useAdventure";
import { ADVENTURE_STORAGE_KEY } from "@/lib/constants";

const REVEAL_JSON = JSON.stringify({
  name: "Yuna",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads. Her maps outlive rulers.",
  visionStory: "The wave rose. The ice answered.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "",
});

const SCENE_TEXT = `<scene>
She crossed the threshold.
</scene>
<choices>
follow the voice
stay where you are
turn back
</choices>
<closing>false</closing>
<summary>
Yuna crossed the gate.
</summary>`;

const ANSWERS = {
  wakeNotice: "the silence that isn't empty",
  weather: "thin cold air after a snowfall",
  trade: "to know something no one else knows",
  mark: "a question that outlives you",
  power: "knowledge — seeing what others miss",
  fork: "the one no one's taken",
  break: "silence — the kind that means you've decided",
};

function jsonResponse(body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchSequence(responses: Response[]) {
  let index = 0;
  vi.spyOn(global, "fetch").mockImplementation(async () => {
    const response = responses[index];
    index += 1;
    if (!response) {
      throw new Error("Unexpected fetch call");
    }
    return response;
  });
}

describe("useAdventure", () => {
  it("starts in idle phase", () => {
    const { result } = renderHook(() => useAdventure());
    expect(result.current.phase).toBe("idle");
    expect(result.current.adventure).toBeNull();
  });

  it("begins questionnaire and reveals a character", async () => {
    mockFetchSequence([
      jsonResponse({ content: [{ type: "text", text: REVEAL_JSON }] }, { "X-Daily-Limit": "10", "X-Daily-Remaining": "9" }),
    ]);

    const { result } = renderHook(() => useAdventure());

    act(() => {
      result.current.begin();
    });
    expect(result.current.phase).toBe("questionnaire");

    await act(async () => {
      await result.current.submitQuestionnaire(ANSWERS, "en");
    });

    expect(result.current.phase).toBe("reveal-shown");
    expect(result.current.character?.name).toBe("Yuna");
    expect(result.current.dailyRemaining).toBe(9);
  });

  it("loads the first scene after entering the world", async () => {
    mockFetchSequence([
      jsonResponse({ content: [{ type: "text", text: REVEAL_JSON }] }),
      jsonResponse({ content: [{ type: "text", text: SCENE_TEXT }] }),
    ]);

    const { result } = renderHook(() => useAdventure());

    await act(async () => {
      await result.current.submitQuestionnaire(ANSWERS, "en");
    });

    await act(async () => {
      await result.current.enterWorld("en");
    });

    expect(result.current.phase).toBe("scene-shown");
    expect(result.current.adventure?.scenes).toHaveLength(1);
    expect(result.current.adventure?.scenes[0].choices).toEqual([
      "follow the voice",
      "stay where you are",
      "turn back",
    ]);
  });

  it("can stop the story and end the run", async () => {
    mockFetchSequence([
      jsonResponse({ content: [{ type: "text", text: REVEAL_JSON }] }),
      jsonResponse({ content: [{ type: "text", text: SCENE_TEXT }] }),
    ]);

    const { result } = renderHook(() => useAdventure());

    await act(async () => {
      await result.current.submitQuestionnaire(ANSWERS, "en");
      await result.current.enterWorld("en");
    });

    act(() => {
      result.current.stopHere();
    });

    expect(result.current.phase).toBe("ended");
    expect(result.current.adventure?.endedBy).toBe("user");
  });

  it("resumes a saved adventure", async () => {
    localStorage.setItem(
      ADVENTURE_STORAGE_KEY,
      JSON.stringify({
        character: {
          framing: "protagonist",
          name: "Yuna",
          vision: "Cryo",
          nation: "Inazuma",
          weapon: "polearm",
          archetype: "Wandering Cartographer",
          bio: "Yuna walks the coastal roads. Her maps outlive rulers.",
          visionStory: "The wave rose. The ice answered.",
          constellation: "Lantern of Quiet Hours",
          signature: "A blade of ice that remembers the last hand it held.",
          knownAssociate: "",
        },
        scenes: [
          {
            sceneNumber: 1,
            text: "She crossed the threshold.",
            choices: ["follow the voice", "stay where you are", "turn back"],
            closing: false,
            summary: "Yuna crossed the gate.",
            fromChoice: "",
          },
        ],
        ended: false,
        endedBy: null,
        startedAt: "2026-05-05T00:00:00Z",
      })
    );

    const { result } = renderHook(() => useAdventure());

    await waitFor(() => {
      expect(result.current.hasSavedAdventure).toBe(true);
    });

    act(() => {
      expect(result.current.resumeAdventure()).toBe(true);
    });

    expect(result.current.phase).toBe("scene-shown");
    expect(result.current.adventure?.scenes).toHaveLength(1);
  });
});