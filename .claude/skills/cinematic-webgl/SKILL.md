---
name: cinematic-webgl
description: Engineering rules for this project's scroll-driven Three.js experience — director/scene contract, camera rigs, portal transitions, scroll beats, Arabic canvas text, performance budgets, mobile tiers and cleanup. Load before writing or modifying anything in src/core, src/scenes or src/ui.
---

# Cinematic WebGL architecture

Stack: Vite + vanilla Three.js + GSAP (core only, for the intro timeline) + Lenis. No framework.

## Layout
```
src/config/   content.js (all copy), theme.js (palette, quality tiers)
src/core/     renderer.js (one WebGLRenderer, RTs, composite pass)
              director.js (scene registry, active/transition logic, lazy init, loop)
              scroll.js (Lenis + per-section progress), pointer.js, cameraRig.js (quality tiers live in config/theme.js)
src/scenes/   one file per world, extends BaseScene; shared/ for textures, glsl, geometry
src/ui/       dom.js (builds sections from content), beats.js (text reveals), intro.js, hud.js
```

## Scene contract (`src/scenes/BaseScene.js`)
- `constructor(ctx)` cheap; heavy work in `init()` which the director calls lazily when the
  section is within one viewport.
- `update(dt, time, progress, pointer)` — progress 0..1 is section-local; derive everything
  from it so scrubbing backwards works. Ambient motion uses `time`.
- `resize(w, h, aspect)` — re-fit camera for portrait (widen FOV / pull back).
- `dispose()` must free geometries, materials, textures.
- Each scene owns `this.scene` and `this.camera` (via `CameraRig`).

## Rendering
- Single renderer. Each frame the director renders the active scene into RT A. In a
  transition zone it also renders the next into RT B; the composite pass mixes them with
  the 16:9 portal wipe, then applies tone mapping, sRGB, grain and vignette.
- Only scenes in view (or in a transition) render. Others are skipped entirely.
- Composite shader must include `<tonemapping_fragment>` and `<colorspace_fragment>`.

## Text
- All readable copy is DOM (accessible, crisp, RTL). WebGL text = CanvasTexture with
  `ctx.direction = 'rtl'`, drawn after `document.fonts.ready`.
- Beats: elements with `data-in`/`data-out` (section progress). `beats.js` toggles a
  `.is-on` class; CSS + word spans do the reveal. Never split Arabic into letters.

## Performance budget
- Desktop: ≤ 60 draw calls per scene, DPR ≤ 2, MSAA 4 on RTs.
- Mobile (tier `low`): DPR ≤ 1.5, no shadows, half particle counts, no MSAA.
- Prefer InstancedMesh + vertex-shader animation over per-object JS updates.
- Adaptive DPR: drop by 0.25 when the rolling FPS < 45 for 2 s (floor 1).
- Pause the loop when `document.hidden`.

## Reduced motion
`prefers-reduced-motion`: native scroll (no Lenis), short intro, ambient time × 0.25,
no camera shake. Story still progresses with scroll.

## Mobile
Not a shrunken desktop: shorter sections, text docked low with a scrim, camera FOV widened
for portrait, pointer interactions mapped to touch drag, disciplines names as tap targets.

## v2 additions
- Prologue: `PrologueScene` is time-driven (`setTime(t)`), rendered by the director in **mask mode**: it clears with alpha 0 and is composited premultiplied over the hall. Additive effects inside it must use the custom blend that leaves destination alpha untouched.
- Bloom: `renderer.bloom()` runs a 1/4 + 1/8 res chain; per-scene `this.bloom = { strength, threshold }`, interpolated through portal transitions.
- Dev frame review: `/?pt=1.4` freezes the prologue at t = 1.4 s; `__pt(t)` scrubs it from the console. `go(scene, progress)` jumps the scroll.
- Rod sculpture: endpoints for all five forms live in instanced attributes (a0–a4, b0–b4); keep total vertex attributes ≤ 16.
