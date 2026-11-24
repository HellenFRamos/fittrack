const bcrypt = require('bcrypt');
const crypto = require('crypto');
const usuarioModel = require('../models/usuarioModel');
const treinoModel = require('../models/treinoModel');
const metaModel = require('../models/metaModel');
const medidaModel = require('../models/medidaModel');
const painelService = require('../services/painelService');
const { errosPorCampo, numOuNulo, texto } = require('../utils/validacao');

function sugerirSenha() {
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const b = crypto.randomBytes(10);
  let s = '';
  for (let i = 0; i < 10; i += 1) s += i % 3 === 2 ? nums[b[i] % nums.length] : letras[b[i] % letras.length];
  return s;
}

async function listar(req, res, next) {
  try {
    const busca = texto(req.query.busca, 100);
    const situacao = ['ativos', 'inativos', 'todos'].includes(req.query.situacao) ? req.query.situacao : 'ativos';
    const [vinculados, ativos] = await Promise.all([
      usuarioModel.listarVinculados(req.user.id_usuario, { busca, situacao }),
      usuarioModel.listarVinculados(req.user.id_usuario, { situacao: 'ativos' }),
    ]);
    const comPlano = ativos.filter((v) => v.treinos_semana > 0);
    const aderencia = comPlano.length
      ? Math.round(comPlano.reduce((s, v) => s + v.realizados_semana / v.treinos_semana, 0) / comPlano.length * 100) : null;
    return res.render('pages/admin/vinculados', {
      titulo: 'Usuários vinculados', vinculados, busca, situacao, totalAtivos: ativos.length, aderencia,
    });
  } catch (err) { return next(err); }
}

function novo(req, res) {
  res.render('pages/admin/vinculado-form', {
    titulo: 'Cadastrar vinculado', acao: '/admin/vinculados', novo: true, erros: {},
    dados: { nome: '', email: '', data_nascimento: '', sexo: '', altura_cm: '', senha_provisoria: sugerirSenha() },
  });
}

function lerDados(b) {
  return {
    nome: texto(b.nome, 100), email: texto(b.email, 120).toLowerCase(), data_nascimento: texto(b.data_nascimento, 10),
    sexo: texto(b.sexo, 1), altura_cm: texto(b.altura_cm, 6),
  };
}

async function criar(req, res, next) {
  try {
    const dados = { ...lerDados(req.body), senha_provisoria: String(req.body.senha_provisoria || '') };
    const erros = errosPorCampo(req);
    if (Object.keys(erros).length) {
      return res.status(400).render('pages/admin/vinculado-form', { titulo: 'Cadastrar vinculado', acao: '/admin/vinculados', novo: true, erros, dados });
    }
    const altura = numOuNulo(dados.altura_cm);
    const id = await usuarioModel.criar({
      ...dados, altura_cm: altura ? Math.round(altura) : null, tipo_perfil: 'VINCULADO',
      id_administrador: req.user.id_usuario, senha_hash: await bcrypt.hash(dados.senha_provisoria, 12),
      senha_provisoria: true, consentimento: false,
    });
    req.session.credenciais = { id, nome: dados.nome, email: dados.email, senha: dados.senha_provisoria };
    return res.redirect(`/admin/vinculados/${id}/credenciais`);
  } catch (err) { return next(err); }
}

function credenciais(req, res) {
  const c = req.session.credenciais;
  if (!c || Number(c.id) !== Number(req.params.vid)) return res.redirect(`/admin/vinculados/${req.params.vid}`);
  delete req.session.credenciais;
  return res.render('pages/admin/credenciais', { titulo: 'Vinculado cadastrado', c });
}

async function ficha(req, res, next) {
  try {
    const v = req.ctx.dono;
    const [painel, treinos, metas, medidas] = await Promise.all([
      painelService.montar(v.id_usuario),
      treinoModel.listar(v.id_usuario, {}, 1, 6),
      metaModel.listar(v.id_usuario),
      medidaModel.listar(v.id_usuario, v.altura_cm),
    ]);
    return res.render('pages/admin/ficha', { titulo: v.nome, v, painel, treinos: treinos.itens, totalTreinos: treinos.total, metas, medidas: medidas.slice(0, 5) });
  } catch (err) { return next(err); }
}

function editar(req, res) {
  res.render('pages/admin/vinculado-form', {
    titulo: 'Editar vinculado', acao: `/admin/vinculados/${req.ctx.dono.id_usuario}/editar`, novo: false, erros: {}, dados: req.ctx.dono,
  });
}

async function atualizar(req, res, next) {
  try {
    const v = req.ctx.dono;
    const dados = { ...v, ...lerDados(req.body) };
    const erros = errosPorCampo(req);
    if (Object.keys(erros).length) {
      return res.status(400).render('pages/admin/vinculado-form', { titulo: 'Editar vinculado', acao: `/admin/vinculados/${v.id_usuario}/editar`, novo: false, erros, dados });
    }
    const altura = numOuNulo(dados.altura_cm);
    await usuarioModel.atualizarVinculado(v.id_usuario, { ...dados, altura_cm: altura ? Math.round(altura) : null });
    req.flash('sucesso', 'Dados do vinculado atualizados.');
    return res.redirect(`/admin/vinculados/${v.id_usuario}`);
  } catch (err) { return next(err); }
}

async function definirAtivo(req, res, next, ativo) {
  try {
    await usuarioModel.definirAtivo(req.ctx.dono.id_usuario, ativo);
    req.flash('sucesso', ativo ? `${req.ctx.dono.nome} foi reativado(a).` : `${req.ctx.dono.nome} foi desativado(a). O histórico foi preservado.`);
    return res.redirect(req.body.voltar === 'ficha' ? `/admin/vinculados/${req.ctx.dono.id_usuario}` : '/admin/vinculados');
  } catch (err) { return next(err); }
}

async function redefinirSenha(req, res, next) {
  try {
    const v = req.ctx.dono;
    const senha = sugerirSenha();
    await usuarioModel.atualizarSenha(v.id_usuario, await bcrypt.hash(senha, 12), true);
    req.session.credenciais = { id: v.id_usuario, nome: v.nome, email: v.email, senha, redefinida: true };
    return res.redirect(`/admin/vinculados/${v.id_usuario}/credenciais`);
  } catch (err) { return next(err); }
}

module.exports = {
  listar, novo, criar, credenciais, ficha, editar, atualizar, redefinirSenha,
  desativar: (req, res, next) => definirAtivo(req, res, next, false),
  reativar: (req, res, next) => definirAtivo(req, res, next, true),
};
