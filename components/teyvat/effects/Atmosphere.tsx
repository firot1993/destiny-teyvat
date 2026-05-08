// components/teyvat/effects/Atmosphere.tsx
"use client";
import type { TierPalette } from "@/lib/teyvat/stageTiers";

interface Props {
  palette: TierPalette;
  /** Number of wind streaks to render. Default 3. */
  windStreaks?: number;
}

const layerStyle: React.CSSProperties = {
  position: "absolute", left: 0, right: 0, pointerEvents: "none", zIndex: 0,
};

export function Atmosphere({ palette, windStreaks = 3 }: Props) {
  return (
    <>
      <svg style={{ ...layerStyle, bottom: "30%", height: "22%", opacity: 0.32 }}
           viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden>
        <polygon points="0,80 50,40 110,55 180,30 240,48 320,32 380,50 400,38 400,80"
                 fill="#5a6878"/>
      </svg>
      <svg style={{ ...layerStyle, bottom: "22%", height: "36%", opacity: 0.6 }}
           viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden>
        <polygon points="0,100 40,55 90,75 140,40 200,68 260,38 310,62 360,42 400,68 400,100"
                 fill="#3d4858"/>
      </svg>
      <span style={{ position: "absolute", top: 18, left: 22, color: palette.gold,
                     fontSize: 22, lineHeight: 1, zIndex: 2 }}>❦</span>
      <span style={{ position: "absolute", bottom: 18, right: 22, color: palette.gold,
                     fontSize: 22, lineHeight: 1, zIndex: 2 }}>❦</span>
      {Array.from({ length: windStreaks }).map((_, i) => (
        <span key={i} style={{
          position: "absolute", height: 1, top: `${20 + i * 15}%`,
          left: `${(i * 12) % 30}%`, width: `${45 + (i % 3) * 5}%`,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
          pointerEvents: "none", zIndex: 1,
          animation: `dh-wind 7s linear ${i * 1.4}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes dh-wind {
          0% { transform: translateX(-30%); opacity: 0; }
          20% { opacity: 0.7; }
          80% { opacity: 0.5; }
          100% { transform: translateX(60%); opacity: 0; }
        }
      `}</style>
    </>
  );
}
