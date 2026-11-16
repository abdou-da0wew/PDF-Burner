const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
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

function fbm(x: number, y: number, seed: number) {
  let value = 0,
    amplitude = 0.5,
    frequency = 1,
    weight = 0;
  for (let octave = 0; octave < 4; octave++) {
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
      const index = (y * tile.width + x) * 4;
      const fiber = noise(x * 0.08, y * 0.9, seed + 317);
      const grain = hash(x, y, seed + 911);
      const tone = Math.round(238 + grain * 16 - fiber * 5);
      pixels.data[index] = tone;
      pixels.data[index + 1] = Math.min(255, tone + 1);
      pixels.data[index + 2] = Math.min(255, tone + 4);
      pixels.data[index + 3] = 255;
    }
  }
  tileContext.putImageData(pixels, 0, 0);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** CPU-friendly paper grain and a seeded, uneven burn front rendered at reduced resolution. */
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
  context.globalAlpha = 0.105;
  context.fillStyle = '#f6e6c2';
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
  const image = maskContext.createImageData(mask.width, mask.height);
  const depth = minSide * (0.035 + intensity * 0.13);
  const transition = Math.max(2, minSide * 0.012);

  for (let y = 0; y < mask.height; y++) {
    const v = (y + 0.5) / mask.height;
    for (let x = 0; x < mask.width; x++) {
      const u = (x + 0.5) / mask.width;
      const pixelX = u * width,
        pixelY = v * height;
      const distance = Math.min(pixelX, pixelY, width - pixelX, height - pixelY);
      const broad = fbm(u * 4.1 + seed * 0.00001, v * 4.7, seed);
      const detail = noise(u * 18 + seed * 0.00003, v * 22, seed + 11939);
      const front = depth * (0.5 + broad * 0.72 + (detail - 0.5) * 0.24);
      const soot = 1 - smooth(front - transition * 1.6, front + transition * 1.25, distance);
      const ember =
        1 - smooth(transition * 0.35, transition * (2.1 + intensity), Math.abs(distance - front));
      const corner =
        1 -
        smooth(
          depth * 0.55,
          depth * 1.8,
          Math.min(
            Math.hypot(pixelX, pixelY),
            Math.hypot(width - pixelX, pixelY),
            Math.hypot(pixelX, height - pixelY),
            Math.hypot(width - pixelX, height - pixelY),
          ),
        );
      const alpha = Math.min(
        0.9,
        soot * (0.36 + intensity * 0.36) + ember * 0.28 + corner * intensity * 0.12,
      );
      const glow = Math.min(1, ember * (0.7 + detail * 0.5));
      const index = (y * mask.width + x) * 4;
      image.data[index] = Math.round(35 + glow * 198);
      image.data[index + 1] = Math.round(20 + glow * 81);
      image.data[index + 2] = Math.round(12 + glow * 27);
      image.data[index + 3] = Math.round(alpha * 255);
    }
  }
  maskContext.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = true;
  context.drawImage(mask, 0, 0, width, height);

  const random = (index: number) => hash(index, seed, seed ^ 0x5f356495);
  const sparks = Math.round(20 + intensity * 35);
  for (let index = 0; index < sparks; index++) {
    const side = index % 4,
      along = random(index + 1);
    const x = side < 2 ? along * width : side === 2 ? 0 : width;
    const y = side < 2 ? (side === 0 ? 0 : height) : along * height;
    const radius = minSide * (0.004 + random(index + 83) * (0.012 + intensity * 0.014));
    const spot = context.createRadialGradient(x, y, 0, x, y, radius);
    spot.addColorStop(0, `rgba(31,16,10,${0.6 + intensity * 0.25})`);
    spot.addColorStop(0.62, `rgba(95,39,16,${0.4 + intensity * 0.28})`);
    spot.addColorStop(1, 'rgba(206,91,28,0)');
    context.fillStyle = spot;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  return canvas;
}
