import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { burnCanvas } from './burn';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export type BurnResult = { bytes: Uint8Array; preview: string; pages: number };

export async function processPdf(
  file: File,
  intensity: number,
  onProgress: (percent: number) => void = () => {},
): Promise<BurnResult> {
  if (!Number.isFinite(intensity) || intensity < 15 || intensity > 100) {
    throw new RangeError('Burn intensity must be between 15 and 100');
  }
  const source = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
    .promise;
  if (!source.numPages) throw new Error('The PDF has no pages');
  const output = await PDFDocument.create();
  output.setTitle(`${file.name.replace(/\.pdf$/i, '')} — scorched edition`);
  output.setCreator('Ember PDF Burner');
  const scale = clamp(1.35 - intensity / 130, 0.58, 1.15);
  const documentSeed = crypto.getRandomValues(new Uint32Array(1))[0];
  let preview = '';

  for (let number = 1; number <= source.numPages; number++) {
    const page = await source.getPage(number);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is unavailable');
    await page.render({ canvasContext: context, viewport }).promise;
    const pageSeed = (documentSeed ^ Math.imul(number, 0x9e3779b9)) >>> 0;
    const burnt = burnCanvas(canvas, intensity / 100, pageSeed);
    const image = await output.embedJpg(burnt.toDataURL('image/jpeg', 0.88));
    if (number === 1) preview = burnt.toDataURL('image/jpeg', 0.72);
    burnt.width = 0;
    burnt.height = 0;
    const dimensions = page.getViewport({ scale: 1 });
    const target = output.addPage([dimensions.width, dimensions.height]);
    target.drawImage(image, { x: 0, y: 0, width: target.getWidth(), height: target.getHeight() });
    onProgress(Math.round((number / source.numPages) * 100));
    canvas.width = 0;
    canvas.height = 0;
  }

  return { bytes: await output.save({ useObjectStreams: true }), preview, pages: source.numPages };
}
