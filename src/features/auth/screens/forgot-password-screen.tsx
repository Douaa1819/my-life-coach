import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Button, InlineMessage, TextField } from '@/components/ui';
import { useZodForm } from '@/lib/forms/use-zod-form';

import { requestPasswordReset } from '../auth.api';
import { classifyAuthError, getAuthErrorMessage } from '../auth-errors';
import { forgotPasswordSchema } from '../auth.schema';
import { AuthScreen } from '../components/auth-screen';

export function ForgotPasswordScreen() {
  const form = useZodForm(forgotPasswordSchema, { email: '' });
  const resetMutation = useMutation({ mutationFn: requestPasswordReset });
  const errorKind = resetMutation.error ? classifyAuthError(resetMutation.error) : null;

  function submit() {
    const input = form.validate();
    if (!input || resetMutation.isPending) return;
    resetMutation.mutate(input);
  }

  if (resetMutation.isSuccess) {
    return (
      <AuthScreen
        title="Check your inbox"
        subtitle={`If an account exists for ${resetMutation.variables.email}, we sent a link to choose a new password. Open it on this phone.`}
        footer={
          <Button
            variant="ghost"
            label="Back to sign in"
            onPress={() => router.replace('/sign-in')}
          />
        }>
        <InlineMessage tone="info" message="The link expires after one hour and works once." />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="Enter the email you signed up with. We will send you a link to choose a new password.">
      {errorKind && <InlineMessage tone="danger" message={getAuthErrorMessage(errorKind)} />}
      <TextField
        label="Email"
        value={form.values.email}
        onChangeText={(value) => form.setValue('email', value)}
        errorText={form.errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Button
        label="Send reset link"
        size="lg"
        fullWidth
        loading={resetMutation.isPending}
        onPress={submit}
      />
    </AuthScreen>
  );
}
