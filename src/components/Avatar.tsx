import { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ImageStyle, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Props = {
  initials?: string;
  photoUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle | ImageStyle>;
};

export function initialsFromName(fullName?: string | null) {
  return (fullName ?? 'P')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

function AvatarComponent({ initials = 'P', photoUrl, size = 40, style }: Props) {
  const { colors } = useTheme();
  const avatarRadius = size / 2;
  const shape = useMemo(
    () => ({ width: size, height: size, borderRadius: avatarRadius }),
    [size, avatarRadius],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        image: {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.primarySoft,
        },
        fallback: {
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        initial: { color: colors.primaryDark, fontWeight: '800' },
      }),
    [colors],
  );

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[shape, styles.image, style as ImageStyle]}
        accessibilityLabel="Profile photo"
        resizeMode="cover"
        fadeDuration={0}
      />
    );
  }

  return (
    <View style={[shape, styles.fallback, style]} accessibilityLabel="Profile">
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.34) }]}>
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

export const Avatar = memo(AvatarComponent);
