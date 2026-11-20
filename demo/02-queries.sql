-- Customer wealth ranking
WITH wealth AS (SELECT c.id,c.name,sum(a.balance) AS deposits FROM customers c JOIN accounts a ON a.customer_id=c.id GROUP BY c.id,c.name) SELECT *,dense_rank() OVER(ORDER BY deposits DESC) AS rank FROM wealth ORDER BY rank;

-- Above-average balances
SELECT a.number,c.name,a.balance FROM accounts a JOIN customers c ON c.id=a.customer_id WHERE a.balance>(SELECT avg(balance) FROM accounts) ORDER BY a.balance DESC;

-- Branch hierarchy
WITH RECURSIVE tree AS (SELECT id,name,parent_id,0 AS depth,name AS path FROM branches WHERE parent_id IS NULL UNION ALL SELECT b.id,b.name,b.parent_id,t.depth+1,t.path||' → '||b.name FROM branches b JOIN tree t ON b.parent_id=t.id) SELECT * FROM tree ORDER BY path;

-- Daily transfer volume
WITH daily AS (SELECT created_at::date AS day,count(*) AS transfers,sum(amount) AS volume FROM transfers GROUP BY 1) SELECT *,sum(volume) OVER(ORDER BY day) AS cumulative_volume FROM daily ORDER BY day;

-- Most recent transfer per account
WITH ranked AS (SELECT a.number,t.amount,t.narration,t.created_at,row_number() OVER(PARTITION BY a.id ORDER BY t.created_at DESC,t.id DESC) AS rn FROM accounts a JOIN transfers t ON t.from_account=a.id) SELECT * FROM ranked WHERE rn=1 ORDER BY number;

-- Loan exposure & EMI
SELECT c.name,l.kind,l.principal,l.rate,monthly_emi(l.principal,l.rate,l.months) AS monthly_payment FROM loans l JOIN customers c ON c.id=l.customer_id ORDER BY principal DESC;

-- Flexible KYC documents
SELECT name,kyc->>'occupation' AS occupation,kyc->>'risk' AS risk,kyc FROM customers WHERE kyc @> '{"verified":true}'::jsonb ORDER BY name;

-- Full-text search of transfer descriptions
SELECT id, narration, amount FROM transfers
WHERE to_tsvector('english', narration) @@ plainto_tsquery('english', 'rent')
ORDER BY id;
