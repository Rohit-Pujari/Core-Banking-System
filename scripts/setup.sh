#!/usr/bin/env bash
set -eu
docker compose up -d --wait mysql
bank() { docker compose exec -T mysql mysql -ubank_admin -pbank_demo vault "$@"; }
if [ "$(bank -Ns -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='vault'")" = 0 ]; then
  bank < sql/01-schema.sql
fi
# Seed/import is transactional. Never overlay existing bank records.
if [ "$(bank -Ns -e 'SELECT COUNT(*) FROM branches')" = 0 ]; then
  source_file=sql/02-seed.sql
  if [ -f data/backups/mysql-import.sql ]; then source_file=data/backups/mysql-import.sql; fi
  bank < "$source_file"
fi
bank -e 'SELECT COUNT(*) AS accounts, SUM(balance) AS deposits FROM accounts'
