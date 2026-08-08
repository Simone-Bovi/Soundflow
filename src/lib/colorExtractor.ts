import { MaterialPalette } from '../types';

const paletteCache = new Map<string, MaterialPalette>();
const MAX_CACHE_SIZE = 100;

/**
 * Extracts dominant dynamic Material You palette from an image URL or cover art.
 * Fallback to default vibrant purple/teal Material palette if image fails to load.
 */
export async function extractMaterialPalette(imageUrl: string): Promise<MaterialPalette> {
  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    const defaultPalette: MaterialPalette = {
      primary: '#a855f7',
      onPrimary: '#ffffff',
      primaryContainer: '#3b0764',
      onPrimaryContainer: '#f3e8ff',
      secondary: '#06b6d4',
      secondaryContainer: '#164e63',
      tertiary: '#f43f5e',
      tertiaryContainer: '#881337',
      surface: '#0f172a',
      surfaceContainer: '#1e293b',
      onSurface: '#f8fafc',
      outline: '#475569',
      glowColor: 'rgba(168, 85, 247, 0.45)',
    };

    const saveAndResolve = (palette: MaterialPalette) => {
      if (paletteCache.size >= MAX_CACHE_SIZE) {
        const firstKey = paletteCache.keys().next().value;
        if (firstKey) paletteCache.delete(firstKey);
      }
      paletteCache.set(imageUrl, palette);
      resolve(palette);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return saveAndResolve(defaultPalette);

        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const imageData = ctx.getImageData(0, 0, 64, 64).data;
        let rSum = 0, gSum = 0, bSum = 0;
        let count = 0;

        // Sample pixels excluding ultra dark/bright
        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          if (brightness > 20 && brightness < 235) {
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }
        }

        if (count === 0) return saveAndResolve(defaultPalette);

        const avgR = Math.round(rSum / count);
        const avgG = Math.round(gSum / count);
        const avgB = Math.round(bSum / count);

        // Convert RGB to HSL for Material 3 color generation
        const { h, s, l } = rgbToHsl(avgR, avgG, avgB);

        // Primary (vibrant & comfortable lightness)
        const primaryHsl = { h, s: Math.max(s, 0.65), l: clamp(l, 0.45, 0.65) };
        const primaryHex = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l);

        // Secondary (complementary shift)
        const secondaryH = (h + 35) % 360;
        const secondaryHex = hslToHex(secondaryH, 0.55, 0.55);

        // Tertiary (expressive contrast shift)
        const tertiaryH = (h + 160) % 360;
        const tertiaryHex = hslToHex(tertiaryH, 0.70, 0.60);

        // Containers
        const primaryContainerHex = hslToHex(h, Math.max(s, 0.6), 0.18);
        const onPrimaryContainerHex = hslToHex(h, 0.8, 0.92);

        const secondaryContainerHex = hslToHex(secondaryH, 0.5, 0.20);
        const tertiaryContainerHex = hslToHex(tertiaryH, 0.6, 0.22);

        // Surface tones
        const surfaceHex = hslToHex(h, 0.25, 0.07);
        const surfaceContainerHex = hslToHex(h, 0.20, 0.12);

        const glowColor = `rgba(${avgR}, ${avgG}, ${avgB}, 0.5)`;

        saveAndResolve({
          primary: primaryHex,
          onPrimary: '#ffffff',
          primaryContainer: primaryContainerHex,
          onPrimaryContainer: onPrimaryContainerHex,
          secondary: secondaryHex,
          secondaryContainer: secondaryContainerHex,
          tertiary: tertiaryHex,
          tertiaryContainer: tertiaryContainerHex,
          surface: surfaceHex,
          surfaceContainer: surfaceContainerHex,
          onSurface: '#f8fafc',
          outline: hslToHex(h, 0.15, 0.35),
          glowColor,
        });
      } catch {
        saveAndResolve(defaultPalette);
      }
    };

    img.onerror = () => saveAndResolve(defaultPalette);
  });
}

export interface BgThemePreset {
  id: string;
  name: string;
  surface: string;
  surfaceContainer: string;
  desc: string;
}

