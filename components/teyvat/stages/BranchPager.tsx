"use client";
import type { CSSProperties } from "react";

interface Props {
  branchCount: number;
  activeIndex: number;
  activeChoiceLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
}

export function BranchPager({
  branchCount,
  activeIndex,
  activeChoiceLabel,
  onPrev,
  onNext,
  onJump,
}: Props) {
  if (branchCount < 2) return null;

  const pillStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 16px",
    border: "1px solid rgba(184,138,64,0.4)",
    borderRadius: 999,
    background: "rgba(0,0,0,0.15)",
    fontFamily: "Georgia, serif",
    fontSize: 13,
    color: "rgba(245,232,200,0.8)",
    userSelect: "none",
  };

  const navBtn = (disabled: boolean): CSSProperties => ({
    background: "transparent",
    border: "none",
    color: disabled ? "rgba(212,168,97,0.3)" : "rgba(212,168,97,0.8)",
    fontSize: 18,
    cursor: disabled ? "default" : "pointer",
    padding: "0 4px",
    lineHeight: 1,
  });

  const dot = (active: boolean): CSSProperties => ({
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: active ? "rgba(212,168,97,0.9)" : "rgba(212,168,97,0.3)",
    cursor: "pointer",
    border: "none",
    padding: 0,
    display: "inline-block",
  });

  return (
    <div style={pillStyle}>
      <button
        style={navBtn(activeIndex === 0)}
        onClick={onPrev}
        disabled={activeIndex === 0}
        aria-label="Previous branch"
      >
        ‹
      </button>

      {Array.from({ length: branchCount }, (_, i) => (
        <button
          key={i}
          style={dot(i === activeIndex)}
          onClick={() => onJump(i)}
          aria-label={`Branch ${i + 1}`}
        />
      ))}

      <span style={{ fontStyle: "italic", fontSize: 12, opacity: 0.7, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {activeChoiceLabel}
      </span>

      <button
        style={navBtn(activeIndex === branchCount - 1)}
        onClick={onNext}
        disabled={activeIndex === branchCount - 1}
        aria-label="Next branch"
      >
        ›
      </button>

      <span style={{ fontSize: 11, opacity: 0.4, letterSpacing: "0.06em" }}>← →</span>
    </div>
  );
}
