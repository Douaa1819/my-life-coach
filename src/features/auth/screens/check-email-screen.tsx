import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, InlineMessage, Text } from '@/components/ui';
import { radius, useTheme } from '@/design';

import { resendVerificationEmail } from '../auth.api';
import { classifyAuthError, getAuthErrorMessage } from '../auth-errors';
import { emailSchema } from '../auth.schema';
import { AuthScreen } from '../components/auth-screen';

/** Matches the Auth email frequency limit, so the button never offers a request that fails. */
const RESEND_COOLDOWN_SECONDS = 60;

export function CheckEmailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = emailSchema.safeParse(params.email ?? '').data ?? null;
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => setSecondsLeft(RESEND_COOLDOWN_SECONDS),
  });
  const errorKind = resendMutation.error ? classifyAuthError(resendMutation.error) : null;

  return (
    <AuthScreen
      title="Check your inbox"
      subtitle={
        email
          ? `We sent a confirmation link to ${email}. Open it on this phone to finish setting up your account.`
          : 'We sent you a confirmation link. Open it on this phone to finish setting up your account.'
      }
      footer={
        <Button
          variant="ghost"
          label="Back to sign in"
          onPress={() => router.replace('/sign-in')}
        />
      }>
      <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
        <Icon name="mail" size={32} color={colors.primary} />
      </View>
      <Text color="textSecondary">
        If you already have an account with this address, sign in instead. The link expires after
        one hour.
      </Text>

      {resendMutation.isSuccess && (
        <InlineMessage tone="success" message="A new link is on its way." />
      )}
      {errorKind && <InlineMessage tone="danger" message={getAuthErrorMessage(errorKind)} />}

      {email && (
        <Button
          variant="secondary"
          icon="retry"
          label={secondsLeft > 0 ? `Resend link in ${secondsLeft}s` : 'Resend link'}
          disabled={secondsLeft > 0}
          loading={resendMutation.isPending}
          onPress={() => resendMutation.mutate(email)}
        />
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
