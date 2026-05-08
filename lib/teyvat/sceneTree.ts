// lib/teyvat/sceneTree.ts
export interface SceneNode {
  id: string;
  parentId: string | null;
  depth: number;          // 1-indexed; root = 1
  choiceTaken: string | null; // null on root
  prose: string;
  choices: string[];
  closing: boolean;
  summary: string;
  fromChoice: string;     // back-compat with current Scene.fromChoice
}

export interface SceneTree {
  nodes: Record<string, SceneNode>;
  rootId: string;
  /** Ordered ids root → current leaf — what the document renders. */
  activePath: string[];
}

export function createTree(root: SceneNode): SceneTree {
  return {
    nodes: { [root.id]: { ...root, parentId: null, depth: 1, choiceTaken: null } },
    rootId: root.id,
    activePath: [root.id],
  };
}

export function appendChild(tree: SceneTree, node: SceneNode): SceneTree {
  return {
    ...tree,
    nodes: { ...tree.nodes, [node.id]: node },
    activePath: [...tree.activePath, node.id],
  };
}

/** Fork a new child of `parentId` and switch active path to it. */
export function forkAt(tree: SceneTree, parentId: string, child: SceneNode): SceneTree {
  const parentIdx = tree.activePath.indexOf(parentId);
  const trimmed = parentIdx >= 0 ? tree.activePath.slice(0, parentIdx + 1) : [tree.rootId];
  return {
    ...tree,
    nodes: { ...tree.nodes, [child.id]: child },
    activePath: [...trimmed, child.id],
  };
}

/**
 * Switch the active path to include `targetId` at its depth. The deeper
 * portion of the path is restored to the most-recently-walked descendant
 * chain (the path that previously ended in this subtree).
 */
export function switchSibling(tree: SceneTree, targetId: string): SceneTree {
  const target = tree.nodes[targetId];
  if (!target) return tree;
  const parent = target.parentId ? tree.nodes[target.parentId] : null;
  // Build prefix: root → ... → parent → target
  const prefix: string[] = [];
  let cursor: SceneNode | null = target;
  while (cursor) {
    prefix.unshift(cursor.id);
    cursor = cursor.parentId ? tree.nodes[cursor.parentId] : null;
  }
  // Then walk the deepest chain from target downward — pick the
  // most-recently-added child at each step until a leaf is reached.
  const suffix: string[] = [];
  let walk = targetId;
  // Use insertion order over node entries to find children of `walk`
  const childrenIndex: Record<string, string[]> = {};
  for (const id of Object.keys(tree.nodes)) {
    const n = tree.nodes[id];
    if (n.parentId) {
      childrenIndex[n.parentId] = childrenIndex[n.parentId] ?? [];
      childrenIndex[n.parentId].push(id);
    }
  }
  while (childrenIndex[walk] && childrenIndex[walk].length > 0) {
    const pick = childrenIndex[walk][childrenIndex[walk].length - 1];
    suffix.push(pick);
    walk = pick;
    if (parent && walk === parent.id) break; // safety
  }
  return { ...tree, activePath: [...prefix, ...suffix] };
}

export function findChildByChoice(
  tree: SceneTree,
  parentId: string,
  choice: string
): SceneNode | null {
  for (const id of Object.keys(tree.nodes)) {
    const n = tree.nodes[id];
    if (n.parentId === parentId && n.choiceTaken === choice) {
      return n;
    }
  }
  return null;
}

export function childrenOf(tree: SceneTree, parentId: string): SceneNode[] {
  return Object.values(tree.nodes).filter((n) => n.parentId === parentId);
}

export function activeScenes(tree: SceneTree): SceneNode[] {
  return tree.activePath.map((id) => tree.nodes[id]).filter(Boolean);
}
