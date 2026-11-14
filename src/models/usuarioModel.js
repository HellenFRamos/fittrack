// Modelo de usuários (tabela usuario – herança em tabela única).
const db = require('../config/db');
const { semana, hojeISO, addDias } = require('../utils/datas');

const CAMPOS = `id_usuario, nome, email, data_nascimento, sexo, altura_cm, tipo_perfil,
  id_administrador, ativo, senha_provisoria, criado_em`;

async function porEmail(email) {
  return db.one('SELECT * FROM usuario WHERE email = ?', [String(email).trim().toLowerCase()]);
}

async function porId(id) {
  return db.one(`SELECT ${CAMPOS} FROM usuario WHERE id_usuario = ?`, [id]);
}

async function senhaHash(id) {
  const r = await db.one('SELECT senha_hash FROM usuario WHERE id_usuario = ?', [id]);
  return r ? r.senha_hash : null;
}

async function emailEmUso(email, exceto = 0) {
  const r = await db.one('SELECT id_usuario FROM usuario WHERE email = ? AND id_usuario <> ?',
    [String(email).trim().toLowerCase(), exceto]);
  return !!r;
}

async function criar(u) {
  const r = await db.query(
    `INSERT INTO usuario (nome, email, senha_hash, data_nascimento, sexo, altura_cm, tipo_perfil,
       id_administrador, senha_provisoria, consentimento_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [u.nome, u.email.trim().toLowerCase(), u.senha_hash, u.data_nascimento || null, u.sexo || null,
      u.altura_cm || null, u.tipo_perfil, u.id_administrador || null, u.senha_provisoria ? 1 : 0,
      u.consentimento ? new Date() : null]);
  return r.insertId;
}

async function atualizarPerfil(id, u) {
  await db.query(
    'UPDATE usuario SET nome = ?, data_nascimento = ?, sexo = ?, altura_cm = ? WHERE id_usuario = ?',
    [u.nome, u.data_nascimento || null, u.sexo || null, u.altura_cm || null, id]);
}

async function atualizarSenha(id, hash, provisoria = false) {
  await db.query('UPDATE usuario SET senha_hash = ?, senha_provisoria = ? WHERE id_usuario = ?',
    [hash, provisoria ? 1 : 0, id]);
}

// RF19 – exclusão definitiva (as tabelas filhas usam ON DELETE CASCADE)
async function excluir(id) {
  await db.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
}

// ---------------------------------------------------------------- vinculados

// RN04 – o administrador só enxerga os próprios vinculados
async function vinculadoDoAdmin(adminId, vinculadoId) {
  return db.one(`SELECT ${CAMPOS} FROM usuario
    WHERE id_usuario = ? AND id_administrador = ? AND tipo_perfil = 'VINCULADO'`, [vinculadoId, adminId]);
}

async function atualizarVinculado(id, u) {
  await db.query(
    `UPDATE usuario SET nome = ?, email = ?, data_nascimento = ?, sexo = ?, altura_cm = ?
     WHERE id_usuario = ? AND tipo_perfil = 'VINCULADO'`,
    [u.nome, u.email.trim().toLowerCase(), u.data_nascimento || null, u.sexo || null, u.altura_cm || null, id]);
}

// RN08 – desativação lógica
async function definirAtivo(id, ativo) {
  await db.query('UPDATE usuario SET ativo = ? WHERE id_usuario = ?', [ativo ? 1 : 0, id]);
}

// Lista com aderência da semana: treinos realizados / treinos da semana (RF13)
async function listarVinculados(adminId, { busca = '', situacao = 'ativos' } = {}) {
  const { inicio, fim } = semana();
  const params = [inicio, fim, inicio, fim, adminId];
  let filtro = '';
  if (situacao === 'ativos') filtro += ' AND u.ativo = 1';
  else if (situacao === 'inativos') filtro += ' AND u.ativo = 0';
  if (busca) {
    filtro += ' AND (u.nome LIKE ? OR u.email LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }
  return db.query(
    `SELECT u.id_usuario, u.nome, u.email, u.ativo, u.senha_provisoria, u.criado_em,
       (SELECT COUNT(*) FROM treino t WHERE t.id_usuario = u.id_usuario AND t.status = 'REALIZADO'
          AND t.data_treino BETWEEN ? AND ?) AS realizados_semana,
       (SELECT COUNT(*) FROM treino t WHERE t.id_usuario = u.id_usuario
          AND t.data_treino BETWEEN ? AND ?) AS treinos_semana,
       (SELECT COUNT(*) FROM meta m WHERE m.id_usuario = u.id_usuario AND m.status = 'ATIVA') AS metas_ativas,
       (SELECT MAX(t.data_treino) FROM treino t WHERE t.id_usuario = u.id_usuario
          AND t.status = 'REALIZADO') AS ultimo_treino
     FROM usuario u
     WHERE u.id_administrador = ? AND u.tipo_perfil = 'VINCULADO' ${filtro}
     ORDER BY u.ativo DESC, u.nome`, params);
}

// Resumo para o painel do administrador (UC05 A2)
async function resumoVinculados(adminId) {
  const todos = await listarVinculados(adminId, { situacao: 'ativos' });
  const limite = addDias(hojeISO(), -7);
  return {
    total: todos.length,
    treinaramSemana: todos.filter((v) => v.realizados_semana > 0).length,
    semTreinar: todos.filter((v) => !v.ultimo_treino || v.ultimo_treino < limite),
  };
}

module.exports = {
  porEmail, porId, senhaHash, emailEmUso, criar, atualizarPerfil, atualizarSenha, excluir,
  vinculadoDoAdmin, atualizarVinculado, definirAtivo, listarVinculados, resumoVinculados,
};
