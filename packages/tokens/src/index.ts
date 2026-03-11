// Palantir Blueprint dark color tokens as JS constants
// Used by NativeWind and any JS-side styling

export const colors = {
  surface: {
    base:    '#111418',
    primary: '#1C2127',
    panel:   '#252A31',
    card:    '#2F343C',
    hover:   '#383E47',
    active:  '#404854',
  },
  content: {
    primary:   '#F6F7F9',
    secondary: '#ABB3BF',
    muted:     '#738091',
  },
  intent: {
    primary: '#4C90F0',
    success: '#32A467',
    warning: '#EC9A3C',
    danger:  '#E76A6E',
    gold:    '#D1980B',
  },
} as const;

export type ColorToken = typeof colors;
