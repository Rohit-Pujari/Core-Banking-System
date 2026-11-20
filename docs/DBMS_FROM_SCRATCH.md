# Vault DBMS project — from the beginning

This guide starts with the problem the database solves, then explains the tables and their links. The final sections give you commands to execute and describe for the evaluator.

## 1. What does the application do?

Vault is a small bank application. A customer can view their accounts, send money to another Vault account and apply for a loan. Bank staff can register customers, verify KYC, open or freeze accounts, and review loans. PostgreSQL stores the data and protects it with keys, constraints and transactions.

The app has two layers:

```text
Next.js screens → Next.js API → SQL → PostgreSQL
```

The screen sends a request to the API. The API checks the signed-in user's role and account ownership, then runs SQL. PostgreSQL sends rows back to the API, and the API returns them to the screen.

## 2. What is a table?

A table stores one kind of thing. A row is one instance of it; a column stores one fact about that instance.

For example, one row in `customers` stores one bank customer. `customers.id` identifies that row. An account stores the customer's `id` in `accounts.customer_id` to say who owns it.

## 3. Tables in this project

There are eight application tables. `schema_version` is a small internal table used to remember which setup steps have run.

| Table | One row represents | Important data |
|---|---|---|
| `customers` | A bank customer | Name, email, phone and KYC JSON document |
| `branches` | A bank branch | Name, city and optional parent branch |
| `accounts` | One customer's bank account | Unique number, owner, branch, account type, balance, status |
| `transfers` | One movement between two accounts | Sender account, receiver account, amount and description |
| `loans` | One loan or loan application | Borrower, product, principal, rate, term and status |
| `audit_log` | One account balance change | Account, old balance, new balance and time |
| `app_users` | One login identity | Name, email, password hash, role and optional customer link |
| `app_sessions` | One signed-in browser session | Hashed session token, user and expiry time |

The SQL definitions live in [01-schema.sql](../sql/01-schema.sql) and [04-application.sql](../sql/04-application.sql). Sample rows are inserted by [02-seed.sql](../sql/02-seed.sql).

## 4. Keys and constraints

- A **primary key (PK)** uniquely identifies each row. Example: `customers.id`.
- A **foreign key (FK)** points to a row in another table. Example: `accounts.customer_id` points to `customers.id`.
- **UNIQUE** prevents duplicate values, such as two customers using the same email.
- **NOT NULL** requires a value.
- **CHECK** limits acceptable values, such as a balance being zero or greater.

These rules let PostgreSQL reject invalid data even when a user or API makes a mistake.

Money uses `NUMERIC(16,2)` so it can store exact decimal amounts, for example `1250.75`.

## 5. How the tables connect

Open the [Chen ER diagram](../diagrams/01-er-diagram.svg) or [diagram gallery](../diagrams/index.html). A rectangle is an entity/table, a diamond is a relationship, and an oval is an attribute/column. Underlined ovals are primary keys. Relationship labels show minimum and maximum participation: `(0,N)` means zero or many, `(1,1)` exactly one, and `(0,1)` optional one.

```mermaid
erDiagram
    CUSTOMERS ||--o{ ACCOUNTS : owns
    BRANCHES ||--o{ ACCOUNTS : maintains
    CUSTOMERS ||--o{ LOANS : applies_for
    ACCOUNTS ||--o{ TRANSFERS : sends
    ACCOUNTS ||--o{ TRANSFERS : receives
    ACCOUNTS ||--o{ AUDIT_LOG : changes
    CUSTOMERS o|--o| APP_USERS : login
    APP_USERS ||--o{ APP_SESSIONS : signs_in
    APP_USERS o|--o{ LOANS : reviews
    BRANCHES o|--o{ BRANCHES : parent_of
```

### The relationships, one by one

**Customer to accounts — one-to-many.** One customer may have no accounts or several. Every account belongs to exactly one customer. The database implements this with `accounts.customer_id` referencing `customers.id`.

**Branch to accounts — one-to-many.** One branch maintains many accounts; each account belongs to one branch. `accounts.branch_id` references `branches.id`.

**Branch to branch — recursive one-to-many.** A branch can have child branches. One branch can have zero or one parent. `branches.parent_id` references another row in `branches`. Head Office is the root in the sample data.

**Customer to loans — one-to-many.** A customer can apply for several loans; a loan belongs to one customer. `loans.customer_id` references `customers.id`.

