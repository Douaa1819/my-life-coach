import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { rootHref } from '@/components/navigation/tab-routes';
import { Button, InlineMessage, LoadingState, PasswordField, Screen } from '@/components/ui';
import { useZodForm } from '@/lib/forms/use-zod-form';

import { updatePassword } from '../auth.api';
import { classifyAuthError, getAuthErrorMessage } from '../auth-errors';
import { authRedirectPaths } from '../auth-links';
import { useAuth } from '../auth-provider';
import { resetPasswordSchema } from '../auth.schema';
import { AuthFeedback } from '../components/auth-feedback';
import { AuthScreen } from '../components/auth-screen';
import { useAuthLink, useAuthLinkExchange } from '../use-auth-link';

export function ResetPasswordScreen() {
  const { state, completeRecovery, signOut } = useAuth();
  const link = useAuthLink(authRedirectPaths.resetPassword);
  const exchange = useAuthLinkExchange(link);
  const form = useZodForm(resetPasswordSchema, { password: '' });
  const updateMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: completeRecovery,
  });
  const errorKind = updateMutation.error ? classifyAuthError(updateMutation.error) : null;

  function submit() {
    const input = form.validate();
    if (!input || updateMutation.isPending) return;
    updateMutation.mutate(input);
  }

  async function cancel() {
    await signOut();
    router.replace('/welcome');
  }

  if (updateMutation.isSuccess) {
    return (
      <AuthFeedback
        icon="verified"
        tone="primary"
        title="Password updated"
        message="You are signed in with your new password."
        actionLabel="Continue"
        onAction={() => router.replace(rootHref)}
      />
    );
  }

  if (exchange.status === 'pending' || state.status === 'loading') {
    return (
      <Screen scroll={false}>
        <LoadingState label="Checking your link" />
      </Screen>
    );
  }

  if (exchange.status === 'error' || state.status !== 'signedIn') {
    const isOffline = exchange.status === 'error' && exchange.kind === 'network';
    return (
      <AuthFeedback
        icon={isOffline ? 'error' : 'key'}
        tone="danger"
        title={isOffline ? 'You seem to be offline' : 'This link no longer works'}
        message={isOffline ? getAuthErrorMessage('network') : getAuthErrorMessage('linkExpired')}
        actionLabel="Request a new link"
        onAction={() => router.replace('/forgot-password')}
        secondaryAction={{ label: 'Back to sign in', onPress: () => router.replace('/sign-in') }}
      />
    );
  }

  return (
    <AuthScreen
      topInset
      title="Choose a new password"
      subtitle="Use something you have not used here before."
      footer={<Button variant="ghost" label="Cancel and sign out" onPress={() => void cancel()} />}>
      {errorKind && <InlineMessage tone="danger" message={getAuthErrorMessage(errorKind)} />}
      <PasswordField
        purpose="new"
        label="New password"
        value={form.values.password}
        onChangeText={(value) => form.setValue('password', value)}
        errorText={form.errors.password}
        helperText="At least 8 characters, with a letter and a number."
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button
        label="Save new password"
        size="lg"
        fullWidth
        loading={updateMutation.isPending}
        onPress={submit}
      />
    </AuthScreen>
  );
}
