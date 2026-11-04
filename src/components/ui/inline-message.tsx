import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/design';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type InlineMessageTone = 'danger' | 'info' | 'success';

const toneIcon: Record<InlineMessageTone, IconName> = {
  danger: 'error',
  info: 'info',
  success: 'verified',
};

/** Form-level feedback. Danger messages are announced by screen readers. */
export function InlineMessage({ tone, message }: { tone: InlineMessageTone; message: string }) {
  const { colors } = useTheme();
  const palette = {
    danger: {
      background: colors.dangerContainer,
      icon: colors.dangerIcon,
      foreground: colors.onDangerContainer,
    },
    info: { background: colors.primaryContainer, icon: colors.brand, foreground: colors.text },
    success: {
      background: colors.successContainer,
      icon: colors.success,
      foreground: colors.successText,
    },
  }[tone];

  return (
    <View
      role={tone === 'danger' ? 'alert' : undefined}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      style={[styles.container, { backgroundColor: palette.background }]}>
      <Icon name={toneIcon[tone]} size={20} color={palette.icon} />
      <Text variant="body" style={[styles.message, { color: palette.foreground }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  message: {
    flex: 1,
  },
});
