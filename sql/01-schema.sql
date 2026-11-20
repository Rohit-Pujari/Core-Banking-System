CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  parent_id INTEGER,
  FOREIGN KEY (parent_id) REFERENCES branches(id)
);
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(255) NOT NULL,
  kyc JSON NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(255) UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  branch_id INTEGER NOT NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  kind VARCHAR(255) NOT NULL CHECK(kind IN ('Savings','Current')),
  balance NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK(balance>=0),
  status VARCHAR(255) NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Frozen','Closed'))
);
CREATE TABLE IF NOT EXISTS transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_account INTEGER NOT NULL,
  FOREIGN KEY (from_account) REFERENCES accounts(id),
  to_account INTEGER NOT NULL,
  FOREIGN KEY (to_account) REFERENCES accounts(id),
  amount NUMERIC(16,2) NOT NULL CHECK(amount>0),
  narration VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CHECK(from_account<>to_account)
);
CREATE INDEX transfers_date_idx ON transfers(created_at);
CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  old_balance NUMERIC(16,2),
  new_balance NUMERIC(16,2),
  actor VARCHAR(288),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  kind VARCHAR(255) NOT NULL,
  principal NUMERIC(16,2) NOT NULL CHECK(principal>0),
  amount_paid DECIMAL(16,2) NOT NULL DEFAULT 0 CHECK(amount_paid BETWEEN 0 AND principal),
  rate NUMERIC(5,2) NOT NULL,
  months INTEGER NOT NULL CHECK(months>0),
  account_id INT,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  reviewed_by INT,
  reviewed_at DATETIME(3),
  status VARCHAR(255) NOT NULL CHECK(status IN ('Active','Pending','Closed','Rejected'))
);
CREATE TABLE IF NOT EXISTS app_users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(255) NOT NULL,
 email VARCHAR(255) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role VARCHAR(255) NOT NULL CHECK(role IN ('customer','employee','admin')),
 customer_id INTEGER UNIQUE, FOREIGN KEY (customer_id) REFERENCES customers(id),
 CHECK ((role='customer' AND customer_id IS NOT NULL) OR (role<>'customer' AND customer_id IS NULL))
);
CREATE TABLE IF NOT EXISTS app_sessions (
 token_hash VARCHAR(255) PRIMARY KEY,
 user_id INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
 expires_at DATETIME(3) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
ALTER TABLE loans ADD FOREIGN KEY (reviewed_by) REFERENCES app_users(id);
CREATE INDEX sessions_expiry_idx ON app_sessions(expires_at);
CREATE FULLTEXT INDEX transfer_text ON transfers(narration);

DELIMITER //
CREATE TRIGGER balance_audit AFTER UPDATE ON accounts FOR EACH ROW
BEGIN
 IF OLD.balance <> NEW.balance THEN
  INSERT INTO audit_log(account_id,old_balance,new_balance,actor)
  VALUES(NEW.id,OLD.balance,NEW.balance,USER());
 END IF;
END//
CREATE FUNCTION monthly_emi(p DECIMAL(16,2),r DECIMAL(6,2),n INT)
RETURNS DECIMAL(16,2) DETERMINISTIC NO SQL
RETURN IF(r=0,p/n,p*(r/1200)/(1-POWER(1+r/1200,-n)))//
CREATE FUNCTION transfer_funds(src INT,dst INT,amount_in DECIMAL(24,8),note VARCHAR(255))
RETURNS INT MODIFIES SQL DATA
BEGIN
 DECLARE first_id, second_id INT;
 DECLARE available DECIMAL(16,2);
 IF src=dst OR amount_in IS NULL OR amount_in<=0 OR ROUND(amount_in,2)<>amount_in THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid accounts or amount';
 END IF;
 SELECT id INTO first_id FROM accounts WHERE id=LEAST(src,dst) AND status='Active' FOR UPDATE;
 SELECT id INTO second_id FROM accounts WHERE id=GREATEST(src,dst) AND status='Active' FOR UPDATE;
 IF first_id IS NULL OR second_id IS NULL THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Both accounts must exist and be active';
 END IF;
 SELECT balance INTO available FROM accounts WHERE id=src FOR UPDATE;
 IF available<amount_in THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient funds'; END IF;
 UPDATE accounts SET balance=balance-amount_in WHERE id=src;
 UPDATE accounts SET balance=balance+amount_in WHERE id=dst;
 INSERT INTO transfers(from_account,to_account,amount,narration) VALUES(src,dst,amount_in,COALESCE(NULLIF(TRIM(note),''),'Account transfer'));
 RETURN LAST_INSERT_ID();
END//
DELIMITER ;
