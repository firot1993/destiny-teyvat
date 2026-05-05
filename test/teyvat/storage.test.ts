import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAdventure,
  loadAdventure,
  saveAdventure,
} from "@/lib/teyvat/storage";
import type { AdventureState } from "@/lib/teyvat/scenes";

const STATE: AdventureState = {
  id: "test-storage-1",
  character: {
    framing: "protagonist",
    name: "Yuna",
    title: "The Quiet Cartographer",
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
  scenes: [],
  ended: false,
  endedBy: null,
  startedAt: "2026-05-05T00:00:00Z",
};

describe("adventure storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads a valid adventure", () => {
    saveAdventure(STATE);
    expect(loadAdventure()).toEqual(STATE);
  });

  it("returns null for invalid stored data", () => {
    localStorage.setItem("destiny-adventure-state", JSON.stringify({ bad: true }));
    expect(loadAdventure()).toBeNull();
  });

  it("clears persisted state", () => {
    saveAdventure(STATE);
    clearAdventure();
    expect(loadAdventure()).toBeNull();
  });
});