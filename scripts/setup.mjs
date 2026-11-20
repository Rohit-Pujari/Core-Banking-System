import { getDb } from '../lib/db.mjs';
const db = await getDb();
console.log('Database initialized with fictional sample data.');
console.log((await db.query('SELECT count(*) AS accounts,sum(balance) AS deposits FROM accounts')).rows);
await db.close();
