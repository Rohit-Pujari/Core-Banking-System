CREATE TABLE IF NOT EXISTS app_users (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('customer','employee','admin')),
 customer_id INTEGER UNIQUE REFERENCES customers(id),
 CHECK ((role='customer' AND customer_id IS NOT NULL) OR (role<>'customer' AND customer_id IS NULL))
);
CREATE TABLE IF NOT EXISTS app_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE loans ADD CONSTRAINT loans_status_check CHECK(status IN ('Active','Pending','Closed','Rejected'));
ALTER TABLE loans ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES app_users(id);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON app_sessions(expires_at);
