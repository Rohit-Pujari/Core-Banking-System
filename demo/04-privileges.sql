-- Run as root on the local coursework server.
CREATE USER IF NOT EXISTS 'vault_auditor'@'%' IDENTIFIED BY 'auditor_demo';
CREATE USER IF NOT EXISTS 'vault_teller'@'%' IDENTIFIED BY 'teller_demo';
GRANT SELECT ON vault.accounts TO 'vault_auditor'@'%';
GRANT SELECT ON vault.accounts TO 'vault_teller'@'%';
GRANT EXECUTE ON FUNCTION vault.transfer_funds TO 'vault_teller'@'%';
SHOW GRANTS FOR 'vault_auditor'@'%';
SHOW GRANTS FOR 'vault_teller'@'%';
