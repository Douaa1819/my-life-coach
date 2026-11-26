import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing } from '@/design';

type HomeHeaderProps = {
  greeting: string;
  /** Null while the profile loads or if it cannot be read. */
  firstName: string | null;
  dateLabel: string;
};

export function HomeHeader({ greeting, firstName, dateLabel }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <Text variant="overline" color="textSecondary">
        {dateLabel}
      </Text>
      <Text variant="display" role="heading">
        {firstName ? `${greeting}, ${firstName}` : greeting}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
});
