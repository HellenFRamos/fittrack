// UC06 – Gerenciar treinos · UC11 – Atribuir treino (e copiar, A1; marcar realizado, A2)
// UC12 – Consultar treinos atribuídos (somente leitura). Rotas montadas sob req.ctx.prefixo.
const treinoModel = require('../models/treinoModel');
const catalogoModel = require('../models/catalogoModel');
const medidaModel = require('../models/medidaModel');
const usuarioModel = require('../models/usuarioModel');
const { pertence, naoEncontrado } = require('../middlewares/contexto');
const { caloriasEstimadas, statusPorData } = require('../utils/regras');
const { numOuNulo, texto, dataValida } = require('../utils/validacao');
const { hojeISO } = require('../utils/datas');

const INTENSIDADES = ['LEVE', 'MODERADA', 'VIGOROSA'];
const MAX_ITENS = 30;

function base(req) { return `${req.ctx.prefixo}/treinos`; }

// ---------------------------------------------------------------- listagem (RF05)
async function listar(req, res, next) {
  try {
    const q = req.query;
    const filtros = {
      de: dataValida(q.de) ? q.de : '',
      ate: dataValida(q.ate) ? q.ate : '',
      modalidade: Number(q.modalidade) || '',
      status: ['PLANEJADO', 'REALIZADO'].includes(q.status) ? q.status : '',
    };
    const pagina = Math.max(1, Number(q.pagina) || 1);
    const [resultado, modalidades] = await Promise.all([
      treinoModel.listar(req.ctx.dono.id_usuario, filtros, pagina, 10),
      catalogoModel.modalidades(),
    ]);
    return res.render('pages/treinos/lista', { titulo: req.ctx.rotulos.treinos, resultado, filtros, modalidades });
  } catch (err) { return next(err); }
}

// ---------------------------------------------------------------- detalhes
async function detalhar(req, res, next) {
  try {
    const t = await treinoModel.porId(Number(req.params.id));
    if (!pertence(req, t)) return naoEncontrado(res, 'Treino');
    const itens = await treinoModel.itens(t.id_treino);
    return res.render('pages/treinos/detalhe', { titulo: t.titulo, treino: t, itens });
  } catch (err) { return next(err); }
}

// ---------------------------------------------------------------- formulário
async function dadosFormulario(req) {
  const [modalidades, exercicios, ultima] = await Promise.all([
    catalogoModel.modalidades(), catalogoModel.exercicios(), medidaModel.ultima(req.ctx.dono.id_usuario),
  ]);
  const modelos = req.user.tipo_perfil === 'ADMINISTRADOR' ? await treinoModel.modelosParaCopia(req.user.id_usuario) : [];
  return { modalidades, exercicios, pesoReferencia: ultima ? Number(ultima.peso_kg) : null, modelos };
}

function statusPadrao(req, data) {
  // RF14 – treino atribuído nasce planejado; treino próprio segue a data (RN05)
  if (req.ctx.tipo === 'vinculado') return 'PLANEJADO';
  return statusPorData(data, hojeISO());
}

// Um administrador pode copiar treinos próprios ou de seus vinculados; os demais, só os próprios.
async function podeCopiar(req, t) {
  if (!t) return false;
  if (Number(t.id_usuario) === Number(req.user.id_usuario)) return true;
  if (req.user.tipo_perfil !== 'ADMINISTRADOR') return false;
  const dono = await usuarioModel.porId(t.id_usuario);
  return dono && Number(dono.id_administrador) === Number(req.user.id_usuario);
}

