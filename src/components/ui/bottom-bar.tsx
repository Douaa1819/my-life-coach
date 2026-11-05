import { type ReactNode, useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing, useTheme } from '@/design';

type BottomBarProps = {
  /** Usually one large primary button, optionally followed by a ghost button. */
  children: ReactNode;
};

const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/**
 * Fixed action area at the bottom of a screen (docs/ONBOARDING_UX_SPEC.md 3).
 * Place it inside a padding KeyboardAvoidingView: while the keyboard is open,
 * the keyboard already covers the navigation bar, so its inset is dropped.
 */
export function BottomBar({ children }: BottomBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const shown = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const paddingBottom = spacing.md + (keyboardOpen ? 0 : insets.bottom);

  return (
    <View
      testID="bottom-bar"
      style={[
        styles.bar,
        { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom },
      ]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPadding,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.xs,
  },
});
