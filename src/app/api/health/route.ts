import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Point d'entree leger pour les health checks (ConnectionStatus, monitoring).
 * Aucune authentification requise - verifie juste que le serveur Next.js repond.
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: Date.now() },
    { status: 200 },
  );
}

/**
 * HEAD /api/health
 * Support explicite de HEAD pour eviter de passer par le handler GET complet.
 */
export async function HEAD() {
  return new Response(null, { status: 200 });
}
