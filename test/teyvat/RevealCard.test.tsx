import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RevealCard } from "@/components/teyvat/RevealCard";
import { I18nProvider } from "@/i18n";
import type { RevealedCharacter } from "@/lib/teyvat/character";

const CHARACTER: RevealedCharacter = {
  framing: "companion",
  name: "Yuna",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads. Her maps outlive rulers.",
  visionStory: "The wave rose. The ice answered.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "Wanderer — they share a quiet contempt for fate",
};

describe("RevealCard", () => {
  it("renders the core fields", async () => {
    render(
      <I18nProvider>
        <RevealCard character={CHARACTER} onAdvance={() => undefined} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Yuna")).toBeInTheDocument();
      expect(screen.getByText(/Wandering Cartographer/)).toBeInTheDocument();
      expect(screen.getByText(/Lantern of Quiet Hours/)).toBeInTheDocument();
      expect(screen.getByText(/Wanderer/)).toBeInTheDocument();
    });
  });
});