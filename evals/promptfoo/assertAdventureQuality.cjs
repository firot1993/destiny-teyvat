const goldenScenarios = require("../golden/adventureScenarios.json");

const DEFAULT_FORBIDDEN = [
  "Big Five",
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
  "personality test",
  "questionnaire",
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

function findScenario(id) {
  return goldenScenarios.find((scenario) => scenario.id === id);
}

function tryParseJson(output) {
  try {
    const cleaned = output
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

module.exports = function assertAdventureQuality(output, context = {}) {
  const vars = context.vars || {};
  const scenario = findScenario(vars.scenarioId);
  const expected = vars.expectedTraits || scenario?.expectedTraits || {};
  const forbiddenTerms = normalizeList(expected.forbiddenTerms || DEFAULT_FORBIDDEN);
  const requiredFields = normalizeList(expected.requiredFields);

  const words = wordCount(output);
  const lower = output.toLowerCase();

  // Check forbidden terms
  const forbiddenHits = forbiddenTerms.filter((term) =>
    lower.includes(String(term).toLowerCase())
  );

  // Check if output is valid JSON (for reveal responses)
  const parsed = tryParseJson(output);
  const isJson = parsed !== null && typeof parsed === "object";

  // Check required JSON fields
  const missingFields = isJson
    ? requiredFields.filter((field) => !(field in parsed) || !parsed[field])
    : [];

  // Check word count
  const minWords = Number(expected.minWords || 50);
  const maxWords = Number(expected.maxWords || 500);
  const lengthOk = words >= minWords && words <= maxWords;

  // Score
  const leakageScore = forbiddenHits.length === 0 ? 1 : 0;
  const lengthScore = lengthOk ? 1 : words >= Math.floor(minWords * 0.7) ? 0.5 : 0;
  const fieldsScore = requiredFields.length === 0 ? 1 : 1 - missingFields.length / requiredFields.length;
  const contentScore = words > 10 ? 1 : 0;

  const score = (leakageScore + lengthScore + fieldsScore + contentScore) / 4;
  const threshold = Number(expected.threshold || 0.75);

  const issues = [];
  if (!lengthOk) issues.push(`word count ${words}, expected ${minWords}-${maxWords}`);
  if (forbiddenHits.length) issues.push(`forbidden terms: ${forbiddenHits.join(", ")}`);
  if (missingFields.length) issues.push(`missing fields: ${missingFields.join(", ")}`);
  if (!contentScore) issues.push("output too short or empty");

  const pass = score >= threshold && leakageScore === 1;

  return {
    pass,
    score,
    reason: pass
      ? "Adventure quality checks passed."
      : `Adventure quality checks failed: ${issues.join("; ")}`,
    metadata: {
      words,
      isJson,
      leakageScore,
      lengthScore,
      fieldsScore,
      contentScore,
      forbiddenHits,
      missingFields,
    },
  };
};
