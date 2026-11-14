// "Contexto do dono": define de quem são os treinos, metas e medidas que uma rota manipula.
//  - próprio:    usuário pessoal ou administrador cuidando dos próprios dados;
//  - vinculado:  administrador cuidando de um aluno seu (RN04, UC11);
//  - atribuído:  usuário vinculado consultando em modo somente leitura (RN03, UC12).
// Assim, os mesmos controladores e visões servem aos três casos, e a checagem de
// permissão fica concentrada aqui e em pertence() (verificação em todas as rotas).
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

// Bloqueia rotas de escrita no modo somente leitura (RN03)
function permitirEscrita(req, res, next) {
  if (req.ctx && req.ctx.somenteLeitura) {
    return res.status(403).render('pages/erros/erro', {
      titulo: 'Somente leitura', status: 403,
      mensagem: 'Seus treinos, metas e medidas são mantidos pelo seu administrador.',
    });
  }
  return next();
}

// O registro pertence ao dono do contexto?
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
