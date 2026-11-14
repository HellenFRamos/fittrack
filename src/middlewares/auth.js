// Autenticação e autorização por perfil (RNF02: verificação de permissão em todas as rotas).
const usuarioModel = require('../models/usuarioModel');

// Carrega o usuário da sessão em req.user / res.locals.usuario
async function carregarUsuario(req, res, next) {
  res.locals.usuario = null;
  if (!req.session.userId) return next();
  try {
    const u = await usuarioModel.porId(req.session.userId);
    if (!u || !u.ativo) {
      // conta removida ou desativada durante a sessão
      return req.session.destroy(() => res.redirect('/entrar'));
    }
    req.user = u;
    res.locals.usuario = u;
    return next();
  } catch (err) {
    return next(err);
  }
}

function exigirLogin(req, res, next) {
  if (!req.user) {
    req.session.voltarPara = req.originalUrl;
    return res.redirect('/entrar');
  }
  return next();
}

// RF18 – o vinculado com senha provisória precisa trocá-la antes de qualquer outra página
function exigirSenhaDefinitiva(req, res, next) {
  if (req.user && req.user.senha_provisoria) return res.redirect('/primeiro-acesso');
  return next();
}

function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/entrar');
    if (!perfis.includes(req.user.tipo_perfil)) {
      return res.status(403).render('pages/erros/erro', {
        titulo: 'Acesso negado', status: 403,
        mensagem: 'Seu perfil não tem permissão para acessar esta página.',
      });
    }
    return next();
  };
}

// Visitante com sessão ativa vai direto ao painel (UC02 A1)
function somenteVisitante(req, res, next) {
  if (req.user) return res.redirect('/painel');
  return next();
}

module.exports = { carregarUsuario, exigirLogin, exigirSenhaDefinitiva, exigirPerfil, somenteVisitante };
