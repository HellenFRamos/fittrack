const painelService = require('../services/painelService');
const usuarioModel = require('../models/usuarioModel');

async function mostrar(req, res, next) {
  try {
    const u = req.user;
    const painel = await painelService.montar(u.id_usuario);
    if (u.tipo_perfil === 'VINCULADO') {
      const administrador = await usuarioModel.porId(u.id_administrador);
      return res.render('pages/painel-vinculado', { titulo: 'Painel', painel, administrador });
    }
    const resumo = u.tipo_perfil === 'ADMINISTRADOR' ? await usuarioModel.resumoVinculados(u.id_usuario) : null;
    return res.render('pages/painel', { titulo: 'Painel', painel, resumo });
  } catch (err) { return next(err); }
}

module.exports = { mostrar };
