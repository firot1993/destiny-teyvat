import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RevealStage } from "@/components/teyvat/stages/RevealStage";
import { I18nProvider } from "@/i18n";
import { paletteFor } from "@/lib/teyvat/stageTiers";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";
import type { ParsedDirection } from "@/lib/teyvat/candidates";
import type { RevealedCharacter } from "@/lib/teyvat/character";

const raiden: CanonCharacter = {
  id: "raiden-shogun",
  nameEn: "Raiden Shogun",
  nameZh: "Raiden Shogun",
  vision: "Electro",
  nation: "Inazuma",
  weapon: "polearm",
  archetypeTags: ["divine"],
  archetypeBlurb: { en: "Electro Archon", zh: "Electro Archon" },
  bioBlurb: { en: "Keeper of eternity.", zh: "Keeper of eternity." },
  powerFantasyAxes: {
    dominance: ["divine"],
    pace: ["patient"],
    humbleTargets: ["heavens"],
    rewards: ["transcendence"],
  },
};

const directions: ParsedDirection[] = [
  { id: "throne", title: "Take the Silent Throne", hook: "The palace waits for your command." },
  { id: "storm", title: "Call Down the Storm", hook: "The sky answers before anyone can kneel." },
  { id: "mercy", title: "Rewrite the Decree", hook: "Mercy becomes another form of power." },
];

const lumine: RevealedCharacter = {
  framing: "protagonist",
  name: "Lumine",
  title: "Traveler Between Stars",
  vision: "Anemo",
  nation: "wandering",
  weapon: "sword",
  archetype: "wanderer",
  bio: "A traveler stepping through a new threshold.",
  visionStory: "The wind answers first.",
  constellation: "Viatrix",
  signature: "starward",
  knownAssociate: "",
};

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("RevealStage", () => {
  it("uses a balanced split layout for the revealed story state", () => {
    renderWithI18n(
      <RevealStage
        palette={paletteFor("theatrical", "Electro")}
        loading={false}
        character={null}
        fatedCharacter={raiden}
        imageUrl="/raiden.png"
        revealReason="You chose eternity before anyone named it for you."
        directions={directions}
        language="en"
        committed={true}
        onAdvance={vi.fn()}
        onCommit={vi.fn()}
        onPickDirection={vi.fn()}
      />
    );

    expect(screen.getByTestId("reveal-layout").style.gridTemplateColumns).toContain("minmax");
    expect(screen.getByTestId("reveal-portrait").style.position).toBe("relative");
    expect(screen.getByTestId("reveal-copy").style.textAlign).toBe("left");
  });

  it("shows immediate progress feedback after walking into the revealed world", () => {
    renderWithI18n(
      <RevealStage
        palette={paletteFor("theatrical", "Anemo")}
        loading={false}
        character={lumine}
        fatedCharacter={null}
        imageUrl={null}
        revealReason={null}
        directions={null}
        language="en"
        committed={true}
        onAdvance={vi.fn()}
        onCommit={vi.fn()}
        onPickDirection={vi.fn()}
        {...({ enteringWorld: true } as { enteringWorld: boolean })}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(/opening the path/i);
    expect(screen.getByRole("button", { name: /opening the path/i })).toBeDisabled();
  });
});
