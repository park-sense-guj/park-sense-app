import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: Props) {
  const { typography } = useTheme();

  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text style={typography.title} maxFontSizeMultiplier={1.4}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[typography.caption, styles.subtitle]} maxFontSizeMultiplier={1.4}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  subtitle: { marginTop: 6 },
});
