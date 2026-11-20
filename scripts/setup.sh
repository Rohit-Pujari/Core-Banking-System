#!/usr/bin/env bash
set -eu
docker compose up -d --wait mysql mongo
bank() { docker compose exec -T mysql mysql -ubank_admin -pbank_demo vault "$@"; }
if [ "$(bank -Ns -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='vault'")" = 0 ]; then
  bank < sql/01-schema.sql
fi
if [ "$(bank -Ns -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='vault' AND table_name='loans' AND column_name='account_id'")" = 0 ]; then
  bank -e 'ALTER TABLE loans ADD account_id INT, ADD FOREIGN KEY (account_id) REFERENCES accounts(id)'
fi
if [ "$(bank -Ns -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='vault' AND table_name='loans' AND column_name='amount_paid'")" = 0 ]; then
  bank -e 'ALTER TABLE loans ADD amount_paid DECIMAL(16,2) NOT NULL DEFAULT 0 CHECK(amount_paid BETWEEN 0 AND principal)'
fi
# Seed/import is transactional. Never overlay existing bank records.
if [ "$(bank -Ns -e 'SELECT COUNT(*) FROM branches')" = 0 ]; then
  source_file=sql/02-seed.sql
  if [ -f data/backups/mysql-import.sql ]; then source_file=data/backups/mysql-import.sql; fi
  bank < "$source_file"
fi
bank -e 'SELECT COUNT(*) AS accounts, SUM(balance) AS deposits FROM accounts'