**Account to transfer — two relationships.** Every transfer has exactly one sending account (`from_account`) and one receiving account (`to_account`). An account can appear in many transfers in either role. Both columns reference `accounts.id`. A transfer must not send money to itself.

**Account to audit log — one-to-many.** One account may have many balance change records. Each audit row refers to one account through `audit_log.account_id`.

**Customer to login — optional one-to-one.** A customer can have at most one login; a customer login must point to one customer. Employee and admin logins have no customer profile. `app_users.customer_id` is a unique foreign key and a CHECK constraint enforces the role rule.

**User to sessions — one-to-many.** A user may have multiple browser sessions. Each session has one owner through `app_sessions.user_id`.

**User to reviewed loan — optional one-to-many.** One staff user may review many loans; a loan has no reviewer while pending and at most one reviewer after decision. `loans.reviewed_by` references `app_users.id`. The API restricts this action to admins.

### Chen attributes that matter

KYC is a **composite conceptual attribute**: the JSON object has `verified`, `occupation`, and `risk` components. The application stores this object in one PostgreSQL JSONB column, `customers.kyc`.

EMI is a **derived attribute**. It is calculated from loan principal, rate, and term by `monthly_emi()`; the app does not store it as a loan column.

The supplied reference image shows a **multivalued attribute** with a double oval. Chen notation also represents a **weak entity** with a double rectangle. This database has neither. A customer phone is one text value. All eight tables have their own primary key, so none is weak. The notation key shows the symbols, but the bank ER diagram does not pretend they are part of the schema. A weak entity would need an owner's key plus its own partial key for identification.

## 6. What happens during a transfer?

Suppose Aarav sends ₹100 to Diya:

1. The customer enters their source account, Diya's account number, and the amount.
2. The API checks that the customer owns the source account.
3. The API looks up the receiving account and starts a database transaction.
4. It calls `transfer_funds(source, destination, amount, note)`.
5. The function checks that the accounts are active, the amount is valid, and the sender has enough money.
6. The function locks both account rows, subtracts ₹100 from the sender, adds ₹100 to the receiver, and inserts a transfer record.
7. Each balance update activates the `balance_audit` trigger. It writes the old and new balance to `audit_log`.
8. PostgreSQL commits the transaction. If a check fails, the changes roll back.

If the sender had ₹500 and the receiver had ₹300, after the transfer they have ₹400 and ₹400. Together they still have ₹800. An internal transfer moves money; it does not create money.

A successful transfer creates one `transfers` row and normally two `audit_log` rows. The function and trigger definitions are in [01-schema.sql](../sql/01-schema.sql). The API calls them from [the bank route](../app/api/bank/route.js).

## 7. SQL commands the evaluator asked about

Run the app with `npm run dev`. For the SQL command-line demo, follow the Docker and psql setup in [DEMO_PLAYBOOK.txt](../DEMO_PLAYBOOK.txt). PGlite is the default local database; PostgreSQL in Docker provides the separate psql login demo. They use different databases unless the app has `DATABASE_URL` configured.

### DDL: define or change database structure

```sql
CREATE TABLE demo_note (
  id INTEGER PRIMARY KEY,
  note TEXT NOT NULL
);
ALTER TABLE demo_note ADD COLUMN checked BOOLEAN DEFAULT false;
DROP TABLE demo_note;
```

Explain: `CREATE TABLE` adds a table, `ALTER TABLE` changes its structure, and `DROP TABLE` removes it. Use a temporary/demo table during the presentation.

### DML: change rows

```sql
INSERT INTO customers(name,email,phone,kyc)
VALUES ('Demo Customer','demo@example.com','9876500000','{"verified":false}');

UPDATE customers
SET kyc = jsonb_set(kyc, '{verified}', 'true')
WHERE email = 'demo@example.com';

DELETE FROM customers WHERE email = 'demo@example.com';
```

Explain: `INSERT` adds a row, `UPDATE` changes it, and `DELETE` removes it. Do not delete a seeded customer that still owns accounts or loans; foreign keys protect those linked records. `SELECT` reads data; some courses call it DQL.

The project already includes its DDL and seed DML in [ALL_COMMANDS.txt](../sql/ALL_COMMANDS.txt).

## 8. Five complex queries

The application includes seven reports in [queries.mjs](../lib/queries.mjs). Here are five you can run and explain. End each query with a semicolon in psql.

### 1. CTE and window function: rank customers by deposits

