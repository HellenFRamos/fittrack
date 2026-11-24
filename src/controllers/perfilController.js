const bcrypt = require('bcrypt');
const usuarioModel = require('../models/usuarioModel');
const { errosPorCampo, numOuNulo, texto } = require('../utils/validacao');

function tela(req, res, extra = {}, status = 200) {
  return res.status(status).render('pages/auth/perfil', {
    titulo: 'Meu perfil',
    dados: extra.dados || req.user,
    erros: extra.erros || {},
    errosSenha: extra.errosSenha || {},
    errosExclusao: extra.errosExclusao || {},
    administrador: extra.administrador || null,
  });
}

async function mostrar(req, res, next) {
  try {
    const administrador = req.user.id_administrador ? await usuarioModel.porId(req.user.id_administrador) : null;
    return tela(req, res, { administrador });
  } catch (err) { return next(err); }
}

async function salvar(req, res, next) {
  try {
    const dados = {
      ...req.user,
      nome: texto(req.body.nome, 100), data_nascimento: texto(req.body.data_nascimento, 10),
      sexo: texto(req.body.sexo, 1), altura_cm: texto(req.body.altura_cm, 6),
    };
    const erros = errosPorCampo(req);
    if (Object.keys(erros).length) return tela(req, res, { dados, erros }, 400);
    const altura = numOuNulo(dados.altura_cm);
    await usuarioModel.atualizarPerfil(req.user.id_usuario, { ...dados, altura_cm: altura ? Math.round(altura) : null });
    const msg = Number(altura || 0) !== Number(req.user.altura_cm || 0)
      ? 'Perfil atualizado. As próximas medições usarão a nova altura no cálculo do IMC.'
      : 'Perfil atualizado com sucesso.';
    req.flash('sucesso', msg);
    return res.redirect('/perfil');
  } catch (err) { return next(err); }
}

async function trocarSenha(req, res, next) {
  try {
    const errosSenha = errosPorCampo(req);
    if (!errosSenha.senha_atual) {
      const ok = await bcrypt.compare(String(req.body.senha_atual || ''), await usuarioModel.senhaHash(req.user.id_usuario));
      if (!ok) errosSenha.senha_atual = 'Senha atual incorreta. A senha não foi alterada.';
    }
    if (Object.keys(errosSenha).length) return tela(req, res, { errosSenha }, 400);
    await usuarioModel.atualizarSenha(req.user.id_usuario, await bcrypt.hash(req.body.nova_senha, 12), false);
    req.flash('sucesso', 'Senha alterada com sucesso.');
    return res.redirect('/perfil');
  } catch (err) { return next(err); }
}

async function excluirConta(req, res, next) {
  try {
    if (req.user.tipo_perfil !== 'PESSOAL') {
      return tela(req, res, { errosExclusao: { senha_exclusao: 'Este perfil não pode excluir a conta por aqui.' } }, 403);
    }
    const ok = await bcrypt.compare(String(req.body.senha_exclusao || ''), await usuarioModel.senhaHash(req.user.id_usuario));
    if (!ok) return tela(req, res, { errosExclusao: { senha_exclusao: 'Senha incorreta. A conta não foi excluída.' } }, 400);
    await usuarioModel.excluir(req.user.id_usuario);
    return req.session.destroy(() => {
      res.clearCookie('fittrack.sid');
      res.redirect('/?conta=excluida');
    });
  } catch (err) { return next(err); }
}

module.exports = { mostrar, salvar, trocarSenha, excluirConta };
