import type { RevealedCharacter } from "@/lib/teyvat/character";
import {
  activeScenes as activeFromTree,
  appendChild,
  type SceneNode,
  type SceneTree,
} from "@/lib/teyvat/sceneTree";

export interface Scene {
  sceneNumber: number;
  text: string;
  choices: string[];
  closing: boolean;
  summary: string;
  fromChoice: string;
}

export interface StoryDirection {
  id: string;
  title: string;
  hook: string;
}

export interface AdventureState {
  id: string;
  character: RevealedCharacter;
  /** Branching scene tree. Renderer uses `activeScenesOf(state)`. */
  tree: SceneTree;
  ended: boolean;
  endedBy: "model" | "user" | null;
  startedAt: string;
  variantId?: string;
  /** Editorial "why we picked this character" line. v2-wish only. */
  revealReason?: string;
  /** Picked story arc for v2-wish. Threaded into every scene prompt. */
  storyDirection?: StoryDirection | null;
  /**
   * True once the user has committed past the reveal. Pre-reveal stages
   * become read-only after this flips. The flag is set on first scene
   * generation and never reverts within a run.
   */
  committed?: boolean;
}

export function nextSceneNumber(state: AdventureState): number {
  return activeScenesOf(state).length + 1;
}

export function activeScenesOf(state: AdventureState): Scene[] {
  return activeFromTree(state.tree)
    .filter((node) => node.prose !== "")
    .map((node, idx) => ({
      sceneNumber: idx + 1,
      text: node.prose,
      choices: node.choices,
      closing: node.closing,
      summary: node.summary,
      fromChoice: node.fromChoice,
    }));
}

export function withSceneAppended(
  state: AdventureState,
  newNodeId: string,
  choiceTaken: string,
  scene: Scene
): AdventureState {
  const active = activeFromTree(state.tree);
  const parent = active[active.length - 1];
  const node: SceneNode = {
    id: newNodeId,
    parentId: parent?.id ?? null,
    depth: (parent?.depth ?? 0) + 1,
    choiceTaken,
    prose: scene.text,
    choices: scene.choices,
    closing: scene.closing,
    summary: scene.summary,
    fromChoice: scene.fromChoice,
  };
  return { ...state, tree: appendChild(state.tree, node) };
}