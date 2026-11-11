---
name: creative-direction
description: Creative bible for the مصطفى كنانة cinematic site — narrative, scene worlds, palette, Arabic typography, motion language and the "avoid" list. Load before designing or changing any scene, copy layout, colour or transition.
---

# Creative direction — "من الشريحة إلى العالم" (From slide to world)

## Core idea
The **16:9 rectangle** (the PowerPoint slide) is the brand's single recurring form.
At the start it is a flat prison. Through the story it is broken open, given depth,
threaded, multiplied and finally becomes a **doorway** the visitor walks through to
contact. Every scene must use the rectangle with a *different* meaning. Every
transition between worlds is the next world appearing inside an expanding 16:9 frame
(the "portal wipe") — that is the unified identity; the worlds themselves differ.

## Narrative (scene order and why it exists)
| # | id | World | Message | Interaction |
|---|----|-------|---------|-------------|
| 0 | prologue | A steel 16:9 slide engraved «عرض تقديمي · 01 / 24» in a black studio. One crafted sword is drawn back, strikes (80 ms hit-stop, sparks, kerf), slow-motion cut; the halves fall and the hall powers on through the cut | "The traditional slide is broken." | none (~3.1 s, no skip; scrolling fast-forwards it x4) |
| 1 | hall | Surreal fluorescent archive: an endless corridor of grey identical slides | Main headline + intro copy: traditional slides are limiting | slides lean away from the cursor; camera parallax |
| 2 | unfold | The flat slide breaks into tiles that rise into a live kinetic data-landscape | عرض يلفت الانتباه | cursor is a lens that lifts tiles |
| 3 | disciplines | Gallery plinth under a warm spot: one blackened-steel rod-and-node study model snaps, rod by rod, into dome → bar chart → DNA → chip → open book; real shadows | لجميع التخصصات | names are buttons (scroll to that form); cursor turns the turntable |
| 4 | link | **Inverted** paper-white gallery: one vermilion thread pierces projector, laptop, tablet, phone; a flash drive falls away | رابط واحد لمشروعك | pluck the thread (hover / drag) — it vibrates |
| 5 | standout | Kinetic façade at golden hour: a vertical wall of hundreds of identical grey 16:9 flip-panels (everyone's slides); with scroll the panels flip to their ember side and write the word «تميّز» | تميّز عن زملائك + pricing note + "ابتعد عن مشاريع الذكاء الاصطناعي التقليدية" + 2nd CTA | panels flip in a wake behind the cursor / finger |
| 6 | finale | Cast-concrete 16:9 opening in a dark hall; a paper-white room behind it throws an exact light pool on the floor; the visitor walks into the light and the chat bubble appears | Closing message, name, WhatsApp CTA | gentle parallax only |

## Review decisions (adopted)
- Persistent WhatsApp pill from the hall onward (ink/paper, ember only on hover) + CTA beside the pricing note + finale CTA.
- The service is stated plainly in the hall: «حوّل مشروعك أو بحثك الجامعي إلى موقع ويب تفاعلي».
- Disciplines: the names are tappable (hint «اختر تخصصك»); «وغيرها» = an open book so humanities see themselves.
- Link scene: the headline word swaps فلاشة → ملف → رابط as the drive falls. Portrait: devices stack, thread runs vertically.
- HUD counter `01 / 07` pays off the intro's slide counter (progress, not navigation).
- Intro ≤ 3.5 s. Portal wipe keeps its form but starts from each scene's own focal object.
- Amiri restricted to the link world and the closing line. Digits: Western (0-9) in mono labels.

## Palette (tokens in `src/config/theme.js`)
- `ink` #0b0b0d — void, text on paper
- `paper` #ece6da — warm bone, main text on dark, the link-world background
- `ember` #ff4a1c — vermilion accent: the "alive" thing in each scene (one per scene, never decoration)
- `brass` #c9a24a — used ONLY as light colour (golden hour, doorway glow), never flat fills
- `fluoro` #cfd8d6 — cold fluorescent grey of the hall
Gold is light, not paint. Black is space, not a theme.

## Typography
- Display: **Reem Kufi** (geometric kufi) — huge, tight leading (0.95–1.05), weight 600–700.
- Editorial counterpoint: **Amiri** (naskh) for emotive lines and pull quotes.
- Body: **IBM Plex Sans Arabic** 300–500, line-height 1.7–1.9.
- Technical labels / numbers: **IBM Plex Mono**, LTR, uppercase, letter-spacing .12em.
- Never split Arabic into letters (breaks joining). Kinetic reveals split by **words** only.
- Wrap phone numbers/URLs in `<bdi dir="ltr">`.
- Each scene has a different layout grid: centred monument (hall), right column + low paragraph (unfold), vertical index list (disciplines), editorial columns ink-on-paper (link), giant single word (standout), centred CTA (finale).

## Motion language
- Scroll is the only clock for story progress; ambient motion (breathing, drift, flicker) continues when scroll stops.
- Ease: `power3.out` / `expo.out` for reveals, never bouncy.
- Text enters with a short vertical mask + blur-to-sharp, exits faster than it enters.
- Camera: slow, weighted, damped (lerp ≈ 0.06–0.08/frame); pointer parallax ≤ 3°.

## Copy rules
Source copy lives in `src/config/content.js`. Preserve meaning; do not invent services,
prices, guarantees, clients, links or testimonials. No portfolio, no nav bar, no skip button.
Brand name is always exactly **مصطفى كنانة**. WhatsApp: `https://wa.me/970595261017`.

## Avoid
SaaS card grids, gradient blobs, glow on everything, random floating shapes, gold-on-black
"luxury" clichés, more than one accent per scene, text that only exists inside WebGL.

## Upgrade rules (v2)
- Fewer, better objects. No glowing particle clouds, sci-fi rings, starfields, dust motes or light-shaft planes.
- Metal needs something to reflect: use `studioEnvironment()` (procedural softbox strips), never a flat colour.
- Every surface gets an imperfection map (brushed steel, cast concrete pores, engraved bump).
- Bloom is for incandescent things only (sparks, the kerf; a little halation on the finale room). Off elsewhere.
- Light is motivated: each scene names its key, rim and practical source.
