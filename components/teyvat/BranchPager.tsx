"use client";
import type { TierPalette } from "@/lib/teyvat/stageTiers";
import type { SiblingInfo } from "@/hooks/useAdventure";

interface Props {
  palette: TierPalette;
  siblings: SiblingInfo;
  onSwitchSibling: (nodeId: string) => void;
}

export function BranchPager({ palette, siblings, onSwitchSibling }: Props) {
  const { branchCount, activeIndex, siblings: sibs } = siblings;
  if (branchCount < 2) return null;

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < branchCount - 1;

  const navBtn = (enabled: boolean): React.CSSProperties => ({
    background: "transparent",
    border: "none",
    color: enabled ? palette.gold : `${palette.gold}44`,
    fontSize: 16,
    cursor: enabled ? "pointer" : "default",
    padding: "0 6px",
    lineHeight: 1,
  });

  const dotStyle = (active: boolean): React.CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: active ? palette.gold : `${palette.gold}44`,
    border: `1px solid ${palette.gold}88`,
    cursor: active ? "default" : "pointer",
    flexShrink: 0,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "6px 0",
        width: "100%",
      }}
      role="navigation"
      aria-label="Branch navigation"
    >
      <button
        style={navBtn(canPrev)}
        onClick={() => canPrev && onSwitchSibling(sibs[activeIndex - 1].id)}
        aria-label="Previous branch"
        disabled={!canPrev}
      >
        ‹
      </button>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {sibs.map((sib, i) => (
          <button
            key={sib.id}
            style={{ ...dotStyle(i === activeIndex), border: "none" }}
            onClick={() => i !== activeIndex && onSwitchSibling(sib.id)}
            aria-label={`Branch ${i + 1}${sib.choiceTaken ? `: ${sib.choiceTaken}` : ""}`}
            title={sib.choiceTaken ?? `Branch ${i + 1}`}
          />
        ))}
      </div>

      <button
        style={navBtn(canNext)}
        onClick={() => canNext && onSwitchSibling(sibs[activeIndex + 1].id)}
        aria-label="Next branch"
        disabled={!canNext}
      >
        ›
      </button>

      {siblings.activeChoiceLabel && (
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: `${palette.gold}bb`,
            marginLeft: 4,
            maxWidth: 160,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {siblings.activeChoiceLabel}
        </span>
      )}
    </div>
  );
}
