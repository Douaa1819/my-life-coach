import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { layout, spacing, useTheme } from '@/design';

import { reviewRows } from '../onboarding-copy';
import { type OnboardingAnswers, type QuestionStep } from '../onboarding.schema';

type ReviewScreenProps = {
  answers: OnboardingAnswers;
  editingLocked: boolean;
  onEdit: (step: QuestionStep) => void;
};

export function ReviewScreen({ answers, editingLocked, onEdit }: ReviewScreenProps) {
  const { colors } = useTheme();
  const rows = reviewRows(answers);

  return (
    <Card>
      {rows.map((row, index) => (
        <View
          key={row.step}
          style={[
            styles.row,
            index < rows.length - 1 && {
              borderBottomColor: colors.border,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}>
          <View style={styles.copy}>
            <Text variant="bodySmall" color="textSecondary">
              {row.label}
            </Text>
            <Text variant="bodyStrong">{row.value}</Text>
          </View>
          <Pressable
            role="button"
            aria-label={`Edit ${row.label}`}
            disabled={editingLocked}
            onPress={() => onEdit(row.step)}
            style={styles.edit}>
            <Text variant="bodyStrong" color="primary">
              Edit
            </Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  edit: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
