// Dono dos dados da rota: próprio, vinculado ou atribuído (somente leitura).
const usuarioModel = require('../models/usuarioModel');

function ctxProprio(req, res, next) {
  req.ctx = {
    tipo: 'proprio', dono: req.user, prefixo: '', somenteLeitura: false,
    rotulos: { treinos: 'Meus treinos', metas: 'Minhas metas', medidas: 'Medidas corporais' },
  };
  res.locals.ctx = req.ctx;
  next();
}

async function ctxVinculado(req, res, next) {
  try {
    const v = await usuarioModel.vinculadoDoAdmin(req.user.id_usuario, Number(req.params.vid));
    if (!v) {
      return res.status(404).render('pages/erros/erro', {
        titulo: 'Aluno não encontrado', status: 404,
        mensagem: 'Este usuário não existe ou não está vinculado a você.',
      });
    }
    req.ctx = {
      tipo: 'vinculado', dono: v, prefixo: `/admin/vinculados/${v.id_usuario}`, somenteLeitura: false,
      rotulos: { treinos: `Treinos de ${v.nome}`, metas: `Metas de ${v.nome}`, medidas: `Medidas de ${v.nome}` },
    };
    res.locals.ctx = req.ctx;
    return next();
  } catch (err) {
    return next(err);
  }
}

function ctxAtribuido(req, res, next) {
  req.ctx = {
    tipo: 'atribuido', dono: req.user, prefixo: '/atribuidos', somenteLeitura: true,
    rotulos: { treinos: 'Treinos atribuídos', metas: 'Metas atribuídas', medidas: 'Minhas medidas' },
  };
  res.locals.ctx = req.ctx;
  next();
}

function permitirEscrita(req, res, next) {
  if (req.ctx && req.ctx.somenteLeitura) {
    return res.status(403).render('pages/erros/erro', {
      titulo: 'Somente leitura', status: 403,
      mensagem: 'Seus treinos, metas e medidas são mantidos pelo seu administrador.',
    });
  }
  return next();
}

function pertence(req, registro) {
  return registro && Number(registro.id_usuario) === Number(req.ctx.dono.id_usuario);
}

function naoEncontrado(res, oque = 'Registro') {
  return res.status(404).render('pages/erros/erro', {
    titulo: `${oque} não encontrado`, status: 404,
    mensagem: 'O item não existe ou você não tem acesso a ele.',
  });
}

module.exports = { ctxProprio, ctxVinculado, ctxAtribuido, permitirEscrita, pertence, naoEncontrado };
