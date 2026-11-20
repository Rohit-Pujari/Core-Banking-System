-- Run as bank_admin in full PostgreSQL, NOT embedded PGlite.
CREATE ROLE bank_auditor NOLOGIN;
CREATE ROLE bank_teller NOLOGIN;
GRANT USAGE ON SCHEMA public TO bank_auditor, bank_teller;
GRANT SELECT ON customers,accounts,branches,transfers,loans,audit_log TO bank_auditor;
GRANT SELECT ON customers,accounts,branches,transfers TO bank_teller;
-- Invoker rights: teller needs these underlying privileges to execute the function.
GRANT UPDATE(balance) ON accounts TO bank_teller;
GRANT INSERT ON transfers,audit_log TO bank_teller;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO bank_teller;
REVOKE EXECUTE ON FUNCTION transfer_funds(INTEGER,INTEGER,NUMERIC,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transfer_funds(INTEGER,INTEGER,NUMERIC,TEXT) TO bank_teller;
-- Demonstrate authorization independently of the UI.
SET ROLE bank_auditor;
SELECT number,balance FROM accounts;
-- Expected ERROR: permission denied for table accounts
UPDATE accounts SET balance=balance+1 WHERE id=1;
RESET ROLE;
SET ROLE bank_teller;
SELECT transfer_funds(1,2,100.00,'CLI teller demo');
-- Expected ERROR: permission denied for table customers
DELETE FROM customers WHERE id=8;
RESET ROLE;
