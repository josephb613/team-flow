import { createNeonAuth } from "@neondatabase/auth/next/server";
import { db } from "@/lib/db";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Codes d'erreur réseau Neon Auth qui sont transitoires et méritent un retry
const RETRYABLE_NETWORK_CODES = new Set([
  "NETWORK_TIMEOUT",
  "NETWORK_REFUSED",
  "NETWORK_RESET",
  "NETWORK_DNS",
]);

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000, // délai initial en ms
};

/**
 * Attend un délai donné (promesse).
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Vérifie si l'erreur de réponse Neon Auth est une erreur réseau transitoire.
 */
function isRetryableNetworkError(
  response: { error?: { code?: string } | null }
): boolean {
  return RETRYABLE_NETWORK_CODES.has(response.error?.code ?? "");
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  // Active les logs debug en développement pour mieux diagnostiquer
  logLevel: process.env.NODE_ENV === "production" ? "warn" : "debug",
});

/**
 * Appelle auth.getSession() avec retry automatique sur les erreurs réseau transitoires.
 */
async function getSessionWithRetry(): Promise<{
  data?: { user?: Record<string, unknown>; session?: Record<string, unknown> };
  error?: { code?: string; message?: string } | null;
} | null> {
  let lastError: { code?: string; message?: string } | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[getSessionWithRetry] Tentative ${attempt}/${RETRY_CONFIG.maxRetries} après ${backoffMs}ms (erreur précédente: ${lastError?.code})`
      );
      await delay(backoffMs);
    }

    try {
      const response = await auth.getSession();
      const typedResponse = response as {
        data?: { user?: Record<string, unknown>; session?: Record<string, unknown> };
        error?: { code?: string; message?: string } | null;
      };

      // Si pas d'erreur ou erreur non-réseau (ex: 401), on retourne immédiatement
      if (!typedResponse.error || !isRetryableNetworkError(typedResponse)) {
        return typedResponse;
      }

      lastError = typedResponse.error;
      // Continue la boucle pour retry
    } catch (err) {
      // Erreur inattendue (ex: exception JS), on retente si possible
      lastError = {
        code: "UNEXPECTED",
        message: err instanceof Error ? err.message : String(err),
      };
      console.error("[getSessionWithRetry] Exception inattendue:", err);
    }
  }

  // Toutes les tentatives ont échoué, retourner null pour indiquer l'absence de session
  console.error(
    `[getSessionWithRetry] Échec après ${RETRY_CONFIG.maxRetries + 1} tentatives, dernière erreur: ${lastError?.code}`
  );
  return null;
}

/**
 * Retourne la session Neon Auth courante et synchronise UserProfile.
 */
export async function getAuthSession(): Promise<AuthenticatedUser | null> {
  const response = await getSessionWithRetry();
  if (!response) return null;

  const sessionData = response.data;
  if (!sessionData?.user) return null;

  const neonUser = sessionData.user as {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role?: string | null;
  };

  // Synchronise UserProfile (le crée s'il n'existe pas)
  try {
    const profile = await db.userProfile.upsert({
      where: { neonAuthUserId: neonUser.id },
      update: {
        email: neonUser.email,
        name: neonUser.name,
        avatar: neonUser.image ?? null,
      },
      create: {
        neonAuthUserId: neonUser.id,
        email: neonUser.email,
        name: neonUser.name,
        role: (neonUser.role as string) || "member",
        status: "online",
        avatar: neonUser.image ?? null,
      },
    });

    return {
      id: profile.neonAuthUserId,
      email: neonUser.email,
      name: neonUser.name,
      role: profile.role,
    };
  } catch (dbError) {
    console.error("[getAuthSession] Erreur upsert UserProfile:", dbError);
    // En cas d'erreur DB transitoire, on retourne un utilisateur degrade
    // sans persister le profil - la synchro sera retentee au prochain appel
    return {
      id: neonUser.id,
      email: neonUser.email,
      name: neonUser.name,
      role: (neonUser.role as string) || "member",
    };
  }
}
