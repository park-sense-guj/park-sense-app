import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

function BlobBackgroundComponent() {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        blob: {
          position: 'absolute',
          borderRadius: 999,
        },
        blobOne: {
          width: 220,
          height: 220,
          top: -70,
          right: -70,
          backgroundColor: colors.blobOne,
          opacity: 0.85,
        },
        blobTwo: {
          width: 180,
          height: 180,
          bottom: 120,
          left: -70,
          backgroundColor: colors.blobTwo,
          opacity: 0.7,
        },
      }),
    [colors],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
    </View>
  );
}

export const BlobBackground = memo(BlobBackgroundComponent);
