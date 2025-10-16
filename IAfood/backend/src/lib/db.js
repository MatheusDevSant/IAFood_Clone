const mysql = require("mysql2/promise");
require("dotenv").config();

let connection;

// cria conexão única (sem pool)
async function initDB() {
  if (!connection) {
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASS || "",
        database: process.env.DB_NAME || "ifood_clone",
      });
      console.log("✅ Conectado ao banco MySQL com sucesso!");
    } catch (err) {
      console.error("❌ Erro ao conectar ao MySQL:", err);
      process.exit(1);
    }
  }
  return connection;
}

// wrapper que permite usar await db.query(...)
module.exports = {
  query: async (sql, params) => {
    const conn = await initDB();
    const [rows] = await conn.query(sql, params);
    return [rows];
  },
};
  