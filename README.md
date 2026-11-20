# Vault — Core Bank Management System

For the evaluator, start with the [five terminal demonstrations](demo/README.md).
A Next.js banking application for customers, employees and administrators, with MySQL persistence and DBMS presentation tools.

Read the [from-scratch DBMS guide](docs/DBMS_FROM_SCRATCH.md) for the tables, relationships and banking workflows.

## Run with MySQL 8.4

Start Docker, then run these commands from the project directory.

```sh
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000. In a second terminal run `npm run db:cli` and type `SHOW TABLES;`. Both sessions use the same vault database. Setup restores the local export in `data/backups/mysql-import.sql` when present. A fresh checkout uses fictional sample rows. The MySQL volume persists between restarts.

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

See the [project diagrams](diagrams/index.html) for relationships and workflows.


With the Compose MySQL server running, use `npm test` to run integration tests in disposable databases.
