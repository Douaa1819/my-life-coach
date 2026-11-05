import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  InlineMessage,
  LoadingState,
  Screen,
  Text,
  TextField,
} from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';
import { useAuth, useSessionUser } from '@/features/auth/auth-provider';
import { useZodForm } from '@/lib/forms/use-zod-form';
import { DataAccessError } from '@/lib/supabase/data-access-error';

import { DISPLAY_NAME_MAX_LENGTH, type Profile, profileUpdateSchema } from './profile.schema';
import { useProfile, useUpdateProfile } from './use-profile';

function saveErrorMessage(error: unknown) {
  if (error instanceof DataAccessError && error.kind === 'network') {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (error instanceof DataAccessError && error.kind === 'invalid') {
    return 'That name cannot be used. Try a shorter name without special characters.';
  }
  return "We couldn't save your changes. Please try again.";
}

function DisplayNameForm({ profile }: { profile: Profile }) {
  const form = useZodForm(profileUpdateSchema, { displayName: profile.displayName });
  const updateMutation = useUpdateProfile();
  const isUnchanged = form.values.displayName.trim() === profile.displayName;

  function submit() {
    const input = form.validate();
    if (!input || updateMutation.isPending) return;
    updateMutation.mutate(input);
  }

  return (
    <View style={styles.form}>
      <TextField
        label="First name"
        value={form.values.displayName}
        onChangeText={(value) => {
          updateMutation.reset();
          form.setValue('displayName', value);
        }}
        errorText={form.errors.displayName}
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {updateMutation.isError && (
        <InlineMessage tone="danger" message={saveErrorMessage(updateMutation.error)} />
      )}
      {updateMutation.isSuccess && isUnchanged && <InlineMessage tone="success" message="Saved." />}
      <Button
        label="Save"
        variant="secondary"
        disabled={isUnchanged}
        loading={updateMutation.isPending}
        onPress={submit}
      />
    </View>
  );
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const user = useSessionUser();
  const profile = useProfile();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  if (profile.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading your profile" />
      </Screen>
    );
  }

  if (profile.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState
          message="We couldn't load your profile. Check your connection and try again."
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  const data = profile.data;
  const initial = data.displayName.charAt(0).toUpperCase();

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={profile.isRefetching}
          onRefresh={() => void profile.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      <Text variant="title" role="heading">
        Profile
      </Text>

      <Card>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text variant="headline" color="onPrimaryContainer" aria-hidden>
              {initial}
            </Text>
          </View>
          <View style={styles.identityCopy}>
            <Text variant="headline">{data.displayName}</Text>
            {user?.email && (
              <Text variant="caption" color="textSecondary">
                {user.email}
              </Text>
            )}
            <Text variant="caption" color="textTertiary">
              Time zone: {data.timezone}
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <DisplayNameForm key={data.id} profile={data} />
      </Card>

      <Text variant="caption" color="textSecondary">
        Coaching preferences, notifications and privacy settings arrive in a later phase.
      </Text>

      <Button
        variant="secondary"
        icon="signOut"
        label="Sign out"
        fullWidth
        loading={isSigningOut}
        onPress={() => void handleSignOut()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  form: {
    gap: spacing.md,
  },
});
