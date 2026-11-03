import { StyleSheet, View } from 'react-native';

import { Button, Icon, type IconName, Screen, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';

type AuthFeedbackProps = {
  icon: IconName;
  tone: 'primary' | 'danger';
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  secondaryAction?: { label: string; onPress: () => void };
};

/** Full-screen outcome of an email link: confirmed, expired, offline. */
export function AuthFeedback({
  icon,
  tone,
  title,
  message,
  actionLabel,
  onAction,
  secondaryAction,
}: AuthFeedbackProps) {
  const { colors } = useTheme();
  const isDanger = tone === 'danger';

  return (
    <Screen>
      <View style={styles.centered} role={isDanger ? 'alert' : undefined}>
        <View
          style={[
            styles.badge,
            { backgroundColor: isDanger ? colors.dangerContainer : colors.primaryContainer },
          ]}>
          <Icon name={icon} size={32} color={isDanger ? colors.danger : colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text variant="title" role="heading" align="center">
            {title}
          </Text>
          <Text color="textSecondary" align="center">
            {message}
          </Text>
        </View>
        <Button label={actionLabel} size="lg" fullWidth onPress={onAction} />
        {secondaryAction && (
          <Button variant="ghost" label={secondaryAction.label} onPress={secondaryAction.onPress} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.xs,
    maxWidth: 360,
  },
});
