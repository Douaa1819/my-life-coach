import { router } from 'expo-router';

import { rootHref } from '@/components/navigation/tab-routes';
import { LoadingState, Screen } from '@/components/ui';

import { getAuthErrorMessage } from '../auth-errors';
import { authRedirectPaths } from '../auth-links';
import { useAuth } from '../auth-provider';
import { AuthFeedback } from '../components/auth-feedback';
import { useAuthLink, useAuthLinkExchange } from '../use-auth-link';

export function VerifyEmailScreen() {
  const { state } = useAuth();
  const link = useAuthLink(authRedirectPaths.verifyEmail);
  const exchange = useAuthLinkExchange(link);

  if (exchange.status === 'pending' || state.status === 'loading') {
    return (
      <Screen scroll={false}>
        <LoadingState label="Confirming your email" />
      </Screen>
    );
  }

  if (
    exchange.status === 'success' ||
    (exchange.status === 'none' && state.status === 'signedIn')
  ) {
    return (
      <AuthFeedback
        icon="verified"
        tone="primary"
        title="Email confirmed"
        message="Your account is ready. Let's plan your first day."
        actionLabel="Continue"
        onAction={() => router.replace(rootHref)}
      />
    );
  }

  if (exchange.status === 'error' && exchange.kind === 'network') {
    return (
      <AuthFeedback
        icon="error"
        tone="danger"
        title="You seem to be offline"
        message={getAuthErrorMessage('network')}
        actionLabel="Back to sign in"
        onAction={() => router.replace('/sign-in')}
      />
    );
  }

  // Opening the link on another device confirms the address but cannot sign in
  // here, so the copy points to signing in rather than claiming a failure.
  return (
    <AuthFeedback
      icon="mail"
      tone="danger"
      title="We couldn't finish signing you in"
      message="Your email may already be confirmed. Try signing in. If that does not work, sign in to request a new link."
      actionLabel="Go to sign in"
      onAction={() => router.replace('/sign-in')}
    />
  );
}
