import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef } from 'react';
import { type TextInputInstance } from 'react-native';

import { Button, InlineMessage, PasswordField, Text, TextField } from '@/components/ui';
import { DISPLAY_NAME_MAX_LENGTH } from '@/features/profile/profile.schema';
import { useZodForm } from '@/lib/forms/use-zod-form';

import { signUp } from '../auth.api';
import { classifyAuthError, getAuthErrorMessage } from '../auth-errors';
import { signUpSchema } from '../auth.schema';
import { AuthScreen } from '../components/auth-screen';

export function SignUpScreen() {
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const form = useZodForm(signUpSchema, { displayName: '', email: '', password: '' });
  const signUpMutation = useMutation({
    mutationFn: signUp,
    // Same outcome whether or not the address already has an account.
    onSuccess: (_result, input) =>
      router.replace({ pathname: '/check-email', params: { email: input.email } }),
  });

  const errorKind = signUpMutation.error ? classifyAuthError(signUpMutation.error) : null;

  function submit() {
    const input = form.validate();
    if (!input || signUpMutation.isPending) return;
    signUpMutation.mutate(input);
  }

  return (
    <AuthScreen
      title="Create your account"
      subtitle="A few details and you are ready to plan your first day."
      footer={
        <Button
          variant="ghost"
          label="Already have an account? Sign in"
          onPress={() => router.replace('/sign-in')}
        />
      }>
      {errorKind && <InlineMessage tone="danger" message={getAuthErrorMessage(errorKind)} />}

      <TextField
        label="First name"
        value={form.values.displayName}
        onChangeText={(value) => form.setValue('displayName', value)}
        errorText={form.errors.displayName}
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        value={form.values.email}
        onChangeText={(value) => form.setValue('email', value)}
        errorText={form.errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordField
        ref={passwordRef}
        purpose="new"
        label="Password"
        value={form.values.password}
        onChangeText={(value) => form.setValue('password', value)}
        errorText={form.errors.password}
        helperText="At least 8 characters, with a letter and a number."
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button
        label="Create account"
        size="lg"
        fullWidth
        loading={signUpMutation.isPending}
        onPress={submit}
      />
      <Text variant="caption" color="textSecondary" align="center">
        We will send a link to confirm your email address.
      </Text>
    </AuthScreen>
  );
}
