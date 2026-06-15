import { Database } from 'bun:sqlite';

const db = new Database('db/custom.db');
const tables = db
  .query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name"
  )
  .all();

for (const { name } of tables) {
  const { c } = db.query(`SELECT COUNT(*) as c FROM "${name}"`).get();
  console.log(`${name}: ${c}`);
}

db.close();
