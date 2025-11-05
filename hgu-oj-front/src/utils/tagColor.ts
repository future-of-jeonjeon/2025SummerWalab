export interface TagColorScheme {
  background: string;
  hoverBackground: string;
  activeBackground: string;
  text: string;
  activeText?: string;
  border: string;
  activeBorder: string;
}

const TAG_PALETTE: Array<{ bg: string; text: string }> = [
  { bg: '#3D74B6', text: '#FFFFFF' },
  { bg: '#FBF5DE', text: '#1F2937' },
  { bg: '#EAC8A6', text: '#3B2F2F' },
  { bg: '#DC3C22', text: '#FFFFFF' },
];

const clamp = (value: number) => Math.min(255, Math.max(0, value));

const adjustColor = (hex: string, amount: number) => {
  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized.split('').map((char) => char + char).join('');
  }
  const numeric = parseInt(sanitized, 16);
  const r = clamp((numeric >> 16) + amount);
  const g = clamp(((numeric >> 8) & 0xff) + amount);
  const b = clamp((numeric & 0xff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const hashTag = (tag: string): number =>
  Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const getTagColor = (tag: string): TagColorScheme => {
  const fallback = TAG_PALETTE[0];
  if (!tag) {
    const base = adjustColor(fallback.bg, 24);
    return {
      background: base,
      hoverBackground: adjustColor(base, 10),
      activeBackground: adjustColor(fallback.bg, -18),
      text: fallback.text,
      border: adjustColor(fallback.bg, -20),
      activeBorder: adjustColor(fallback.bg, -28),
    };
  }
  const palette = TAG_PALETTE[hashTag(tag) % TAG_PALETTE.length];
  const inactiveBackground = adjustColor(palette.bg, 28);
  const activeBackground = adjustColor(palette.bg, -22);
  return {
    background: inactiveBackground,
    hoverBackground: adjustColor(inactiveBackground, 8),
    activeBackground,
    text: palette.text,
    activeText: palette.text,
    border: adjustColor(palette.bg, -12),
    activeBorder: adjustColor(palette.bg, -34),
  };
};

export const getTagPalette = () => [...TAG_PALETTE];
