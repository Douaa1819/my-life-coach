import { StyleSheet, View } from 'react-native';

import { EmptyState, type IconName, Screen, Text } from '@/components/ui';
import { spacing } from '@/design';

type ComingSoonScreenProps = {
  title: string;
  description: string;
  icon: IconName;
  /** False when a native stack header already shows the title. */
  showTitle?: boolean;
};

/** Placeholder for sections that are routed but not built yet. */
export function ComingSoonScreen({
  title,
  description,
  icon,
  showTitle = true,
}: ComingSoonScreenProps) {
  return (
    <Screen topInset={showTitle}>
      {showTitle && (
        <View style={styles.header}>
          <Text variant="title" role="heading">
            {title}
          </Text>
        </View>
      )}
      <EmptyState icon={icon} title="Coming in a later phase" message={description} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xs,
  },
});
