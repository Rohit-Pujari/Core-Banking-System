export const queries = [{
  title: 'Customer wealth ranking',
  concept: 'CTE + window function',
  sql: `WITH wealth AS (SELECT c.id,c.name,sum(a.balance) AS deposits FROM customers c JOIN accounts a ON a.customer_id=c.id GROUP BY c.id,c.name) SELECT *,dense_rank() OVER(ORDER BY deposits DESC) AS position_no FROM wealth ORDER BY position_no`
}, {
  title: 'Above-average balances',
  concept: 'Nested subquery',
  sql: `SELECT a.number,c.name,a.balance FROM accounts a JOIN customers c ON c.id=a.customer_id WHERE a.balance>(SELECT avg(balance) FROM accounts) ORDER BY a.balance DESC`
}, {
  title: 'Branch hierarchy',
  concept: 'Recursive CTE',
  sql: `WITH RECURSIVE tree AS (SELECT id,name,parent_id,0 AS depth,CAST(name AS CHAR(2000)) AS path FROM branches WHERE parent_id IS NULL UNION ALL SELECT b.id,b.name,b.parent_id,t.depth+1,CONCAT(t.path,' → ',b.name) FROM branches b JOIN tree t ON b.parent_id=t.id) SELECT * FROM tree ORDER BY path`
}, {
  title: 'Daily transfer volume',
  concept: 'CTE + running window',
  sql: `WITH daily AS (SELECT DATE(created_at) AS day,count(*) AS transfers,sum(amount) AS volume FROM transfers GROUP BY 1) SELECT *,sum(volume) OVER(ORDER BY day) AS cumulative_volume FROM daily ORDER BY day`
}, {
  title: 'Most recent transfer per account',
  concept: 'ROW_NUMBER partition',
  sql: `WITH ranked AS (SELECT a.number,t.amount,t.narration,t.created_at,row_number() OVER(PARTITION BY a.id ORDER BY t.created_at DESC,t.id DESC) AS rn FROM accounts a JOIN transfers t ON t.from_account=a.id) SELECT * FROM ranked WHERE rn=1 ORDER BY number`
}, {
  title: 'Loan exposure & EMI',
  concept: 'Join + stored function',
  sql: `SELECT c.name,l.kind,l.principal,l.rate,monthly_emi(l.principal,l.rate,l.months) AS monthly_payment FROM loans l JOIN customers c ON c.id=l.customer_id ORDER BY principal DESC`
}, {
  title: 'Flexible KYC documents',
  concept: 'JSON / document query',
  sql: `SELECT name,JSON_UNQUOTE(JSON_EXTRACT(kyc,'$.occupation')) AS occupation,JSON_UNQUOTE(JSON_EXTRACT(kyc,'$.risk')) AS risk,kyc FROM customers WHERE JSON_CONTAINS(kyc,'{"verified":true}') ORDER BY name`
}];
