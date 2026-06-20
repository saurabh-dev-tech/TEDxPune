import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Height of the bottom tab bar, including the platform's safe-area inset.
 *
 * Must match the values in `app/(tabs)/_layout.tsx`. Use it as
 * `contentContainerStyle={{ paddingBottom: useTabBarHeight() + 20 }}`
 * on any ScrollView in a tab so the last item isn't hidden behind the
 * iOS Liquid Glass (absolute-positioned) tab bar.
 */
const BAR_CONTENT_HEIGHT = 56;

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  // Android has a solid bar (not absolute) so the OS already reserves the
  // space — callers don't need to compensate. Return 0 to keep math simple.
  if (Platform.OS !== 'ios') return 0;
  return BAR_CONTENT_HEIGHT + insets.bottom;
}
