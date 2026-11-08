// One QueryClient for the app: cached reads, retries only for network and server errors,
// and helpers to prefetch a route's data when the visitor shows intent (hover, focus, touch).
import { QueryClient } from '@tanstack/react-query';
import { ApiError, getConfig } from './api';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (count, err) => count < 2 && (!(err instanceof ApiError) || err.status === 0 || err.status >= 500),
      },
      mutations: { retry: false },
    },
  });
}

// Query keys and fetchers in one place so prefetch and useQuery always agree.
export const queries = {
  config: { queryKey: ['config'] as const, queryFn: ({ signal }: { signal: AbortSignal }) => getConfig(signal), staleTime: 5 * 60_000 },
};
