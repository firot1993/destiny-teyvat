import { describe, expect, it } from "vitest";
import {
  createTree,
  appendChild,
  forkAt,
  switchSibling,
  findChildByChoice,
  childrenOf,
  activeScenes,
  type SceneNode,
  type SceneTree,
} from "@/lib/teyvat/sceneTree";

const baseNode = (overrides: Partial<SceneNode> = {}): SceneNode => ({
  id: "n1",
  parentId: null,
  depth: 1,
  choiceTaken: null,
  prose: "Scene I prose.",
  choices: ["a", "b", "c"],
  closing: false,
  summary: "scene 1",
  fromChoice: "",
  ...overrides,
});

describe("createTree", () => {
  it("creates a single-node tree with the root active", () => {
    const root = baseNode();
    const tree = createTree(root);
    expect(tree.rootId).toBe("n1");
    expect(tree.activePath).toEqual(["n1"]);
    expect(tree.nodes["n1"]).toEqual(root);
  });
});

describe("appendChild", () => {
  it("appends a child to the active leaf, extending the active path", () => {
    const tree = createTree(baseNode());
    const child: SceneNode = {
      id: "n2",
      parentId: "n1",
      depth: 2,
      choiceTaken: "a",
      prose: "Scene II prose.",
      choices: ["x", "y", "z"],
      closing: false,
      summary: "scene 2",
      fromChoice: "a",
    };
    const next = appendChild(tree, child);
    expect(next.activePath).toEqual(["n1", "n2"]);
    expect(next.nodes["n2"]).toEqual(child);
  });
});

describe("forkAt", () => {
  it("forks a new sibling at depth and replaces active path from there", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2a", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II-a", choices: ["p","q","r"], closing: false, summary: "", fromChoice: "a",
    });
    tree = appendChild(tree, {
      id: "n3a", parentId: "n2a", depth: 3, choiceTaken: "p",
      prose: "III-a", choices: ["s","t","u"], closing: false, summary: "", fromChoice: "p",
    });
    // Now fork at n1 with choice "b" (different sibling)
    const sibling: SceneNode = {
      id: "n2b", parentId: "n1", depth: 2, choiceTaken: "b",
      prose: "II-b", choices: ["m","n","o"], closing: false, summary: "", fromChoice: "b",
    };
    const next = forkAt(tree, "n1", sibling);
    expect(next.activePath).toEqual(["n1", "n2b"]);
    expect(next.nodes["n2a"]).toBeDefined(); // preserved
    expect(next.nodes["n3a"]).toBeDefined(); // preserved
    expect(next.nodes["n2b"]).toEqual(sibling);
  });
});

describe("switchSibling", () => {
  it("switches active path to an existing sibling at depth, preserving deeper history", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2a", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II-a", choices: ["p","q","r"], closing: false, summary: "", fromChoice: "a",
    });
    tree = appendChild(tree, {
      id: "n3a", parentId: "n2a", depth: 3, choiceTaken: "p",
      prose: "III-a", choices: [], closing: false, summary: "", fromChoice: "p",
    });
    tree = forkAt(tree, "n1", {
      id: "n2b", parentId: "n1", depth: 2, choiceTaken: "b",
      prose: "II-b", choices: ["m","n","o"], closing: false, summary: "", fromChoice: "b",
    });
    // active path is now [n1, n2b]; switching back to n2a should restore [n1, n2a, n3a]
    const next = switchSibling(tree, "n2a");
    expect(next.activePath).toEqual(["n1", "n2a", "n3a"]);
  });
});

describe("findChildByChoice", () => {
  it("returns the existing child for a (parentId, choice) pair if any", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2a", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II-a", choices: [], closing: false, summary: "", fromChoice: "a",
    });
    expect(findChildByChoice(tree, "n1", "a")?.id).toBe("n2a");
    expect(findChildByChoice(tree, "n1", "z")).toBeNull();
  });
});

describe("childrenOf", () => {
  it("returns all children of a node, ordered by depth then by id", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2a", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II-a", choices: [], closing: false, summary: "", fromChoice: "a",
    });
    tree = forkAt(tree, "n1", {
      id: "n2b", parentId: "n1", depth: 2, choiceTaken: "b",
      prose: "II-b", choices: [], closing: false, summary: "", fromChoice: "b",
    });
    expect(childrenOf(tree, "n1").map((n) => n.id).sort()).toEqual(["n2a", "n2b"]);
  });
});

describe("activeScenes", () => {
  it("returns the active path's nodes in order", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II", choices: [], closing: false, summary: "", fromChoice: "a",
    });
    expect(activeScenes(tree).map((n) => n.id)).toEqual(["n1", "n2"]);
  });
});
