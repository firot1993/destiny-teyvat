import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CandidateGallery } from "@/components/teyvat/CandidateGallery";
import { CANON_ROSTER } from "@/lib/teyvat/canonRoster";
import { I18nProvider } from "@/i18n";

const sampleCandidates = [
  { character: CANON_ROSTER[0], hook: "you wake at the top...", imageUrl: null },
  { character: CANON_ROSTER[1], hook: "the contract opens...", imageUrl: null },
  { character: CANON_ROSTER[2], hook: "the wind sings...", imageUrl: null },
];

function renderGallery(onPick: (id: string) => void = () => {}) {
  return render(
    <I18nProvider>
      <CandidateGallery candidates={sampleCandidates} onPick={onPick} />
    </I18nProvider>
  );
}

describe("CandidateGallery", () => {
  it("renders one card per candidate", () => {
    renderGallery();
    // I18nProvider defaults to zh in jsdom (no navigator.language match), so
    // names render in Chinese. Assert via the hook text instead, which is
    // language-agnostic.
    for (const c of sampleCandidates) {
      expect(screen.getByText(c.hook)).toBeInTheDocument();
    }
  });

  it("calls onPick with the canon id when a card is clicked", () => {
    const onPick = vi.fn();
    renderGallery(onPick);
    const firstHook = sampleCandidates[0].hook;
    fireEvent.click(screen.getByText(firstHook).closest("button")!);
    expect(onPick).toHaveBeenCalledWith(sampleCandidates[0].character.id);
  });
});
