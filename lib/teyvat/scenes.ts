import type { RevealedCharacter } from "@/lib/teyvat/character";

export interface Scene {
  sceneNumber: number;
  text: string;
  choices: string[];
  closing: boolean;
  summary: string;
  fromChoice: string;
}

export interface AdventureState {
  id: string;
  character: RevealedCharacter;
  scenes: Scene[];
  ended: boolean;
  endedBy: "model" | "user" | null;
  startedAt: string;
}

export function nextSceneNumber(state: AdventureState): number {
  return state.scenes.length + 1;
}