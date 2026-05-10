import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n";
import { SceneStage } from "@/components/teyvat/stages/SceneStage";
import { paletteFor } from "@/lib/teyvat/stageTiers";

const emptySiblings = {
  branchCount: 0,
  activeIndex: -1,
  activeChoiceLabel: "",
  siblings: [],
};

describe("SceneStage", () => {
  it("labels scene pages when prose has been split across snap stages", () => {
    render(
      <I18nProvider>
        <SceneStage
          palette={paletteFor("reading", "Anemo")}
          sceneNumber={1}
          prose="The first part of the scene."
          streamingText=""
          streaming={false}
          closing={false}
          choices={[]}
          takenChoices={[]}
          visionLabel="Anemo"
          pickedChoice={null}
          onPickChoice={vi.fn()}
          onStop={vi.fn()}
          siblings={emptySiblings}
          onSwitchSibling={vi.fn()}
          isActiveStage={false}
          {...({ scenePageNumber: 1, scenePageCount: 2 } as {
            scenePageNumber: number;
            scenePageCount: number;
          })}
        />
      </I18nProvider>
    );

    expect(screen.getByText(/scene i/i)).toHaveTextContent("1 of 2");
  });

  it("vertically balances paginated prose pages in the viewport", () => {
    render(
      <I18nProvider>
        <SceneStage
          palette={paletteFor("reading", "Anemo")}
          sceneNumber={1}
          prose="The first part of the scene."
          streamingText=""
          streaming={false}
          closing={false}
          choices={[]}
          takenChoices={[]}
          visionLabel="Anemo"
          pickedChoice={null}
          onPickChoice={vi.fn()}
          onStop={vi.fn()}
          siblings={emptySiblings}
          onSwitchSibling={vi.fn()}
          isActiveStage={false}
          scenePageNumber={1}
          scenePageCount={2}
        />
      </I18nProvider>
    );

    const content = screen.getByTestId("scene-content");
    expect(content.style.minHeight).toContain("100vh");
    expect(content.style.justifyContent).toBe("center");
  });
});
