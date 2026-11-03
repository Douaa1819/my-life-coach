import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/design';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type Action = { label: string; onPress: () => void };

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.centered} aria-busy role="progressbar" aria-label={label}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

type MessageStateProps = {
  title: string;
  message: string;
  icon?: IconName;
  action?: Action;
};

export function EmptyState({ title, message, icon = 'empty', action }: MessageStateProps) {
  return (
    <MessageState title={title} message={message} icon={icon} action={action} tone="primary" />
  );
}

/**
 * Show a calm, user-facing message here. Never pass raw error messages from the
 * network or the database: they can leak internals.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again in a moment.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <MessageState
      title={title}
      message={message}
      icon="error"
      tone="danger"
      action={onRetry ? { label: 'Try again', onPress: onRetry } : undefined}
    />
  );
}

function MessageState({
  title,
  message,
  icon,
  action,
  tone,
}: Required<Pick<MessageStateProps, 'icon'>> & MessageStateProps & { tone: 'primary' | 'danger' }) {
  const { colors } = useTheme();
  const iconBackground = tone === 'danger' ? colors.dangerContainer : colors.primaryContainer;
  const iconColor = tone === 'danger' ? colors.danger : colors.primary;

  return (
    <View style={styles.centered} role={tone === 'danger' ? 'alert' : undefined}>
      <View style={[styles.iconBadge, { backgroundColor: iconBackground }]}>
        <Icon name={icon} size={28} color={iconColor} />
      </View>
      <View style={styles.copy}>
        <Text variant="headline" align="center">
          {title}
        </Text>
        <Text color="textSecondary" align="center">
          {message}
        </Text>
      </View>
      {action && <Button label={action.label} onPress={action.onPress} variant="secondary" />}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.xs,
    maxWidth: 360,
  },
});
