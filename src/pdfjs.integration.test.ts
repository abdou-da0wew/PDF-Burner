import { createCanvas, Path2D } from '@napi-rs/canvas';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';

describe('real PDF.js compatibility', () => {
  it('opens and rasterizes an actual generated two-page PDF', async () => {
    globalThis.Path2D = Path2D as unknown as typeof globalThis.Path2D;
    const source = await PDFDocument.create();
    for (const [width, color] of [
      [320, rgb(0.85, 0.2, 0.1)],
      [400, rgb(0.1, 0.4, 0.85)],
    ] as const) {
      const page = source.addPage([width, 480]);
      page.drawRectangle({ x: 32, y: 360, width: 120, height: 48, color });
    }
    const sourceBytes = await source.save();
    const loaded = await pdfjs.getDocument({ data: sourceBytes }).promise;

    try {
      expect(loaded.numPages).toBe(2);
      for (const [number, expectedWidth] of [
        [1, 320],
        [2, 400],
      ]) {
        const page = await loaded.getPage(number);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = createCanvas(viewport.width, viewport.height);
        await page.render({
          canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;
        expect(viewport.width).toBe(expectedWidth / 2);
        expect(canvas.toBuffer('image/png').byteLength).toBeGreaterThan(300);
      }
    } finally {
      await loaded.destroy();
    }
  });
});
