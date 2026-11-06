# FRL Image Converter — Hybrid Edition

A browser-based experimental PNG/JPG/WebP to FR Legends livery-shape encoder.

## Features
- Hybrid adaptive tracing (quadtree-style subdivision using color variation and edge activity).
- Separate Body Code and Window Code outputs.
- Adjustable shape budgets (Body 100–1,300; Window 50–500).
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

The current encoder emits square shape type `0002` records and uses an estimated centered coordinate mapping. The public format notes do not fully specify every in-game coordinate convention, shape catalog, or version-specific behavior. Therefore:
- Treat generated codes as **experimental** until imported and verified in your own FR Legends version.
- Test with a small shape budget first.
- Import Body Code in the Body section and Window Code in the Window section.
- Keep a backup of an existing livery before testing.
- A single flat source image is mapped into each output separately; this does not automatically understand car panel boundaries or perspective.

The Body and Window outputs are independently generated from the same uploaded image. Window Code is not automatically extracted from actual glass regions.

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
