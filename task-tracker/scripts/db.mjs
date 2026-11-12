/**
 * node scripts/db.mjs reset   → (re)build db.json from db.seed.json (all changes are lost)
 * node scripts/db.mjs ensure  → build db.json only if it does not exist yet (used by "npm run api")
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildDb, toLocalDateString } from './seed.mjs';

const seedPath = fileURLToPath(new URL('../db.seed.json', import.meta.url));
const dbPath = fileURLToPath(new URL('../db.json', import.meta.url));

const mode = process.argv[2];
if (mode !== 'reset' && mode !== 'ensure') {
  console.error('Usage: node scripts/db.mjs reset|ensure');
  process.exit(1);
}

if (mode === 'ensure' && existsSync(dbPath)) {
  console.log('db.json already exists, keeping your data. (npm run db:reset starts over.)');
} else {
  const today = toLocalDateString(new Date());
  const db = buildDb(JSON.parse(readFileSync(seedPath, 'utf8')), today);
  writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`);
  console.log(`db.json built from db.seed.json with ${db.tasks.length} tasks (today = ${today}).`);
}
