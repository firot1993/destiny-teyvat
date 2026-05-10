"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import type { TierPalette } from "@/lib/teyvat/stageTiers";
import {
  advanceStoryScrollProgress,
  computeStoryScrollEffect,
  computeStoryScrollEffectFromProgress,
  computeStoryScrollProgress,
  type FallingStarEffect,
  type StoryScrollEffectMetrics,
} from "@/lib/teyvat/scrollEffect";

interface Props {
  docRef: RefObject<HTMLDivElement>;
  palette: TierPalette;
}

const initialMetrics = computeStoryScrollEffect({
  scrollTop: 0,
  scrollHeight: 1,
  clientHeight: 1,
});
const SETTLE_EPSILON = 0.0015;

export function StoryProgressVeil({ docRef, palette }: Props) {
  const [metrics, setMetrics] = useState<StoryScrollEffectMetrics>(initialMetrics);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;

    let frame = 0;
    let lastFrameTime = 0;
    let targetProgress = computeStoryScrollProgress({
      scrollTop: doc.scrollTop,
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
    });
    let visualProgress = targetProgress;
    const reducedMotionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let prefersReducedMotion = reducedMotionQuery?.matches ?? false;

    const cancelFrame =
      typeof window.cancelAnimationFrame === "function"
        ? window.cancelAnimationFrame.bind(window)
        : window.clearTimeout.bind(window);
    const requestFrame =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 16);

    const measureTargetProgress = () =>
      computeStoryScrollProgress({
        scrollTop: doc.scrollTop,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
      });

    const applyProgress = (progress: number) => {
      visualProgress = progress;
      setMetrics(computeStoryScrollEffectFromProgress(progress));
    };

    const stopFrame = () => {
      if (frame) cancelFrame(frame);
      frame = 0;
      lastFrameTime = 0;
    };

    const tick = (timestamp: number) => {
      frame = 0;
      const deltaMs = lastFrameTime ? timestamp - lastFrameTime : 16;
      lastFrameTime = timestamp;
      const nextProgress = prefersReducedMotion
        ? targetProgress
        : advanceStoryScrollProgress({
            currentProgress: visualProgress,
            targetProgress,
            deltaMs,
          });

      applyProgress(nextProgress);

      if (!prefersReducedMotion && Math.abs(targetProgress - nextProgress) > SETTLE_EPSILON) {
        frame = requestFrame(tick);
        return;
      }

      if (Math.abs(targetProgress - nextProgress) > 0) {
        applyProgress(targetProgress);
      }
      lastFrameTime = 0;
    };

    const startFrame = () => {
      if (frame) return;
      frame = requestFrame(tick);
    };

    const updateTarget = (snap = false) => {
      targetProgress = measureTargetProgress();

      if (snap || prefersReducedMotion) {
        stopFrame();
        applyProgress(targetProgress);
        return;
      }

      startFrame();
    };

    const handleTargetChange = () => updateTarget();
    const handleReducedMotionChange = () => {
      prefersReducedMotion = reducedMotionQuery?.matches ?? false;
      updateTarget(true);
    };

    updateTarget(true);
    doc.addEventListener("scroll", handleTargetChange, { passive: true });
    window.addEventListener("resize", handleTargetChange);
    reducedMotionQuery?.addEventListener?.("change", handleReducedMotionChange);

    return () => {
      doc.removeEventListener("scroll", handleTargetChange);
      window.removeEventListener("resize", handleTargetChange);
      reducedMotionQuery?.removeEventListener?.("change", handleReducedMotionChange);
      stopFrame();
    };
  }, [docRef]);

  const rootStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 8,
    pointerEvents: "none",
    overflow: "hidden",
    opacity: 1,
  };

  const mistStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: metrics.mistOpacity,
    background:
      `radial-gradient(ellipse at 50% ${70 - metrics.progress * 28}%, rgba(255,255,255,0.62), transparent 42%), ` +
      `linear-gradient(180deg, rgba(255,255,255,0.18), transparent 38%, rgba(31,27,21,0.14))`,
    backdropFilter: `blur(${metrics.blurPx}px) saturate(${1 + metrics.focus * 0.2}) contrast(${0.94 + metrics.focus * 0.12})`,
    WebkitBackdropFilter: `blur(${metrics.blurPx}px) saturate(${1 + metrics.focus * 0.2}) contrast(${0.94 + metrics.focus * 0.12})`,
    transition: "opacity 260ms cubic-bezier(0.22, 1, 0.36, 1), backdrop-filter 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    maskImage: "radial-gradient(ellipse at center, transparent 0%, transparent 38%, black 72%)",
    WebkitMaskImage: "radial-gradient(ellipse at center, transparent 0%, transparent 38%, black 72%)",
  };

  const ambientStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: metrics.ambientOpacity,
    background:
      `radial-gradient(ellipse at 50% ${18 + metrics.progress * 54}%, ${metrics.ambientColor} 0%, transparent 58%), ` +
      `linear-gradient(180deg, transparent 0%, ${metrics.ambientColor} 58%, transparent 100%)`,
    mixBlendMode: "color",
    transition: "background 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms cubic-bezier(0.22, 1, 0.36, 1)",
  };

  const glintStyle: CSSProperties = {
    position: "absolute",
    inset: "-12% -20%",
    opacity: metrics.sharpenOpacity,
    background:
      `linear-gradient(112deg, transparent 0%, transparent 39%, rgba(255,255,255,0.3) 46%, ${palette.accent}26 50%, transparent 57%, transparent 100%)`,
    transform: `translate3d(0, ${(1 - metrics.progress) * 22}px, 0)`,
    mixBlendMode: "soft-light",
    animation: "story-focus-glint 7s cubic-bezier(0.22, 1, 0.36, 1) infinite",
    willChange: "transform, opacity",
  };

  const vignetteStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: metrics.vignetteOpacity,
    background:
      "linear-gradient(90deg, rgba(25,20,14,0.16), transparent 18%, transparent 82%, rgba(25,20,14,0.12)), " +
      "linear-gradient(180deg, rgba(25,20,14,0.08), transparent 28%, transparent 72%, rgba(25,20,14,0.14))",
  };

  const threadStyle: CSSProperties = {
    position: "absolute",
    left: "clamp(18px, 4vw, 46px)",
    top: "9vh",
    bottom: "9vh",
    width: 1,
    background: `${palette.gold}2e`,
    boxShadow: `0 0 18px ${palette.gold}22`,
  };

  const threadFillStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    transform: `scaleY(${metrics.threadScale})`,
    transformOrigin: "top",
    background: `linear-gradient(180deg, ${palette.goldBright}, ${palette.accent}, transparent)`,
    boxShadow: `0 0 16px ${palette.accent}55`,
    willChange: "transform",
  };

  const pulseStyle: CSSProperties = {
    position: "absolute",
    left: "calc(clamp(18px, 4vw, 46px) - 3px)",
    top: "9vh",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: palette.goldBright,
    boxShadow: `0 0 18px ${palette.goldBright}, 0 0 28px ${palette.accent}55`,
    transform: `translate3d(0, ${metrics.progress * 82}vh, 0) translateY(-50%)`,
    willChange: "transform",
  };

  const fallingStarLayerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    mixBlendMode: "screen",
  };

  const fallingStarStyle = (star: FallingStarEffect): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    width: star.length,
    height: Math.max(18, star.headSize * 3),
    opacity: star.opacity,
    transform: `translate3d(${star.xvw}vw, ${star.yvh}vh, 0) translate(-50%, -50%) rotate(${star.rotationDeg}deg) scale(${star.scale})`,
    transformOrigin: "center",
    willChange: "transform, opacity",
  });

  const fallingStarTailStyle = (star: FallingStarEffect): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: "50%",
    width: star.length - star.headSize,
    height: 2,
    borderRadius: 999,
    background: `linear-gradient(90deg, transparent 0%, ${palette.accent}22 22%, rgba(255,255,255,0.76) 70%, ${palette.goldBright} 100%)`,
    boxShadow: `0 0 14px ${palette.goldBright}88, 0 0 26px ${palette.accent}66`,
    transform: "translateY(-50%)",
  });

  const fallingStarHeadStyle = (star: FallingStarEffect): CSSProperties => ({
    position: "absolute",
    right: 0,
    top: "50%",
    width: star.headSize,
    height: star.headSize,
    borderRadius: "50%",
    background: `radial-gradient(circle, #fffdf0 0 24%, ${palette.goldBright} 42%, ${palette.accent} 100%)`,
    boxShadow: `0 0 12px #fffdf0, 0 0 24px ${palette.goldBright}, 0 0 38px ${palette.accent}88`,
    transform: "translateY(-50%)",
  });

  return (
    <div data-testid="story-progress-veil" aria-hidden="true" style={rootStyle}>
      <style>{`
        @keyframes story-focus-glint {
          0%, 100% { transform: translate3d(-3%, -2%, 0) rotate(0.001deg); }
          50% { transform: translate3d(3%, 2%, 0) rotate(0.001deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-testid="story-progress-veil"] * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <div style={ambientStyle} />
      <div style={mistStyle} />
      <div style={glintStyle} />
      <div style={vignetteStyle} />
      <div
        data-testid="story-falling-stars"
        data-progress={metrics.progress}
        style={fallingStarLayerStyle}
      >
        {metrics.fallingStars.map((star) => (
          <div key={star.id} data-testid="story-falling-star" data-star-id={star.id} style={fallingStarStyle(star)}>
            <span style={fallingStarTailStyle(star)} />
            <span style={fallingStarHeadStyle(star)} />
          </div>
        ))}
      </div>
      <div style={threadStyle}>
        <div style={threadFillStyle} />
      </div>
      <div style={pulseStyle} />
    </div>
  );
}
