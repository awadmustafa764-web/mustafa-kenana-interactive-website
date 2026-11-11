---
name: visual-qa
description: Focused verification checklist for this cinematic site — build, console, desktop/mobile viewports, scroll scrubbing, RTL, WhatsApp link, performance. Load when testing or reviewing the site.
---

# Visual QA

1. `npm run build` must pass with no errors; note bundle size (target < 900 KB JS gzip-less).
2. `npm run dev` (port 5173) and open in the preview browser.
3. Console: zero errors, zero WebGL warnings after the intro and after a full scroll.
4. Scrub: scroll to each section start/middle/end (`window.scrollTo`) and back — scenes
   must look identical scrubbing backwards; transitions must show the 16:9 portal wipe.
5. Viewports: 1440×900, 768×1024, 375×812 (mobile emulation). Check: no horizontal
   scroll, text never overlaps the focal 3D object illegibly, tap targets ≥ 44 px.
6. RTL: `<html dir="rtl" lang="ar">`, punctuation and `…` placement, phone number LTR.
7. Contact: every WhatsApp link is `https://wa.me/970595261017`, opens in new tab with `rel="noopener"`.
8. Brand name spelled exactly مصطفى كنانة everywhere.
9. Reduced motion: emulate and confirm site still works and the intro is short.
10. Performance: `renderer.info.render.calls` per scene; FPS from the loop's monitor.
Report concrete issues as `file:line — problem — fix`, no generic advice.
