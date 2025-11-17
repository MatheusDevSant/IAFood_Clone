const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

function initPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'ifood_clone',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('✅ MySQL pool criado');
  }
  return pool;
}

module.exports = {
  // Query helper que mantém compatibilidade com o código existente (retorna [rows])
  query: async (sql, params) => {
    const p = initPool();
    const [rows] = await p.query(sql, params);
    return [rows];
  },

  // Expõe getConnection para permitir transações (conn.beginTransaction(), commit(), rollback(), release())
  getConnection: async () => {
    const p = initPool();
    const conn = await p.getConnection();
    // conn é um objeto connection do mysql2; o código atual espera métodos query, beginTransaction, commit, rollback, release
    return conn;
  },
};
  