```sql
WITH wealth AS (
  SELECT c.id, c.name, SUM(a.balance) AS deposits
  FROM customers c
  JOIN accounts a ON a.customer_id = c.id
  GROUP BY c.id, c.name
)
SELECT *, DENSE_RANK() OVER (ORDER BY deposits DESC) AS rank
FROM wealth
ORDER BY rank;
```

The CTE named `wealth` first totals each customer's accounts. `DENSE_RANK()` ranks those totals. If two customers tie, they receive the same rank.

### 2. Nested query: accounts above average

```sql
SELECT a.number, c.name, a.balance
FROM accounts a
JOIN customers c ON c.id = a.customer_id
WHERE a.balance > (SELECT AVG(balance) FROM accounts)
ORDER BY a.balance DESC;
```

The inner query calculates the average balance. The outer query finds accounts above it.

### 3. Recursive CTE: branch hierarchy

```sql
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 0 AS depth, name AS path
  FROM branches WHERE parent_id IS NULL
  UNION ALL
  SELECT b.id, b.name, b.parent_id, t.depth + 1,
         t.path || ' → ' || b.name
  FROM branches b JOIN tree t ON b.parent_id = t.id
)
SELECT * FROM tree ORDER BY path;
```

The first SELECT starts at Head Office. The recursive SELECT repeatedly adds child branches. `depth` and `path` show the branch level and route from the root.

### 4. Window function: daily running transfer total

```sql
WITH daily AS (
  SELECT created_at::date AS day,
         COUNT(*) AS transfers,
         SUM(amount) AS volume
  FROM transfers
  GROUP BY created_at::date
)
SELECT *, SUM(volume) OVER (ORDER BY day) AS cumulative_volume
FROM daily
ORDER BY day;
```

The CTE makes one daily summary row. The windowed `SUM` adds each day's volume to the total of previous days.

### 5. ROW_NUMBER: latest outgoing payment per account

```sql
WITH ranked AS (
  SELECT a.number, t.amount, t.narration, t.created_at,
         ROW_NUMBER() OVER (
           PARTITION BY a.id ORDER BY t.created_at DESC, t.id DESC
         ) AS rn
  FROM accounts a JOIN transfers t ON t.from_account = a.id
)
SELECT * FROM ranked WHERE rn = 1 ORDER BY number;
```

`PARTITION BY` restarts the numbering for each account. The newest transfer gets row number 1. The outside query keeps that row.

### 6. Join and stored function: loan EMI

```sql
SELECT c.name, l.kind, l.principal, l.rate,
       monthly_emi(l.principal, l.rate, l.months) AS monthly_payment
FROM loans l
JOIN customers c ON c.id = l.customer_id
ORDER BY l.principal DESC;
```

The join adds each borrower's name to their loan. The stored function calculates the monthly instalment using principal, annual percentage rate and term in months. It divides the annual percentage by 1200 to obtain the monthly rate; for zero interest it uses principal divided by months. The query includes all loan statuses. A calculated EMI does not mean the loan has been disbursed.

### 7. JSONB query: verified customers

```sql
SELECT name,
       kyc->>'occupation' AS occupation,
       kyc->>'risk' AS risk,
       kyc
FROM customers
WHERE kyc @> '{"verified":true}'::jsonb
ORDER BY name;
```

`@>` checks whether the JSONB document contains the given field/value. Here true is a JSON boolean, not the text "true". `->>` extracts occupation and risk as text. This returns seven verified customers on a fresh seed; verification actions can change that count.

All seven queries appear in the staff **Reports** screen and execute in PostgreSQL. The branch list also uses the recursive query, and the staff overview chart uses the daily-transfer CTE. Q1–Q5 are the five examples to lead with for the evaluator.

## 9. Function and trigger

A function runs when explicitly called. A trigger runs automatically after a specified database event.

```sql
SELECT transfer_funds(1, 2, 100.00, 'Presentation transfer');
```

`transfer_funds()` checks the accounts, moves the money, and inserts a transfer. The `balance_audit` trigger automatically records each changed balance. The evaluator asks for a procedure or function; this project demonstrates a function.

Show the before and after values:

```sql
SELECT number, balance FROM accounts WHERE id IN (1, 2);
SELECT transfer_funds(1, 2, 100.00, 'Presentation transfer');
SELECT number, balance FROM accounts WHERE id IN (1, 2);
SELECT account_id, old_balance, new_balance
FROM audit_log ORDER BY id DESC LIMIT 2;
```

