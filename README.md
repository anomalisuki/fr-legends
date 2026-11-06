# FRL Image Converter — Combined Smart Tracing Edition

A browser-based experimental PNG/JPG/WebP to FR Legends livery-shape encoder.

## Features
- Combined Smart Tracing: adaptive 16–32 color palette, connected-component analysis, edge-aware quadtree subdivision, and salience-weighted shape budgeting.
- 256 × 256 analysis canvas with aspect-ratio preservation and very light smoothing.
- Separate Body Code and Window Code outputs.
- Adjustable shape budgets (Body 20–1,300; Window 10–500), defaulting to 650 / 250.
- Fast / Balanced / Fine tracing presets.
- Transparent pixel handling or white/black background replacement.
- Preview, copy, TXT export, and local conversion history.
- No backend or API key required. Images are processed locally in the browser.

## Run locally
Open `index.html` in a modern browser. For best results, use a local static server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy to Vercel
1. Extract this ZIP.
2. Upload the project to a Git repository.
3. Import the repository in Vercel.
4. Framework Preset: **Other**.
5. Build Command: leave empty.
6. Output Directory: `.` (project root).
7. Deploy.

No environment variables are required.

## Important compatibility note
This project uses a documented 18-byte / 36-hex-character shape record layout:
`shape type + position X/Y + scale X/Y + rotation + RGB + opacity + blend + flags`.

The current encoder emits rectangular shape type `0002` records and uses an estimated centered coordinate mapping. The encoder format has no verified arbitrary-polygon record, so the tracing engine preserves curved boundaries by adaptive small rectangles rather than silently changing the established record structure. The public format notes do not fully specify every in-game coordinate convention, shape catalog, or version-specific behavior. Therefore:
- Treat generated codes as **experimental** until imported and verified in your own FR Legends version.
- Test with a small shape budget first.
- Import Body Code in the Body section and Window Code in the Window section.
- Keep a backup of an existing livery before testing.
- A single flat source image is mapped into each output separately; this does not automatically understand car panel boundaries or perspective.

The Body and Window outputs are independently generated from the same uploaded image. Window Code is not automatically extracted from actual glass regions.

## Tracing implementation notes

The local tracing pipeline quantizes colors with a deterministic adaptive palette, labels connected components, measures component area/perimeter, then recursively subdivides mixed-color/high-edge tiles. Shape-budget reduction uses area, edge activity, component salience, and color rarity instead of deleting solely by area. The experimental `FFFF` wrapper is retained for both Body and Window exports; its in-game compatibility remains unverified.

## Technical references
- FR Legends livery code format notes: https://github.com/Razanius12/frl-ai-generated-livery-codes/blob/main/documentation/LIVERY_CODE_FORMAT.md
- FRLMods image-to-livery overview: https://frlmods.com/image-to-livery
- Import guide: https://frlmods.com/how-to-import-livery-codes-fr-legends

## Project structure
- `index.html` — interface
- `style.css` — responsive styling
- `app.js` — image processing, hybrid tracing, encoder, export/history
- `vercel.json` — static Vercel configuration

## License
Provided as an educational community prototype. FR Legends is a third-party game; this project is not affiliated with its developers.
