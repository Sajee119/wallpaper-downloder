// Suggestion helpers for the admin wallpaper editor. Everything here runs in the
// browser: titles map to collections/tags/accents by keyword, and uploaded images
// are sampled locally so the accent colour comes from the picture itself.

export const DEVICE_SIZES = {
  desktop: { width: 1392, height: 752 },
  tablet: { width: 880, height: 1184 },
  mobile: { width: 752, height: 1392 },
};

export const BASE_COLLECTIONS = ['Abstract', 'City', 'Minimal', 'Nature', 'Ocean', 'Space'];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'my', 'new',
  'wallpaper', 'wallpapers', 'background', 'backgrounds', 'bg', 'hd', 'uhd', '4k', '8k', '5k',
  'desktop', 'mobile', 'tablet', 'final', 'copy', 'edit', 'img', 'image', 'photo', 'photography',
]);

// Order matters: the first matching theme wins ties, so "Night Bloom" becomes
// Nature rather than City.
const THEMES = [
  {
    keys: ['space', 'cosmic', 'galaxy', 'nebula', 'star', 'stars', 'planet', 'orbit', 'lunar', 'moon', 'astronaut', 'aurora', 'milky', 'supernova'],
    category: 'Space',
    tags: ['space', 'stars', 'nebula', 'dark'],
    accent: '#9b7bf0',
  },
  {
    keys: ['ocean', 'sea', 'wave', 'waves', 'tide', 'tides', 'water', 'underwater', 'beach', 'surf', 'coral', 'reef', 'harbor', 'harbour'],
    category: 'Ocean',
    tags: ['ocean', 'water', 'blue', 'calm'],
    accent: '#4fa8c8',
  },
  {
    keys: ['forest', 'pine', 'pines', 'tree', 'trees', 'fern', 'leaf', 'leaves', 'moss', 'jungle', 'plant', 'plants', 'monstera', 'flower', 'bloom', 'mountain', 'mountains', 'alpine', 'lake', 'desert', 'dune', 'dunes', 'canyon', 'landscape', 'meadow', 'ridge', 'valley', 'glacier', 'snow'],
    category: 'Nature',
    tags: ['nature', 'landscape', 'green', 'calm'],
    accent: '#7d9c7a',
  },
  {
    keys: ['city', 'urban', 'skyline', 'street', 'neon', 'alley', 'downtown', 'tokyo', 'cyber', 'subway', 'traffic', 'rooftop', 'night'],
    category: 'City',
    tags: ['city', 'urban', 'night', 'neon'],
    accent: '#cf8163',
  },
  {
    keys: ['minimal', 'paper', 'geometric', 'clean', 'simple', 'cream', 'fold', 'grid', 'line', 'lines', 'curve', 'curves', 'blank', 'plain'],
    category: 'Minimal',
    tags: ['minimal', 'clean', 'shape', 'soft'],
    accent: '#ddd0b6',
  },
  {
    keys: ['abstract', 'gradient', 'glass', 'ink', 'liquid', 'texture', 'fluid', 'marble', 'blob', 'iridescent', 'chrome', '3d', 'render', 'prism'],
    category: 'Abstract',
    tags: ['abstract', 'gradient', 'texture', 'color'],
    accent: '#8b7cf6',
  },
];

const COLOURS = [
  { name: 'blue', keys: ['blue', 'navy', 'azure', 'sky', 'cobalt', 'sapphire'], hex: '#4f8cc9' },
  { name: 'teal', keys: ['teal', 'turquoise', 'cyan', 'aqua', 'mint', 'jade'], hex: '#4fb6a8' },
  { name: 'green', keys: ['green', 'emerald', 'forest', 'lime', 'sage', 'olive'], hex: '#5f9c6b' },
  { name: 'amber', keys: ['amber', 'gold', 'golden', 'orange', 'sunset', 'sand', 'ember', 'warm'], hex: '#d99450' },
  { name: 'red', keys: ['red', 'crimson', 'ruby', 'rose', 'wine', 'blood'], hex: '#c96b6b' },
  { name: 'pink', keys: ['pink', 'magenta', 'blush', 'salmon', 'peach'], hex: '#d98fb0' },
  { name: 'violet', keys: ['violet', 'purple', 'lavender', 'indigo', 'synthwave', 'plum'], hex: '#8b7cf6' },
  { name: 'grey', keys: ['grey', 'gray', 'mono', 'monochrome', 'silver', 'slate'], hex: '#8b95a3' },
];

const MOBILE_WORDS = ['portrait', 'phone', 'mobile', 'vertical', 'iphone', 'android'];
const TABLET_WORDS = ['tablet', 'ipad'];

export function words(value) {
  return String(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 || /^\d$/.test(token));
}