export const BG_THEME_PRESETS: BgThemePreset[] = [
  { id: 'classic_dark', name: 'Originale (Slate)', surface: '#020617', surfaceContainer: '#0f172a', desc: 'Sfondo predefinito Slate 950' },
  { id: 'match_accent', name: 'Sincronizzato', surface: '', surfaceContainer: '', desc: 'Intonato al colore dei tasti' },
  { id: 'oled_black', name: 'Nero OLED', surface: '#000000', surfaceContainer: '#0d0d0d', desc: 'Nero profondo 0%' },
  { id: 'deep_slate', name: 'Slate Notte', surface: '#0f172a', surfaceContainer: '#1e293b', desc: 'Blu notte medio' },
  { id: 'charcoal', name: 'Antracite', surface: '#121212', surfaceContainer: '#1f1f1f', desc: 'Grigio scuro moderno' },
  { id: 'coffee', name: 'Espresso', surface: '#1c1917', surfaceContainer: '#292524', desc: 'Sfondo caldo caffè' },
  { id: 'emerald', name: 'Smeraldo', surface: '#062c1d', surfaceContainer: '#0b3d29', desc: 'Verde pino scuro' },
  { id: 'violet', name: 'Viola Notte', surface: '#1e1b4b', surfaceContainer: '#2e2a72', desc: 'Tono viola profondo' },
];

/**
 * Applies a detached background theme (preset or custom HEX) to an existing MaterialPalette.
 */
export function applyBackgroundTheme(palette: MaterialPalette, bgTheme: string): MaterialPalette {
  if (!bgTheme || bgTheme === 'match_accent') {
    return palette;
  }

  const preset = BG_THEME_PRESETS.find((p) => p.id === bgTheme);
  if (preset && preset.surface) {
    return {
      ...palette,
      surface: preset.surface,
      surfaceContainer: preset.surfaceContainer,
    };
  }

  // If custom hex provided for background theme (e.g. "#0a0a14")
  if (/^#[0-9A-F]{6}$/i.test(bgTheme)) {
    const customBgPalette = generatePaletteFromHex(bgTheme);
    return {
      ...palette,
      surface: customBgPalette.surface,
      surfaceContainer: customBgPalette.surfaceContainer,
    };
  }

  return palette;
}

/**
 * Generates a full congruent Material 3 palette from any hex color (e.g. user theme selection).
 */
export function generatePaletteFromHex(colorHex: string): MaterialPalette {
  let hex = colorHex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }

  const num = parseInt(hex, 16);
  if (isNaN(num)) {
    return {
      primary: '#a855f7',
      onPrimary: '#ffffff',
      primaryContainer: '#3b0764',
      onPrimaryContainer: '#f3e8ff',
      secondary: '#06b6d4',
      secondaryContainer: '#164e63',
      tertiary: '#f43f5e',
      tertiaryContainer: '#881337',
      surface: '#0f172a',
      surfaceContainer: '#1e293b',
      onSurface: '#f8fafc',
      outline: '#475569',
      glowColor: 'rgba(168, 85, 247, 0.45)',
    };
  }

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const { h, s, l } = rgbToHsl(r, g, b);

  const primaryHex = hslToHex(h, Math.max(s, 0.65), clamp(l, 0.45, 0.65));
  const secondaryH = (h + 35) % 360;
  const secondaryHex = hslToHex(secondaryH, 0.60, 0.55);
  const tertiaryH = (h + 160) % 360;
  const tertiaryHex = hslToHex(tertiaryH, 0.70, 0.60);

  const primaryContainerHex = hslToHex(h, Math.max(s, 0.6), 0.16);
  const onPrimaryContainerHex = hslToHex(h, 0.85, 0.92);

  const secondaryContainerHex = hslToHex(secondaryH, 0.5, 0.20);
  const tertiaryContainerHex = hslToHex(tertiaryH, 0.6, 0.22);

  const surfaceHex = hslToHex(h, 0.20, 0.08);
  const surfaceContainerHex = hslToHex(h, 0.15, 0.13);

  return {
    primary: primaryHex,
    onPrimary: '#ffffff',
    primaryContainer: primaryContainerHex,
    onPrimaryContainer: onPrimaryContainerHex,
    secondary: secondaryHex,
    secondaryContainer: secondaryContainerHex,
    tertiary: tertiaryHex,
    tertiaryContainer: tertiaryContainerHex,
    surface: surfaceHex,
    surfaceContainer: surfaceContainerHex,
    onSurface: '#f8fafc',
    outline: hslToHex(h, 0.15, 0.35),
    glowColor: `rgba(${r}, ${g}, ${b}, 0.5)`,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h / 360 + 1 / 3);
    g = hueToRgb(p, q, h / 360);
    b = hueToRgb(p, q, h / 360 - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
