-- Install in a new banking schema after creating its tables.
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
