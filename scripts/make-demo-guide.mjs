import fs from 'node:fs';
import { queries } from '../lib/queries.mjs';
const explanations = [['Which customers hold the most money across all accounts?', 'The CTE first groups accounts by customer and computes SUM(balance). DENSE_RANK then ranks those grouped totals. Equal totals share a rank, with no skipped rank after a tie. GROUP BY collapses rows; a window function annotates rows without collapsing them.', 'One row per customer who has an account, ordered richest first. Aarav has two accounts, so both contribute. Customers without accounts are excluded by the INNER JOIN.'], ['Which accounts have a balance above the bank-wide average?', 'The inner SELECT computes one scalar AVG(balance). The outer query compares each account balance with that value and joins the owner name. This is a non-correlated scalar subquery: it does not refer to an outer row.', 'Only balances strictly greater than the average, in descending order. The average includes all accounts, including frozen accounts.'], ['How are branches organized under the head office?', 'The anchor SELECT starts at branches with no parent. UNION ALL adds children by joining each parent to the recursive result. depth increments and path concatenates each branch name. Recursion stops when no more children match. The seeded hierarchy is acyclic.', 'Four rows on fresh seed: Head Office at depth 0 and three children at depth 1. A self-referencing foreign key links parent_id to branches.id.'], ['How does transfer volume accumulate day by day?', 'The CTE aggregates transfers into one row per date. SUM(volume) OVER(ORDER BY day) produces the running total. The daily GROUP BY creates one row per day, so each date appears once in the window.', 'Daily counts and volumes, with a cumulative total that never decreases because transfer amounts are positive. This is transaction volume, not new bank deposits: internal transfers do not create money.'], ['What was the latest outgoing transfer for every sending account?', 'ROW_NUMBER restarts for each account because of PARTITION BY a.id. Descending timestamp puts the newest transfer first; descending transfer ID breaks timestamp ties. The outer query keeps rn=1. A second query level is used because WHERE cannot filter a window result at the same SELECT level.', 'One latest outgoing transfer per account that has sent money. Accounts with no outgoing transfers are absent.'], ['What is the expected monthly repayment on each loan?', 'The join obtains the borrower name. monthly_emi is a stored SQL function using principal, annual percentage rate and number of months. It converts the annual rate to a monthly rate with r/1200. The zero-interest case returns principal/months.', 'Loan amounts and monthly EMI. This query includes pending, active, rejected and closed records; the result is a calculation, not evidence of loan disbursement.'], ['Which verified customers match a document field?', 'kyc is JSONB. The containment operator @> matches a JSON boolean true. The ->> operator extracts a field as text. Additional document fields can be stored without adding relational columns.', 'Only verified customers, with occupation, risk and the complete document. JSONB is document support inside PostgreSQL; MongoDB below is the separate NoSQL demonstration.'], ['Find banking articles about loans using full-text search.', 'to_tsvector normalizes and stems title/body words using the English dictionary. plainto_tsquery builds a lexical search query. @@ tests a match; ts_rank ranks matches. The matching expression has a GIN index in the schema.', 'Loan-related articles and relevance scores. Full-text search is not vector similarity. On five rows PostgreSQL may choose a sequential scan because it is cheaper than an index scan.']];
let text = `VAULT BANKING — LIVE DBMS PRESENTATION PLAYBOOK
================================================
Keep this file open in your editor during the presentation.
Execute blocks ONE AT A TIME in the shell named above each block.
Do not paste the whole file into a terminal: explanatory text is not code.

WHAT YOUR PROFESSOR ASKED
1. Notepad file with DDL/DML: sql/ALL_COMMANDS.txt contains the complete scripts.
2. At least 5 complex queries: Q1–Q5 below meet that count; Q6–Q7 provide extras.
3. At least one trigger and procedure/function: transfer_funds + balance_audit.
4. Different user privileges in database CLI: actual auditor/teller logins below.
5. Vector Search/NoSQL: MongoDB is the NoSQL option. Vector search is NOT implemented.
The email lists query categories, not specific SQL questions. These banking queries
are examples chosen to demonstrate those categories.

IMPLEMENTED APPLICATION
Customer: registration/sign-in, own accounts/balances, incoming/outgoing transfers,
loan applications and KYC status. Source-account ownership is checked by the API.
Employee: customer onboarding/logins, KYC verification, opening zero-balance
accounts, freeze/reactivation and assisted internal transfers.
Admin: employee creation, loan approve/reject decisions, all staff operations,
balance audit history and the bank reports.
Database: primary/foreign keys, uniqueness/check constraints, NUMERIC money,
transactions, ordered account locks, trigger audit, stored functions, JSONB,
sessions and role-based application authorization.
Not implemented: real payment rails, cash deposits/withdrawals, loan disbursement,
repayment collection, external identity-document verification or vector embeddings.
MongoDB is independently seeded for the CLI demo; it is not synchronized with the UI.

PREPARE BEFORE CLASS (BASH TERMINAL)
-----------------------------------
Docker must be running and your terminal must have access to its daemon.
Run from the project directory:

 docker compose up -d
 docker compose exec postgres pg_isready -U bank_admin -d vault
 DATABASE_URL=postgresql://bank_admin:bank_demo@localhost:5433/vault npm run db:setup

Wait for pg_isready to report accepting connections before setup. Setup seeds only
if needed and preserves existing data. If you want the UI and CLI to share data,
stop Next.js and start it in a separate terminal with:

 DATABASE_URL=postgresql://bank_admin:bank_demo@localhost:5433/vault npm run dev

Otherwise the default UI uses data/bank (PGlite), a SEPARATE database from Docker.
Do not claim a CLI change is reflected in the UI unless both use this URL.

Open PostgreSQL CLI:

 docker compose exec postgres psql -U bank_admin -d vault

IN PSQL:
\\pset pager off
\\conninfo
SELECT current_database(), current_user;
\\dt
SELECT 'customers' AS entity, count(*) FROM customers
UNION ALL SELECT 'accounts', count(*) FROM accounts
UNION ALL SELECT 'transfers', count(*) FROM transfers;

Fresh seed: 8 customers, 10 accounts, 80 transfers. Counts/balances change after use.
Demo sign-ins: aarav@example.com / employee@vault.bank / admin@vault.bank
All seeded login passwords: VaultDemo123!  Recipient example: VB10002 (Diya).

1. EXECUTE DDL AND DML (PSQL)
-----------------------------
First show the actual application table structure:
\\d accounts
\\d transfers
\\d audit_log
Explain: account PK identifies a row; customer_id/branch_id are foreign keys;
number is UNIQUE; balance >= 0 is a CHECK; NUMERIC stores exact decimal amounts.
Open sql/ALL_COMMANDS.txt to show the actual CREATE TABLE / INSERT seed commands.
Do NOT rerun the complete seed against an already initialized bank.

Execute a disposable table example to demonstrate every DDL/DML operation:
BEGIN;
CREATE TABLE presentation_notes (
 id INTEGER PRIMARY KEY,
 topic TEXT NOT NULL,
 explanation TEXT
);
ALTER TABLE presentation_notes ADD COLUMN reviewed BOOLEAN DEFAULT false;
INSERT INTO presentation_notes(id,topic,explanation)
VALUES (1,'Atomic transfers','Both balances change together');
SELECT * FROM presentation_notes;
UPDATE presentation_notes SET reviewed=true WHERE id=1;
SELECT * FROM presentation_notes;
DELETE FROM presentation_notes WHERE id=1;
SELECT count(*) FROM presentation_notes;
DROP TABLE presentation_notes;
ROLLBACK;

Say: CREATE/ALTER/DROP change structure (DDL); INSERT/UPDATE/DELETE modify rows
(DML); SELECT retrieves data (often called DQL). PostgreSQL supports transactional
DDL, so this exercise leaves no permanent table behind.

2. COMPLEX QUERIES — EXECUTE AND EXPLAIN (PSQL)
----------------------------------------------
`;
queries.forEach((q, i) => {
  const [question, explain, expected] = explanations[i];
  text += `\nQ${i + 1}: ${q.title.toUpperCase()}\nConcept: ${q.concept}\nBusiness question: ${question}\n\n${q.sql};\n\nExplain: ${explain}\nExpected: ${expected}\n`;
});
text += `
3. STORED FUNCTION + AUTOMATIC TRIGGER (PSQL)
--------------------------------------------
Show the definitions, not just the output:
SELECT pg_get_functiondef('transfer_funds(integer,integer,numeric,text)'::regprocedure);
SELECT pg_get_functiondef('audit_balance()'::regprocedure);
SELECT pg_get_triggerdef(oid) FROM pg_trigger
WHERE tgname='balance_audit' AND NOT tgisinternal;

Say: transfer_funds is a stored PL/pgSQL FUNCTION invoked using SELECT. The email
allows a procedure OR function; this is a function, not a CALL procedure.
It validates amount/accounts, locks accounts in ID order, checks funds, updates
both balances and inserts the transfer. The AFTER UPDATE trigger runs automatically
for each changed balance and inserts old/new values into audit_log.

Use a transaction so the demonstration is repeatable without changing balances:
BEGIN;
UPDATE accounts SET status='Active' WHERE id IN (1,2);
SELECT id,number,balance FROM accounts WHERE id IN (1,2) ORDER BY id;
SELECT sum(balance) AS bank_total_before FROM accounts;
SELECT count(*) AS audit_count_before FROM audit_log;
SELECT transfer_funds(1,2,100.00,'Faculty live trigger demo');
SELECT id,number,balance FROM accounts WHERE id IN (1,2) ORDER BY id;
SELECT sum(balance) AS bank_total_after FROM accounts;
SELECT count(*) AS audit_count_after FROM audit_log;
SELECT account_id,old_balance,new_balance,new_balance-old_balance AS change
FROM audit_log ORDER BY id DESC LIMIT 2;
ROLLBACK;

Expected: sender -100, receiver +100, total unchanged, TWO new audit records.
If account 1 has less than 100, select a smaller affordable amount first.
ROLLBACK restores the balance/transfer/audit changes. Sequence IDs may have gaps:
PostgreSQL sequence increments are not rolled back.

Demonstrate rejected transfer and transaction recovery:
BEGIN;
SAVEPOINT before_invalid;
SELECT transfer_funds(1,1,100.00,'Invalid same-account transfer');
-- Expected ERROR: distinct accounts required. This is intentional.
ROLLBACK TO SAVEPOINT before_invalid;
SELECT id,number,balance FROM accounts WHERE id=1;
ROLLBACK;

Say: an exception cancels the function statement. A savepoint lets us recover
inside an explicit transaction after an expected error. Without it, the transaction
remains aborted until ROLLBACK. Transactions give atomicity; CHECK/FK constraints
support consistency; row locks control concurrent balance changes.

4. CLI PRIVILEGES — TWO REAL DATABASE LOGINS
-------------------------------------------
Run these setup statements as bank_admin in psql. Repeatable role creation:
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='demo_auditor') THEN
  CREATE ROLE demo_auditor LOGIN PASSWORD 'AuditorDemo123!';
 END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='demo_teller') THEN
  CREATE ROLE demo_teller LOGIN PASSWORD 'TellerDemo123!';
 END IF;
END $$;
GRANT CONNECT ON DATABASE vault TO demo_auditor,demo_teller;
GRANT USAGE ON SCHEMA public TO demo_auditor,demo_teller;
GRANT SELECT ON accounts,customers,branches,transfers,loans,audit_log TO demo_auditor;
GRANT SELECT ON accounts,customers,branches,transfers TO demo_teller;
GRANT UPDATE(balance) ON accounts TO demo_teller;
GRANT INSERT ON transfers,audit_log TO demo_teller;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO demo_teller;
REVOKE EXECUTE ON FUNCTION transfer_funds(INTEGER,INTEGER,NUMERIC,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transfer_funds(INTEGER,INTEGER,NUMERIC,TEXT) TO demo_teller;
\\du
\\dp accounts
\\q

BASH: start an authenticated auditor connection over TCP (enter password when asked):
 docker compose exec postgres psql -h 127.0.0.1 -U demo_auditor -d vault -W
Password: AuditorDemo123!

PSQL (auditor):
SELECT current_user,session_user;
SELECT number,balance FROM accounts;
UPDATE accounts SET balance=balance+1 WHERE id=1;
-- Expected permission denied: auditor cannot UPDATE.
SELECT transfer_funds(1,2,1.00,'Auditor attempt');
-- Expected permission denied for function.
\\q

BASH: connect as teller:
 docker compose exec postgres psql -h 127.0.0.1 -U demo_teller -d vault -W
Password: TellerDemo123!

PSQL (teller):
SELECT current_user,session_user;
BEGIN;
SELECT transfer_funds(1,2,1.00,'Teller authorized transfer');
SELECT number,balance FROM accounts WHERE id IN (1,2);
ROLLBACK;
DELETE FROM customers WHERE id=8;
-- Expected permission denied: teller cannot DELETE customers.
\\q

Precondition: accounts 1/2 active and account 1 has at least 1 rupee.
Say: GRANT gives privileges, REVOKE removes privileges. These are actual database
logins, unlike the web application's customer/employee/admin roles. The application
checks its own roles on the server and uses a shared database connection.
The function uses invoker rights: teller needs underlying balance-update, insert
and sequence privileges. This is NOT a function-only security boundary.

5. NoSQL — MONGODB LIVE DEMO
---------------------------
BASH:
 docker compose exec mongo mongosh vault_documents

MONGOSH (not psql):
`;
text += fs.readFileSync('mongo/DEMO_COMMANDS.txt', 'utf8');
text += `
Explain: a collection contains documents with nested objects and arrays. A dotted
path matches nested fields. $set adds/updates fields without ALTER TABLE. $unwind
emits one row per array element; $group counts by document status; $sort orders
those counts. The text index supports lexical searches across title/body.
Fresh seed aggregation: verified=3, pending=1. Searching loan returns two articles.
This covers the NoSQL option in the email. It does not demonstrate vector search.

FINAL 30-SECOND SUMMARY TO SAY
------------------------------
Our Next.js banking application has customer, employee and admin workflows.
PostgreSQL enforces relationships and constraints; a stored transfer function and
trigger demonstrate atomic balance updates and automatic auditing. We executed
nested, recursive, CTE and window queries, and verified distinct
CLI user privileges. MongoDB demonstrates document queries and aggregation.

REHEARSAL STATUS
----------------
The project's automated database tests execute all seven queries, the trigger,
function, rejected-transfer behavior and SQL group-role permissions in PGlite.
Application authorization tests also pass. Docker daemon access was unavailable
in the coding sandbox, so rehearse the actual PostgreSQL LOGIN and MongoDB CLI
sections on your machine before class. Do not leave first-time image downloads
or password/daemon checks until the presentation.
`;
fs.writeFileSync('DEMO_PLAYBOOK.txt', text);
