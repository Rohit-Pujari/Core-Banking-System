import { getDb } from '../lib/db.mjs';
import readline from 'node:readline/promises';
const db = await getDb();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
console.log('Vault SQL console. One SQL statement per line. Type exit to quit. Stop Next.js first when using PGlite.');
try {
  for (;;) {
    const sql = await rl.question('vault> ');
    if (sql.trim() === 'exit') break;
    try {
      console.table((await db.query(sql)).rows);
    } catch (e) {
      console.error(e.message);
    }
  }
} finally {
  rl.close();
  await db.close();
}