async function novo(req, res, next) {
  try {
    const hoje = hojeISO();
    let treino = { titulo: '', data_treino: hoje, id_modalidade: '', duracao_min: '', intensidade: 'MODERADA', observacoes: '', status: statusPadrao(req, hoje) };
    let itens = [];
    let copiadoDe = null;
    if (req.query.copiar) {
      const origem = await treinoModel.porId(Number(req.query.copiar));
      if (await podeCopiar(req, origem)) {
        copiadoDe = origem;
        treino = { ...treino, titulo: origem.titulo, id_modalidade: origem.id_modalidade, duracao_min: origem.duracao_min, intensidade: origem.intensidade, observacoes: origem.observacoes || '' };
        itens = await treinoModel.itens(origem.id_treino);
      }
    }
    return res.render('pages/treinos/form', {
      titulo: req.ctx.tipo === 'vinculado' ? 'Atribuir treino' : 'Registrar treino',
      acao: base(req), treino, itens, erros: {}, copiadoDe, ...(await dadosFormulario(req)),
    });
  } catch (err) { return next(err); }
}

async function editar(req, res, next) {
  try {
    const t = await treinoModel.porId(Number(req.params.id));
    if (!pertence(req, t)) return naoEncontrado(res, 'Treino');
    const itens = await treinoModel.itens(t.id_treino);
    return res.render('pages/treinos/form', {
      titulo: 'Editar treino', acao: `${base(req)}/${t.id_treino}`, treino: t, itens, erros: {}, copiadoDe: null,
      ...(await dadosFormulario(req)),
    });
  } catch (err) { return next(err); }
}

// Lê e valida o formulário (UC06 A1: obrigatórios vazios ou valores negativos)
async function lerFormulario(req) {
  const b = req.body;
  const erros = {};
  const t = {
    titulo: texto(b.titulo, 100),
    data_treino: texto(b.data_treino, 10),
    id_modalidade: Number(b.id_modalidade) || null,
    duracao_min: numOuNulo(b.duracao_min),
    intensidade: texto(b.intensidade, 10),
    status: texto(b.status, 10),
    observacoes: texto(b.observacoes, 2000),
  };
  if (t.titulo.length < 2) erros.titulo = 'Informe um título para o treino.';
  if (!dataValida(t.data_treino)) erros.data_treino = 'Informe uma data válida.';
  const modalidade = t.id_modalidade ? await catalogoModel.modalidade(t.id_modalidade) : null;
  if (!modalidade) erros.id_modalidade = 'Selecione a modalidade.';
  if (t.duracao_min === null || Number.isNaN(t.duracao_min) || t.duracao_min <= 0 || t.duracao_min > 600) {
    erros.duracao_min = 'Informe a duração em minutos (de 1 a 600).';
  } else t.duracao_min = Math.round(t.duracao_min);
  if (!INTENSIDADES.includes(t.intensidade)) erros.intensidade = 'Selecione a intensidade.';

  // exercícios (RF04): um ou mais, sem valores negativos
  const brutos = Object.values(b.itens || {}).slice(0, MAX_ITENS);
  const itens = [];
  const errosItens = {};
  brutos.forEach((it, i) => {
    if (!it || (!it.id_exercicio && !it.series && !it.repeticoes && !it.carga_kg && !it.distancia_km && !it.tempo_min)) return;
    const item = {
      id_exercicio: Number(it.id_exercicio) || null,
      series: numOuNulo(it.series), repeticoes: numOuNulo(it.repeticoes), carga_kg: numOuNulo(it.carga_kg),
      distancia_km: numOuNulo(it.distancia_km), tempo_min: numOuNulo(it.tempo_min),
    };
    const lim = { series: 50, repeticoes: 120, carga_kg: 1000, distancia_km: 500, tempo_min: 600 };
    let msg = null;
    if (!item.id_exercicio) msg = 'Selecione o exercício.';
    for (const [k, max] of Object.entries(lim)) {
      if (item[k] !== null && (Number.isNaN(item[k]) || item[k] < 0 || item[k] > max)) {
        msg = msg || 'Use apenas valores positivos e dentro do limite.';
      }
    }
    if (msg) errosItens[itens.length] = msg;
    item.series = item.series === null ? null : Math.round(item.series);
    item.repeticoes = item.repeticoes === null ? null : Math.round(item.repeticoes);
    item.tempo_seg = item.tempo_min === null ? null : Math.round(item.tempo_min * 60);
    itens.push(item);
  });
  if (!itens.length) erros.itens = 'Adicione pelo menos um exercício ao treino.';
  else if (!(await catalogoModel.exerciciosExistem(itens.filter((i) => i.id_exercicio).map((i) => i.id_exercicio)))) {
    erros.itens = 'Há um exercício inválido na lista.';
  }
  if (Object.keys(errosItens).length) erros.itensLinha = errosItens;

  // RN05 – data futura ⇒ planejado; atribuído ⇒ planejado por padrão (RF14)
  if (!['PLANEJADO', 'REALIZADO'].includes(t.status)) t.status = statusPadrao(req, t.data_treino);
  if (t.data_treino > hojeISO()) t.status = 'PLANEJADO';

  // RN07 – calorias = MET × peso mais recente × horas
  const ultima = await medidaModel.ultima(req.ctx.dono.id_usuario);
  t.calorias_estimadas = modalidade && !erros.duracao_min
    ? caloriasEstimadas(modalidade.met, ultima && ultima.peso_kg, t.duracao_min) : null;
  return { t, itens, erros };
}

