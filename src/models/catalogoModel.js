const db = require('../config/db');

async function modalidades() {
  return db.query('SELECT id_modalidade, nome, categoria, met FROM modalidade ORDER BY nome');
}

async function modalidade(id) {
  return db.one('SELECT id_modalidade, nome, categoria, met FROM modalidade WHERE id_modalidade = ?', [id]);
}

async function exercicios() {
  return db.query(
    `SELECT e.id_exercicio, e.id_modalidade, e.nome, e.grupo_muscular, m.nome AS modalidade
     FROM exercicio e JOIN modalidade m ON m.id_modalidade = e.id_modalidade
     ORDER BY m.nome, e.nome`);
}

async function exerciciosExistem(ids) {
  if (!ids.length) return true;
  const unicos = [...new Set(ids.map(Number))];
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM exercicio WHERE id_exercicio IN (${unicos.map(() => '?').join(',')})`, unicos);
  return r[0].n === unicos.length;
}

module.exports = { modalidades, modalidade, exercicios, exerciciosExistem };
