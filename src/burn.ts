const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function hash(x: number, y: number, seed: number) {
  let value = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy);
  const top = hash(ix, iy, seed) * (1 - ux) + hash(ix + 1, iy, seed) * ux;
  const bottom = hash(ix, iy + 1, seed) * (1 - ux) + hash(ix + 1, iy + 1, seed) * ux;
  return top * (1 - uy) + bottom * uy;
}

/** Six compact octaves approximate shader FBM without making per-page processing expensive. */
function fbm(x: number, y: number, seed: number) {
  let value = 0,
    amplitude = 0.5,
    frequency = 1,
    weight = 0;
  for (let octave = 0; octave < 6; octave++) {
    value += amplitude * noise(x * frequency, y * frequency, seed + octave * 7919);
    weight += amplitude;
    frequency *= 2.03;
    amplitude *= 0.52;
  }
  return value / weight;
}

function paperGrain(ctx: CanvasRenderingContext2D, seed: number, width: number, height: number) {
  const tile = document.createElement('canvas');
  tile.width = 192;
  tile.height = 192;
  const tileContext = tile.getContext('2d');
  if (!tileContext) return;
  const pixels = tileContext.createImageData(tile.width, tile.height);
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const u = x / tile.width,
        v = y / tile.height;
      const grain = fbm(u * 6, v * 12, seed + 317);
      const fiber = noise(u * 40, v * 8, seed + 911);
      const fleck = hash(x, y, seed + 1201) - 0.5;
      const tone = Math.round(255 - grain * 19 - fiber * 10 + fleck * 8);
      const index = (y * tile.width + x) * 4;
      pixels.data[index] = tone;
      pixels.data[index + 1] = Math.min(255, tone - 2);
      pixels.data[index + 2] = Math.min(255, tone - 13);
      pixels.data[index + 3] = 255;
    }
  }
  tileContext.putImageData(pixels, 0, 0);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Shader-inspired paper grain, FBM dissolve front, soot falloff, and ember edge, rasterized cheaply. */
export function burnCanvas(source: HTMLCanvasElement, intensity: number, seed: number) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable');
  context.drawImage(source, 0, 0);
  const width = canvas.width,
    height = canvas.height,
    minSide = Math.min(width, height);

  context.save();
  context.globalCompositeOperation = 'multiply';
  context.globalAlpha = 0.16;
  context.fillStyle = '#fff0c8';
  context.fillRect(0, 0, width, height);
  context.restore();
  paperGrain(context, seed, width, height);

  const maxMaskSide = 460;
  const ratio = Math.min(1, maxMaskSide / Math.max(width, height));
  const mask = document.createElement('canvas');
  mask.width = Math.max(2, Math.round(width * ratio));
  mask.height = Math.max(2, Math.round(height * ratio));
  const maskContext = mask.getContext('2d');
  if (!maskContext) throw new Error('Canvas rendering is unavailable');
  const pixels = maskContext.createImageData(mask.width, mask.height);
  const edgeDepth = minSide * (0.035 + intensity * 0.13);
  const edgeWidth = Math.max(2, minSide * 0.012);
  const front = -0.2 + 1.4 * (0.22 + intensity * 0.5);

  for (let y = 0; y < mask.height; y++) {
    const v = (y + 0.5) / mask.height;
    for (let x = 0; x < mask.width; x++) {
      const u = (x + 0.5) / mask.width;
      const px = u * width,
        py = v * height;
      const edgeDistance = Math.min(px, py, width - px, height - py);
      const broad = fbm(u * 3, v * 6, seed + 5011);
      const detail = noise(u * 40, v * 8, seed + 11939);
      const field = v + (broad - 0.5) * 0.14 + (detail - 0.5) * 0.035;
      const frontEdge =
        smooth(front - 0.035, front - 0.008, field) *
        (1 - smooth(front + 0.004, front + 0.07, field));
      const charredPaper = 1 - smooth(front - 0.18, front - 0.055, field);
      const perimeter = edgeDepth * (0.5 + broad * 0.72 + (detail - 0.5) * 0.24);
      const perimeterSoot =
        1 - smooth(perimeter - edgeWidth * 1.6, perimeter + edgeWidth * 1.25, edgeDistance);
      const perimeterEmber =
        1 -
        smooth(edgeWidth * 0.35, edgeWidth * (2.1 + intensity), Math.abs(edgeDistance - perimeter));
      const corner =
        1 -
        smooth(
          edgeDepth * 0.55,
          edgeDepth * 1.8,
          Math.min(
            Math.hypot(px, py),
            Math.hypot(width - px, py),
            Math.hypot(px, height - py),
            Math.hypot(width - px, height - py),
          ),
        );
      const soot = Math.max(
        perimeterSoot * (0.48 + intensity * 0.3),
        charredPaper * (0.08 + intensity * 0.11),
      );
      const ember = Math.max(
        frontEdge * (0.58 + detail * 0.4),
        perimeterEmber * 0.72,
        corner * intensity * 0.2,
      );
      const alpha = Math.min(0.9, soot + ember * 0.68);
      const glow = clamp(ember * (0.76 + detail * 0.28));
      const index = (y * mask.width + x) * 4;
      pixels.data[index] = Math.round(31 + glow * 222);
      pixels.data[index + 1] = Math.round(17 + glow * 106);
      pixels.data[index + 2] = Math.round(9 + glow * 44);
      pixels.data[index + 3] = Math.round(alpha * 255);
    }
  }
  maskContext.putImageData(pixels, 0, 0);
  context.imageSmoothingEnabled = true;
  context.drawImage(mask, 0, 0, width, height);

  const random = (index: number) => hash(index, seed, seed ^ 0x5f356495);
  const sparks = Math.round(14 + intensity * 24);
  for (let index = 0; index < sparks; index++) {
    const along = random(index + 1);
    const x = along * width;
    const y = Math.max(0, Math.min(height, (front + (random(index + 51) - 0.5) * 0.08) * height));
    const radius = minSide * (0.002 + random(index + 83) * (0.006 + intensity * 0.009));
    const spot = context.createRadialGradient(x, y, 0, x, y, radius);
    spot.addColorStop(0, `rgba(255,180,82,${0.22 + intensity * 0.25})`);
    spot.addColorStop(0.45, `rgba(235,84,28,${0.28 + intensity * 0.24})`);
    spot.addColorStop(1, 'rgba(206,65,20,0)');
    context.fillStyle = spot;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  return canvas;
}
