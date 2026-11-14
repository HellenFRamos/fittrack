// UC09 – Registrar medidas corporais (próprias ou de um vinculado) e consulta pelo vinculado (RF17)
const medidaModel = require('../models/medidaModel');
const { pertence, naoEncontrado } = require('../middlewares/contexto');
const { numOuNulo, texto, dataValida } = require('../utils/validacao');
const { hojeISO } = require('../utils/datas');

function base(req) { return `${req.ctx.prefixo}/medidas`; }

async function tela(req, res, extra = {}) {
  const dono = req.ctx.dono;
  const medidas = await medidaModel.listar(dono.id_usuario, dono.altura_cm);
  return res.status(extra.status || 200).render('pages/medidas/lista', {
    titulo: req.ctx.rotulos.medidas,
    medidas,
    medida: extra.medida || { data_medicao: hojeISO(), peso_kg: '', percentual_gordura: '', cintura_cm: '', observacao: '' },
    acao: extra.acao || base(req),
    editando: !!extra.editando,
    erros: extra.erros || {},
    semAltura: !dono.altura_cm,
  });
}

async function listar(req, res, next) {
  try { return await tela(req, res); } catch (err) { return next(err); }
}

async function editar(req, res, next) {
  try {
    const m = await medidaModel.porId(Number(req.params.id));
    if (!pertence(req, m)) return naoEncontrado(res, 'Medição');
    return await tela(req, res, { medida: m, acao: `${base(req)}/${m.id_medida}`, editando: true });
  } catch (err) { return next(err); }
}

// UC09 passo 4 / A2 – valores impossíveis são recusados junto ao campo
function ler(req) {
  const b = req.body;
  const m = {
    data_medicao: texto(b.data_medicao, 10), peso_kg: numOuNulo(b.peso_kg),
    percentual_gordura: numOuNulo(b.percentual_gordura), cintura_cm: numOuNulo(b.cintura_cm),
    observacao: texto(b.observacao, 255),
  };
  const erros = {};
  if (!dataValida(m.data_medicao)) erros.data_medicao = 'Informe a data da medição.';
  else if (m.data_medicao > hojeISO()) erros.data_medicao = 'A data não pode estar no futuro.';
  if (m.peso_kg === null || Number.isNaN(m.peso_kg) || m.peso_kg < 20 || m.peso_kg > 400) erros.peso_kg = 'Informe um peso entre 20 e 400 kg.';
  if (m.percentual_gordura !== null && (Number.isNaN(m.percentual_gordura) || m.percentual_gordura < 2 || m.percentual_gordura > 70)) {
    erros.percentual_gordura = 'O percentual de gordura deve ficar entre 2% e 70%.';
  }
  if (m.cintura_cm !== null && (Number.isNaN(m.cintura_cm) || m.cintura_cm < 30 || m.cintura_cm > 250)) {
    erros.cintura_cm = 'A cintura deve ficar entre 30 e 250 cm.';
  }
  return { m, erros };
}

async function criar(req, res, next) {
  try {
    const { m, erros } = ler(req);
    if (Object.keys(erros).length) return await tela(req, res, { medida: m, erros, status: 400 });
    await medidaModel.criar({ ...m, id_usuario: req.ctx.dono.id_usuario });
    req.flash('sucesso', req.ctx.dono.altura_cm
      ? 'Medição registrada. O novo peso já entra no cálculo de calorias.'
      : 'Medição registrada sem IMC. Complete a altura no perfil para calcular o IMC.'); // UC09 A1
    return res.redirect(base(req));
  } catch (err) { return next(err); }
}

async function atualizar(req, res, next) {
  try {
    const atual = await medidaModel.porId(Number(req.params.id));
    if (!pertence(req, atual)) return naoEncontrado(res, 'Medição');
    const { m, erros } = ler(req);
    if (Object.keys(erros).length) {
      return await tela(req, res, { medida: { ...m, id_medida: atual.id_medida }, acao: `${base(req)}/${atual.id_medida}`, editando: true, erros, status: 400 });
    }
    await medidaModel.atualizar(atual.id_medida, m);
    req.flash('sucesso', 'Medição atualizada.');
    return res.redirect(base(req));
  } catch (err) { return next(err); }
}

async function excluir(req, res, next) {
  try {
    const m = await medidaModel.porId(Number(req.params.id));
    if (!pertence(req, m)) return naoEncontrado(res, 'Medição');
    await medidaModel.excluir(m.id_medida);
    req.flash('sucesso', 'Medição excluída.');
    return res.redirect(base(req));
  } catch (err) { return next(err); }
}

module.exports = { listar, editar, criar, atualizar, excluir };
