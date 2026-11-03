import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useTheme } from '@/design';
import { toNavigationTheme } from '@/design/navigation-theme';
import { createQueryClient } from '@/lib/query/query-client';
import { useAppFocusRefetch } from '@/lib/query/use-app-focus';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const theme = useTheme();
  useAppFocusRefetch();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={toNavigationTheme(theme)}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
