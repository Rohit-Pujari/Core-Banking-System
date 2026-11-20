# DBMS practical exam

Start Docker. Open **Bash** in the project folder and run these commands once before presenting.

```bash
npm run db:setup
docker compose up -d mongo
```

Wait for the account count and deposits total. If you see `ECONNREFUSED 127.0.0.1:3307`, check `docker compose ps mysql` and rerun setup before opening the app.

| Evaluator asks for | File to open |
|---|---|
| DDL and DML in Notepad | [01-ddl-dml.txt](01-ddl-dml.txt) |
| Five or more complex queries | [02-queries.sql](02-queries.sql) |
| Function and trigger | [03-function-trigger.sql](03-function-trigger.sql) |
| Database users and privileges | [04-privileges.sql](04-privileges.sql) |
| NoSQL | [05-nosql.js](05-nosql.js) |

**To present one statement at a time**, type `npm run db:cli` in Bash. At the `mysql>` prompt, try:

```sql
SELECT DATABASE(), CURRENT_USER();
SHOW TABLES;
DESCRIBE accounts;
```

You should see database `vault` and the columns of `accounts`. For sections 2 and 3, copy one complete SQL statement from the numbered file, including its final semicolon, and press Enter. Read the result before pasting the next one. Type `exit` to return to Bash. Sections 1, 4 and 5 use their own database or login as shown below.

For a quicker rehearsal, define this shortcut in Bash. The commands beginning with `bank <` run a whole file and print both the statements and results.

```bash
bank() { docker compose exec -T mysql mysql -v -ubank_admin -pbank_demo vault "$@"; }
```

## 1. Create tables and change rows

```bash
docker compose exec -T mysql mysql -uroot -pvault_root_demo -e 'CREATE DATABASE vault_rehearsal'
docker compose exec -T mysql mysql -v -uroot -pvault_root_demo vault_rehearsal < demo/01-ddl-dml.txt
docker compose exec -T mysql mysql -uroot -pvault_root_demo -e 'DROP DATABASE vault_rehearsal'
```

Open the text file in Notepad to show the actual banking schema and seed commands. Point out the foreign key from accounts to customers. The seed creates ten accounts. At the end, CREATE defines a receipt table, INSERT adds a receipt, UPDATE changes its note and DELETE removes it. DROP removes the table. Use a fresh rehearsal database each time. MySQL commits DDL immediately.

## 2. Execute the complex queries

```bash
bank < demo/02-queries.sql
```

For a five-minute SQL demo, run queries 1–5 at the MySQL prompt. Add query 8 if asked to show full-text search.

| Query | What to explain when the rows appear |
|---|---|
| Wealth ranking | The CTE sums each customer’s accounts. DENSE_RANK ranks those totals and gives equal totals the same rank. |
| Above-average balances | The inner SELECT calculates one average across accounts. The outer WHERE keeps balances above it. |
| Branch hierarchy | The recursive CTE starts with the root branch. Each pass joins children to the previous level and extends the path. |
| Daily transfers | GROUP BY produces one total per day. A SUM window accumulates those totals in date order. |
| Latest outgoing transfer | ROW_NUMBER restarts at each sender and counts from the newest transfer. Keeping row 1 gives one result per sending account. |
| Loan instalments | A join supplies the borrower name. The EMI function calculates monthly payment from amount, rate and term. |
| Verified KYC | JSON containment selects verified customers. Field extraction reads their occupation and risk. |
| Full-text search | The final CLI example tokenizes each narration and matches the word rent. Look for Monthly rent payments. |

## 3. Call a function and observe its trigger

```bash
bank < demo/03-function-trigger.sql
```

The [demo SQL](03-function-trigger.sql) contains all three complete CREATE statements. Run `cat demo/03-function-trigger.sql` to read them or use the command above to execute them in MySQL 8.4. The IF NOT EXISTS clauses keep installed definitions intact.

| Object | Type | App feature |
|---|---|---|
| `transfer_funds` | Stored function | Send money locks the accounts, moves the amount and returns the transfer ID. |
| `balance_audit` | AFTER UPDATE trigger | A changed balance writes its old and new values to the audit log during transfers, deposits, loan payouts and repayments. |
| `monthly_emi` | Stored function | Loan screens and the staff EMI report calculate the monthly instalment estimate. |

**Stored procedures:** none. The app invokes its stored functions with SELECT. Queries 1–7 in section 2 run in staff Reports. Query 8 demonstrates full-text search in the CLI.

In the app, pressing Send calls the bank API, which checks ownership and calls `transfer_funds` inside a transaction. The function locks the two accounts in ID order, checks funds, updates the balances and inserts the payment. MySQL calls the trigger once per updated row. Inside it, `OLD.balance` and `NEW.balance` are the values before and after that update. The other function, `monthly_emi`, calculates the instalment shown with each loan.

Use seeded accounts 1 and 2 while both are active and account 1 has at least ₹100. Read the balances, call transfer_funds and compare the balances again. One falls by ₹100 and the other rises by ₹100. The balance_audit trigger writes two audit rows automatically. ROLLBACK restores the balances for another rehearsal.

## 4. Demonstrate database privileges

```bash
docker compose exec -T mysql mysql -uroot -pvault_root_demo vault < demo/04-privileges.sql
docker compose exec mysql mysql -uvault_auditor -pauditor_demo vault
```

At the auditor prompt, run these lines. SELECT succeeds and UPDATE gives an access-denied error.

```sql
SELECT CURRENT_USER(), number, balance FROM accounts LIMIT 2;
UPDATE accounts SET balance=balance WHERE id=1;
exit
```

In Bash open the teller session with `docker compose exec mysql mysql -uvault_teller -pteller_demo vault`. The teller can call the transfer function. The final DELETE should give an access-denied error.

```sql
SELECT CURRENT_USER();
START TRANSACTION;
SELECT transfer_funds(1,2,100,'Teller demo');
ROLLBACK;
DELETE FROM customers WHERE FALSE;
exit
```

## 5. Query MongoDB

```bash
docker compose exec -T mongo mongosh vault_documents --quiet --file /dev/stdin < demo/05-nosql.js
```

**Live KYC upload.** Sign in as a customer, open My profile, and upload a sample PDF (up to 2 MB). In Customers, an employee or admin selects View proof to download it and can then use Verify KYC. MongoDB stores the PDF bytes and metadata in `vault_documents.kyc_uploads`. Its document key is the MySQL customer ID. A second upload replaces that customer’s file. MySQL stores the verification decision. Uploading a file leaves that decision unchanged. The first query in the shell demo shows the uploaded file sizes and timestamps.

In the MongoDB database `vault_documents`, the `kyc_documents` collection stores one document per customer. Aarav’s document contains two identity records (PAN and address proof), while Kabir’s contains one pending Student ID. The second collection, `knowledge`, holds short bank policy documents. Its text index lets you find policies containing “loan”.

This covers the evaluator’s NoSQL option using independently seeded KYC documents. The nested filter finds Kabir’s pending Student ID. The aggregation expands each document array and counts three verified documents and one pending document on fresh data. The last query searches the text index for loan policies. To type each command yourself, open `docker compose exec mongo mongosh vault_documents`. Type `exit` when finished.
