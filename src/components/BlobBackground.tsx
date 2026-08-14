import { StyleSheet, View } from 'react-native';

export function BlobBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
      <View style={[styles.blob, styles.blobThree]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobOne: {
    width: 280,
    height: 280,
    top: -90,
    right: -80,
    backgroundColor: 'rgba(15, 118, 110, 0.14)',
  },
  blobTwo: {
    width: 220,
    height: 220,
    top: 180,
    left: -90,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  blobThree: {
    width: 260,
    height: 260,
    bottom: 80,
    right: -100,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
  },
});
