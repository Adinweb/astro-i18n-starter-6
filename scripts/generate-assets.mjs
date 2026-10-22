#!/usr/bin/env node
/**
 * Generates the raster brand assets that social platforms and mobile browsers
 * require. Everything is drawn from code so the assets stay reproducible and
 * no binary image editing tool is needed in contributor environments.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');
// Brand dimensions and the default social-card path are owned by
// `app.config.json`, so the generator and the app cannot disagree.
const appConfig = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'app.config.json'), 'utf-8')
);
// Artwork lives next to the content that uses it, so Astro's `image()`
// helper can resolve it relative to the entry file and optimize it.
// `public/` is reserved for files that need a stable, unprocessed URL.
const contentDir = path.join(rootDir, 'src', 'content');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixel) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixel(x, y);
      const offset = y * stride + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Scales a colour to a target relative luminance, keeping its hue.
 *
 * Equal HSL lightness looks very different across hues — a teal reads far
 * brighter than a blue — so the artwork is normalised to keep every hue at a
 * comparable perceived brightness.
 */
function withLuminance([r, g, b], target) {
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (luminance <= 0) return [r, g, b];
  const k = target / luminance;
  return [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)];
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Draws a white, round-capped "A" centred in a square of `size` pixels. */
function glyphCoverage(px, py, size, scale = 1, offsetX = 0, offsetY = 0) {
  const cx = offsetX + size / 2;
  const cy = offsetY + size / 2;
  const s = size * scale;

  const apex = [cx, cy - s * 0.27];
  const left = [cx - s * 0.21, cy + s * 0.27];
  const right = [cx + s * 0.21, cy + s * 0.27];
  const barY = cy + s * 0.1;
  const barHalf = s * 0.115;

  const leg = Math.min(
    distanceToSegment(px, py, apex[0], apex[1], left[0], left[1]),
    distanceToSegment(px, py, apex[0], apex[1], right[0], right[1])
  );
  const bar = distanceToSegment(px, py, cx - barHalf, barY, cx + barHalf, barY);
  const distance = Math.min(leg, bar);
  const thickness = s * 0.055;

  return Math.max(0, Math.min(1, thickness + 0.75 - distance));
}

function brandPixel(width, height, options = {}) {
  const { icon = false } = options;
  return (x, y) => {
    const nx = x / width;
    const ny = y / height;
    const t = Math.min(1, (nx * 0.65 + ny * 0.35));
    let r = mix(67, 8, t);
    let g = mix(56, 145, t);
    let b = mix(202, 178, t);

    // Soft radial light in the upper-left keeps flat gradients from looking dead.
    const glow = Math.max(0, 1 - Math.hypot(nx - 0.25, ny - 0.2) * 1.7);
    r = Math.min(255, r + glow * 26);
    g = Math.min(255, g + glow * 16);
    b = Math.min(255, b + glow * 20);

    const size = icon ? Math.min(width, height) : Math.min(width, height) * 0.62;
    const offsetX = icon ? (width - size) / 2 : width * 0.06;
    const offsetY = icon ? (height - size) / 2 : (height - size) / 2;
    const coverage = glyphCoverage(x, y, size, icon ? 1 : 1, offsetX, offsetY);

    if (coverage > 0) {
      r = mix(r, 255, coverage);
      g = mix(g, 255, coverage);
      b = mix(b, 255, coverage);
    }

    if (!icon) {
      // Thin ring framing the glyph, echoing the favicon's orbit.
      const cx = width * 0.36;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.31;
      const ring = Math.abs(Math.hypot(x - cx, y - cy) - radius);
      const ringCoverage = Math.max(0, Math.min(1, 1.5 - ring));
      r = mix(r, 255, ringCoverage * 0.28);
      g = mix(g, 255, ringCoverage * 0.28);
      b = mix(b, 255, ringCoverage * 0.28);

      // Three tonal bars suggest a title block without embedding a font.
      const bars = [
        { y: 0.64, x0: 0.62, x1: 0.9, weight: 0.03, alpha: 0.75 },
        { y: 0.71, x0: 0.62, x1: 0.84, weight: 0.018, alpha: 0.45 },
        { y: 0.76, x0: 0.62, x1: 0.78, weight: 0.018, alpha: 0.28 },
      ];
      for (const bar of bars) {
        const bx = nx >= bar.x0 && nx <= bar.x1;
        const by = Math.abs(ny - bar.y) <= bar.weight / 2;
        if (bx && by) {
          r = mix(r, 255, bar.alpha);
          g = mix(g, 255, bar.alpha);
          b = mix(b, 255, bar.alpha);
        }
      }
    }

    return [Math.round(r), Math.round(g), Math.round(b), 255];
  };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hue = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hue % 2) - 1));
  const [r1, g1, b1] =
    hue < 1
      ? [c, x, 0]
      : hue < 2
        ? [x, c, 0]
        : hue < 3
          ? [0, c, x]
          : hue < 4
            ? [0, x, c]
            : hue < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = l - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/**
 * Abstract editorial artwork: a deep saturated wash, two colour glows,
 * technical rings and a dot grid. Deterministic for a given hue, so covers
 * stay reproducible.
 *
 * The palette is deliberately luminous. This artwork is used as the *background*
 * of the hero band, where only a light scrim may sit on top of it — a dark
 * illustration would be swallowed by the scrim that keeps the copy legible,
 * and the hero would read as a plain black bar.
 *
 * The features are placed in the vertical middle so the artwork still reads
 * after the wide crop a short, full-bleed hero band takes out of a 16:9 image.
 */
