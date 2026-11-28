# Rev2D Rig Archetypes (Step 2)

Four standardized character & creature `.r2d.json` blueprints built on a unified parameter contract:

| File | Archetype | Skeleton & IK | Physics | Expression / Lip-Sync |
|---|---|---|---|---|
| `biped-talking.r2d.json` | Human / Biped | Pelvis → Torso → Head, 4× 2-Bone IK (`armLIk`, `armRIk`, `legLIk`, `legRIk`) | 2-segment scarf (`scarfPhys`) | `MouthOpen` (ellipse `rx/ry`), `EyeLOpen`/`EyeROpen`, `EyeBallX`/`Y` |
| `quadruped-fox.r2d.json` | 4-Legged Animal (Fox) | Pelvis → Chest → Neck → Head, 4× 2-Bone IK (`flIk`, `frIk`, `blIk`, `brIk`) | 3-segment tail (`tailPhys`) + ear bounce (`earPhys`) | `MouthOpen` → `lowerJaw` hinge (`0°..24°`) |
| `avian-bird.r2d.json` | Bird / Avian | Body → Head + 3-bone wing + Perch IK (`legIk`) | Tail feather spring (`tailPhys`) | `MouthOpen` → `lowerBeak` hinge (`0°..28°`), phase-lagged `fly` wings |
| `eye-only-kurzgesagt.r2d.json` | Mouthless Narrator | Body + Head + Brows + `bodyWarp` | — | **No mouth**; gaze (`EyeBallX`/`Y`), blink, `BrowMood`, `AngleZ`, `Breath` |
