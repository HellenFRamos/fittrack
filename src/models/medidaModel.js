const db = require('../config/db');
const { imc, classificacaoImc } = require('../utils/regras');
const { addDias, hojeISO } = require('../utils/datas');

function comImc(m, alturaCm) {
  if (!m) return m;
  const v = imc(m.peso_kg, alturaCm);
  const exato = v == null ? null : Number(m.peso_kg) / (Number(alturaCm) / 100) ** 2;
  return { ...m, imc: v, classificacao: classificacaoImc(exato) };
}

async function listar(idUsuario, alturaCm) {
  const rows = await db.query(
    'SELECT * FROM medida_corporal WHERE id_usuario = ? ORDER BY data_medicao DESC, id_medida DESC', [idUsuario]);
  return rows.map((m) => comImc(m, alturaCm));
}

async function porId(id) {
  return db.one('SELECT * FROM medida_corporal WHERE id_medida = ?', [id]);
}

async function ultima(idUsuario) {
  return db.one(
    'SELECT * FROM medida_corporal WHERE id_usuario = ? ORDER BY data_medicao DESC, id_medida DESC LIMIT 1',
    [idUsuario]);
}

async function pesoReferenciaMes(idUsuario) {
  return db.one(
    `SELECT peso_kg, data_medicao FROM medida_corporal WHERE id_usuario = ? AND data_medicao <= ?
     ORDER BY data_medicao DESC, id_medida DESC LIMIT 1`, [idUsuario, addDias(hojeISO(), -30)]);
}

async function criar(m) {
  const r = await db.query(
    `INSERT INTO medida_corporal (id_usuario, data_medicao, peso_kg, percentual_gordura, cintura_cm, observacao)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [m.id_usuario, m.data_medicao, m.peso_kg, m.percentual_gordura, m.cintura_cm, m.observacao || null]);
  return r.insertId;
}

async function atualizar(id, m) {
  await db.query(
    `UPDATE medida_corporal SET data_medicao = ?, peso_kg = ?, percentual_gordura = ?, cintura_cm = ?,
       observacao = ? WHERE id_medida = ?`,
    [m.data_medicao, m.peso_kg, m.percentual_gordura, m.cintura_cm, m.observacao || null, id]);
}

async function excluir(id) {
  await db.query('DELETE FROM medida_corporal WHERE id_medida = ?', [id]);
}

module.exports = { listar, porId, ultima, pesoReferenciaMes, criar, atualizar, excluir, comImc };
