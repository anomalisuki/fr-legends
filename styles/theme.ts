// Universal theme and styling constants
export const theme = {
  colors: {
    primary: '#6b46c1',
    secondary: '#3b82f6',
    background: '#ffffff',
    surface: '#f6f6f6',
    border: '#ddd',
    text: '#000000',
    textMuted: '#666666',
    placeholder: '#999999',
  },
  spacing: {
    xs: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
    xxl: 24,
  },
  fontSizes: {
    xs: 11,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 16,
    xxl: 20,
    h1: 24,
    h1Lg: 32,
    h3: 14,
    h3Lg: 16,
  },
  borderRadius: {
    sm: 6,
    md: 8,
  },
  breakpoints: {
    mobile: 768,
  },
};

export type Theme = typeof theme;
