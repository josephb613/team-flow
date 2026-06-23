#!/usr/bin/env node
/**
 * Keep-alive local pour le service Render (plan Free).
 *
 * Ping un endpoint léger à intervalle régulier pour éviter la mise en veille
 * (15 min d'inactivité). Pour économiser le quota mensuel (750h), AUCUN ping
 * n'est envoyé pendant la fenêtre de silence (par défaut 01:00 -> 06:00),
 * ce qui laisse le service dormir ~5h/nuit.
 *
 * Usage :
 *   node scripts/keep-alive.mjs
 *   npm run keep-alive
 *
 * Variables d'environnement (optionnelles) :
 *   KEEPALIVE_URL        URL à pinger (défaut: health de prod)
 *   KEEPALIVE_INTERVAL   Minutes entre deux pings (défaut: 12)
 *   KEEPALIVE_QUIET_START Heure locale de début du silence (défaut: 1)
 *   KEEPALIVE_QUIET_END   Heure locale de fin du silence  (défaut: 6)
 */

const URL =
  process.env.KEEPALIVE_URL || "https://team-flow-vsr5.onrender.com/api/health";
const INTERVAL_MIN = Number(process.env.KEEPALIVE_INTERVAL || 12);
const QUIET_START = Number(process.env.KEEPALIVE_QUIET_START ?? 1); // 01:00
const QUIET_END = Number(process.env.KEEPALIVE_QUIET_END ?? 6); // 06:00
const TIMEOUT_MS = 30_000;

function now() {
  return new Date().toLocaleString("fr-FR");
}

/** Vrai si l'heure locale courante est dans la fenêtre de silence [start, end). */
function isQuietHour(date = new Date()) {
  const h = date.getHours();
  if (QUIET_START === QUIET_END) return false;
  // Fenêtre normale (ex: 1 -> 6)
  if (QUIET_START < QUIET_END) return h >= QUIET_START && h < QUIET_END;
  // Fenêtre qui passe minuit (ex: 23 -> 6)
  return h >= QUIET_START || h < QUIET_END;
}

async function ping() {
  if (isQuietHour()) {
    console.log(
      `[${now()}] 😴 Fenêtre de silence (${QUIET_START}h-${QUIET_END}h) — ping ignoré, le service peut dormir.`
    );
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(URL, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "teamflow-keepalive/1.0" },
      cache: "no-store",
    });
    const ms = Date.now() - start;
    console.log(`[${now()}] ✅ ${res.status} ${res.statusText} en ${ms}ms — ${URL}`);
  } catch (err) {
    const ms = Date.now() - start;
    const reason = err?.name === "AbortError" ? "timeout" : err?.message || err;
    console.log(`[${now()}] ⚠️  Échec après ${ms}ms (${reason}) — réessai au prochain cycle.`);
  } finally {
    clearTimeout(timer);
  }
}

console.log(
  `🚀 Keep-alive démarré\n   Cible      : ${URL}\n   Intervalle : ${INTERVAL_MIN} min\n   Silence    : ${QUIET_START}h -> ${QUIET_END}h (aucun ping)\n   (Ctrl+C pour arrêter)\n`
);

await ping();
setInterval(ping, INTERVAL_MIN * 60_000);
