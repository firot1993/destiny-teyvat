# Curate Phase: Bullet Model

## Data Flow

```
LLM scan (10 fragments)
    ↓ parseNoiseFragments
NoiseFragment[] (id, text)
    ↓ fragmentToBullet
Bullet[] (id, text, status, passCount, chamberIndex)
    ↓ user interaction (BulletField click → catchBullet)
    ↓ pass complete → ricochetSingle / ricochetUncaught
    ↓ 6 caught → runPhase = "ready"
    ↓ FIRE button → FireImpact overlay → generate()
    ↓ buildBulletSeed
"N::text\n..." seed string → denoising loop
```

## Bullet Status Machine

```
flying ──click──▶ caught (chamberIndex assigned)
  │                  │
  │ (pass ends)      └─── locked, included in seed
  ▼
ricocheting (passCount++, direction reverses)
  │
  │ (passCount >= 3)
  ▼
spent ──▶ excluded from seed
```

## Component Tree (Curate Phase)

```
<div position:relative>          ← contains field + HUD
  <AmmoHUD bullets={bullets} />  ← absolute top-left, z-5
  <BulletField bullets={bullets}
    onCatch={gen.catchBullet}
    onPassComplete={ricochetSingle}
  />
</div>
<FireImpact active={fireImpactActive}
  onComplete={() => gen.generate()}
/>
```

## Constants

| Constant | Value | Location |
|---|---|---|
| REVOLVER_CHAMBERS | 6 | types/index.ts |
| MAX_BULLET_PASSES | 3 | types/index.ts |
| bulletDurationSec | 2.5 | lib/motion.ts |
| ricochetDurationSec | 3.5 | lib/motion.ts |
| catchScalePulse | 1.22 | lib/motion.ts |
| fireTotalMs | 840 | lib/motion.ts |

## Hook API (useGeneration)

New actions replace old ones:

| Old | New |
|---|---|
| `decideCurrentNoise("keep")` | `catchBullet(id)` |
| `decideCurrentNoise("remove")` | (no action — just don't click) |
| `denoiseSelectedNoise` | `generate()` (after FireImpact) |
| `scanNoiseFragments` | `scanNoiseFragments` (unchanged) |
| — | `ricochetSingle(id)` |
| — | `ricochetUncaught()` |
| — | `reloadScan()` |

Removed from hook return: `currentNoiseFragment`, `keptNoiseFragments`, `removedNoiseCount`, `mergedNoisePlan`, `mergeRevealStage`, `isMergeRevealPending`, `canRemoveCurrentNoise`, `canKeepCurrentNoise`, `denoiseSelectedNoise`, `decideCurrentNoise`.
