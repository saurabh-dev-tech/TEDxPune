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
};

export const Fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

// Legacy colors used by existing components
export const Colors = {
  light: {
    text: C.ink,
    background: C.paper,
    tint: C.red,
    icon: C.slate,
    tabIconDefault: C.faint,
    tabIconSelected: C.ink,
  },
  dark: {
    text: C.ink,
    background: C.paper,
    tint: C.red,
    icon: C.slate,
    tabIconDefault: C.faint,
    tabIconSelected: C.ink,
  },
};
