import { Platform } from 'react-native';

export const C = {
  red: '#E11D2E',
  redSoft: '#FEF2F3',
  ink: '#0A0A0A',
  paper: '#FFFFFF',
  mist: '#F4F4F5',
  hair: '#E4E4E7',
  slate: '#52525B',
  muted: '#71717A',
  faint: '#A1A1AA',
  // Dark mode specific tokens
  darkPaper: '#09090B',
  darkSurface: '#121215',
  darkCard: '#18181B',
  darkInk: '#F4F4F5',
  darkMist: '#27272A',
  darkHair: '#3F3F46',
  darkSlate: '#A1A1AA',
  darkMuted: '#71717A',
  darkRedSoft: '#2C1215',
};

export const Fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

// Colors used by themed components and navigation
export const Colors = {
  light: {
    text: C.ink,
    background: C.paper,
    surface: C.paper,
    card: C.paper,
    border: C.hair,
    tint: C.red,
    icon: C.slate,
    subtext: C.slate,
    tabIconDefault: C.faint,
    tabIconSelected: C.red,
  },
  dark: {
    text: C.darkInk,
    background: C.darkPaper,
    surface: C.darkSurface,
    card: C.darkCard,
    border: C.darkHair,
    tint: C.red,
    icon: C.darkSlate,
    subtext: C.darkSlate,
    tabIconDefault: C.darkMuted,
    tabIconSelected: C.red,
  },
};
