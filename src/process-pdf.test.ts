import { createCanvas, loadImage } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pagePaints = vi.hoisted(() => vi.fn());
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: async (number: number) => ({
        view: [0, 0, 240 + number * 10, 320],
        getViewport: ({ scale }: { scale: number }) => ({
          width: (240 + number * 10) * scale,
          height: 320 * scale,
        }),
        render: ({ canvasContext }: { canvasContext: CanvasRenderingContext2D }) => {
          pagePaints(number);
          canvasContext.fillStyle = '#f4e8d5';
          canvasContext.fillRect(0, 0, 400, 500);
          return { promise: Promise.resolve() };
        },
      }),
    }),
  }),
}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/worker.mjs' }));

const originalCreateElement = document.createElement.bind(document);
const originalCreateObjectUrl = URL.createObjectURL;

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  document.createElement = originalCreateElement;
  URL.createObjectURL = originalCreateObjectUrl;
});

describe('PDF burning pipeline', () => {
  it('burns every page and creates a readable PDF with the original page dimensions', async () => {
    document.createElement = ((tag: string, options?: ElementCreationOptions) => {
      if (tag.toLowerCase() === 'canvas') return createCanvas(1, 1) as unknown as HTMLElement;
      return originalCreateElement(tag, options);
    }) as typeof document.createElement;

    const { processPdf } = await import('./process-pdf');
    const progress: number[] = [];
    const input = new File(['sample pdf data'], 'example.pdf', { type: 'application/pdf' });
    const result = await processPdf(input, 72, (value) => progress.push(value));
    const reopened = await PDFDocument.load(result.bytes);
    const pages = reopened.getPages();

    expect(result.bytes.byteLength).toBeGreaterThan(500);
    expect(result.preview).toMatch(/^data:image\/jpeg;base64,/);
    expect(new TextDecoder().decode(result.bytes).match(/DCTDecode/g)).toHaveLength(2);
    const previewImage = await loadImage(Buffer.from(result.preview.split(',')[1], 'base64'));
    const previewCanvas = createCanvas(previewImage.width, previewImage.height);
    previewCanvas.getContext('2d').drawImage(previewImage, 0, 0);
    const pixels = previewCanvas
      .getContext('2d')
      .getImageData(0, 0, previewImage.width, previewImage.height);
    const luminance = (x: number, y: number) => {
      const offset = (y * previewImage.width + x) * 4;
      return pixels.data[offset] + pixels.data[offset + 1] + pixels.data[offset + 2];
    };
    expect(luminance(0, Math.floor(previewImage.height / 2))).toBeLessThan(
      luminance(Math.floor(previewImage.width / 2), Math.floor(previewImage.height / 2)),
    );
    expect(result.pages).toBe(2);
    expect(progress).toEqual([50, 100]);
    expect(pagePaints).toHaveBeenCalledTimes(2);
    expect(pages).toHaveLength(2);
    expect(reopened.getTitle()).toBe('example — scorched edition');
    expect(pages[0].getWidth()).toBe(250);
    expect(pages[0].getHeight()).toBe(320);
    expect(pages[1].getWidth()).toBe(260);
  });

  it('rejects invalid burn intensities before opening a file', async () => {
    const { processPdf } = await import('./process-pdf');
    const file = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    await expect(processPdf(file, 101)).rejects.toThrow('between 15 and 100');
    await expect(processPdf(file, Number.NaN)).rejects.toThrow('between 15 and 100');
    expect(pagePaints).not.toHaveBeenCalled();
  });
});
