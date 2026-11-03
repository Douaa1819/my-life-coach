import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, type TextInputInstance, View } from 'react-native';

import { Button, InlineMessage, PasswordField, TextField } from '@/components/ui';
import { useZodForm } from '@/lib/forms/use-zod-form';

import { resendVerificationEmail, signIn } from '../auth.api';
import { classifyAuthError, getAuthErrorMessage } from '../auth-errors';
import { useAuth } from '../auth-provider';
import { signInSchema } from '../auth.schema';
import { AuthScreen } from '../components/auth-screen';

export function SignInScreen() {
  const { state } = useAuth();
  const passwordRef = useRef<TextInputInstance>(null);
  const form = useZodForm(signInSchema, { email: '', password: '' });
  const signInMutation = useMutation({ mutationFn: signIn });
  const resendMutation = useMutation({ mutationFn: resendVerificationEmail });

  const errorKind = signInMutation.error ? classifyAuthError(signInMutation.error) : null;

  function submit() {
    const input = form.validate();
    if (!input || signInMutation.isPending) return;
    resendMutation.reset();
    // On success the navigation guard moves the user into the app.
    signInMutation.mutate(input);
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <Button
          variant="ghost"
          label="New here? Create an account"
          onPress={() => router.replace('/sign-up')}
        />
      }>
      {state.notice === 'sessionExpired' && !errorKind && (
        <InlineMessage tone="info" message={getAuthErrorMessage('sessionExpired')} />
      )}
      {errorKind && <InlineMessage tone="danger" message={getAuthErrorMessage(errorKind)} />}
      {errorKind === 'emailNotConfirmed' &&
        (resendMutation.isSuccess ? (
          <InlineMessage
            tone="success"
            message="We sent a new confirmation link. Check your inbox."
          />
        ) : (
          <Button
            variant="secondary"
            icon="mail"
            label="Send a new confirmation link"
            loading={resendMutation.isPending}
            onPress={() => resendMutation.mutate(form.values.email.trim().toLowerCase())}
          />
        ))}

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
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordField
        ref={passwordRef}
        purpose="current"
        label="Password"
        value={form.values.password}
        onChangeText={(value) => form.setValue('password', value)}
        errorText={form.errors.password}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <View style={styles.forgot}>
        <Button
          variant="ghost"
          label="Forgot password?"
          onPress={() => router.push('/forgot-password')}
        />
      </View>
      <Button
        label="Sign in"
        size="lg"
        fullWidth
        loading={signInMutation.isPending}
        onPress={submit}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignItems: 'flex-end',
    marginTop: -8,
  },
});
