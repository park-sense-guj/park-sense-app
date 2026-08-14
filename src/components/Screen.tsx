import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../config/theme';
import { BlobBackground } from './BlobBackground';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  overlayTabBar?: boolean;
  edges?: ('top' | 'bottom')[];
};

export function Screen({
  children,
  style,
  padded = true,
  overlayTabBar = false,
  edges = ['top'],
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = edges.includes('top') ? insets.top + 8 : 0;
  const paddingBottom = overlayTabBar
    ? 8
    : edges.includes('bottom')
      ? Math.max(insets.bottom, 12) + 24
      : 12;

  return (
    <View style={styles.root}>
      <BlobBackground />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
});
