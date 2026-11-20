DELIMITER //
CREATE TRIGGER IF NOT EXISTS account_delete_cleanup BEFORE DELETE ON accounts FOR EACH ROW
BEGIN
 IF OLD.balance <> 0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only zero-balance accounts can be deleted.';
 END IF;
 -- A pending application can receive funds in another account at approval.
 UPDATE loans SET account_id=NULL WHERE account_id=OLD.id AND status='Pending';
 -- Other references remain protected by foreign keys.
END//
DELIMITER ;