Use accounts 1 and 2 only if both are Active and account 1 has at least ₹100. The demo playbook shows how to roll back the demonstration afterward.

## 10. Database user privileges

The app's website roles and PostgreSQL's database roles are different. Use the PostgreSQL CLI to show actual database permissions. [03-privileges.sql](../sql/03-privileges.sql) defines read-only auditor and teller roles.

Before the commands below, open psql as bank_admin and execute the CREATE ROLE / GRANT / REVOKE setup at the top of that file. Those CREATE ROLE statements are a one-time setup. If the roles already exist, skip their creation and reapply the grants. Run expected permission-denied commands outside an explicit transaction, so one denial does not leave a transaction aborted.

For separate password-authenticated database logins, use **section 4 of DEMO_PLAYBOOK.txt** instead. It creates demo_auditor and demo_teller and shows how to open a separate psql connection for each. Do not mix those names with bank_auditor/bank_teller below. Before a teller transfer, check that accounts 1 and 2 are active and the sender has enough balance.

```sql
-- As database owner/admin:
SET ROLE bank_auditor;
SELECT number, balance FROM accounts;             -- allowed
UPDATE accounts SET balance = balance + 1 WHERE id = 1; -- denied
RESET ROLE;

SET ROLE bank_teller;
SELECT transfer_funds(1, 2, 100.00, 'Teller demo'); -- allowed
DELETE FROM customers WHERE id = 8;               -- denied
RESET ROLE;
```

Explain: `GRANT` gives permission; `REVOKE` removes it. Auditor can read, but cannot update. Teller can execute transfers, but cannot delete customers. The sample script sets roles in one psql session. The playbook also gives commands for separate logins.

## 11. MongoDB / NoSQL requirement

The banking application itself uses PostgreSQL. MongoDB is an independent small dataset for the NoSQL demonstration. Start MongoDB with Docker, then follow [DEMO_COMMANDS.txt](../mongo/DEMO_COMMANDS.txt) in `mongosh`.

The commands show documents, nested fields, updating a field, and an aggregation pipeline. This meets the NoSQL option from the email. The project does not implement vector search. PostgreSQL KYC JSONB is a document-like column, but it is not a separate NoSQL database.

## 12. Presentation order

1. Sign in as Aarav and show his accounts.
2. Send ₹100 to Diya's account `VB10002`.
3. Show the changed balances and two automatic audit entries.
4. Open the Chen ER diagram and explain Customer → Account → Transfer.
5. Run five queries from this guide and explain the SQL feature each one demonstrates.
6. Show `transfer_funds()` and the automatic trigger.
7. Switch auditor/teller privileges in psql and show allowed and denied commands.
8. Finish with the MongoDB document/aggregation demo.

### Short opening explanation

“Customers own accounts, and branches maintain them. A transfer links one sending account to one receiving account. PostgreSQL checks the transfer in a stored function, updates both balances in a transaction, and a trigger records the balance changes.”

## 13. The application itself

Start the application from the project folder:

```sh
npm run dev
```

Open http://localhost:3000. Sign in with one of the demo users below. The sign-in page also has buttons to fill in a demo login.

| User | Email | Password | What to show |
|---|---|---|---|
| Aarav Sharma | `aarav@example.com` | `VaultDemo123!` | Customer home, balances, transfers and own loans |
| Diya Patel | `diya@example.com` | `VaultDemo123!` | Second customer's separate accounts and received transfers |
| Bank employee | `employee@vault.bank` | `VaultDemo123!` | Customer list, KYC checks, account servicing and bank reports |
| Bank admin | `admin@vault.bank` | `VaultDemo123!` | Employee tools, loan decisions, audit history and reports |

### Customer screens

After Aarav signs in, the customer home screen shows his combined account balance, account cards, and recent transfers. **My accounts** lists his accounts. **Payments** lists his incoming and outgoing transfers. **My loans** shows his loan records and an application form. **My profile** shows contact information and KYC status.

To demonstrate a transfer, click **Send money**. Choose Aarav's Savings account, enter `VB10002` as the recipient account, and enter `100`. Confirm the transfer. The account balances and transfer history refresh. Sign out and sign in as Diya to show the incoming transfer from her view.

The transfer updates two accounts; total bank balances stay the same. The API checks that a customer owns the source account. Try choosing another customer's source account through a direct request and the API rejects it.

### Employee screens

