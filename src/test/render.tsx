import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { type ReactElement, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function renderWithProviders(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  function TestProviders({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  return render(element, { wrapper: TestProviders });
}
