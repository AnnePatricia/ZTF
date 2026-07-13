// src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 10,
            gcTime: 1000 * 60 * 30,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* ✅ Position en bas à GAUCHE pour éviter l'IA (en bas à droite) */}
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="bottom-left"  // ✅ Déplace le bouton en bas à gauche
        position="bottom"
      />
    </QueryClientProvider>
  );
}