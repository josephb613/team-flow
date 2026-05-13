import { QueryClient } from "@tanstack/react-query";

/**
 * Helper de fetch qui reproduit la logique d'extraction de useApiData :
 * - Si la reponse JSON est un tableau → utilise directement
 * - Sinon → deballe response.data, fallback: l'objet entier
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : (json.data ?? json)) as T;
}

let queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}
