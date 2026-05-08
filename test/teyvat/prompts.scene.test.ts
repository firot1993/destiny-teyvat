import { describe, expect, it } from "vitest";
import {
  buildScenePrompt,
  parseSceneStream,
} from "@/lib/teyvat/prompts";
import type { RevealedCharacter } from "@/lib/teyvat/character";
import type { AdventureState } from "@/lib/teyvat/scenes";
import { createTree } from "@/lib/teyvat/sceneTree";

const CHARACTER: RevealedCharacter = {
  framing: "companion",
  name: "Yuna",
  title: "The Quiet Cartographer",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads. Her maps outlive rulers.",
  visionStory: "Yashiori. The wave. The ice answered.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "Wanderer — they share a quiet contempt for fate",
};

const STATE: AdventureState = {
  id: "test-scene-1",
  character: CHARACTER,
  tree: createTree({
    id: "n1", parentId: null, depth: 1, choiceTaken: null,
    prose: "She crossed the gate and the cold recognized her.",
    choices: ["follow the voice", "stay where you are", "turn back into the rain"],
    closing: false,
    summary: "Yuna crossed the gate and heard a voice call her name.",
    fromChoice: "",
  }),
  committed: true,
  ended: false,
  endedBy: null,
  startedAt: "2026-05-05T00:00:00Z",
};

describe("buildScenePrompt", () => {
  it("includes character details and story-so-far", () => {
    const prompt = buildScenePrompt(STATE, 2, "follow the voice", "en");
    expect(prompt).toContain("Yuna");
    expect(prompt).toContain("Cryo");
    expect(prompt).toContain("follow the voice");
  });

  it("mentions the companion when framing is companion", () => {
    const prompt = buildScenePrompt(STATE, 2, "follow the voice", "en");
    expect(prompt).toContain("Wanderer");
  });

  it("injects different pacing guidance per scene number", () => {
    const s1 = buildScenePrompt(STATE, 1, "", "en");
    const s10 = buildScenePrompt(STATE, 10, "follow the voice", "en");
    expect(s1).toMatch(/closing must be false/i);
    expect(s10.toLowerCase()).toMatch(/closing must be true|land the plane/);
  });

  it("declares the streaming tag format", () => {
    const prompt = buildScenePrompt(STATE, 2, "follow the voice", "en");
    expect(prompt).toContain("<scene>");
    expect(prompt).toContain("<choices>");
    expect(prompt).toContain("<summary>");
  });
});

describe("parseSceneStream", () => {
  const completed = `<scene>
She crossed the threshold. The cold of her own Vision stilled her.

A voice called her name from inside the gate.
</scene>
<choices>
follow the voice
stay where you are
turn back into the rain
</choices>
<closing>false</closing>
<summary>
Yuna crossed the gate and a voice called her name.
</summary>`;

  it("parses a complete scene", () => {
    const result = parseSceneStream(completed);
    expect(result.complete).toBe(true);
    expect(result.text).toContain("She crossed the threshold");
    expect(result.choices).toEqual([
      "follow the voice",
      "stay where you are",
      "turn back into the rain",
    ]);
    expect(result.closing).toBe(false);
    expect(result.summary).toBe("Yuna crossed the gate and a voice called her name.");
  });

  it("returns partial state during streaming", () => {
    const partial = "<scene>\nShe crossed the threshold. The cold of her own Vision";
    const result = parseSceneStream(partial);
    expect(result.complete).toBe(false);
    expect(result.text).toContain("She crossed the threshold");
    expect(result.choices).toEqual([]);
  });

  it("treats the next choices tag as a tolerant scene terminator", () => {
    const sloppy = `<scene>
She crossed the threshold.
<choices>
follow the voice
stay where you are
turn back
</choices>
<closing>true</closing>
<summary>
Yuna crossed.
</summary>`;
    const result = parseSceneStream(sloppy);
    expect(result.complete).toBe(true);
    expect(result.text).toContain("She crossed");
    expect(result.choices.length).toBe(3);
    expect(result.closing).toBe(true);
  });

  it("parses closing=true", () => {
    const closingScene = completed.replace("<closing>false</closing>", "<closing>true</closing>");
    const result = parseSceneStream(closingScene);
    expect(result.closing).toBe(true);
  });
});