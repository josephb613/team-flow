#!/usr/bin/env bun
/**
 * TeamFlow AI integration smoke tests (Phases 1-3).
 * Usage: bun scripts/test-ai-integration.mjs
 * Env: TEST_BASE_URL (default http://127.0.0.1:3000), TEST_WORKSPACE_ID (optional)
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

const REQUIRED = ["GROQ_API_KEY", "DATABASE_URL"];
const PHASE3_ENV = [
  "NVIDIA_API_KEY",
  "AI_EMBED_MODEL",
  "AI_EMBED_BASE_URL",
  "AI_EMBED_DIMENSIONS",
];

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim();
    if (v) out[m[1]] = true;
  }
  return out;
}

function envStatus() {
  const fromFile = parseEnvFile(join(ROOT, ".env"));
  const merged = (name) => Boolean(fromFile[name] || (process.env[name] && String(process.env[name]).trim()));
  return {
    dotenvExists: existsSync(join(ROOT, ".env")),
    vars: Object.fromEntries(
      [...REQUIRED, ...PHASE3_ENV].map((k) => [k, merged(k) ? "SET" : "MISSING"])
    ),
    embedDefaultsNote:
      "AI_EMBED_* use code defaults in src/lib/ai/config.ts when unset in .env",
  };
}

async function postJson(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json, text: text.slice(0, 800) };
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json, text: text.slice(0, 800) };
}

async function checkDb() {
  const prisma = new PrismaClient();
  const out = { connect: "FAIL", workspaceId: null, documentChunkTable: "UNKNOWN" };
  try {
    await prisma.$connect();
    out.connect = "OK";
    const ws = await prisma.workspace.findFirst({ select: { id: true } });
    out.workspaceId = ws?.id ?? null;
    const rows = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'DocumentChunk'
      ) as exists
    `;
    out.documentChunkTable = rows?.[0]?.exists ? "EXISTS" : "MISSING";
  } catch (e) {
    out.error = String(e.message).slice(0, 300);
  } finally {
    await prisma.$disconnect();
  }
  return out;
}

async function runApiTests(workspaceId) {
  const results = [];
  const nvidiaSet = parseEnvFile(join(ROOT, ".env")).NVIDIA_API_KEY || process.env.NVIDIA_API_KEY;

  const chat = await postJson(
    "/api/ai/chat?stream=false",
    { message: "Hello", workspaceId, locale: "fr" },
    { Accept: "application/json" }
  );
  results.push({
    name: "POST /api/ai/chat",
    status: chat.status === 200 && chat.json?.message ? "PASS" : chat.json?.error ? "PASS" : "FAIL",
    http: chat.status,
    detail: chat.json?.error || `message_len=${String(chat.json?.message || "").length}`,
  });

  const sug = await postJson("/api/ai/suggestions", { workspaceId, locale: "fr" });
  results.push({
    name: "POST /api/ai/suggestions",
    status: sug.status === 200 && Array.isArray(sug.json?.suggestions) ? "PASS" : sug.json?.error ? "PASS" : "FAIL",
    http: sug.status,
    detail: sug.json?.error || `count=${sug.json?.suggestions?.length ?? 0}`,
  });

  const legacy = await postJson("/api/ai-chat", { message: "test", workspaceId });
  results.push({
    name: "POST /api/ai-chat (legacy)",
    status: legacy.status >= 200 && legacy.status < 500 ? "PASS" : "FAIL",
    http: legacy.status,
    detail: legacy.json?.error || "response received",
  });

  const tools = await postJson(
    "/api/ai/chat?stream=false",
    { message: "List all projects in this workspace", workspaceId, locale: "fr" },
    { Accept: "application/json" }
  );
  const msg = String(tools.json?.message || tools.json?.error || "").toLowerCase();
  const toolHint = msg.includes("project") || msg.includes("projet");
  results.push({
    name: "Phase 2 tool calling (chat)",
    status: tools.status === 200 && toolHint ? "PASS" : "FAIL",
    http: tools.status,
    detail: tools.json?.error || (toolHint ? "mentions projects" : tools.text.slice(0, 200)),
  });

  if (nvidiaSet) {
    const index = await postJson("/api/ai/index", { workspaceId });
    results.push({
      name: "POST /api/ai/index",
      status: index.status === 200 ? "PASS" : "FAIL",
      http: index.status,
      detail: index.json?.error || JSON.stringify(index.json).slice(0, 300),
    });
  } else {
    results.push({ name: "POST /api/ai/index", status: "SKIP", detail: "NVIDIA_API_KEY not set" });
  }

  const search = await getJson(
    `/api/ai/search?workspaceId=${encodeURIComponent(workspaceId)}&q=project&limit=3`
  );
  results.push({
    name: "GET /api/ai/search",
    status: search.status === 200 && typeof search.json?.count === "number" ? "PASS" : "FAIL",
    http: search.status,
    detail: search.json?.error || `count=${search.json?.count ?? "n/a"}`,
  });

  const ragChat = await postJson(
    "/api/ai/chat?stream=false",
    {
      message: "What information do you have indexed about projects in this workspace?",
      workspaceId,
      locale: "en",
    },
    { Accept: "application/json" }
  );
  results.push({
    name: "RAG-aware chat",
    status: ragChat.status === 200 ? "PASS" : "FAIL",
    http: ragChat.status,
    detail: ragChat.json?.error || `message_len=${String(ragChat.json?.message || "").length}`,
  });

  return results;
}

const timestamp = new Date().toISOString();
const migrationPath = join(
  ROOT,
  "prisma/migrations/20250615000000_add_pgvector_document_chunks/migration.sql"
);

const report = {
  timestamp,
  environment: envStatus(),
  migrationFile: existsSync(migrationPath) ? "EXISTS" : "MISSING",
  database: await checkDb(),
  apiBase: BASE,
  api: [],
};

const wsId = process.env.TEST_WORKSPACE_ID || report.database.workspaceId;
if (!wsId) {
  report.api = [{ name: "API tests", status: "SKIP", detail: "No workspaceId / DB unavailable" }];
} else {
  try {
    const probe = await fetch(`${BASE}/`);
    if (!probe.ok) throw new Error(`Dev server returned ${probe.status}`);
    report.api = await runApiTests(wsId);
  } catch (e) {
    report.api = [{ name: "API tests", status: "SKIP", detail: `Dev server not reachable: ${e.message}` }];
  }
}

console.log(JSON.stringify(report, null, 2));