async function reexibir(req, res, acao, t, itens, erros, tituloTela) {
  return res.status(400).render('pages/treinos/form', {
    titulo: tituloTela, acao, treino: t, itens, erros, copiadoDe: null, ...(await dadosFormulario(req)),
  });
}

async function criar(req, res, next) {
  try {
    const { t, itens, erros } = await lerFormulario(req);
    if (Object.keys(erros).length) {
      return reexibir(req, res, base(req), t, itens, erros, req.ctx.tipo === 'vinculado' ? 'Atribuir treino' : 'Registrar treino');
    }
    // UC11 passo 5 – id_usuario = dono (vinculado ou o próprio); id_criador = quem está logado
    const id = await treinoModel.criar({ ...t, id_usuario: req.ctx.dono.id_usuario, id_criador: req.user.id_usuario }, itens);
    req.flash('sucesso', t.status === 'PLANEJADO' ? 'Treino salvo como planejado.' : 'Treino registrado com sucesso!');
    return res.redirect(req.ctx.tipo === 'vinculado' ? `${req.ctx.prefixo}` : `${base(req)}/${id}`);
  } catch (err) { return next(err); }
}

async function atualizar(req, res, next) {
  try {
    const atual = await treinoModel.porId(Number(req.params.id));
    if (!pertence(req, atual)) return naoEncontrado(res, 'Treino');
    const { t, itens, erros } = await lerFormulario(req);
    if (Object.keys(erros).length) {
      return reexibir(req, res, `${base(req)}/${atual.id_treino}`, { ...t, id_treino: atual.id_treino }, itens, erros, 'Editar treino');
    }
    await treinoModel.atualizar(atual.id_treino, t, itens);
    req.flash('sucesso', 'Treino atualizado.');
    return res.redirect(`${base(req)}/${atual.id_treino}`);
  } catch (err) { return next(err); }
}

async function excluir(req, res, next) {
  try {
    const t = await treinoModel.porId(Number(req.params.id));
    if (!pertence(req, t)) return naoEncontrado(res, 'Treino');
    await treinoModel.excluir(t.id_treino); // exercícios saem em cascata
    req.flash('sucesso', 'Treino excluído.');
    return res.redirect(base(req));
  } catch (err) { return next(err); }
}

// UC11 A2 – marcar como realizado (não permitido para data futura, RN05)
async function marcarRealizado(req, res, next) {
  try {
    const t = await treinoModel.porId(Number(req.params.id));
    if (!pertence(req, t)) return naoEncontrado(res, 'Treino');
    if (t.data_treino > hojeISO()) {
      req.flash('erro', 'Treinos com data futura continuam planejados. Altere a data para marcá-lo como realizado.');
    } else {
      await treinoModel.definirStatus(t.id_treino, 'REALIZADO');
      req.flash('sucesso', 'Treino marcado como realizado.');
    }
    return res.redirect(req.body.voltar === 'lista' ? base(req) : `${base(req)}/${t.id_treino}`);
  } catch (err) { return next(err); }
}

module.exports = { listar, detalhar, novo, editar, criar, atualizar, excluir, marcarRealizado };
