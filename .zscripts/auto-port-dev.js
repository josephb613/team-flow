/**
 * Script de détection de port libre pour Next.js Dev Server
 *
 * Problème résolu : lorsque le port 3001 est déjà utilisé (EADDRINUSE),
 * ce script trouve automatiquement le premier port libre disponible
 * et démarre Next.js dessus.
 *
 * Améliorations :
 * - Supprime le fichier .next/dev/lock avant de démarrer (évite "Unable to acquire lock")
 * - Tue les processus Next.js obsolètes qui bloquent le port
 * - Nettoie le fichier lock à l'arrêt
 *
 * Usage : node .zscripts/auto-port-dev.js
 * (appelé automatiquement depuis npm run dev)
 */

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const PORT_START = 3002;
const PORT_END = 3010; // On essaie jusqu'à 3010 max
const NEXT_DIR = path.resolve(__dirname, "..");

/**
 * Supprime le fichier de verrouillage .next/dev/lock s'il existe
 */
function cleanLockFile() {
  const lockPath = path.join(NEXT_DIR, ".next", "dev", "lock");
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      console.log("  🧹 Fichier .next/dev/lock supprimé (instance précédente)");
    }
  } catch {
    // Ignorer
  }
}

/**
 * Tue un processus par PID, de manière compatible Windows/Unix
 */
function killProcess(pid) {
  try {
    if (os.platform() === "win32") {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGKILL");
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Tue les processus Next.js obsolètes qui écoutent sur un port donné
 */
function killProcessOnPort(port) {
  try {
    let pid = null;
    if (os.platform() === "win32") {
      const output = execSync(`netstat -ano | findstr ":${port} "`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      for (const line of output.split("\n")) {
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          pid = parseInt(parts[parts.length - 1], 10);
        }
      }
    } else {
      const output = execSync(`lsof -ti:${port} 2>/dev/null`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      pid = parseInt(output.trim(), 10);
    }
    if (pid && !isNaN(pid)) {
      console.log(`  🧹 Processus PID ${pid} tué (occupait le port ${port})`);
      killProcess(pid);
    }
  } catch {
    // Aucun processus trouvé ou erreur
  }
}

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
  // Nettoyage préalable : supprimer le lock file et tuer les processus résiduels
  cleanLockFile();
  killProcessOnPort(PORT_START);
  for (let p = PORT_START + 1; p <= PORT_END; p++) {
    killProcessOnPort(p);
  }

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
  const child = spawn("npx", ["next", "dev", "-p", String(freePort)], {
    cwd: NEXT_DIR,
    stdio: "inherit",
    shell: true,
  });

  // Si Next.js crash avec EADDRINUSE (race condition), on nettoye le lock
  child.on("exit", (code) => {
    if (code !== 0) {
      cleanLockFile();
      if (freePort < PORT_END) {
        console.log(
          `\n⚠️  Port ${freePort} verrouillé entre-temps, relancez la commande.`,
        );
      }
    }
    process.exit(code ?? 0);
  });

  // Nettoyer le fichier lock à l'arrêt du script parent
  const cleanup = () => {
    cleanLockFile();
    child.kill();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
})();
