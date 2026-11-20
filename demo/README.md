# DBMS practical exam

Open a Bash terminal in the project root. Start Docker and prepare the bank before class. The setup command uses the same PostgreSQL database as the commands below.

```bash
docker compose up -d --wait
DATABASE_URL=postgresql://bank_admin:bank_demo@localhost:5433/vault npm run db:setup
bank() { docker compose exec -T postgres psql -X -U bank_admin -d vault -v ON_ERROR_STOP=1 -P pager=off -a "$@"; }
```

Keep this terminal open. The Bash function called `bank` prints each SQL statement and its result. Run the five commands below **one at a time**. To type statements manually, open `docker compose exec postgres psql -U bank_admin -d vault` and paste the corresponding file one statement at a time, including its transaction commands. Type `\q` to leave psql.

## 1. Create tables and change rows

```bash
bank < demo/01-ddl-dml.txt
```

Open the text file in Notepad to show the actual banking schema and seed commands. Point out the foreign key from accounts to customers. The seed creates ten accounts. At the end, CREATE and ALTER define a receipt table, INSERT adds a receipt, UPDATE changes its note and DELETE returns the row it removed. DROP removes the table. The rehearsal runs in its own schema and ROLLBACK undoes it.

## 2. Execute the complex queries

```bash
bank < demo/02-queries.sql
```

Pause after each result during a manual demo. The first five are the core presentation queries.

| Query | What to explain when the rows appear |
|---|---|
| Wealth ranking | The CTE sums each customer’s accounts. DENSE_RANK ranks those totals and gives equal totals the same rank. |
| Above-average balances | The inner SELECT calculates one average across accounts. The outer WHERE keeps balances above it. |
| Branch hierarchy | The recursive CTE starts with the root branch. Each pass joins children to the previous level and extends the path. |
| Daily transfers | GROUP BY produces one total per day. A SUM window accumulates those totals in date order. |
| Latest outgoing transfer | ROW_NUMBER restarts at each sender and counts from the newest transfer. Keeping row 1 gives one result per sending account. |
| Loan instalments | A join supplies the borrower name. The EMI function calculates monthly payment from amount, rate and term. |
| Verified KYC | JSONB containment selects verified customers. Field extraction reads their occupation and risk. |
| Full-text search | The final CLI example tokenizes each narration and matches the word rent. Look for Monthly rent payments. |

## 3. Call a function and observe its trigger

```bash
bank < demo/03-function-trigger.sql
```

Use seeded accounts 1 and 2 while both are active and account 1 has at least ₹100. Read the balances, call transfer_funds and compare the balances again. One falls by ₹100 and the other rises by ₹100. The balance_audit trigger writes two audit rows automatically. ROLLBACK restores the balances for another rehearsal.

## 4. Demonstrate database privileges

```bash
bank < demo/04-privileges.sql
```

The admin creates two temporary demonstration roles within the transaction. GRANT assigns privileges and SET LOCAL ROLE switches the effective database user. Point to current_user on screen. The auditor can read balances but UPDATE reports permission denied. The teller can execute a transfer but DELETE reports permission denied. WHERE false keeps the denial probes harmless. The two errors are expected. Each savepoint lets the demo continue after a denial. The last rollback removes the transfer and roles.

## 5. Query MongoDB

```bash
docker compose exec -T mongo mongosh vault_documents --quiet --file /dev/stdin < demo/05-nosql.js
```

This covers the evaluator’s NoSQL option using independently seeded KYC documents. The nested filter finds Kabir’s pending Student ID. The aggregation expands each document array and counts three verified documents and one pending document on fresh data. The last query searches the text index for loan policies. To type each command yourself, open `docker compose exec mongo mongosh vault_documents`. Type `exit` when finished.
