import path from 'path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

async function main(): Promise<void> {
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  console.log('Migrations complete');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
