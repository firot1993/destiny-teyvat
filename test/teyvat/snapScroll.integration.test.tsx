import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n";
import Page from "@/app/page";

beforeEach(() => {
  localStorage.clear();
});

describe("snap-scroll page (smoke)", () => {
  it("renders title + at least one question + reveal stage scaffold", () => {
    render(
      <I18nProvider>
        <Page />
      </I18nProvider>
    );

    // TitleStage headline (exact h1)
    expect(screen.getByRole("heading", { name: /^destiny$/i })).toBeInTheDocument();

    // QuestionStage eyebrows — editorial schema has 7 steps, so "1 of 7" etc.
    expect(screen.getAllByText(/\d+ of 7/i).length).toBeGreaterThan(0);

    // RevealStage commit-gate CTA (before any LLM call)
    expect(screen.getByText(/reveal my destiny/i)).toBeInTheDocument();

    // Story-progress sharpening veil sits above the snap document.
    expect(screen.getByTestId("story-progress-veil")).toBeInTheDocument();
  });

  it("anchors one night-sky layer behind transparent snap stages", () => {
    const { container } = render(
      <I18nProvider>
        <Page />
      </I18nProvider>
    );

    const sky = screen.getByTestId("story-sky");
    expect(sky.getAttribute("style")).toContain("rgb(8, 17, 31)");
    expect(sky.style.position).toBe("fixed");

    const stageSections = Array.from(container.querySelectorAll("[data-stage] > section")) as HTMLElement[];
    expect(stageSections.length).toBeGreaterThan(1);
    expect(stageSections.every((section) => section.style.background === "transparent")).toBe(true);
  });
});
