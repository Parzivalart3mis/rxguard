import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../rxguard.db');

if (!existsSync(DB_PATH)) {
  console.warn(
    `[db] rxguard.db not found at ${DB_PATH}.\n` +
    `Run "npm run seed" to initialize the database.`
  );
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
