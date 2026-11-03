import { type ReactNode } from 'react';
import { ScrollView, type ScrollViewProps, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing, useTheme } from '@/design';

type ScreenProps = {
  children: ReactNode;
  /** Scrollable by default. Set to false for screens that fill the viewport. */
  scroll?: boolean;
  /** Apply the top safe-area inset. Disable when a native header already covers it. */
  topInset?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
};

/**
 * Screen frame: background, horizontal padding, readable max width on tablets.
 * The native tab bar applies the bottom inset itself on Android.
 */
export function Screen({ children, scroll = true, topInset = true, refreshControl }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const paddingTop = (topInset ? insets.top : 0) + spacing.md;

  const content = <View style={styles.content}>{children}</View>;

  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background, paddingTop }]}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.lg,
  },
});
