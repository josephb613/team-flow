import { cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const standaloneDir = '.next/standalone';
const staticSrc = '.next/static';
const staticDest = join(standaloneDir, '.next/static');
const publicSrc = 'public';
const publicDest = join(standaloneDir, 'public');

if (!existsSync(standaloneDir)) {
  console.error(
    'Missing .next/standalone. Add `output: "standalone"` to next.config.ts before building.',
  );
  process.exit(1);
}

if (!existsSync(staticSrc)) {
  console.error('Missing .next/static. Run `next build` first.');
  process.exit(1);
}

mkdirSync(join(standaloneDir, '.next'), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });

if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

const prismaEngine = 'node_modules/.prisma';
const prismaClient = 'node_modules/@prisma/client';
const standaloneNodeModules = join(standaloneDir, 'node_modules');

if (existsSync(prismaEngine)) {
  mkdirSync(join(standaloneNodeModules, '.prisma'), { recursive: true });
  cpSync(prismaEngine, join(standaloneNodeModules, '.prisma'), { recursive: true });
}

if (existsSync(prismaClient)) {
  mkdirSync(join(standaloneNodeModules, '@prisma/client'), { recursive: true });
  cpSync(prismaClient, join(standaloneNodeModules, '@prisma/client'), { recursive: true });
}

console.log('Copied static assets into standalone output.');
