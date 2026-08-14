import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useTheme } from '@/lib/theme/context';

export function useColorScheme(): 'light' | 'dark' {
  try {
    const { effectiveTheme } = useTheme();
    return effectiveTheme;
  } catch {
    return useNativeColorScheme() === 'dark' ? 'dark' : 'light';
  }
}