The employee workspace shows bank records for servicing. In **Customers**, review customer details and verify a pending KYC status. In **Accounts**, open a Savings or Current account for a KYC-verified customer, or freeze/reactivate an account. New accounts start with a zero balance. **Reports** runs the supplied banking SQL. The employee cannot approve loans or create employee logins.

### Admin screens

The admin has the employee tools plus loan decisions, employee account creation, the **Audit trail**, and Reports. In **Loans**, approve or reject a pending application. This changes its status and records the reviewer. Approval does not send money to an account.

The **Audit trail** lists the old and new values created by the balance trigger. It records balance changes, including changes from the seeded transfers.

### How login affects the screens

`app/access.js` provides registration and sign-in. `app/customer.js` renders customer banking screens. `app/workspace.js` renders employee and admin screens. Forms are in `app/forms.js`.

The browser sends requests to `/api/auth` or `/api/bank`. The API identifies the user from their session cookie, checks their role, and for customer requests limits account and loan data to their `customer_id`. PostgreSQL then returns the requested records. The browser does not query the database directly.

## 14. The sample data

The sample rows are in [02-seed.sql](../sql/02-seed.sql). On a fresh database it inserts:

- **4 branches:** Head Office and three Bengaluru branches: Indiranagar, Koramangala and Jayanagar.
- **8 customers:** Aarav Sharma, Diya Patel, Arjun Rao, Ananya Iyer, Kabir Mehta, Ishita Nair, Rohan Das and Meera Reddy.
- **10 accounts:** each customer gets a Savings or Current account. Aarav has a second account. Kabir has a frozen account; the other accounts start Active.
- **80 transfers:** made between the seeded accounts with descriptions such as rent, vendor payment and consulting fee. These populate transfer history and trigger-created audit rows.
- **5 loans:** three Active and two Pending. Kabir's education loan and Meera's business loan are Pending, so the admin can demonstrate decisions.
- **Demo user accounts:** one login for every customer, plus one employee and one admin. Setup creates salted password hashes for the shared demo password.

Aarav owns two accounts: `VB10001` and `VB10009`. Diya owns `VB10002`. These account numbers are useful in the transfer demo. `VB100010` is Kabir's frozen account; transfers to or from it should fail.

Seed data is fictional. The sample relationships are more useful than memorizing exact balance totals, because a transfer or a loan decision changes the live data. To inspect current records in PostgreSQL:

```sql
SELECT c.name, a.number, a.kind, a.balance, a.status
FROM customers c JOIN accounts a ON a.customer_id = c.id
ORDER BY c.id, a.id;

SELECT l.id, c.name, l.kind, l.principal, l.status
FROM loans l JOIN customers c ON c.id = l.customer_id
ORDER BY l.id;
```

A fresh installation is initialized automatically when the app first connects to the database. Existing database installations run migrations when the app starts. Do not rerun `02-seed.sql` against an already initialized database: it inserts duplicate sample rows and unique email/account-number constraints will reject some of them.

## 15. How to explain one complete feature

Use a transfer to connect the application, API, SQL schema, function, transaction and trigger in one demonstration:

1. The customer enters a recipient account number and amount on the screen.
2. The screen sends those fields to the Next.js API.
3. The API checks the session and verifies that the source account belongs to this customer.
4. PostgreSQL's `transfer_funds()` checks account state and available money.
5. It updates both `accounts` rows and inserts one `transfers` row.
6. The database trigger writes two `audit_log` rows.
7. The transaction commits; the screen reloads balances and history.

If the sender has insufficient funds, the accounts do not change and the transfer is rejected. This is the main example of how the UI and API rely on database rules to keep account data consistent.

## Verification on 19 November 2026

- Production build passed.
- All three test suites passed: application workflows, database integrity/reports/SQL privileges, and origin checks.
- All seven report queries executed successfully against isolated embedded PostgreSQL.
- Auditor SELECT succeeded; UPDATE and transfer execution were rejected. Teller transfer succeeded; customer DELETE was rejected.
- Transfers conserved total deposits; the trigger inserted two audit rows. Rejected transfers left balances and audit counts unchanged.
- Tests covered registration, login, customer ownership, staff actions, loan review permissions, logout and session expiry.
- HTTP/browser startup was blocked by sandbox port permission (EPERM). Docker daemon access was denied. Separate PostgreSQL password logins and MongoDB CLI execution still require a local rehearsal.

Tests use temporary databases and do not establish the state of a running Docker database or your current browser session.
