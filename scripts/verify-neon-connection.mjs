import pg from 'pg';

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const tables = [
  'User', 'Workspace', 'WorkspaceMember', 'Project', 'Sprint', 'Milestone',
  'Task', 'Stakeholder',
];

console.log('Neon PostgreSQL verification:');
for (const table of tables) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  console.log(`  ${table}: ${rows[0].c}`);
}

const user = await client.query('SELECT email, name, role FROM "User" LIMIT 1');
console.log('\nSample user:', user.rows[0]);

await client.end();
console.log('\nConnection OK');
