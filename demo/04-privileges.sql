BEGIN;
CREATE ROLE class_demo_auditor NOLOGIN;
CREATE ROLE class_demo_teller NOLOGIN;
GRANT USAGE ON SCHEMA public TO class_demo_auditor, class_demo_teller;
GRANT SELECT ON customers,accounts,branches,transfers,loans,audit_log TO class_demo_auditor;
GRANT SELECT ON customers,accounts,branches,transfers TO class_demo_teller;
-- Invoker rights: teller needs these underlying privileges to execute the function.
GRANT UPDATE(balance) ON accounts TO class_demo_teller;
GRANT INSERT ON transfers,audit_log TO class_demo_teller;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO class_demo_teller;
REVOKE EXECUTE ON FUNCTION transfer_funds(INTEGER,INTEGER,NUMERIC,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transfer_funds(INTEGER,INTEGER,NUMERIC,TEXT) TO class_demo_teller;
SET LOCAL ROLE class_demo_auditor;
SELECT current_user, number, balance FROM accounts ORDER BY id LIMIT 2;
SAVEPOINT auditor_check;
\set ON_ERROR_STOP off
UPDATE accounts SET balance = balance WHERE false;
\set ON_ERROR_STOP on
ROLLBACK TO auditor_check;
RESET ROLE;
SET LOCAL ROLE class_demo_teller;
SELECT current_user, transfer_funds(1, 2, 100, 'Teller demonstration');
SAVEPOINT teller_check;
\set ON_ERROR_STOP off
DELETE FROM customers WHERE false;
\set ON_ERROR_STOP on
ROLLBACK TO teller_check;
ROLLBACK;
