import { memo, type ReactNode, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlobBackground } from './BlobBackground';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  overlayTabBar?: boolean;
  edges?: ('top' | 'bottom')[];
  /** Decorative blobs are expensive when every tab mounts them. Default off on map. */
  blobs?: boolean;
};

function ScreenComponent({
  children,
  style,
  padded = true,
  overlayTabBar = false,
  edges = ['top'],
  blobs = true,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const paddingTop = edges.includes('top') ? insets.top + 8 : 0;
  const paddingBottom = overlayTabBar
    ? 8
    : edges.includes('bottom')
      ? Math.max(insets.bottom, 12) + 24
      : 12;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        content: { flex: 1 },
      }),
    [colors],
  );

  return (
    <View style={styles.root}>
      {blobs ? <BlobBackground /> : null}
      <View
        style={[
          styles.content,
          padded && { paddingHorizontal: 20, paddingTop, paddingBottom },
          !padded && { paddingTop, paddingBottom },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export const Screen = memo(ScreenComponent);
