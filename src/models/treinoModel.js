const db = require('../config/db');
const { semana, addDias, hojeISO } = require('../utils/datas');

const SELECT = `SELECT t.*, m.nome AS modalidade, m.met, c.nome AS criador_nome, c.tipo_perfil AS criador_perfil
  FROM treino t
  JOIN modalidade m ON m.id_modalidade = t.id_modalidade
  JOIN usuario c ON c.id_usuario = t.id_criador`;

async function listar(idUsuario, f = {}, pagina = 1, porPagina = 10) {
  const cond = ['t.id_usuario = ?'];
  const params = [idUsuario];
  if (f.de) { cond.push('t.data_treino >= ?'); params.push(f.de); }
  if (f.ate) { cond.push('t.data_treino <= ?'); params.push(f.ate); }
  if (f.modalidade) { cond.push('t.id_modalidade = ?'); params.push(f.modalidade); }
  if (f.status) { cond.push('t.status = ?'); params.push(f.status); }
  const where = cond.join(' AND ');
  const total = (await db.one(`SELECT COUNT(*) AS n FROM treino t WHERE ${where}`, params)).n;
  const offset = (pagina - 1) * porPagina;
  const itens = await db.query(
    `${SELECT} WHERE ${where} ORDER BY t.data_treino DESC, t.id_treino DESC
     LIMIT ${Number(porPagina)} OFFSET ${Number(offset)}`, params);
  return { itens, total, pagina, paginas: Math.max(1, Math.ceil(total / porPagina)) };
}

async function porId(id) {
  return db.one(`${SELECT} WHERE t.id_treino = ?`, [id]);
}

async function itens(idTreino) {
  return db.query(
    `SELECT te.*, e.nome AS exercicio, e.grupo_muscular, e.id_modalidade
     FROM treino_exercicio te JOIN exercicio e ON e.id_exercicio = te.id_exercicio
     WHERE te.id_treino = ? ORDER BY te.ordem`, [idTreino]);
}

async function gravarItens(q, idTreino, lista) {
  await q.query('DELETE FROM treino_exercicio WHERE id_treino = ?', [idTreino]);
  let ordem = 1;
  for (const it of lista) {
    await q.query(
      `INSERT INTO treino_exercicio (id_treino, id_exercicio, ordem, series, repeticoes, carga_kg, distancia_km, tempo_seg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idTreino, it.id_exercicio, ordem++, it.series, it.repeticoes, it.carga_kg, it.distancia_km, it.tempo_seg]);
  }
}

async function criar(t, lista) {
  return db.transaction(async (q) => {
    const r = await q.query(
      `INSERT INTO treino (id_usuario, id_criador, id_modalidade, titulo, data_treino, duracao_min,
         intensidade, calorias_estimadas, status, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id_usuario, t.id_criador, t.id_modalidade, t.titulo, t.data_treino, t.duracao_min,
        t.intensidade, t.calorias_estimadas, t.status, t.observacoes || null]);
    await gravarItens(q, r.insertId, lista);
    return r.insertId;
  });
}

async function atualizar(id, t, lista) {
  return db.transaction(async (q) => {
    await q.query(
      `UPDATE treino SET id_modalidade = ?, titulo = ?, data_treino = ?, duracao_min = ?, intensidade = ?,
         calorias_estimadas = ?, status = ?, observacoes = ? WHERE id_treino = ?`,
      [t.id_modalidade, t.titulo, t.data_treino, t.duracao_min, t.intensidade, t.calorias_estimadas,
        t.status, t.observacoes || null, id]);
    await gravarItens(q, id, lista);
  });
}

async function definirStatus(id, status) {
  await db.query('UPDATE treino SET status = ? WHERE id_treino = ?', [status, id]);
}

async function excluir(id) {
  await db.query('DELETE FROM treino WHERE id_treino = ?', [id]);
}

// Indicadores consideram só treinos realizados
async function resumoPeriodo(idUsuario, inicio, fim) {
  return db.one(
    `SELECT COUNT(*) AS treinos, COALESCE(SUM(duracao_min), 0) AS minutos,
       COALESCE(SUM(calorias_estimadas), 0) AS calorias
     FROM treino WHERE id_usuario = ? AND status = 'REALIZADO' AND data_treino BETWEEN ? AND ?`,
    [idUsuario, inicio, fim]);
}

async function minutosPorDia(idUsuario, inicio, fim) {
  const rows = await db.query(
    `SELECT data_treino AS dia, SUM(duracao_min) AS minutos FROM treino
     WHERE id_usuario = ? AND status = 'REALIZADO' AND data_treino BETWEEN ? AND ?
     GROUP BY data_treino`, [idUsuario, inicio, fim]);
  const mapa = Object.fromEntries(rows.map((r) => [r.dia, Number(r.minutos)]));
  return Array.from({ length: 7 }, (_, i) => mapa[addDias(inicio, i)] || 0);
}

// Volume (minutos) por semana nas últimas N semanas
async function volumeSemanal(idUsuario, semanas = 8) {
  const atual = semana();
  const inicio = addDias(atual.inicio, -7 * (semanas - 1));
  const rows = await db.query(
    `SELECT data_treino AS dia, duracao_min FROM treino
     WHERE id_usuario = ? AND status = 'REALIZADO' AND data_treino BETWEEN ? AND ?`,
    [idUsuario, inicio, atual.fim]);
  const out = Array.from({ length: semanas }, (_, i) => ({ inicio: addDias(inicio, 7 * i), minutos: 0 }));
  for (const r of rows) {
    const idx = Math.floor((new Date(r.dia) - new Date(inicio)) / (7 * 86400000));
    if (out[idx]) out[idx].minutos += Number(r.duracao_min);
  }
  return out;
}

async function frequenciaModalidade(idUsuario, dias = 90) {
  return db.query(
    `SELECT m.nome AS modalidade, COUNT(*) AS treinos FROM treino t
     JOIN modalidade m ON m.id_modalidade = t.id_modalidade
     WHERE t.id_usuario = ? AND t.status = 'REALIZADO' AND t.data_treino >= ?
     GROUP BY m.nome ORDER BY treinos DESC`, [idUsuario, addDias(hojeISO(), -dias)]);
}

async function ultimosRealizados(idUsuario, limite = 5) {
  return db.query(`${SELECT} WHERE t.id_usuario = ? AND t.status = 'REALIZADO'
    ORDER BY t.data_treino DESC, t.id_treino DESC LIMIT ${Number(limite)}`, [idUsuario]);
}

async function planejados(idUsuario, limite = 5) {
  return db.query(`${SELECT} WHERE t.id_usuario = ? AND t.status = 'PLANEJADO'
    ORDER BY t.data_treino ASC, t.id_treino ASC LIMIT ${Number(limite)}`, [idUsuario]);
}

async function modelosParaCopia(adminId) {
  return db.query(
    `SELECT t.id_treino, t.titulo, t.data_treino, m.nome AS modalidade, u.nome AS dono, u.id_usuario
     FROM treino t
     JOIN modalidade m ON m.id_modalidade = t.id_modalidade
     JOIN usuario u ON u.id_usuario = t.id_usuario
     WHERE t.id_usuario = ? OR u.id_administrador = ?
     ORDER BY t.data_treino DESC LIMIT 50`, [adminId, adminId]);
}

module.exports = {
  listar, porId, itens, criar, atualizar, definirStatus, excluir, resumoPeriodo, minutosPorDia,
  volumeSemanal, frequenciaModalidade, ultimosRealizados, planejados, modelosParaCopia,
};
