import { router } from 'expo-router';

import { rootHref } from '@/components/navigation/tab-routes';
import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundRoute() {
  return (
    <Screen topInset={false}>
      <EmptyState
        icon="empty"
        title="This page doesn't exist"
        message="The link may be out of date."
        action={{ label: 'Back to today', onPress: () => router.replace(rootHref) }}
      />
    </Screen>
  );
}
