# مصطفى كنانة — Interactive Cinematic Experience

Scroll-driven WebGL story: six worlds joined by a 16:9 "portal" transition.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/ — deploy to any static host
```

- Copy: `src/config/content.js` (all text, WhatsApp number)
- Palette / quality tiers: `src/config/theme.js`
- Worlds: `src/scenes/*Scene.js` · loop & transitions: `src/core/director.js`, `src/core/renderer.js`
- Creative/engineering rules for future work: `.claude/skills/`
