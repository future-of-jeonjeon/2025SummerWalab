export interface TagColorScheme {
  background: string;
  hoverBackground: string;
  activeBackground: string;
  text: string;
  activeText?: string;
  border: string;
  activeBorder: string;
}

export const getTagColor = (_tag: string): TagColorScheme => {
  return {
    background: '#FFFFFF',
    hoverBackground: '#F3F4F6', // gray-100
    activeBackground: '#FFFFFF',
    text: '#374151', // gray-700
    activeText: '#374151',
    border: '#D1D5DB', // gray-300
    activeBorder: '#9CA3AF', // gray-400
  };
};

export const getTagPalette = () => [{ bg: '#FFFFFF', text: '#374151' }];
