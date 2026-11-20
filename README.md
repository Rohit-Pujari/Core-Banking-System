# Vault — Core Bank Management System

A Next.js banking application for customers, employees and administrators, with PostgreSQL persistence and DBMS presentation tools.

Read the [from-scratch DBMS guide](docs/DBMS_FROM_SCRATCH.md) for the tables, relationships and banking workflows.

## Run

Requires Node.js 20.9+.

```sh
npm install
npm run dev
```

Open **http://localhost:3000**. Embedded PostgreSQL (PGlite) initializes and migrates automatically. Banking data persists in `data/bank`. Existing seeded banking records are preserved by the application migration.

## Demo sign-ins

All seeded users have password **VaultDemo123!**. The sign-in page can fill these credentials for your presentation.

| Role | Email | Workspace |
|---|---|---|
| Customer | aarav@example.com | Own accounts, payments, loans and profile |
| Another customer | diya@example.com | A separate customer’s records |
| Employee | employee@vault.bank | Customer onboarding, KYC, accounts and servicing |
| Administrator | admin@vault.bank | Staff operations, loan decisions, employee creation, audit and reports |

New customers can register from the sign-in screen. Their profiles await KYC verification and account opening by bank staff. Employees and admins can also create customer logins; only admins can create employees.

## Features

Customers view balances, make internal transfers and apply for loans. Staff manage customers, KYC and accounts. Admins review loans and manage employees.

Eight application tables store the data. Staff Reports use CTEs, recursive queries, subqueries and window functions. The overview chart uses SQL daily totals; the branch list uses a recursive CTE. Transfers use a stored function and automatic audit trigger.

See the [short project guide](docs/PROJECT_GUIDE.md) for relationships and workflows.

## DBMS presentation kit

[Diagram gallery](diagrams/index.html) — ER diagram, architecture, transfer flow, role permissions and onboarding/loan flow. Open locally in a browser; SVG diagrams are included.

Start with [DEMO_PLAYBOOK.txt](DEMO_PLAYBOOK.txt): a live execution script with terminal commands, query explanations, expected results, real database logins, trigger/function execution and MongoDB demonstration.

- [SQL command notebook](sql/ALL_COMMANDS.txt): DDL, DML, queries, triggers, functions, login schema and CLI privileges
- [MongoDB command notebook](mongo/DEMO_COMMANDS.txt): independently seeded NoSQL companion

```sh
npm test
npm run build
npm start
```

Tests use independent in-memory databases, covering banking integrity, authentication, customer isolation, role permissions, registration, servicing, approvals, session expiry and logout. Stop the app before running `npm run db:cli` against its persistent embedded database.

Optional server PostgreSQL: `docker compose up -d`, then `DATABASE_URL=postgresql://bank_admin:bank_demo@localhost:5433/vault npm run db:setup`. Set the same URL in `.env.local` and restart Next.js. See DEMO_PLAYBOOK.txt for SQL and MongoDB CLI demos.

All records and funds are fictional. This is a local coursework application with published demo credentials, not a production banking deployment. No real payment rails, document verification provider or money disbursement is integrated.

Framework reference: https://nextjs.org/docs/app/guides/authentication

## Read the code in this order

1. `sql/01-schema.sql` — tables, transfer function and audit trigger.
2. `lib/db.mjs` — connection and transactions.
3. `app/api/auth/route.js` — registration and login.
4. `app/api/bank/route.js` — banking actions and permission checks.
5. `lib/queries.mjs` — SQL used by reports.
6. `app/customer.js` and `app/workspace.js` — customer and staff screens.

`docs/PROJECT_GUIDE.md` is the explanation; `DEMO_PLAYBOOK.txt` is the execution guide. Diagram sources and their SVG outputs are kept together in `diagrams/`.
