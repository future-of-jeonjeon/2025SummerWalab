export interface TagColorScheme {
  background: string;
  hoverBackground: string;
  activeBackground: string;
  text: string;
  activeText?: string;
  border: string;
  activeBorder: string;
}

// 파스텔톤 연파랑 단일 팔레트
const BASE_COLOR = '#8CBDFE'; // 조금 더 밝은 블루 계열
const TEXT_COLOR = '#0B1224';

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

export const getTagColor = (_tag: string): TagColorScheme => {
  const base = BASE_COLOR;
  const inactiveBackground = adjustColor(base, 16); // 기본보다 살짝 밝은 톤
  const activeBackground = adjustColor(base, -16); // 클릭 시 살짝 짙게
  const navyBorder = '#0B1E4D'; // 클릭 시 강조용 진한 남색
  return {
    background: inactiveBackground,
    hoverBackground: adjustColor(inactiveBackground, -10),
    activeBackground,
    text: TEXT_COLOR,
    activeText: '#F8FAFF',
    border: adjustColor(base, -14),
    activeBorder: navyBorder,
  };
};

export const getTagPalette = () => [{ bg: BASE_COLOR, text: '#FFFFFF' }];
