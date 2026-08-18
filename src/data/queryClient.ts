import { QueryClient } from '@tanstack/react-query';

/**
 * Reference data is immutable at runtime (SPEC §3.1): fetch once, never refetch
 * on focus/reconnect. IndexedDB persistence + a schema_version invalidation land
 * in Phase 5; for now an in-memory client with an infinite stale time is enough.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});
