# FRL AI Livery Collaborator

Browser-based FR Legends livery generator with a local computer-vision collaborator. Image analysis and tracing run in the browser; the project preserves the original Next.js application structure and FRL shape-record layout.

## Features

- Image upload and image URL loading.
- Local image analysis: adaptive RGB quantization, 4-connected component extraction, contour/perimeter scoring, and shape prioritization.
- Collaborator optimizer evaluates multiple palette configurations (16/24/32 colors for Balanced) and selects a candidate using coverage, layer-budget utilization, and truncation penalties.
- Design strategies: Detail, Balanced, and Lite.
- Optional natural-language design brief rules: prioritize detail, simplify layers, or preserve the background.
- Layer budget, generated code, and reference/generated preview.
- No image upload to the generation API, API key, paid AI endpoint, or external model download is required. The original API route remains available as a compatible server-side endpoint.
- Vercel-compatible Next.js deployment.

> Technical accuracy: this release is a deterministic local computer-vision and heuristic optimization system. It is not a pretrained neural network or generative AI model. The UI calls it a Collaborator because it analyzes, compares configurations, reports metrics, and applies supported design instructions. A future neural segmentation model can be added as an optional local inference stage without changing the FRL encoder.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Upload this project to a Git repository or import the extracted folder into Vercel.
2. Select **Next.js** as the framework (normally detected automatically).
3. Build command: `npm run build`.
4. Output directory: leave the default setting.
5. No environment variables or API keys are required.
6. Deploy.

## Collaborator design strategies

- **Detail**: evaluates 24/28/32-color palettes and favors fine structure.
- **Balanced**: evaluates 16/24/32-color palettes and balances coverage, color fidelity, and layer count.
- **Lite**: evaluates 12/16/20-color palettes and favors compact output.

Supported design-brief directives (English or Indonesian):

- `more detail`, `pertahankan detail`, `lebih detail` → Detail strategy.
- `simpler`, `less layer`, `kurangi layer`, `lebih sederhana` → Lite strategy.
- `keep background`, `preserve background`, `jangan hapus background`, `pertahankan background` → retain the dominant edge-connected background component.

Other free-text notes are displayed as the design brief but are not interpreted semantically in this version.

## FRL output compatibility

- Existing 36-character drawable shape record layout is retained.
- Existing `0002` sprite ID and `FFFF00000000006400640000FFFFFFFF0001` experimental parent header are retained.
- Every drawable remains an individual shape record; shapes are not flattened into one bitmap layer.
- Parent grouping compatibility must still be verified by importing a generated code into FR Legends. This project does not claim the experimental `FFFF` group header is game-verified.

## Validation

The source has been syntax-transpiled and the local generator tested against synthetic four-color, curved-logo, fine-detail, and adjacent-color images. Record lengths, layer caps, header, and closing marker were checked. A full Next.js production build and in-game import test must be run in an environment with dependencies installed and access to Vercel/FR Legends.