function artPixel(width, height, hue) {
  const accent = withLuminance(hslToRgb(hue, 0.82, 0.62), 118);
  const secondary = withLuminance(hslToRgb((hue + 46) % 360, 0.78, 0.58), 96);
  const deep = withLuminance(hslToRgb((hue + 8) % 360, 0.64, 0.24), 42);

  return (x, y) => {
    const nx = x / width;
    const ny = y / height;

    // Base wash — deep and saturated, never flat black.
    let r = mix(deep[0] * 0.62, deep[0] * 1.25, ny);
    let g = mix(deep[1] * 0.62, deep[1] * 1.25, ny);
    let b = mix(deep[2] * 0.62, deep[2] * 1.25, ny);

    // Two wide, soft glows carry the colour.
    const glowA = Math.max(0, 1 - Math.hypot((nx - 0.26) * 0.92, (ny - 0.4) * 1.3)) ** 1.8;
    const glowB = Math.max(0, 1 - Math.hypot((nx - 0.8) * 0.88, (ny - 0.58) * 1.2)) ** 1.9;
    r += glowA * accent[0] * 0.95 + glowB * secondary[0] * 0.82;
    g += glowA * accent[1] * 0.95 + glowB * secondary[1] * 0.82;
    b += glowA * accent[2] * 0.95 + glowB * secondary[2] * 0.82;

    // Concentric rings anchored in the middle-end.
    const centerX = 0.74;
    const centerY = 0.44;
    const ringDistance = Math.hypot(nx - centerX, ny - centerY);
    const ringPhase = (ringDistance % 0.07) / 0.07;
    const ring = ringDistance < 0.62 && ringPhase < 0.055 ? 0.4 * (1 - ringDistance * 1.05) : 0;

    // Dot grid across the lower-start quadrant.
    const dotX = (nx % 0.04) - 0.02;
    const dotY = (ny % 0.04) - 0.02;
    const dot =
      nx < 0.5 && ny > 0.5 && Math.hypot(dotX, dotY) < 0.0038
        ? 0.34 * Math.min(1, (0.95 - ny) * 2.2 + 0.45)
        : 0;

    // Diagonal light sweep for depth.
    const band = Math.max(0, 1 - Math.abs(nx * 0.75 + ny * 0.66 - 0.86) * 4.2) * 0.16;

    const veil = Math.min(1, ring + dot + band);
    r = mix(r, 255, veil);
    g = mix(g, 255, veil);
    b = mix(b, 255, veil);

    // Soft vignette so the edges read as deliberate.
    const vignette = Math.max(0, Math.hypot(nx - 0.5, ny - 0.5) - 0.34) * 0.26;
    r = mix(r, 6, vignette);
    g = mix(g, 8, vignette);
    b = mix(b, 22, vignette);

    return [
      Math.round(Math.min(255, Math.max(0, r))),
      Math.round(Math.min(255, Math.max(0, g))),
      Math.round(Math.min(255, Math.max(0, b))),
      255,
    ];
  };
}

/** Writes the generated artwork of a content group next to its entries. */
function writeArtwork(collection, group, width, height, hue) {
  const targetDir = path.join(contentDir, collection, group);
  fs.mkdirSync(targetDir, { recursive: true });
  const filePath = path.join(targetDir, `${group}.png`);
  fs.writeFileSync(filePath, encodePng(width, height, artPixel(width, height, hue)));
  const kb = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`✅ src/content/${collection}/${group}/${group}.png (${width}×${height}, ${kb} KB)`);
}

function writeAsset(filename, width, height, options) {
  const filePath = path.join(publicDir, filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, encodePng(width, height, brandPixel(width, height, options)));
  const kb = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`✅ public/${filename} (${width}×${height}, ${kb} KB)`);
}

fs.mkdirSync(publicDir, { recursive: true });

const { appleTouchIcon, icons } = appConfig.brand;
writeAsset(appleTouchIcon.file, appleTouchIcon.size, appleTouchIcon.size, { icon: true });
for (const icon of icons) {
  writeAsset(icon.file, icon.size, icon.size, { icon: true });
}

const { socialImage } = appConfig.site;
writeAsset(socialImage.path.replace(/^\/+/, ''), socialImage.width, socialImage.height, {
  icon: false,
});

// The shared hero background is a photograph (`src/assets/hero/hero-0.jpg`),
// not generated artwork, so it is not produced here.

/** Lists the group folder names of a content collection, sorted. */
function contentGroups(collectionDir) {
  if (!fs.existsSync(collectionDir)) return [];
  return fs
    .readdirSync(collectionDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// One cover per blog group so `assets:generate` keeps artwork in sync with posts.
const COVER_HUES = [262, 198, 330, 158, 32, 286, 210, 350];
contentGroups(path.join(contentDir, 'blog')).forEach((group, index) => {
  writeArtwork('blog', group, 1200, 675, COVER_HUES[index % COVER_HUES.length]);
});

// One cover per page group, so every page has its own hero background.
const PAGE_HUES = [232, 292, 172, 336, 208, 24];
contentGroups(path.join(contentDir, 'pages')).forEach((group, index) => {
  writeArtwork('pages', group, 1200, 675, PAGE_HUES[index % PAGE_HUES.length]);
});
