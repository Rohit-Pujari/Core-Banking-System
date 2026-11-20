# Vault banking project

## Stack
Next.js handles the React screens and API. PostgreSQL stores the data. We use raw SQL, without an ORM or separate backend framework. PGlite runs PostgreSQL locally by default; set DATABASE_URL to use server PostgreSQL for the psql demonstration. MongoDB is a separate NoSQL demo only.

## Eight tables
| Table | Purpose |
|---|---|
| customers | Name, contact and KYC |
| branches | Branch details and parent branch |
| accounts | Owner, branch, type, balance and status |
| transfers | Sender, recipient, amount and date |
| loans | Application, rate, term and decision |
| audit_log | Automatic balance-change history |
| app_users | Password hash, role and customer link |
| app_sessions | Login session and expiry |

`schema_version` is one internal migration tracker, not a banking entity.

## Relationships
- Customer → accounts: one-to-many. Each account has one owner.
- Branch → accounts: one-to-many. Each account belongs to one branch.
- Branch → child branches: recursive one-to-many; a root has no parent.
- Account → transfers: two one-to-many links, one for sender and one for recipient.
- Account → audit records: one-to-many.
- Customer → loans: one-to-many.
- Customer → login: at most one login per customer. Staff logins have no customer link.
- User → sessions: one-to-many.
- User → reviewed loans: one-to-many; reviewer is optional until review. The API restricts review to admins.

[Chen ER diagram](../diagrams/01-er-diagram.svg) · [Notation explained](../diagrams/README.md) · [Relational schema](../diagrams/10-relational-schema.svg) · [All diagrams](../diagrams/index.html)

## Features
Customers view their accounts, transfer money and apply for loans. Employees onboard customers, verify KYC, open accounts and freeze/reactivate accounts. Admins also review loans, create employees and inspect balance audits. Staff use Reports for banking summaries.

## SQL used in the application
| Feature | SQL concept |
|---|---|
| Customer deposit ranking report | CTE + DENSE_RANK |
| Above-average account report | Nested subquery |
| Branch list and hierarchy report | Recursive CTE |
| Overview transfer chart and daily report | CTE + running SUM window |
| Latest outgoing payment report | ROW_NUMBER + PARTITION BY |
| Loan list and EMI report | Join + monthly_emi function |
| Verified customer report | JSONB containment |

These queries execute in PostgreSQL and supply the displayed results. Read [the SQL](../lib/queries.mjs). Reports are available to employees/admins; customers cannot access bank-wide reports.

## Transfer flow
Screen → API → session/ownership check → transaction → transfer_funds → commit → refreshed balances.

The function locks both accounts in ID order, checks funds and active status, debits one account, credits the other and inserts the transfer. The balance_audit trigger records each changed balance. Errors roll back the transaction. Total deposits stay unchanged.

[Transfer diagram](../diagrams/03-transfer-flow.svg) · [Function and trigger SQL](../sql/01-schema.sql)

## Login
Passwords use scrypt hashing. A random session token is stored in an HttpOnly cookie; its hash and expiry are stored in app_sessions. API checks enforce role and account ownership. Sessions expire after eight hours. Login throttling uses an in-memory counter, which resets when the server restarts and is not shared across server processes.

## Presentation
Use [DEMO_PLAYBOOK.txt](../DEMO_PLAYBOOK.txt) to execute DDL/DML, five complex queries, the function/trigger and separate PostgreSQL-user privileges. Use [MongoDB commands](../mongo/DEMO_COMMANDS.txt) for NoSQL. MongoDB is independent of the banking app; vector search is not implemented.

## Scope
Account balances and internal transfers work. KYC is a staff-controlled status. Loan approval changes the loan record; it does not disburse funds. Cash deposits, external payments and repayment collection are not implemented.

## Files
- [Bank API](../app/api/bank/route.js): banking actions and reads.
- [Auth API](../app/api/auth/route.js): login and registration.
- [Database helper](../lib/db.mjs): connection, initialization and transactions.
- [Schema](../sql/01-schema.sql) and [login tables](../sql/04-application.sql).
- [Customer screens](../app/customer.js) and [staff screens](../app/workspace.js).

Existing installations automatically migrate on next access. Removed supporting tables are backed up as JSON in data/backups before being dropped. Customer accounts, transfers, loans and balance audits are retained.
