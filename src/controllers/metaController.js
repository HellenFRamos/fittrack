// UC07 – Gerenciar metas · UC08 – Registrar progresso · UC11 – Atribuir meta · UC12 – Consultar
const metaModel = require('../models/metaModel');
const { pertence, naoEncontrado } = require('../middlewares/contexto');
const { numOuNulo, texto, dataValida } = require('../utils/validacao');
const { hojeISO, addDias } = require('../utils/datas');
const { ROTULOS, UNIDADE_META } = require('../utils/formato');

const TIPOS = Object.keys(ROTULOS.tipoMeta);
function base(req) { return `${req.ctx.prefixo}/metas`; }

async function listar(req, res, next) {
  try {
    const filtro = ['ATIVA', 'CONCLUIDA', 'CANCELADA'].includes(req.query.status) ? req.query.status : null;
    const metas = await metaModel.listar(req.ctx.dono.id_usuario, filtro);
    const todas = filtro ? await metaModel.listar(req.ctx.dono.id_usuario) : metas;
    const contagem = { ATIVA: 0, CONCLUIDA: 0, CANCELADA: 0 };
    todas.forEach((m) => { contagem[m.status] += 1; });
    return res.render('pages/metas/lista', { titulo: req.ctx.rotulos.metas, metas, filtro, contagem });
  } catch (err) { return next(err); }
}

async function detalhar(req, res, next, extra = {}) {
  try {
    const meta = await metaModel.porId(Number(req.params.id));
    if (!pertence(req, meta)) return naoEncontrado(res, 'Meta');
    const historico = await metaModel.historico(meta.id_meta);
    return res.status(extra.status || 200).render('pages/metas/detalhe', {
      titulo: meta.titulo, meta, historico, erros: extra.erros || {}, progresso: extra.progresso || { data_registro: hojeISO(), valor: '', observacao: '' },
      parabens: req.session.parabensMeta === meta.id_meta ? (delete req.session.parabensMeta, true) : false,
    });
  } catch (err) { return next(err); }
}

function form(res, req, titulo, acao, meta, erros = {}, status = 200) {
  return res.status(status).render('pages/metas/form', {
    titulo, acao, meta, erros, tipos: TIPOS, unidades: UNIDADE_META,
  });
}

function novo(req, res) {
  const hoje = hojeISO();
  form(res, req, req.ctx.tipo === 'vinculado' ? 'Atribuir meta' : 'Nova meta', base(req), {
    titulo: '', tipo: 'PESO', valor_inicial: '', valor_alvo: '', unidade: 'kg', data_inicio: hoje, data_limite: addDias(hoje, 60),
  });
}

async function editar(req, res, next) {
  try {
    const meta = await metaModel.porId(Number(req.params.id));
    if (!pertence(req, meta)) return naoEncontrado(res, 'Meta');
    return form(res, req, 'Editar meta', `${base(req)}/${meta.id_meta}`, meta);
  } catch (err) { return next(err); }
}

// UC07 passo 4 / A1 – alvo diferente do inicial; prazo posterior ao início e não vencido
function lerFormulario(req, existente = null) {
  const b = req.body;
  const m = {
    titulo: texto(b.titulo, 100), tipo: texto(b.tipo, 20), unidade: texto(b.unidade, 20),
    valor_inicial: numOuNulo(b.valor_inicial), valor_alvo: numOuNulo(b.valor_alvo),
    data_inicio: texto(b.data_inicio, 10), data_limite: texto(b.data_limite, 10),
  };
  const erros = {};
  if (m.titulo.length < 2) erros.titulo = 'Informe um título para a meta.';
  if (!TIPOS.includes(m.tipo)) erros.tipo = 'Selecione o tipo da meta.';
  if (!m.unidade) erros.unidade = 'Informe a unidade (ex.: kg, km, min).';
  const valido = (v) => v !== null && !Number.isNaN(v) && Math.abs(v) < 1000000;
  if (!valido(m.valor_inicial)) erros.valor_inicial = 'Informe o valor inicial.';
  if (!valido(m.valor_alvo)) erros.valor_alvo = 'Informe o valor-alvo.';
  else if (valido(m.valor_inicial) && m.valor_alvo === m.valor_inicial) erros.valor_alvo = 'O valor-alvo deve ser diferente do valor inicial.';
  if (!dataValida(m.data_inicio)) erros.data_inicio = 'Informe a data de início.';
  if (!dataValida(m.data_limite)) erros.data_limite = 'Informe o prazo.';
  else if (dataValida(m.data_inicio) && m.data_limite <= m.data_inicio) erros.data_limite = 'O prazo deve ser posterior à data de início.';
  else if (m.data_limite < hojeISO() && (!existente || existente.data_limite !== m.data_limite)) erros.data_limite = 'O prazo não pode estar no passado.';
  return { m, erros };
}

