-- Read demo/03-definitions.sql for the complete CREATE statements.
SHOW CREATE FUNCTION transfer_funds\G
SHOW CREATE TRIGGER balance_audit\G
SHOW CREATE FUNCTION monthly_emi\G

START TRANSACTION;
SELECT number, balance FROM accounts WHERE id IN (1, 2) ORDER BY id;
SELECT transfer_funds(1, 2, 100, 'Class demonstration') AS transfer_id;
SELECT number, balance FROM accounts WHERE id IN (1, 2) ORDER BY id;
SELECT account_id, old_balance, new_balance FROM audit_log ORDER BY id DESC LIMIT 2;
ROLLBACK;
