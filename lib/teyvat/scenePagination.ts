interface SceneUpdateInput {
  previousSceneCount: number;
  currentSceneCount: number;
  wasGeneratingScene: boolean;
  isGeneratingScene: boolean;
}

const TARGET_PAGE_CHARS = 1280;
const MAX_PAGE_CHARS = 1480;
const MIN_TRAILING_PAGE_CHARS = 380;

function compactText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{3,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

function splitLongParagraph(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  if (sentences.length <= 1) {
    const chunks: string[] = [];
    for (let index = 0; index < paragraph.length; index += TARGET_PAGE_CHARS) {
      chunks.push(paragraph.slice(index, index + TARGET_PAGE_CHARS).trim());
    }
    return chunks.filter(Boolean);
  }

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > TARGET_PAGE_CHARS && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function rebalanceShortTrailingPage(pages: string[]): string[] {
  if (pages.length < 2) {
    return pages;
  }

  const last = pages[pages.length - 1];
  const previous = pages[pages.length - 2];
  const merged = `${previous} ${last}`;

  if (last.length < MIN_TRAILING_PAGE_CHARS && merged.length <= MAX_PAGE_CHARS) {
    return [...pages.slice(0, -2), merged];
  }

  return pages;
}

export function paginateSceneText(text: string): string[] {
  const compact = compactText(text);
  if (!compact) {
    return [""];
  }

  const paragraphs = compact.split(/\n\n+/);
  const pages: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (!current) return;
    pages.push(current);
    current = "";
  };

  for (const paragraph of paragraphs) {
    const pieces = paragraph.length > MAX_PAGE_CHARS ? splitLongParagraph(paragraph) : [paragraph];

    for (const piece of pieces) {
      const next = current ? `${current}\n\n${piece}` : piece;
      if (next.length > TARGET_PAGE_CHARS && current) {
        pushCurrent();
        current = piece;
      } else {
        current = next;
      }
    }
  }

  pushCurrent();
  return pages.length > 0 ? rebalanceShortTrailingPage(pages) : [compact];
}

export function shouldAutoScrollAfterSceneUpdate(input: SceneUpdateInput): boolean {
  return (
    input.wasGeneratingScene &&
    !input.isGeneratingScene &&
    input.currentSceneCount > input.previousSceneCount
  );
}
