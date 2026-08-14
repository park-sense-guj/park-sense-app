import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export type DonutSegment = {
  value: number;
  color: string;
  label: string;
};

type Props = {
  /** 0–1 share drawn in fillColor (rest uses trackColor). */
  progress: number;
  fillColor: string;
  trackColor: string;
  size?: number;
  strokeWidth?: number;
  centerValue: string;
  centerLabel: string;
};

/**
 * Pure RN ring chart — no react-native-svg / native rebuild required.
 */
function DonutChartComponent({
  progress,
  fillColor,
  trackColor,
  size = 128,
  strokeWidth = 14,
  centerValue,
  centerLabel,
}: Props) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const half = size / 2;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        track: {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: trackColor,
        },
        halfClip: {
          position: 'absolute',
          width: half,
          height: size,
          overflow: 'hidden',
        },
        center: {
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 10,
        },
        value: {
          fontSize: 22,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.5,
        },
        label: {
          marginTop: 2,
          fontSize: 11,
          fontWeight: '700',
          color: colors.textMuted,
          textAlign: 'center',
        },
      }),
    [colors, size, half, strokeWidth, trackColor],
  );

  const rightRotate = Math.min(clamped, 0.5) * 360 - 135;
  const leftRotate = Math.max(clamped - 0.5, 0) * 360 + 45;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={`${centerLabel} ${centerValue}`}
    >
      <View style={styles.track} />

      {/* 0% → 50% (right half) */}
      <View style={[styles.halfClip, { right: 0 }]}>
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            left: -half,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderColor: fillColor,
            borderLeftColor: 'transparent',
            borderBottomColor: 'transparent',
            transform: [{ rotate: `${rightRotate}deg` }],
            opacity: clamped > 0.001 ? 1 : 0,
          }}
        />
      </View>

      {/* 50% → 100% (left half) */}
      <View style={[styles.halfClip, { left: 0 }]}>
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderColor: clamped > 0.5 ? fillColor : 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: 'transparent',
            transform: [{ rotate: `${leftRotate}deg` }],
          }}
        />
      </View>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.value} maxFontSizeMultiplier={1.2}>
          {centerValue}
        </Text>
        <Text style={styles.label} maxFontSizeMultiplier={1.2}>
          {centerLabel}
        </Text>
      </View>
    </View>
  );
}

export const DonutChart = memo(DonutChartComponent);
