import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../config/theme';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  return (
    <View
      collapsable={false}
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.pill} collapsable={false}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const color = focused ? '#0F8A4B' : '#8B9598';
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
              style={[styles.item, focused && styles.itemActive]}
            >
              <View>
                {renderedIcon ?? <Ionicons name="ellipse-outline" size={22} color={color} />}
                {options.tabBarBadge != null && Number(options.tabBarBadge) > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{String(options.tabBarBadge)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{String(label)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 40,
    paddingVertical: 6,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  item: {
    width: 78,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    gap: 2,
    paddingVertical: 8,
  },
  itemActive: {
    backgroundColor: '#D8F3E3',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B9598',
  },
  labelActive: {
    color: '#0F8A4B',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.occupied,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
});
