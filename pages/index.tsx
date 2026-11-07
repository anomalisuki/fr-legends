import React from 'react';
import Link from 'next/link';
import { useResponsive, useContainerWidth } from '../hooks/useResponsive';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';
import { uint8ToBase64, ensureTinted } from '../utils/uiHelpers';
import { generateCollaborativeResult } from '../utils/generator';

// Placeholder samples removed — UI shows nothing until an image is loaded.

export default function Home(): React.ReactElement {
  const { isMobile, windowWidth } = useResponsive();
  const [backgroundMode, setBackgroundMode] = React.useState<'tilemap' | 'color'>('tilemap');
  const [backgroundColor, setBackgroundColor] = React.useState<string>('#ffffff');
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const tilemapImageRef = React.useRef<HTMLImageElement>(null);
  const containerWidth = useContainerWidth(canvasContainerRef as React.RefObject<HTMLDivElement & HTMLElement>);

  // Client state for uploaded image and generation
  const [uploadedName, setUploadedName] = React.useState<string | null>(null);
  const [processedWidth, setProcessedWidth] = React.useState<number | null>(null);
  const [processedHeight, setProcessedHeight] = React.useState<number | null>(null);
  const [needsRegenerate, setNeedsRegenerate] = React.useState<boolean>(false);
  const [generatedImgW, setGeneratedImgW] = React.useState<number | null>(null);
  const [generatedImgH, setGeneratedImgH] = React.useState<number | null>(null);
  const processedPixelsBase64Ref = React.useRef<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [generatedCode, setGeneratedCode] = React.useState<string | null>(null);
  // layer cap state (toggleable via Uncap checkbox)
  const [maxLayersState, setMaxLayersState] = React.useState<number>(1300);
  const [uncap, setUncap] = React.useState<boolean>(false);
  const originalImageRef = React.useRef<HTMLImageElement | null>(null);
  const [originalSize, setOriginalSize] = React.useState<{ w: number; h: number } | null>(null);
  const [layersCount, setLayersCount] = React.useState<number | null>(null);
  const [qualityMode, setQualityMode] = React.useState<'detail' | 'balanced' | 'lite'>('balanced');
  const [collabStats, setCollabStats] = React.useState<any>(null);
  const [collabSuggestions, setCollabSuggestions] = React.useState<string[]>([]);
  const [collabNotes, setCollabNotes] = React.useState<string>('');
  const [scalePercent, setScalePercent] = React.useState<number>(100);
  const [urlInput, setUrlInput] = React.useState<string>('');
  const [referenceSrc, setReferenceSrc] = React.useState<string | null>(null);
  const spriteCacheRef = React.useRef<Record<string, HTMLImageElement>>({});
  const [spriteVersion, setSpriteVersion] = React.useState(0);
  const bgCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const tintedCacheRef = React.useRef<Record<string, HTMLCanvasElement>>({});

  // tinted canvases cached in `tintedCacheRef`; use imported `ensureTinted` helper.

  // Draw canvas preview (placeholder shapes) onto the top canvas; background goes to the bg canvas
  React.useEffect((): void => {
    // Do not draw placeholders when no image is loaded; clear canvases instead.
    if (!originalSize) {
      if (bgCanvasRef.current) {
        const c = bgCanvasRef.current;
        const ctx = c.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      }
      if (canvasRef.current) {
        const c = canvasRef.current;
        const ctx = c.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      }
      return;
    }
    if (!canvasRef.current || !bgCanvasRef.current) return;
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    if (!ctx || !bgCtx) return;

    const boxSize = 8;
    const boxesW = 64;
    const boxesH = 64;
    const tilemapPixelW = boxesW * boxSize;
    const tilemapPixelH = boxesH * boxSize;

    // Determine pixel size for square canvas (preserve 1:1 display)
    const containerRect = canvasContainerRef.current?.getBoundingClientRect();
    const availW = containerRect ? containerRect.width : containerWidth || tilemapPixelW;
    const availH = containerRect ? containerRect.height : containerWidth || tilemapPixelH;
    const scale = Math.min(availW / tilemapPixelW, availH / tilemapPixelH) || 1;
    const pxW = Math.round(tilemapPixelW * scale);
    const pxH = Math.round(tilemapPixelH * scale);

    canvas.width = pxW;
    canvas.height = pxH;
    bgCanvas.width = pxW;
    bgCanvas.height = pxH;

    // Draw background on bg canvas
    if (backgroundMode === 'tilemap') {
      if (tilemapImageRef.current && tilemapImageRef.current.complete) {
        const tileImg = tilemapImageRef.current;
        const pattern = bgCtx.createPattern(tileImg, 'repeat');
        if (pattern) {
          bgCtx.fillStyle = pattern;
          bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        }
      } else if (tilemapImageRef.current) {
        tilemapImageRef.current.onload = () => setSpriteVersion((v) => v + 1);
        bgCtx.fillStyle = '#ffffff';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      } else {
        bgCtx.fillStyle = '#ffffff';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      }
    } else {
      bgCtx.fillStyle = backgroundColor;
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    }

    // Clear top canvas (no placeholders)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [backgroundMode, backgroundColor, containerWidth, spriteVersion, originalSize]);

  // Draw generated preview when `generatedCode` is available.
  React.useEffect(() => {
    if (!generatedCode || !canvasRef.current || !bgCanvasRef.current) return;
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    if (!ctx || !bgCtx) return;

    // Prepare canvas size matching previous logic
    const boxSize = 8;
    const boxesW = 64;
    const boxesH = 64;
    const tilemapPixelW = boxesW * boxSize;
    const tilemapPixelH = boxesH * boxSize;
    const containerRect = canvasContainerRef.current?.getBoundingClientRect();
    const availW = containerRect ? containerRect.width : containerWidth || tilemapPixelW;
    const availH = containerRect ? containerRect.height : containerWidth || tilemapPixelH;
    const scale = Math.min(availW / tilemapPixelW, availH / tilemapPixelH) || 1;
    const pxW = Math.round(tilemapPixelW * scale);
    const pxH = Math.round(tilemapPixelH * scale);
    canvas.width = pxW;
    canvas.height = pxH;
    bgCanvas.width = pxW;
    bgCanvas.height = pxH;

    // Draw background onto bg canvas
    if (backgroundMode === 'tilemap') {
      if (tilemapImageRef.current && tilemapImageRef.current.complete) {
        const tileImg = tilemapImageRef.current;
        const pattern = bgCtx.createPattern(tileImg, 'repeat');
        if (pattern) {
          bgCtx.fillStyle = pattern;
          bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        }
      } else if (tilemapImageRef.current) {
        tilemapImageRef.current.onload = () => setSpriteVersion((v) => v + 1);
        bgCtx.fillStyle = '#ffffff';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      } else {
        bgCtx.fillStyle = '#ffffff';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      }
    } else {
      bgCtx.fillStyle = backgroundColor;
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    }

    // Parse generated code lines and draw each sprite into a centered letterboxed area
    const lines = generatedCode.split('\n').map((l) => l.trim()).filter(Boolean);

    const parseLine = (line: string) => {
      const m = line.match(/^([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})/);
      if (!m) return null;
      const [, spriteId, posX, posY, xSize, ySize, rot, colorHex, opacity] = m;
      const hexToSigned = (h: string) => {
        const v = parseInt(h, 16);
        return v > 0x7fff ? v - 0x10000 : v;
      };
      return {
        spriteId,
        posX: hexToSigned(posX),
        posY: hexToSigned(posY),
        xSize: parseInt(xSize, 16),
        ySize: parseInt(ySize, 16),
        rot: hexToSigned(rot),
        colorHex,
        opacity: parseInt(opacity, 16),
      };
    };

    const imgW = generatedImgW || processedWidth || 64;
    const imgH = generatedImgH || processedHeight || 64;

    // Compute letterboxed area inside the square canvas where the image should be drawn
    const scaleFit = Math.min(canvas.width / imgW, canvas.height / imgH);
    const imageDrawW = imgW * scaleFit;
    const imageDrawH = imgH * scaleFit;
    const offsetX = Math.round((canvas.width - imageDrawW) / 2);
    const offsetY = Math.round((canvas.height - imageDrawH) / 2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const line of lines) {
      if (line.startsWith('FFFF') || line === '<' || line === '>') continue;
      const entry = parseLine(line);
      if (!entry) continue;

      // Convert FRL units (1/8px) back to image pixels and center-origin
      const imgX = (entry.posX) / 8 + imgW / 2;
      const imgY = (entry.posY) / 8 + imgH / 2;
      const imgWpx = entry.xSize / 8;
      const imgHpx = entry.ySize / 8;

      // Map to letterboxed canvas coords
      const drawX = offsetX + imgX * scaleFit;
      const drawY = offsetY + imgY * scaleFit;
      const drawW = Math.max(1, imgWpx * scaleFit);
      const drawH = Math.max(1, imgHpx * scaleFit);

      try {
        const spriteIdKey = entry.spriteId;
        let spr = spriteCacheRef.current[spriteIdKey];
        if (!spr) {
          spr = new Image();
          spr.crossOrigin = 'Anonymous';
          spr.onload = () => setSpriteVersion((v) => v + 1);
          spr.onerror = () => { };
          spr.src = `/sprite/${spriteIdKey}.png`;
          spriteCacheRef.current[spriteIdKey] = spr;
        }

        ctx.save();
        ctx.globalAlpha = (entry.opacity || 255) / 255;
        const cx = drawX + drawW / 2;
        const cy = drawY + drawH / 2;
        ctx.translate(cx, cy);
        if (entry.rot) ctx.rotate((entry.rot * Math.PI) / 180);
        if (spr.complete && (spr.naturalWidth || spr.naturalHeight)) {
          const tw = Math.max(1, Math.round(drawW));
          const th = Math.max(1, Math.round(drawH));
          const tinted = ensureTinted(tintedCacheRef.current, spr as HTMLImageElement, entry.colorHex, entry.opacity, tw, th);
          if (tinted) {
            ctx.drawImage(tinted, -drawW / 2, -drawH / 2, drawW, drawH);
          } else {
            ctx.drawImage(spr, -drawW / 2, -drawH / 2, drawW, drawH);
          }
        } else {
          ctx.fillStyle = `#${entry.colorHex}`;
          ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
        ctx.restore();
      } catch (err) {
        ctx.save();
        ctx.fillStyle = `#${entry.colorHex}`;
        ctx.globalAlpha = (entry.opacity || 255) / 255;
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.restore();
      }
    }
  }, [generatedCode, containerWidth, backgroundMode, backgroundColor, generatedImgW, generatedImgH, spriteVersion]);

  // Client helpers are provided by imported utilities (`uint8ToBase64`, `ensureTinted`).

  // Load file and auto-downscale until layers <= maxLayers (client-side preprocessing)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadedName(file.name);
    const reader = new FileReader();
    reader.onload = function (ev) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = async function () {
        originalImageRef.current = img;
        setOriginalSize({ w: img.width, h: img.height });
        setReferenceSrc(ev.target?.result as string);
        // process with current scalePercent
        await processImageFromImage(img, scalePercent);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Prepare a detail-preserving analysis image. Layer limits are applied by the
  // collaborator after segmentation, not by destroying source resolution here.
  const processImageFromImage = async (img: HTMLImageElement, startPercent: number) => {
    const off = document.createElement('canvas');
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const maxDim = 256;
    const requestedScale = Math.max(0.01, Math.min(1, startPercent / 100));
    const scale = Math.min(requestedScale, maxDim / Math.max(img.width, img.height));
    off.width = Math.max(1, Math.round(img.width * scale));
    off.height = Math.max(1, Math.round(img.height * scale));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, off.width, off.height);
    ctx.drawImage(img, 0, 0, off.width, off.height);
    const imageData = ctx.getImageData(0, 0, off.width, off.height);
    processedPixelsBase64Ref.current = uint8ToBase64(imageData.data);
    setProcessedWidth(imageData.width);
    setProcessedHeight(imageData.height);
    setLayersCount(null);
    setScalePercent(Number((scale * 100).toFixed(2)));
    setGeneratedCode(null);
    setCollabStats(null);
    setCollabSuggestions([]);
  };

  // Handle paste URL
  const handleLoadFromUrl = async () => {
    if (!urlInput) return;
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = async () => {
        originalImageRef.current = img;
        setOriginalSize({ w: img.width, h: img.height });
        setReferenceSrc(urlInput);
        await processImageFromImage(img, scalePercent);
      };
      img.onerror = () => alert('Failed to load image from URL (CORS or invalid URL)');
      img.src = urlInput;
    } catch (err) {
      alert('Failed to load image URL');
    }
  };

  // Run the collaborator directly in the browser: no API key, external model, or server request.
  const handleGenerate = async (requestedQuality: 'detail' | 'balanced' | 'lite' = qualityMode) => {
    if (!processedPixelsBase64Ref.current || !processedWidth || !processedHeight) {
      alert('Please upload an image first (processed).');
      return;
    }
    setGenerating(true);
    setGeneratedCode(null);
    try {
      // Yield once so the loading state is painted before CPU-intensive local analysis.
      await new Promise((resolve) => window.setTimeout(resolve, 20));
      const binary = atob(processedPixelsBase64Ref.current);
      const pixels = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) pixels[i] = binary.charCodeAt(i);
      const brief = collabNotes.toLowerCase();
      let selectedQuality = requestedQuality;
      if (/(lebih detail|pertahankan detail|more detail|fine detail)/i.test(brief)) selectedQuality = 'detail';
      if (/(kurangi layer|lebih sederhana|less layer|simpler|simple)/i.test(brief)) selectedQuality = 'lite';
      const preserveBackground = /(jangan hapus background|pertahankan background|keep background|preserve background)/i.test(brief);
      const result = generateCollaborativeResult(pixels, processedWidth, processedHeight, '0002', {
        maxLayers: uncap ? 10000 : maxLayersState,
        quality: selectedQuality,
        preserveBackground,
      });
      const suggestions: string[] = [];
      if (result.stats.coverage < 35) suggestions.push('Coverage rendah: pertimbangkan mempertahankan background atau menaikkan detail agar bidang utama tidak hilang.');
      if (result.stats.candidateShapes > result.stats.shapes) suggestions.push(`${result.stats.candidateShapes - result.stats.shapes} shape dipangkas oleh batas layer. Naikkan batas layer atau gunakan profil Detail.`);
      if (result.stats.colors < 12) suggestions.push('Palet warna relatif sederhana; hasil ini cocok untuk desain flat atau logo.');
      if (result.stats.optimizerPasses > 1) suggestions.push(`Collaborator membandingkan ${result.stats.optimizerPasses} konfigurasi palet dan memilih ${result.stats.selectedPalette} warna sebagai kompromi terbaik.`);
      if (preserveBackground) suggestions.push('Instruksi diterapkan: background dipertahankan sebagai bagian desain.');
      if (result.stats.components > 500) suggestions.push('Banyak komponen terpisah terdeteksi. Profil Balanced membantu menekan noise kecil.');
      if (!suggestions.length) suggestions.push('Komposisi terdeteksi cukup seimbang. Periksa preview dan bandingkan dengan gambar referensi sebelum ekspor.');
      const data = { code: result.code, stats: result.stats, suggestions };
      setGeneratedCode(data.code);
      setCollabStats(data.stats);
      setCollabSuggestions(data.suggestions);
      setGeneratedImgW(processedWidth);
      setGeneratedImgH(processedHeight);
      setNeedsRegenerate(false);
      // Pre-warm tinted sprites for faster preview rendering.
      try {
        const lines = data.code.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const uniqueKeys = new Map<string, { spriteId: string; colorHex: string; opacity: number }>();
        for (const l of lines) {
          if (l.startsWith('FFFF') || l === '<' || l === '>') continue;
          const m = l.match(/^([0-9A-Fa-f]{4})(?:[0-9A-Fa-f]{4}){5}([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})/);
          if (!m) continue;
          const spriteId = l.slice(0, 4);
          const colorHex = m[1];
          const opacity = parseInt(m[2], 16);
          const k = `${spriteId}-${colorHex}-${opacity}`;
          if (!uniqueKeys.has(k)) uniqueKeys.set(k, { spriteId, colorHex, opacity });
        }
        uniqueKeys.forEach(({ spriteId, colorHex, opacity }) => {
          const spritePath = `/sprite/${spriteId}.png`;
          let spr = spriteCacheRef.current[spriteId];
          if (!spr) {
            spr = new Image();
            spr.crossOrigin = 'Anonymous';
            spr.src = spritePath;
            spr.onload = () => {
              ensureTinted(tintedCacheRef.current, spr as HTMLImageElement, colorHex, opacity);
              setSpriteVersion((v) => v + 1);
            };
            spriteCacheRef.current[spriteId] = spr;
          } else if (spr.complete) {
            ensureTinted(tintedCacheRef.current, spr as HTMLImageElement, colorHex, opacity);
          } else {
            spr.onload = () => {
              ensureTinted(tintedCacheRef.current, spr as HTMLImageElement, colorHex, opacity);
              setSpriteVersion((v) => v + 1);
            };
          }
        });
      } catch (e) {
        // Sprite tinting is an optimization; the preview has a fallback renderer.
      }
      const count = data.code.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !l.startsWith('FFFF') && l !== '<' && l !== '>').length;
      setLayersCount(count);
    } catch (err) {
      alert('Local tracing failed. Try a smaller image or a lower-detail strategy.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={commonStyles.container(isMobile)}>
      <h1 style={commonStyles.heading1(isMobile)}>FRL AI Livery Collaborator</h1>
      <div style={{ ...commonStyles.muted(), display: 'flex', alignItems: 'center' }}>by&nbsp;
        <Link href="https://github.com/razanius12" target="_blank" rel="noopener noreferrer">
          Razanius12
        </Link>
        {/* custom style align text to right */}
        <Link href="/documentation" style={{ marginLeft: 'auto'}}>Documentation</Link>
      </div>
      <br />

      <div style={commonStyles.flexColumn(isMobile ? theme.spacing.sm : theme.spacing.lg)}>
        <label style={commonStyles.label(isMobile, true)}>Choose Image</label>
        <input id="imageInput" type="file" accept="image/*" onChange={handleFileChange} style={commonStyles.input(isMobile)} />
        <div style={commonStyles.muted()}>or paste image URL below</div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: theme.spacing.sm }}>
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} style={{ ...commonStyles.input(isMobile), flex: 1 }} placeholder="https://.../image.jpg" />
          <button onClick={handleLoadFromUrl} style={{ ...commonStyles.button(isMobile, 'secondary'), width: isMobile ? '100%' : 'auto' }}>Load</button>
        </div>

        {originalSize && (
          <>
            <div style={commonStyles.flexColumn(theme.spacing.sm)}>
              <label style={commonStyles.label(isMobile)}>Downscale: {scalePercent.toFixed(2)}%</label>
              <input
                type="range"
                min={1}
                max={100}
                step={0.01}
                value={scalePercent}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setScalePercent(v);
                  // reprocess using original image if present (for next generation)
                  if (originalImageRef.current) processImageFromImage(originalImageRef.current, v);
                  // mark generated code as stale if there is one
                  if (generatedCode) setNeedsRegenerate(true);
                }}
              />
            </div>
            {needsRegenerate && (
              <div style={{ color: '#b35e00', fontSize: theme.fontSizes.xs, marginTop: theme.spacing.xs }}>
                Downscale changed — press "Generate Code" to update the generated preview.
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
              <input
                type="checkbox"
                checked={uncap}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUncap(checked);
                  setMaxLayersState(checked ? Number.MAX_SAFE_INTEGER : 1300);
                }}
              />
              <span style={commonStyles.label(isMobile)}>Uncap layers (allow &gt;1300)</span>
            </label>

            <section style={{ border: '1px solid #344054', borderRadius: 12, padding: 14, background: '#101722', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: isMobile ? 16 : 18 }}>AI Livery Collaborator</strong>
                <span style={{ fontSize: 11, color: '#8fd3ff', border: '1px solid #28506b', borderRadius: 20, padding: '3px 8px' }}>LOCAL CV · NO API KEY</span>
              </div>
              <div style={{ color: '#aab7c7', fontSize: 12, lineHeight: 1.5 }}>Semua analisis berjalan langsung di browser: segmentasi warna, connected components, penilaian kontur, dan optimasi multi-pass. Tidak ada upload gambar ke server, API key, atau layanan AI eksternal.</div>
              <label style={{ ...commonStyles.label(isMobile), marginBottom: 0 }}>Design strategy</label>
              <select value={qualityMode} onChange={(e) => setQualityMode(e.target.value as 'detail' | 'balanced' | 'lite')} style={{ ...commonStyles.input(isMobile), background: '#0b111b', color: '#fff' }}>
                <option value="detail">Detail — 32 warna, prioritaskan detail</option>
                <option value="balanced">Balanced — 24 warna, seimbang</option>
                <option value="lite">Lite — 16 warna, shape lebih hemat</option>
              </select>
              <textarea value={collabNotes} onChange={(e) => setCollabNotes(e.target.value)} placeholder="Design brief (opsional): mis. pertahankan logo putih, kurangi noise di background..." rows={2} style={{ ...commonStyles.input(isMobile), resize: 'vertical', background: '#0b111b', color: '#fff' }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={handleGenerate} disabled={generating} style={{ ...commonStyles.button(isMobile, 'primary'), flex: 1 }}>{generating ? 'Analyzing & generating...' : 'Analyze & Generate'}</button>
                <button onClick={() => { setQualityMode('detail'); if (!generating) handleGenerate('detail'); }} disabled={generating} style={{ ...commonStyles.button(isMobile, 'secondary'), flex: 1 }}>Auto Improve</button>
              </div>
              {collabStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {([['Colors', collabStats.colors], ['Components', collabStats.components], ['Shapes', `${collabStats.shapes}/${collabStats.candidateShapes}`], ['Coverage', `${collabStats.coverage}%`], ['AI passes', collabStats.optimizerPasses], ['Palette trial', collabStats.selectedPalette]] as Array<[string, any]>).map(([label, value]) => <div key={label} style={{ background: '#0b111b', borderRadius: 8, padding: 9 }}><div style={{ color: '#8795a8', fontSize: 11 }}>{label}</div><strong>{value}</strong></div>)}
                </div>
              )}
              {collabSuggestions.length > 0 && <div style={{ fontSize: 12, color: '#c4d0df', lineHeight: 1.6 }}><strong>Collaborator review</strong><ul style={{ margin: '5px 0 0', paddingLeft: 18 }}>{collabSuggestions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
              {collabNotes.trim() && <div style={{ color: '#8191a5', fontSize: 11 }}>Design brief diterapkan oleh Collaborator. Instruksi yang dikenali saat ini: prioritaskan detail, sederhanakan layer, atau pertahankan background.</div>}
            </section>
          </>
        )}
      </div>

      {originalSize && (
        <div style={{ marginTop: isMobile ? theme.spacing.md : theme.spacing.xl }}>
          <div style={commonStyles.flexColumn(theme.spacing.xs)}>
            <div style={{ fontSize: isMobile ? theme.fontSizes.lg : theme.fontSizes.xl, fontWeight: 700, textAlign: 'center' }}>Original Size: {originalSize && `${originalSize.w} x ${originalSize.h}`}</div>
            <div style={{ fontSize: isMobile ? theme.fontSizes.md : theme.fontSizes.lg }}>Current Size: {processedWidth && processedHeight ? `${processedWidth} x ${processedHeight}` : '—'}</div>
            <div style={{ fontSize: isMobile ? theme.fontSizes.md : theme.fontSizes.lg }}>Generated shapes: {layersCount ?? '—'}</div>
          </div>

          <h3 style={commonStyles.heading3(isMobile)}>FRL Livery Codes</h3>
          <button
            disabled={!generatedCode}
            onClick={() => {
              if (!generatedCode) return;
              navigator.clipboard.writeText(generatedCode).then(() => alert('Copied to clipboard')).catch(() => alert('Failed to copy to clipboard'));
            }}
            style={{ ...commonStyles.button(isMobile, 'secondary'), marginBottom: theme.spacing.sm }}
          >
            Copy All
          </button>

          <div style={commonStyles.codeBlock(isMobile)}>
            {generatedCode ? (
              generatedCode.split('\n').map((code: string, idx: number) => (
                <div key={idx} style={commonStyles.codeText(isMobile)}>{code}</div>
              ))
            ) : (
              <div style={{ color: theme.colors.placeholder }}>No generated code yet — press "Generate Code".</div>
            )}
          </div>

          <h3 style={commonStyles.heading3(isMobile)}>Preview (Reference vs Generated)</h3>

          <div style={{ marginBottom: theme.spacing.lg, display: 'flex', gap: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: theme.fontSizes.sm }}>
              <input
                type="radio"
                name="bg"
                value="tilemap"
                checked={backgroundMode === 'tilemap'}
                onChange={(e): void => setBackgroundMode(e.target.value as 'tilemap' | 'color')}
              />
              Tilemap
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: theme.fontSizes.sm }}>
              <input
                type="radio"
                name="bg"
                value="color"
                checked={backgroundMode === 'color'}
                onChange={(e): void => setBackgroundMode(e.target.value as 'tilemap' | 'color')}
              />
              Color
            </label>
            {backgroundMode === 'color' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e): void => setBackgroundColor(e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
              </label>
            )}
          </div>

          {/* Hidden image to preload tilemap */}
          <img ref={tilemapImageRef} src="/canvasbg.png" style={{ display: 'none' }} alt="tilemap" />

          <div style={isMobile ? commonStyles.flexColumn(theme.spacing.lg) : commonStyles.flexRow(theme.spacing.lg, 'flex-start')}>
            <div style={{ ...commonStyles.flexColumn(theme.spacing.xs), flex: 1, alignItems: 'center' }}>
              <div style={{ ...commonStyles.label(isMobile, true), textAlign: 'center' }}>Reference</div>
              <div style={commonStyles.canvas(isMobile, theme.colors.background)}>
                {referenceSrc ? (
                  <img src={referenceSrc} alt="reference" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : null}
              </div>
            </div>

            <div style={{ ...commonStyles.flexColumn(theme.spacing.xs), flex: 1, alignItems: 'center' }}>
              <div style={{ ...commonStyles.label(isMobile, true), textAlign: 'center' }}>Generated</div>
              <div ref={canvasContainerRef} style={{ ...commonStyles.canvas(isMobile, backgroundMode === 'color' ? backgroundColor : theme.colors.background), position: 'relative' }}>
                <canvas ref={bgCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
                <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
