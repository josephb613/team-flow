/**
 * One-time migration: copy all data from db/custom.db (SQLite) to Neon PostgreSQL via pg.
 * Run after `prisma db push` has created the PostgreSQL schema.
 */
import { Database } from 'bun:sqlite';
import pg from 'pg';

const { Client } = pg;
const SQLITE_PATH = 'db/custom.db';

const TABLE_ORDER = [
  'User',
  'Workspace',
  'WorkspaceMember',
  'Project',
  'Sprint',
  'Milestone',
  'Task',
  'TaskDependency',
  'TimeEntry',
  'Risk',
  'Stakeholder',
  'Baseline',
  'ChangeRequest',
  'Subtask',
  'Comment',
  'Channel',
  'ChannelMember',
  'Message',
  'Meeting',
  'MeetingMember',
  'Team',
  'TeamMember',
  'Automation',
  'FileItem',
  'WikiPage',
  'ActivityLog',
];

/** Prisma maps PascalCase models to quoted PascalCase table names in PostgreSQL. */
function quoteIdent(name) {
  return `"${name}"`;
}

const DATETIME_COLUMNS = new Set([
  'createdAt', 'updatedAt', 'dueDate', 'startDate', 'endDate',
  'completedAt', 'joinedAt', 'lastRun', 'date', 'decidedAt',
]);

function toPgValue(value, columnName) {
  if (value === null || value === undefined) return null;
  if (
    columnName === 'completed' ||
    columnName === 'enabled' ||
    columnName === 'billable'
  ) {
    return Boolean(value);
  }
  if (DATETIME_COLUMNS.has(columnName)) {
    if (typeof value === 'number' && value > 1e11) {
      return new Date(value).toISOString();
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value;
    }
  }
  return value;
}

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const counts = {};

  try {
    for (const table of TABLE_ORDER) {
      const rows = sqlite.query(`SELECT * FROM "${table}"`).all();
      counts[table] = rows.length;
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const colList = columns.map(quoteIdent).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      for (const row of rows) {
        const values = columns.map((col) => toPgValue(row[col], col));
        await client.query(
          `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      }
      console.log(`✓ ${table}: ${rows.length} rows`);
    }

    console.log('\nMigration complete. Non-empty tables:');
    for (const [table, count] of Object.entries(counts)) {
      if (count > 0) console.log(`  ${table}: ${count}`);
    }
  } finally {
    sqlite.close();
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
