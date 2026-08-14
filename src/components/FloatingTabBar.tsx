import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useContext, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const lastHeight = useRef(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'center',
          paddingTop: 4,
          backgroundColor: colors.background,
        },
        pillShadow: {
          width: '88%',
          maxWidth: 360,
          borderRadius: 36,
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#000000' : '#0F766E',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.35 : 0.12,
              shadowRadius: 18,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 36,
          paddingVertical: 7,
          paddingHorizontal: 8,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.glassBorder,
          backgroundColor: isDark ? colors.tabPill : colors.white,
        },
        item: {
          flex: 1,
          minHeight: 54,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 28,
          gap: 3,
          paddingVertical: 8,
          paddingHorizontal: 6,
        },
        itemActive: {
          backgroundColor: colors.tabActive,
        },
        label: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.tabInactive,
          letterSpacing: 0.1,
        },
        labelActive: {
          color: colors.tabActiveText,
          fontWeight: '700',
        },
        badge: {
          position: 'absolute',
          top: -5,
          right: -11,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.occupied,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
        },
        badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
      }),
    [colors, isDark],
  );

  const pillContent = (
    <>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;
        const color = focused ? colors.tabActiveText : colors.tabInactive;
        const renderedIcon = options.tabBarIcon?.({
          focused,
          color,
          size: 22,
        });

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={String(label)}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={({ pressed }) => [
              styles.item,
              focused && styles.itemActive,
              pressed && { opacity: 0.9 },
            ]}
          >
            <View>
              {renderedIcon ?? <Ionicons name="ellipse-outline" size={22} color={color} />}
              {options.tabBarBadge != null && Number(options.tabBarBadge) > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{String(options.tabBarBadge)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
              {String(label)}
            </Text>
          </Pressable>
        );
      })}
    </>
  );

  return (
    <View
      collapsable={false}
      onLayout={(event) => {
        const height = event.nativeEvent.layout.height;
        if (height > 0 && height !== lastHeight.current) {
          lastHeight.current = height;
          onHeightChange?.(height);
        }
      }}
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}
    >
      <View style={styles.pillShadow} collapsable={false}>
        {Platform.OS === 'ios' && isDark ? (
          <BlurView intensity={28} tint="dark" style={styles.pill}>
            {pillContent}
          </BlurView>
        ) : (
          <View style={styles.pill}>{pillContent}</View>
        )}
      </View>
    </View>
  );
}
