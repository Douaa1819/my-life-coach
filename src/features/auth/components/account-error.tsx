import { StyleSheet, View } from 'react-native';

import { Button, ErrorState, LoadingState } from '@/components/ui';
import { spacing, useTheme } from '@/design';
import { useProfile } from '@/features/profile/use-profile';

import { useAuth } from '../auth-provider';

/** Shown instead of guessing a destination when the signed-in user's profile cannot be loaded. */
export function AccountError() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const profile = useProfile();

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: colors.background }]}>
      {profile.isFetching ? (
        <LoadingState label="Loading your account" />
      ) : (
        <ErrorState
          title="We couldn't load your account"
          message="Check your connection and try again."
          onRetry={() => void profile.refetch()}
        />
      )}
      <View style={styles.signOut}>
        <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  signOut: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
});
