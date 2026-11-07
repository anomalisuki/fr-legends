// utils/uiHelpers.ts

export const uint8ToBase64 = (u8: Uint8ClampedArray): string => {
  let binary = '';
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
};

export const estimateLayers = (imageData: ImageData) => {
  const data = imageData.data;
  const countMap: Record<string, number> = {};
  let maxCount = 0;
  let bgKey = '255,255,255';
  let totalNonTransparent = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;
    const key = `${r},${g},${b}`;
    countMap[key] = (countMap[key] || 0) + 1;
    totalNonTransparent++;
    if (countMap[key] > maxCount) {
      maxCount = countMap[key];
      bgKey = key;
    }
  }

  const [bgR, bgG, bgB] = bgKey.split(',').map((v) => Number(v));
  let nonBg = 0;
  const tolerance = 10;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a !== 0 && (Math.abs(r - bgR) > tolerance || Math.abs(g - bgG) > tolerance || Math.abs(b - bgB) > tolerance)) nonBg++;
  }

  return { bg: { r: bgR, g: bgG, b: bgB }, nonBg, totalNonTransparent };
};

// Create a tinted canvas for a sprite image, caching via provided cache object.
export const ensureTinted = (
  cache: Record<string, HTMLCanvasElement>,
  sprite: HTMLImageElement,
  colorHex: string,
  opacity: number,
  targetW?: number,
  targetH?: number
): HTMLCanvasElement | null => {
  const key = `${sprite.src}-${colorHex}-${opacity}`;
  const existing = cache[key];
  if (existing) return existing;
  try {
    const tw = Math.max(1, targetW || sprite.naturalWidth || 16);
    const th = Math.max(1, targetH || sprite.naturalHeight || 16);
    const off = document.createElement('canvas');
    off.width = tw;
    off.height = th;
    const offCtx = off.getContext('2d');
    if (!offCtx) return null;
    offCtx.clearRect(0, 0, tw, th);
    offCtx.drawImage(sprite, 0, 0, tw, th);
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = `#${colorHex}`;
    offCtx.fillRect(0, 0, tw, th);
    offCtx.globalCompositeOperation = 'source-over';
    cache[key] = off;
    return off;
  } catch (e) {
    return null;
  }
};
