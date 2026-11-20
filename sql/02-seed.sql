INSERT INTO branches(name,city,parent_id) VALUES ('Head Office','Bengaluru',NULL),('Indiranagar','Bengaluru',1),('Koramangala','Bengaluru',1),('Jayanagar','Bengaluru',1);
INSERT INTO customers(name,email,phone,kyc) VALUES
('Aarav Sharma','aarav@example.com','9876501001','{"verified":true,"occupation":"Engineer","risk":"low"}'),
('Diya Patel','diya@example.com','9876501002','{"verified":true,"occupation":"Designer","risk":"low"}'),
('Arjun Rao','arjun@example.com','9876501003','{"verified":true,"occupation":"Business owner","risk":"medium"}'),
('Ananya Iyer','ananya@example.com','9876501004','{"verified":true,"occupation":"Doctor","risk":"low"}'),
('Kabir Mehta','kabir@example.com','9876501005','{"verified":false,"occupation":"Student","risk":"medium"}'),
('Ishita Nair','ishita@example.com','9876501006','{"verified":true,"occupation":"Architect","risk":"low"}'),
('Rohan Das','rohan@example.com','9876501007','{"verified":true,"occupation":"Consultant","risk":"low"}'),
('Meera Reddy','meera@example.com','9876501008','{"verified":true,"occupation":"Entrepreneur","risk":"medium"}');
INSERT INTO accounts(number,customer_id,branch_id,kind,balance,status) SELECT 'VB1000'||id,id,1+(id%4),CASE WHEN id%3=0 THEN 'Current' ELSE 'Savings' END,75000+id*42000,'Active' FROM customers;
INSERT INTO accounts(number,customer_id,branch_id,kind,balance,status) VALUES('VB10009',1,2,'Current',450000,'Active'),('VB100010',5,3,'Savings',25000,'Frozen');
DO $$ DECLARE i INTEGER; BEGIN FOR i IN 1..80 LOOP
PERFORM transfer_funds(1+(i%8),1+((i+1)%8),(500+(i*317)%12000)::numeric, (ARRAY['Vendor payment','Monthly rent','Consulting fee','Family transfer','Invoice settlement'])[1+(i%5)]);
UPDATE transfers SET created_at=now() - ((80-i)||' hours')::interval WHERE id=i;
END LOOP; END $$;
INSERT INTO loans(customer_id,kind,principal,rate,months,status) VALUES(1,'Home loan',4500000,8.5,240,'Active'),(3,'Business loan',1200000,11.25,60,'Active'),(4,'Vehicle loan',850000,9.2,60,'Active'),(5,'Education loan',600000,7.5,84,'Pending'),(8,'Business loan',2000000,10.5,72,'Pending');
