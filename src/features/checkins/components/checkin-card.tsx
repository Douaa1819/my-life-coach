import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { fontFamilies, spacing, useTheme } from '@/design';

import { useDeleteCheckin, useSaveCheckin, useTodayCheckin } from '../use-checkins';
import { CheckinForm } from './checkin-form';

/**
 * An optional, quiet check-in. Skipping costs nothing: no XP is lost, nothing is flagged and
 * the card simply stays small. Checking in earns no XP either, so there is no reason to
 * answer anything that is not true.
 */
export function CheckinCard({ localDate }: { localDate: string }) {
  const { colors } = useTheme();
  const today = useTodayCheckin(localDate);
  const save = useSaveCheckin();
  const remove = useDeleteCheckin();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (today.isPending || today.isError) return null;
  const saved = today.data;

  if (open) {
    return (
      <Card tone="muted">
        <Text variant="headline" style={styles.title}>
          How are you today?
        </Text>
        <CheckinForm
          initial={saved}
          saving={save.isPending}
          errorMessage={save.isError ? "We couldn't save that. Please try again." : undefined}
          onCancel={() => setOpen(false)}
          onSubmit={(input) =>
            save.mutate(input, {
              onSuccess: () => {
                save.reset();
                setOpen(false);
              },
            })
          }
        />
      </Card>
    );
  }

  if (saved) {
    return (
      <Card padding="md">
        <View style={styles.row}>
          <Text variant="bodyStrong" style={styles.grow}>
            Thanks for checking in.
          </Text>
          <TextAction label="Change" onPress={() => setOpen(true)} />
          <TextAction
            label="Delete"
            onPress={() => remove.mutate(saved.id)}
            color={colors.textSecondary}
          />
        </View>
      </Card>
    );
  }

  if (dismissed) return null;

  return (
    <Card padding="md">
      <View style={styles.stack}>
        <Text variant="bodyStrong">How are you today?</Text>
        <Text variant="bodySmall" color="textSecondary">
          A minute to notice how you feel. Totally optional.
        </Text>
        <View style={styles.row}>
          <Button label="Check in" variant="tonal" onPress={() => setOpen(true)} />
          <Button label="Not today" variant="ghost" onPress={() => setDismissed(true)} />
        </View>
      </View>
    </Card>
  );
}

function TextAction({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={styles.textAction}>
      <Text
        variant="bodySmall"
        style={{ color: color ?? colors.primary, fontFamily: fontFamilies.bold }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.sm,
  },
  stack: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  textAction: {
    minHeight: 32,
    justifyContent: 'center',
  },
});
