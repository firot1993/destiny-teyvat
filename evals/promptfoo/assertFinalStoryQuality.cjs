const goldenScenarios = require("../golden/finalStoryScenarios.json");

const DEFAULT_GENERIC_PHRASES = [
  "unlock your potential",
  "embrace the journey",
  "follow your dreams",
  "step into your power",
  "best version of yourself",
  "be the change",
  "dream big",
];

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function wordCount(output) {
  const tokens = output.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?|[\u4e00-\u9fff]/g);
  return tokens ? tokens.length : 0;
}

function paragraphCount(output) {
  return output.trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
}

function countTermHits(output, terms) {
  const lower = output.toLowerCase();
  return terms.filter((term) => lower.includes(String(term).toLowerCase())).length;
}

function findScenario(id) {
  return goldenScenarios.find((scenario) => scenario.id === id);
}

function scoreLength(count, minWords, maxWords) {
  if (count >= minWords && count <= maxWords) return 1;
  if (count >= Math.floor(minWords * 0.8) && count <= Math.ceil(maxWords * 1.15)) {
    return 0.5;
  }
  return 0;
}

module.exports = function assertFinalStoryQuality(output, context = {}) {
  const vars = context.vars || {};
  const scenario = findScenario(vars.scenarioId);
  const expected = vars.expectedTraits || scenario?.expectedTraits || {};
  const minWords = Number(expected.minWords || 320);
  const maxWords = Number(expected.maxWords || 750);
  const threshold = Number(expected.threshold || context.config?.threshold || 0.75);
  const requiredMotifTerms = normalizeList(expected.requiredMotifTerms);
  const forbiddenTerms = normalizeList(expected.forbiddenTerms);
  const genericPhrases = [
    ...DEFAULT_GENERIC_PHRASES,
    ...normalizeList(expected.genericPhrases),
  ];
  const minMotifHits = Math.min(
    requiredMotifTerms.length,
    Number(expected.minMotifHits || Math.min(4, requiredMotifTerms.length))
  );

  const paragraphs = paragraphCount(output);
  const words = wordCount(output);
  const motifHits = countTermHits(output, requiredMotifTerms);
  const forbiddenHits = forbiddenTerms.filter((term) =>
    output.toLowerCase().includes(String(term).toLowerCase())
  );
  const genericHits = genericPhrases.filter((phrase) =>
    output.toLowerCase().includes(String(phrase).toLowerCase())
  );

  const paragraphScore = paragraphs === 4 ? 1 : 0;
  const lengthScore = scoreLength(words, minWords, maxWords);
  const motifScore =
    minMotifHits === 0 ? 1 : Math.min(1, motifHits / Math.max(1, minMotifHits));
  const leakageScore = forbiddenHits.length === 0 ? 1 : 0;
  const genericScore = genericHits.length === 0 ? 1 : 0;
  const sentenceCount = output.split(/[.!?。！？]+/).filter((s) => s.trim()).length;
  const textureScore = sentenceCount >= 12 ? 1 : sentenceCount >= 8 ? 0.5 : 0;

  const namedScores = {
    paragraphs: paragraphScore,
    length: lengthScore,
    motifs: motifScore,
    leakage: leakageScore,
    generic: genericScore,
    texture: textureScore,
  };
  const score =
    (paragraphScore + lengthScore + motifScore + leakageScore + genericScore + textureScore) / 6;

  const issues = [];
  if (paragraphScore < 1) issues.push(`paragraph count ${paragraphs}, expected 4`);
  if (lengthScore < 1) issues.push(`word count ${words}, expected ${minWords}-${maxWords}`);
  if (motifScore < 1) {
    issues.push(`motif hits ${motifHits}/${minMotifHits}`);
  }
  if (forbiddenHits.length) issues.push(`forbidden terms: ${forbiddenHits.join(", ")}`);
  if (genericHits.length) issues.push(`generic phrases: ${genericHits.join(", ")}`);
  if (textureScore < 1) issues.push(`sentence texture too thin (${sentenceCount} sentences)`);

  const pass = score >= threshold && leakageScore === 1 && genericScore === 1;

  return {
    pass,
    score,
    reason: pass
      ? "Final story quality checks passed."
      : `Final story quality checks failed: ${issues.join("; ")}`,
    metadata: {
      ...namedScores,
      paragraphs,
      words,
      motifHits,
      minMotifHits,
    },
  };
};