export function slugifyTitle(value) {
  return words(value).join('-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function pickTheme(tokens) {
  let best = null;
  let bestScore = 0;
  for (const theme of THEMES) {
    let score = 0;
    for (const key of theme.keys) {
      const hit = tokens.some(
        (token) =>
          token === key ||
          (key.length > 3 && token.startsWith(key)) ||
          (token.length > 3 && key.startsWith(token)),
      );
      if (hit) score += 1;
    }
    if (score > bestScore) {
      best = theme;
      bestScore = score;
    }
  }
  return best;
}

function pickColour(tokens) {
  return (
    COLOURS.find((colour) =>
      colour.keys.some((key) =>
        tokens.some((token) => token === key || (token.length > 3 && token.startsWith(key))),
      ),
    ) ?? null
  );
}

function similarRow(tokens, rows) {
  let best = null;
  let bestScore = 0;
  for (const row of rows ?? []) {
    const pool = new Set([
      ...words(row.title),
      ...(row.tags ?? []).map((tag) => String(tag).toLowerCase()),
      String(row.category ?? '').toLowerCase(),
    ]);
    let score = 0;
    for (const token of tokens) {
      if (pool.has(token)) score += token.length > 4 ? 2 : 1;
    }
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best;
}

function estimateDownloads(rows, category) {
  const list = (rows ?? []).filter(
    (row) => row.category === category && Number.isFinite(Number(row.downloads)) && Number(row.downloads) > 0,
  );
  if (!list.length) return null;
  const average = list.reduce((sum, row) => sum + Number(row.downloads), 0) / list.length;
  return Math.max(10, Math.round(average / 10) * 10);
}

export function collectionsFromRows(rows) {
  const names = new Set(BASE_COLLECTIONS);
  for (const row of rows ?? []) {
    if (row?.category) names.add(String(row.category));
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function tagPoolFromRows(rows) {
  const tags = new Set();
  for (const row of rows ?? []) {
    for (const tag of row?.tags ?? []) tags.add(String(tag).toLowerCase());
  }
  return [...tags].sort((a, b) => a.localeCompare(b)).slice(0, 120);
}

/**
 * Suggest values for every editor field from the wallpaper title.
 * Fields with no confident answer are omitted rather than filled with noise.
 */
export function suggestWallpaper(title, rows = []) {
  const tokens = words(title);
  if (!tokens.length) return null;

  const theme = pickTheme(tokens);
  const colour = pickColour(tokens);
  const similar = theme ? null : similarRow(tokens, rows);
  const category = theme?.category ?? similar?.category ?? '';

  const tags = new Set();
  if (theme) theme.tags.forEach((tag) => tags.add(tag));
  for (const token of tokens) {
    if (STOPWORDS.has(token) || tags.size >= 6) continue;
    tags.add(token);
  }
  if (colour) tags.add(colour.name);
  if (similar) {
    for (const tag of similar.tags ?? []) {
      if (tags.size >= 8) break;
      tags.add(String(tag).toLowerCase());
    }
  }

  let device = null;
  if (tokens.some((token) => MOBILE_WORDS.includes(token))) device = 'mobile';
  else if (tokens.some((token) => TABLET_WORDS.includes(token))) device = 'tablet';

  const known = tokens.some((token) => !STOPWORDS.has(token));
  const accent = theme?.accent ?? colour?.hex ?? similar?.accent ?? (known ? '#6b7a99' : '');

  return {
    slug: slugifyTitle(title),
    category,
    tags: [...tags].slice(0, 8),
    accent,
    device,
    width: device ? DEVICE_SIZES[device].width : null,
    height: device ? DEVICE_SIZES[device].height : null,
    downloads: estimateDownloads(rows, category),
    keywords: [...new Set([...(theme?.tags ?? []), ...(colour ? [colour.name] : [])])],
  };
}

/* -------------------------------------------------------------------------- */
/* Image scanning                                                             */
/* -------------------------------------------------------------------------- */

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  if (delta) {
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
    else if (max === green) hue = ((blue - red) / delta + 2) / 6;
    else hue = ((red - green) / delta + 4) / 6;
  }
  return { h: hue, s: saturation, l: lightness };
}

function hslToHex(h, s, l) {
  const hue2rgb = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  let red;
  let green;
  let blue;
  if (s === 0) {
    red = green = blue = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    red = hue2rgb(p, q, h + 1 / 3);
    green = hue2rgb(p, q, h);
    blue = hue2rgb(p, q, h - 1 / 3);
  }
  return `#${[red, green, blue]
    .map((value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function hueName(h, s) {
  if (s < 0.12) return 'monochrome';
  if (h < 0.035 || h >= 0.94) return 'red';
  if (h < 0.11) return 'amber';
  if (h < 0.17) return 'gold';
  if (h < 0.27) return 'lime';
  if (h < 0.45) return 'green';
  if (h < 0.52) return 'teal';
  if (h < 0.68) return 'blue';
  if (h < 0.8) return 'violet';
  return 'pink';
}

function accentFrom(h, s, l) {
  // Keep the sampled hue but make it usable as an accent on both light and
  // dark page backgrounds.
  const saturation =
    s < 0.12 ? Math.min(0.35, s + 0.18) : Math.min(0.82, Math.max(0.34, s));
  const lightness = Math.min(0.68, Math.max(0.42, l));
  return hslToHex(h, saturation, lightness);
}

function paletteFromSource(source) {
  const size = 72;
  const ratio = source.width / source.height;
  const sample = document.createElement('canvas');
  sample.width = ratio >= 1 ? size : Math.max(8, Math.round(size * ratio));
  sample.height = ratio >= 1 ? Math.max(8, Math.round(size / ratio)) : size;
  const context = sample.getContext('2d', { willReadFrequently: true });
  context.drawImage(source, 0, 0, sample.width, sample.height);
  const { data } = context.getImageData(0, 0, sample.width, sample.height);

  const buckets = new Map();
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let pixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 128) continue;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const { h, s, l } = rgbToHsl(red, green, blue);
    redSum += red;
    greenSum += green;
    blueSum += blue;
    pixels += 1;
    if (l > 0.96 || l < 0.04) continue;

    const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, h: 0, s: 0, l: 0 };
    bucket.r += red;
    bucket.g += green;
    bucket.b += blue;
    bucket.h += h;
    bucket.s += s;
    bucket.l += l;
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  if (!pixels) {
    return {
      accent: '#6b7a99',
      swatches: [{ hex: '#6b7a99', share: 1 }],
      lightness: 0.5,
      saturation: 0,
      hueName: 'monochrome',
    };
  }

  const entries = [...buckets.values()].map((bucket) => {
    const h = bucket.h / bucket.n;
    const s = bucket.s / bucket.n;
    const l = bucket.l / bucket.n;
    return {
      hex: hslToHex(h, s, l),
      share: bucket.n / pixels,
      h,
      s,
      l,
      score: bucket.n * (0.5 + s * 0.9),
    };
  });

  if (!entries.length) {
    const h = redSum / pixels / 255;
    const averageHue = rgbToHsl(redSum / pixels, greenSum / pixels, blueSum / pixels);
    entries.push({
      hex: hslToHex(averageHue.h, averageHue.s, averageHue.l),
      share: 1,
      h,
      s: averageHue.s,
      l: averageHue.l,
      score: 1,
    });
  }

  const byScore = [...entries].sort((a, b) => b.score - a.score);
  const byCount = [...entries].sort((a, b) => b.share - a.share);
  const dominant = byScore[0];

  const average = rgbToHsl(redSum / pixels, greenSum / pixels, blueSum / pixels);

  return {
    accent: accentFrom(dominant.h, dominant.s, dominant.l),
    swatches: byCount.slice(0, 5).map((entry) => ({
      hex: accentFrom(entry.h, entry.s, entry.l),
      share: Math.round(entry.share * 100),
    })),
    lightness: average.l,
    saturation: average.s,
    hueName: hueName(dominant.h, dominant.s),
  };
}

export function tagsFromPalette(palette) {
  const tags = [];
  if (palette.lightness < 0.34) tags.push('dark');
  else if (palette.lightness > 0.68) tags.push('light');
  if (palette.saturation > 0.5) tags.push('vibrant');
  if (palette.saturation < 0.12) tags.push('monochrome');
  if (palette.hueName) tags.push(palette.hueName);
  return [...new Set(tags)];
}

export function deviceFromAspect(width, height) {
  const ratio = height ? width / height : 1;
  if (ratio <= 0.85) return 'mobile';
  if (ratio < 1.35) return 'tablet';
  return 'desktop';
}

export function titleFromFilename(name) {
  const base = String(name ?? '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b(4k|8k|5k|hd|uhd|wallpaper|wallpapers|background|bg|final|copy|edit|img|image)\b/gi, ' ')
    .replace(/\bv\d+\b/gi, ' ')
    .replace(/[^a-z0-9 ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base || /^\d+$/.test(base)) return '';
  return base
    .split(' ')
    .slice(0, 6)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resize the picked file to fit `maxSize`, encode it as JPEG and sample its
 * palette at the same time.
 */
export async function analyseImageFile(file, maxSize = 2400) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return {
      imageData: canvas.toDataURL('image/jpeg', 0.9),
      width: canvas.width,
      height: canvas.height,
      palette: paletteFromSource(canvas),
    };
  } finally {
    bitmap.close?.();
  }
}
