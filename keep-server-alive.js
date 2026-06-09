#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');

let restartCount = 0;
const MAX_RESTARTS = 50;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    console.error('Max restarts reached, giving up');
    process.exit(1);
  }
  
  restartCount++;
  const logStream = fs.createWriteStream('/home/z/my-project/dev.log', { flags: 'a' });
  logStream.write(`\n[${new Date().toISOString()}] Starting server (attempt ${restartCount})...\n`);
  
  const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  child.stdout.on('data', (data) => {
    logStream.write(data);
  });

  child.stderr.on('data', (data) => {
    logStream.write(data);
  });

  child.on('exit', (code, signal) => {
    logStream.write(`\n[${new Date().toISOString()}] Server exited with code=${code} signal=${signal}\n`);
    logStream.end();
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    logStream.write(`\n[${new Date().toISOString()}] Failed to start: ${err.message}\n`);
    logStream.end();
    setTimeout(startServer, 3000);
  });
}

// Trap signals to prevent ourselves from being killed
process.on('SIGTERM', () => console.log('Received SIGTERM, ignoring'));
process.on('SIGINT', () => console.log('Received SIGINT, ignoring'));
process.on('SIGHUP', () => console.log('Received SIGHUP, ignoring'));

startServer();

// Keep process alive
setInterval(() => {}, 60000);
