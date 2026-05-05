import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SceneView } from "@/components/teyvat/SceneView";
import { I18nProvider } from "@/i18n";
import type { Scene } from "@/lib/teyvat/scenes";

const SCENE: Scene = {
  sceneNumber: 1,
  text: "She crossed the threshold.\n\nA voice called her name.",
  choices: ["follow the voice", "stay where you are", "turn back"],
  closing: false,
  summary: "Yuna crossed the gate.",
  fromChoice: "",
};

describe("SceneView", () => {
  it("renders scene text and choices when not streaming", () => {
    render(
      <I18nProvider>
        <SceneView
          scene={SCENE}
          streaming={false}
          streamingText=""
          accent="#74c2a8"
          onPickChoice={() => undefined}
          onStop={() => undefined}
        />
      </I18nProvider>
    );

    expect(screen.getByText(/She crossed the threshold/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "follow the voice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop here/i })).toBeInTheDocument();
  });

  it("shows streaming prose without choices while streaming", () => {
    render(
      <I18nProvider>
        <SceneView
          scene={null}
          streaming
          streamingText="Mist gathered along the ridge."
          accent="#74c2a8"
          onPickChoice={() => undefined}
          onStop={() => undefined}
        />
      </I18nProvider>
    );

    expect(screen.getByText(/Mist gathered along the ridge/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /stop here/i })).not.toBeInTheDocument();
  });

  it("fires choice handlers", async () => {
    const user = userEvent.setup();
    const onPickChoice = vi.fn();

    render(
      <I18nProvider>
        <SceneView
          scene={SCENE}
          streaming={false}
          streamingText=""
          accent="#74c2a8"
          onPickChoice={onPickChoice}
          onStop={() => undefined}
        />
      </I18nProvider>
    );

    await user.click(screen.getByRole("button", { name: "follow the voice" }));
    expect(onPickChoice).toHaveBeenCalledWith("follow the voice");
  });
});