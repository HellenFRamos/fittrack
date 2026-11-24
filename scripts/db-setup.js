require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const name = process.env.DB_NAME || 'fittrack';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await conn.query(`USE \`${name}\``);
  for (const file of ['schema.sql', 'catalogo.sql']) {
    await conn.query(fs.readFileSync(path.join(__dirname, '..', 'db', file), 'utf8'));
    console.log(`✔ ${file} aplicado`);
  }
  await conn.end();
  console.log(`Banco "${name}" pronto.`);
})().catch((err) => {
  console.error('Erro ao preparar o banco:', err.message);
  process.exit(1);
});
