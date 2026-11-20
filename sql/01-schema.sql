CREATE TABLE IF NOT EXISTS branches(id SERIAL PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, parent_id INTEGER REFERENCES branches(id));
CREATE TABLE IF NOT EXISTS customers(id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT NOT NULL, kyc JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS accounts(id SERIAL PRIMARY KEY, number TEXT UNIQUE NOT NULL, customer_id INTEGER NOT NULL REFERENCES customers(id), branch_id INTEGER NOT NULL REFERENCES branches(id), kind TEXT NOT NULL CHECK(kind IN ('Savings','Current')), balance NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK(balance>=0), status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Frozen','Closed')));
CREATE TABLE IF NOT EXISTS transfers(id SERIAL PRIMARY KEY, from_account INTEGER NOT NULL REFERENCES accounts(id), to_account INTEGER NOT NULL REFERENCES accounts(id), amount NUMERIC(16,2) NOT NULL CHECK(amount>0), narration TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(from_account<>to_account));
CREATE INDEX IF NOT EXISTS transfers_date_idx ON transfers(created_at);
CREATE TABLE IF NOT EXISTS audit_log(id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), old_balance NUMERIC(16,2), new_balance NUMERIC(16,2), actor TEXT DEFAULT current_user, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS loans(id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), kind TEXT NOT NULL, principal NUMERIC(16,2) NOT NULL CHECK(principal>0), rate NUMERIC(5,2) NOT NULL, months INTEGER NOT NULL CHECK(months>0), status TEXT NOT NULL CHECK(status IN ('Active','Pending','Closed')));
CREATE OR REPLACE FUNCTION audit_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.balance IS DISTINCT FROM NEW.balance THEN
 INSERT INTO audit_log(account_id,old_balance,new_balance) VALUES(NEW.id,OLD.balance,NEW.balance);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS balance_audit ON accounts;
CREATE TRIGGER balance_audit AFTER UPDATE OF balance ON accounts FOR EACH ROW EXECUTE FUNCTION audit_balance();
CREATE OR REPLACE FUNCTION transfer_funds(source_id INTEGER, destination_id INTEGER, value NUMERIC, note TEXT) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE transfer_id INTEGER;
BEGIN
 IF value IS NULL OR value<=0 OR value<>round(value,2) OR source_id=destination_id THEN RAISE EXCEPTION 'Enter a positive amount with at most two decimals and distinct accounts'; END IF;
 -- Consistent lock ordering prevents deadlocks between opposing transfers.
 PERFORM id FROM accounts WHERE id IN(source_id,destination_id) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM accounts WHERE id IN(source_id,destination_id) AND status='Active')<>2 THEN RAISE EXCEPTION 'Both accounts must exist and be active'; END IF;
 IF (SELECT balance FROM accounts WHERE id=source_id)<value THEN RAISE EXCEPTION 'Insufficient funds'; END IF;
 UPDATE accounts SET balance=balance-value WHERE id=source_id;
 UPDATE accounts SET balance=balance+value WHERE id=destination_id;
 INSERT INTO transfers(from_account,to_account,amount,narration) VALUES(source_id,destination_id,value,coalesce(nullif(trim(note),''),'Account transfer')) RETURNING id INTO transfer_id;
 RETURN transfer_id;
END $$;
CREATE OR REPLACE FUNCTION monthly_emi(p NUMERIC,r NUMERIC,n INTEGER) RETURNS NUMERIC LANGUAGE SQL IMMUTABLE AS $$
 SELECT round(CASE WHEN r=0 THEN p/n ELSE p*(r/1200)*power(1+r/1200,n)/(power(1+r/1200,n)-1) END,2);
$$;
