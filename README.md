# INVERSIONES MEZCOLÁ SL - Cinematic Prototype

Production-oriented Next.js App Router prototype for a cinematic ES/EN luxury website.

## Stack

- Next.js (App Router) + TypeScript
- CSS Modules + global CSS
- GSAP ScrollTrigger
- Lenis
- next/font
- Locale metadata + canonical/hreflang
- `sitemap.ts` + `robots.ts`
- JSON-LD (`Organization` + `WebSite`)
- Vercel-ready

## Project Structure

```txt
src/
  app/
    [locale]/
      layout.tsx
      page.tsx
    api/lead/route.ts
    layout.tsx
    page.tsx
    robots.ts
    sitemap.ts
  components/
    CinematicExperience.tsx
    CinematicExperience.module.css
    ContactForm.tsx
    LanguageSwitcher.tsx
    Scene.tsx
    SeoJsonLd.tsx
    TransitionVideo.tsx
  lib/
    assets.ts
    content.ts
    i18n.ts
    seo.ts
styles/
  globals.css
public/
  images/
  videos/
```

## Asset Placement (exact filenames)

Put approved assets here **without renaming**:

Images:

- `/public/images/Photo1Forest.png`
- `/public/images/Photo2Lake.png`
- `/public/images/Photo3Waterfall.png`
- `/public/images/Photo4House.png`
- `/public/images/Photo5Room1.png`
- `/public/images/Photo6Room2.png`
- `/public/images/Photo7Room3.png`
- `/public/images/Photo8TableAndPaper.png`

Videos:

- `/public/videos/Transition1ForestToLake.mp4`
- `/public/videos/Transition2LakeToWaterfall.mp4`
- `/public/videos/Transition3WaterfallToHouse.mp4`
- `/public/videos/Transition4HouseToRoom1.mp4`
- `/public/videos/Transition5Room1ToRoom2Wall.mp4`
- `/public/videos/Transition6Room2ToRoom3ThroughAir.mp4`
- `/public/videos/Transition7Room3ToFinalOfficePaper.mp4`

Asset manifest is defined in [`src/lib/assets.ts`](src/lib/assets.ts).

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Build command: `npm run build`
4. Output: default Next.js output (auto-detected by Vercel).
5. Configure production domains:
   - `inversionesmezcola.es` (canonical)
   - `www.inversionesmezcola.es`
6. Keep canonical on non-www (`https://inversionesmezcola.es`).

## Known Limitations

- Transition videos are opacity-driven and viewport-triggered (not frame-perfect scroll scrubbing) to prioritize Safari reliability.
- If videos fail to load, scenes still render with still image backgrounds and readable semantic content.
- `/api/lead` currently returns captured payload JSON; wire it to CRM/email provider for production.

