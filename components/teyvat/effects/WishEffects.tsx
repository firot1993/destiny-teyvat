// components/teyvat/effects/WishEffects.tsx
"use client";
import type { TierPalette } from "@/lib/teyvat/stageTiers";

interface Props {
  palette: TierPalette;
  /** Show silhouette? Hide once portrait image arrives. */
  showSilhouette?: boolean;
}

const STAR_POSITIONS = [
  { top: "8%", left: "15%", delay: "0s" },
  { top: "14%", left: "78%", delay: "1s" },
  { top: "22%", left: "42%", delay: "2s" },
  { top: "30%", left: "8%", delay: "0.5s" },
  { top: "38%", left: "88%", delay: "1.5s" },
  { top: "18%", left: "60%", delay: "2.5s" },
  { top: "46%", left: "22%", delay: "3s" },
  { top: "10%", left: "35%", delay: "1.2s" },
  { top: "6%", left: "70%", delay: "2.8s" },
  { top: "42%", left: "55%", delay: "0.8s" },
];

export function WishEffects({ palette, showSilhouette = true }: Props) {
  return (
    <>
      {/* gold rays */}
      <span style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: `conic-gradient(from 90deg at 50% 60%,
          transparent 0deg, rgba(228,193,120,0.18) 25deg,
          transparent 50deg, rgba(228,193,120,0.10) 80deg,
          transparent 110deg, rgba(228,193,120,0.20) 145deg,
          transparent 175deg, rgba(228,193,120,0.08) 220deg,
          transparent 250deg, rgba(228,193,120,0.16) 290deg,
          transparent 330deg, rgba(228,193,120,0.18) 360deg)`,
      }} />
      {/* center bloom */}
      <span style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at center 60%, rgba(228,193,120,0.32) 0%, transparent 35%)",
      }} />
      {/* stars */}
      {STAR_POSITIONS.map((s, i) => (
        <span key={i} style={{
          position: "absolute", top: s.top, left: s.left,
          width: 2, height: 2, background: "rgba(255,250,235,0.9)",
          borderRadius: "50%", boxShadow: "0 0 4px rgba(255,250,235,0.6)",
          pointerEvents: "none", zIndex: 1,
          animation: `dh-twinkle 4s ease-in-out ${s.delay} infinite`,
        }} />
      ))}
      {/* filigree top corners */}
      <svg viewBox="0 0 64 64" style={{
        position: "absolute", top: 18, left: 22, width: 64, height: 64,
        color: palette.goldBright, pointerEvents: "none", zIndex: 3,
      }} aria-hidden>
        <path d="M2,2 L62,2 M2,2 L2,62 M2,2 Q22,12 32,32 M2,2 Q12,22 32,32"
              stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9"/>
      </svg>
      <svg viewBox="0 0 64 64" style={{
        position: "absolute", top: 18, right: 22, width: 64, height: 64,
        color: palette.goldBright, pointerEvents: "none", zIndex: 3,
        transform: "scaleX(-1)",
      }} aria-hidden>
        <path d="M2,2 L62,2 M2,2 L2,62 M2,2 Q22,12 32,32 M2,2 Q12,22 32,32"
              stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9"/>
      </svg>
      {/* silhouette */}
      {showSilhouette && (
        <span style={{
          position: "absolute", bottom: "26%", left: "50%", transform: "translateX(-50%)",
          width: 130, height: 220,
          background: palette.silhouette,
          WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
          maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
          borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
          boxShadow: `0 0 60px ${palette.accent}88`,
          pointerEvents: "none", zIndex: 2,
        }} />
      )}
      <style>{`
        @keyframes dh-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
