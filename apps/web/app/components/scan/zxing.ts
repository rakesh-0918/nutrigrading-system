'use client';

import { BrowserMultiFormatReader } from '@zxing/browser';

export async function decodeBarcodesFromImage(img: HTMLImageElement): Promise<string[]> {
  // Ensure image is fully loaded
  if (!img.complete || img.naturalWidth === 0) {
    console.error('Image not fully loaded');
    return [];
  }

  const reader = new BrowserMultiFormatReader();
  try {
    const results: string[] = [];

    // Full image attempt
    try {
      const r = await reader.decodeFromImageElement(img);
      if (r?.getText()) results.push(r.getText());
    } catch (e) {
      // ignore not found errors
    }

    // Simple multi-pass crops to catch multiple barcodes.
    const crops = [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return uniq(results);

    for (const c of crops) {
      const cw = Math.max(1, Math.floor(img.naturalWidth * c.w));
      const ch = Math.max(1, Math.floor(img.naturalHeight * c.h));
      canvas.width = cw;
      canvas.height = ch;
      ctx.drawImage(
        img,
        Math.floor(img.naturalWidth * c.x),
        Math.floor(img.naturalHeight * c.y),
        cw,
        ch,
        0,
        0,
        cw,
        ch
      );

      try {
        const dataUrl = canvas.toDataURL('image/png');
        const r = await reader.decodeFromImageUrl(dataUrl);
        if (r?.getText()) results.push(r.getText());
      } catch (e) {
        // ignore not found errors
      }
    }

    return uniq(results);
  } catch (e) {
    console.error('Barcode decode error:', e);
    return [];
  }
}

function uniq(xs: string[]) {
  return Array.from(new Set(xs.filter(Boolean)));
}


