# Tha Dogg House — concept site

Concept redesign for Tha Dogg House, Snoop Dogg's flagship in Amsterdam (Marnixstraat 333 and Oudebrugsteeg 26). By Crystal Labs.

Live: https://thadogghouse-site.vercel.app

## What's inside

- Three.js shader hero over a looping video (vertical on portrait screens, horizontal on landscape), with optional sound.
- GSAP + ScrollTrigger + SplitText motion, Lenis smooth scroll on desktop.
- "Find the house" map: MapLibre GL with a recolored CARTO dark style, 3D buildings, logo pins and a route between the two houses.
- Lightbox for the reels and the gallery, Ladies Night date in Amsterdam time, age gate.

## Run locally

It is a static site with no build step:

```bash
python -m http.server 5590
```

Then open http://localhost:5590.

## Deploy

```bash
npx vercel deploy --prod --yes
```

Map data © OpenStreetMap contributors © CARTO.
