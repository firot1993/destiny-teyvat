# 2026-05-05 — Teyvat Adventure Pivot

Goal: replace the legacy Destiny life-path generator with the Teyvat adventure flow.

Planned slices:

1. Add `lib/teyvat/*` modules for questionnaire, prompts, reveal/scene types, storage, and theme.
2. Add `hooks/useAdventure.ts` for the new runtime state machine.
3. Replace the page and UI tree with `components/teyvat/*`.
4. Remove the old Big Five, revolver, prompt-chain, and promptfoo prompt-eval surfaces.
5. Update README, CLAUDE, and worklog entries to match the shipped runtime.

Reference spec: `docs/superpowers/specs/2026-05-05-teyvat-adventure-design.md`.