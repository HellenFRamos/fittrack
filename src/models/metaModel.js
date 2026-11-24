const db = require('../config/db');
const { percentualMeta } = require('../utils/regras');
const { hojeISO, diffDias } = require('../utils/datas');

const SELECT = `SELECT m.*, c.nome AS criador_nome, c.tipo_perfil AS criador_perfil,
    (SELECT p.valor FROM progresso_meta p WHERE p.id_meta = m.id_meta
       ORDER BY p.data_registro DESC, p.id_progresso DESC LIMIT 1) AS ultimo_valor
  FROM meta m JOIN usuario c ON c.id_usuario = m.id_criador`;

function enriquecer(m) {
  if (!m) return m;
  const atual = m.ultimo_valor ?? m.valor_inicial;
  const hoje = hojeISO();
  const dias = diffDias(hoje, m.data_limite);
  return {
    ...m,
    valor_atual: Number(atual),
    percentual: m.status === 'CONCLUIDA' ? 100 : percentualMeta(m.valor_inicial, m.valor_alvo, atual),
    dias_restantes: dias,
    vencida: m.status === 'ATIVA' && dias < 0,
    perto_do_prazo: m.status === 'ATIVA' && dias >= 0 && dias <= 7,
  };
}

async function listar(idUsuario, status = null) {
  const params = [idUsuario];
  let cond = '';
  if (status) { cond = ' AND m.status = ?'; params.push(status); }
  const rows = await db.query(`${SELECT} WHERE m.id_usuario = ? ${cond}
    ORDER BY FIELD(m.status, 'ATIVA', 'CONCLUIDA', 'CANCELADA'), m.data_limite ASC`, params);
  return rows.map(enriquecer);
}

async function porId(id) {
  return enriquecer(await db.one(`${SELECT} WHERE m.id_meta = ?`, [id]));
}

async function criar(m) {
  const r = await db.query(
    `INSERT INTO meta (id_usuario, id_criador, titulo, tipo, valor_inicial, valor_alvo, unidade,
       data_inicio, data_limite, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ATIVA')`,
    [m.id_usuario, m.id_criador, m.titulo, m.tipo, m.valor_inicial, m.valor_alvo, m.unidade,
      m.data_inicio, m.data_limite]);
  return r.insertId;
}

async function atualizar(id, m) {
  await db.query(
    `UPDATE meta SET titulo = ?, tipo = ?, valor_inicial = ?, valor_alvo = ?, unidade = ?,
       data_inicio = ?, data_limite = ? WHERE id_meta = ?`,
    [m.titulo, m.tipo, m.valor_inicial, m.valor_alvo, m.unidade, m.data_inicio, m.data_limite, id]);
  return recalcularStatus(id);
}

async function definirStatus(id, status) {
  await db.query('UPDATE meta SET status = ? WHERE id_meta = ?', [status, id]);
}

async function excluir(id) {
  await db.query('DELETE FROM meta WHERE id_meta = ?', [id]);
}

async function historico(idMeta) {
  return db.query(
    `SELECT * FROM progresso_meta WHERE id_meta = ? ORDER BY data_registro ASC, id_progresso ASC`, [idMeta]);
}

async function registrarProgresso(idMeta, p) {
  await db.query('INSERT INTO progresso_meta (id_meta, data_registro, valor, observacao) VALUES (?, ?, ?, ?)',
    [idMeta, p.data_registro, p.valor, p.observacao || null]);
  return recalcularStatus(idMeta);
}

async function excluirProgresso(idMeta, idProgresso) {
  await db.query('DELETE FROM progresso_meta WHERE id_progresso = ? AND id_meta = ?', [idProgresso, idMeta]);
  return recalcularStatus(idMeta);
}

async function recalcularStatus(idMeta) {
  const raw = await db.one(`${SELECT} WHERE m.id_meta = ?`, [idMeta]);
  if (!raw || raw.status === 'CANCELADA') return enriquecer(raw);
  const pct = percentualMeta(raw.valor_inicial, raw.valor_alvo, raw.ultimo_valor ?? raw.valor_inicial);
  const novo = pct >= 100 ? 'CONCLUIDA' : 'ATIVA';
  if (novo !== raw.status) await definirStatus(idMeta, novo);
  return enriquecer({ ...raw, status: novo });
}

module.exports = {
  listar, porId, criar, atualizar, definirStatus, excluir, historico, registrarProgresso,
  excluirProgresso, recalcularStatus,
};
