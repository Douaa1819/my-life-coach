import { type ReactNode } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { spacing } from '@/design';

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** False when a native stack header already covers the status bar. */
  topInset?: boolean;
};

/**
 * Frame for every auth form. "padding" is used on both platforms: with Android
 * edge-to-edge the window is not resized for the keyboard, and when it is, the
 * computed overlap is zero so no padding is added twice.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  topInset = false,
}: AuthScreenProps) {
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <Screen topInset={topInset}>
        <View style={styles.header}>
          <Text variant="title" role="heading">
            {title}
          </Text>
          {subtitle && <Text color="textSecondary">{subtitle}</Text>}
        </View>
        <View style={styles.body}>{children}</View>
        {footer && <View style={styles.footer}>{footer}</View>}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    gap: spacing.xs,
  },
  body: {
    gap: spacing.md,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
});
