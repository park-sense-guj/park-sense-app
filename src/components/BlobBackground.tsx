import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export function BlobBackground() {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        blob: {
          position: 'absolute',
          borderRadius: 999,
        },
        blobOne: {
          width: 280,
          height: 280,
          top: -90,
          right: -80,
          backgroundColor: colors.blobOne,
        },
        blobTwo: {
          width: 220,
          height: 220,
          top: 180,
          left: -90,
          backgroundColor: colors.blobTwo,
        },
        blobThree: {
          width: 260,
          height: 260,
          bottom: 80,
          right: -100,
          backgroundColor: colors.blobThree,
        },
      }),
    [colors],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
      <View style={[styles.blob, styles.blobThree]} />
    </View>
  );
}
