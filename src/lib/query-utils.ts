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
          // Données métier : restent fraîches 5 minutes
          staleTime: 5 * 60 * 1000,
          // Gardées en cache 30 minutes même après inactivité
          gcTime: 30 * 60 * 1000,
          retry: 1,
          // Pas de refetch au montage si le cache est encore frais
          refetchOnMount: false,
          // Pas de refetch quand l'onglet reprend le focus
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClient;
}
