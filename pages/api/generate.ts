import type { NextApiRequest, NextApiResponse } from 'next';
import { generateCollaborativeResult } from '../../utils/generator';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

// POST API: accepts JSON { width, height, pixelsBase64, spriteId }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { width, height, pixelsBase64, spriteId, maxLayers, quality, colorCount, designBrief } = req.body || {};
    if (!width || !height || !pixelsBase64) return res.status(400).json({ error: 'Missing parameters' });

    // Decode base64 RGBA bytes into Uint8Array
    const buffer = Buffer.from(pixelsBase64, 'base64');
    const pixels = new Uint8Array(buffer);

    // Generate FRL code on server
    const w = Number(width), h = Number(height);
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w * h > 250000 || pixels.length !== w * h * 4) {
      return res.status(400).json({ error: 'Invalid image dimensions or pixel buffer' });
    }
    const brief = String(designBrief || '').slice(0, 500).toLowerCase();
    let selectedQuality: 'detail' | 'balanced' | 'lite' = quality === 'detail' || quality === 'lite' ? quality : 'balanced';
    if (/(lebih detail|pertahankan detail|more detail|fine detail)/i.test(brief)) selectedQuality = 'detail';
    if (/(kurangi layer|lebih sederhana|less layer|simpler|simple)/i.test(brief)) selectedQuality = 'lite';
    const preserveBackground = /(jangan hapus background|pertahankan background|keep background|preserve background)/i.test(brief);
    const options = { maxLayers: Number(maxLayers) || 1300, quality: selectedQuality, colorCount: Number(colorCount) || undefined, preserveBackground };
    const result = generateCollaborativeResult(pixels, w, h, spriteId || '0002', options);
    const code = result.code;
    const stats = result.stats;
    const suggestions: string[] = [];
    if (stats.coverage < 35) suggestions.push('Coverage rendah: pertimbangkan mengaktifkan background atau menaikkan detail agar bidang utama tidak hilang.');
    if (stats.candidateShapes > stats.shapes) suggestions.push(`${stats.candidateShapes - stats.shapes} shape dipangkas oleh batas layer. Naikkan batas layer atau gunakan profil Detail.`);
    if (stats.colors < 12) suggestions.push('Palet warna relatif sederhana; hasil ini cocok untuk desain flat atau logo.');
    if (stats.optimizerPasses > 1) suggestions.push(`Collaborator membandingkan ${stats.optimizerPasses} konfigurasi palet dan memilih ${stats.selectedPalette} warna sebagai kompromi terbaik.`);
    if (preserveBackground) suggestions.push('Instruksi diterapkan: background dipertahankan sebagai bagian desain.');
    if (stats.components > 500) suggestions.push('Banyak komponen terpisah terdeteksi. Profil Balanced membantu menekan noise kecil.');
    if (!suggestions.length) suggestions.push('Komposisi terdeteksi cukup seimbang. Periksa preview dan bandingkan dengan gambar referensi sebelum ekspor.');
    return res.status(200).json({ code, stats, suggestions, appliedBrief: designBrief ? String(designBrief).slice(0, 500) : '' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
