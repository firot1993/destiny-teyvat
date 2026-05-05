function list(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

module.exports = function assertPromptContract(output, context = {}) {
  const vars = context.vars || {};
  const required = list(vars.required);
  const forbidden = list(vars.forbidden);
  const missing = required.filter((needle) => !output.includes(needle));
  const leaked = forbidden.filter((needle) => output.includes(needle));
  const pass = missing.length === 0 && leaked.length === 0;

  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? "Prompt contract matched."
      : [
          missing.length ? `Missing: ${missing.join(", ")}` : "",
          leaked.length ? `Forbidden text present: ${leaked.join(", ")}` : "",
        ].filter(Boolean).join(" "),
  };
};
