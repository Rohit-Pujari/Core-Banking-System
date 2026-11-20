export function wrapDatabase(pool) {
  function reader(connection) {
    return { async query(sql, params = []) {
      const [result] = await connection.execute(sql, params);
      return Array.isArray(result) ? { rows: result } : result;
    }};
  }
  return {
    ...reader(pool),
    async transaction(work) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await work(reader(connection));
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally { connection.release(); }
    },
    close: () => pool.end()
  };
}
export async function getDb() {
  const { createPool } = await import('mysql2/promise');
  globalThis.bankDbPromise ??= Promise.resolve(wrapDatabase(createPool(process.env.DATABASE_URL || 'mysql://bank_admin:bank_demo@127.0.0.1:3307/vault')));
  return globalThis.bankDbPromise;
}
