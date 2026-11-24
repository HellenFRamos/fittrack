const bcrypt = require('bcrypt');
const usuarioModel = require('../models/usuarioModel');
const { senhaForte, MSG_SENHA } = require('../utils/regras');
const { errosPorCampo, numOuNulo, texto } = require('../utils/validacao');

const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

function telaAcesso(res, aba, dados = {}, erros = {}, status = 200) {
  return res.status(status).render('pages/auth/acesso', { titulo: aba === 'cadastro' ? 'Criar conta' : 'Entrar', aba, dados, erros });
}

function mostrarLogin(req, res) { telaAcesso(res, 'entrar'); }
function mostrarCadastro(req, res) { telaAcesso(res, 'cadastro'); }

function iniciarSessao(req, usuario, manter) {
  return new Promise((resolve, reject) => {
    const voltar = req.session.voltarPara;
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = usuario.id_usuario;
      if (manter) req.session.cookie.maxAge = TRINTA_DIAS;
      else req.session.cookie.expires = false;
      req.session.save((e) => (e ? reject(e) : resolve(voltar)));
    });
  });
}

async function entrar(req, res, next) {
  try {
    const email = texto(req.body.email, 120).toLowerCase();
    const senha = String(req.body.senha || '');
    const dados = { email, manter: !!req.body.manter };
    if (!email || !senha) {
      return telaAcesso(res, 'entrar', dados, { geral: 'Informe e-mail e senha.' }, 400);
    }
    const u = await usuarioModel.porEmail(email);
    const ok = u && await bcrypt.compare(senha, u.senha_hash);
    if (!ok) return telaAcesso(res, 'entrar', dados, { geral: 'E-mail ou senha incorretos.' }, 401);
    if (!u.ativo) {
      return telaAcesso(res, 'entrar', dados, {
        geral: 'Seu acesso foi desativado. Procure o seu administrador (personal trainer) para reativá-lo.',
      }, 403);
    }
    const voltar = await iniciarSessao(req, u, dados.manter);
    if (u.senha_provisoria) return res.redirect('/primeiro-acesso');
    const destino = voltar && voltar.startsWith('/') && !voltar.startsWith('//') ? voltar : '/painel';
    return res.redirect(destino);
  } catch (err) {
    return next(err);
  }
}

async function cadastrar(req, res, next) {
  try {
    const b = req.body;
    const dados = {
      nome: texto(b.nome, 100), email: texto(b.email, 120).toLowerCase(),
      data_nascimento: texto(b.data_nascimento, 10), sexo: texto(b.sexo, 1),
      altura_cm: texto(b.altura_cm, 6), termos: !!b.termos, consentimento: !!b.consentimento,
    };
    const erros = errosPorCampo(req);
    if (Object.keys(erros).length) return telaAcesso(res, 'cadastro', dados, erros, 400);

    const altura = numOuNulo(dados.altura_cm);
    const id = await usuarioModel.criar({
      ...dados, altura_cm: altura ? Math.round(altura) : null, tipo_perfil: 'PESSOAL',
      senha_hash: await bcrypt.hash(b.senha, 12), consentimento: true,
    });
    await iniciarSessao(req, { id_usuario: id }, false);
    req.flash('sucesso', 'Conta criada! Comece registrando o seu primeiro treino.');
    return res.redirect('/painel');
  } catch (err) {
    return next(err);
  }
}

function sair(req, res) {
  req.session.destroy(() => {
    res.clearCookie('fittrack.sid');
    res.redirect('/');
  });
}

function mostrarPrimeiroAcesso(req, res) {
  if (!req.user.senha_provisoria) return res.redirect('/painel');
  return res.render('pages/auth/primeiro-acesso', { titulo: 'Defina sua senha', erros: {} });
}

async function salvarPrimeiroAcesso(req, res, next) {
  try {
    if (!req.user.senha_provisoria) return res.redirect('/painel');
    const erros = {};
    const hash = await usuarioModel.senhaHash(req.user.id_usuario);
    if (!senhaForte(req.body.senha)) erros.senha = MSG_SENHA;
    else if (await bcrypt.compare(req.body.senha, hash)) erros.senha = 'A nova senha deve ser diferente da provisória.';
    if (req.body.senha !== req.body.confirmacao) erros.confirmacao = 'As senhas não conferem.';
    if (Object.keys(erros).length) {
      return res.status(400).render('pages/auth/primeiro-acesso', { titulo: 'Defina sua senha', erros });
    }
    await usuarioModel.atualizarSenha(req.user.id_usuario, await bcrypt.hash(req.body.senha, 12), false);
    req.flash('sucesso', 'Senha definida! Bem-vindo(a) ao FitTrack.');
    return res.redirect('/painel');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  mostrarLogin, mostrarCadastro, entrar, cadastrar, sair, mostrarPrimeiroAcesso, salvarPrimeiroAcesso,
};