async function criar(req, res, next) {
  try {
    const { m, erros } = lerFormulario(req);
    if (Object.keys(erros).length) return form(res, req, req.ctx.tipo === 'vinculado' ? 'Atribuir meta' : 'Nova meta', base(req), m, erros, 400);
    const id = await metaModel.criar({ ...m, id_usuario: req.ctx.dono.id_usuario, id_criador: req.user.id_usuario });
    req.flash('sucesso', 'Meta criada. Registre o progresso sempre que avançar!');
    return res.redirect(`${base(req)}/${id}`);
  } catch (err) { return next(err); }
}

async function atualizar(req, res, next) {
  try {
    const atual = await metaModel.porId(Number(req.params.id));
    if (!pertence(req, atual)) return naoEncontrado(res, 'Meta');
    const { m, erros } = lerFormulario(req, atual);
    if (Object.keys(erros).length) return form(res, req, 'Editar meta', `${base(req)}/${atual.id_meta}`, { ...m, id_meta: atual.id_meta }, erros, 400);
    const nova = await metaModel.atualizar(atual.id_meta, m); // UC07 A2 – percentual recalculado
    if (nova.status === 'CONCLUIDA' && atual.status !== 'CONCLUIDA') req.session.parabensMeta = atual.id_meta;
    req.flash('sucesso', 'Meta atualizada.');
    return res.redirect(`${base(req)}/${atual.id_meta}`);
  } catch (err) { return next(err); }
}

async function registrarProgresso(req, res, next) {
  try {
    const meta = await metaModel.porId(Number(req.params.id));
    if (!pertence(req, meta)) return naoEncontrado(res, 'Meta');
    const p = {
      data_registro: texto(req.body.data_registro, 10), valor: numOuNulo(req.body.valor), observacao: texto(req.body.observacao, 255),
    };
    const erros = {};
    if (meta.status !== 'ATIVA') erros.valor = 'Só é possível registrar progresso em metas ativas.';
    if (!dataValida(p.data_registro)) erros.data_registro = 'Informe a data.';
    else if (p.data_registro > hojeISO()) erros.data_registro = 'A data não pode estar no futuro.';
    if (p.valor === null || Number.isNaN(p.valor) || Math.abs(p.valor) >= 1000000) erros.valor = erros.valor || 'Informe o valor atual.';
    if (Object.keys(erros).length) return detalhar(req, res, next, { erros, progresso: p, status: 400 });
    const nova = await metaModel.registrarProgresso(meta.id_meta, p);
    if (nova.status === 'CONCLUIDA') req.session.parabensMeta = meta.id_meta; // UC08 A1
    else req.flash('sucesso', `Progresso registrado: ${nova.percentual}% concluído.`);
    return res.redirect(`${base(req)}/${meta.id_meta}`);
  } catch (err) { return next(err); }
}

async function excluirProgresso(req, res, next) {
  try {
    const meta = await metaModel.porId(Number(req.params.id));
    if (!pertence(req, meta)) return naoEncontrado(res, 'Meta');
    await metaModel.excluirProgresso(meta.id_meta, Number(req.params.pid));
    req.flash('sucesso', 'Registro de progresso removido.');
    return res.redirect(`${base(req)}/${meta.id_meta}`);
  } catch (err) { return next(err); }
}

// UC07 A3 – cancelar (sai do painel, continua no histórico)
async function cancelar(req, res, next) {
  try {
    const meta = await metaModel.porId(Number(req.params.id));
    if (!pertence(req, meta)) return naoEncontrado(res, 'Meta');
    await metaModel.definirStatus(meta.id_meta, 'CANCELADA');
    req.flash('sucesso', 'Meta cancelada. Ela continua disponível no histórico.');
    return res.redirect(`${base(req)}/${meta.id_meta}`);
  } catch (err) { return next(err); }
}

async function reativar(req, res, next) {
  try {
    const meta = await metaModel.porId(Number(req.params.id));
    if (!pertence(req, meta)) return naoEncontrado(res, 'Meta');
    await metaModel.definirStatus(meta.id_meta, 'ATIVA');
    await metaModel.recalcularStatus(meta.id_meta);
    req.flash('sucesso', 'Meta reativada.');
    return res.redirect(`${base(req)}/${meta.id_meta}`);
  } catch (err) { return next(err); }
}

// UC07 A4 – excluir com o histórico
async function excluir(req, res, next) {
  try {
    const meta = await metaModel.porId(Number(req.params.id));
    if (!pertence(req, meta)) return naoEncontrado(res, 'Meta');
    await metaModel.excluir(meta.id_meta);
    req.flash('sucesso', 'Meta excluída junto com o histórico de progresso.');
    return res.redirect(base(req));
  } catch (err) { return next(err); }
}

module.exports = {
  listar, detalhar: (req, res, next) => detalhar(req, res, next), novo, editar, criar, atualizar,
  registrarProgresso, excluirProgresso, cancelar, reativar, excluir,
};
