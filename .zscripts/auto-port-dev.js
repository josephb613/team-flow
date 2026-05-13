/**
 * Script de détection de port libre pour Next.js Dev Server
 *
 * Problème résolu : lorsque le port 3001 est déjà utilisé (EADDRINUSE),
 * ce script trouve automatiquement le premier port libre disponible
 * et démarre Next.js dessus.
 *
 * Usage : node .zscripts/auto-port-dev.js
 * (appelé automatiquement depuis npm run dev)
 */

const { spawn } = require("child_process");
const path = require("path");

const PORT_START = 3001;
const PORT_END = 3010; // On essaie jusqu'à 3010 max

/**
 * Vérifie si un port est disponible.
 * On teste la connexion TCP au lieu de binder, ce qui évite les problèmes
 * d'incompatibilité IPv4/IPv6.
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require("net");
    const socket = new net.Socket();

    socket.once("connect", () => {
      socket.destroy();
      resolve(false); // Port occupé
    });

    socket.once("error", (err) => {
      socket.destroy();
      // ECONNREFUSED = rien n'écoute sur ce port → libre
      if (err.code === "ECONNREFUSED") {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    // Timeout : si personne ne répond, on considère le port disponible
    socket.setTimeout(1000);
    socket.once("timeout", () => {
      socket.destroy();
      resolve(true);
    });

    socket.connect(port, "127.0.0.1");
  });
}

/**
 * Trouve le premier port libre dans l'intervalle [start, end]
 */
async function findFreePort(start, end) {
  for (let port = start; port <= end; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    console.log(`  ⛔ Port ${port} occupé, essai du suivant...`);
  }
  return null; // Aucun port libre trouvé
}

(async () => {
  const freePort = await findFreePort(PORT_START, PORT_END);

  if (freePort === null) {
    console.error(
      `❌ Aucun port libre trouvé entre ${PORT_START} et ${PORT_END}.`,
    );
    console.error(
      "   Utilisez 'netstat -ano | findstr :30' pour lister les processus.",
    );
    process.exit(1);
  }

  if (freePort !== PORT_START) {
    console.log(
      `⚠️  Le port ${PORT_START} est déjà utilisé → redirection vers le port ${freePort}`,
    );
    console.log(`🌐  Accédez à http://localhost:${freePort}\n`);
  } else {
    console.log(`✅ Port ${freePort} disponible. Démarrage de Next.js...\n`);
  }

  // Démarrer Next.js sur le port libre
  const nextDir = path.resolve(__dirname, "..");
  const child = spawn("npx", ["next", "dev", "-p", String(freePort)], {
    cwd: nextDir,
    stdio: "inherit",
    shell: true,
  });

  // Si Next.js crash avec EADDRINUSE (race condition), on réessaie sur +1
  child.on("exit", (code) => {
    if (code !== 0 && freePort < PORT_END) {
      console.log(
        `\n⚠️  Port ${freePort} verrouillé entre-temps, relancez la commande.`,
      );
    }
    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
})();
