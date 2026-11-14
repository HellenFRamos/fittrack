// Mapa de rotas – segue o diagrama navegacional (Figura 4 do projeto).
const express = require('express');
const publico = require('../controllers/publicoController');
const auth = require('../controllers/authController');
const perfil = require('../controllers/perfilController');
const painel = require('../controllers/painelController');
const admin = require('../controllers/adminController');
const v = require('../validators/usuarioValidator');
const { exigirLogin, exigirSenhaDefinitiva, exigirPerfil, somenteVisitante } = require('../middlewares/auth');
const { ctxProprio, ctxVinculado, ctxAtribuido } = require('../middlewares/contexto');
const recursos = require('./recursos');

const router = express.Router();
const logado = [exigirLogin, exigirSenhaDefinitiva];
const pessoalOuAdmin = [...logado, exigirPerfil('PESSOAL', 'ADMINISTRADOR')];
const soAdmin = [...logado, exigirPerfil('ADMINISTRADOR')];
const soVinculado = [...logado, exigirPerfil('VINCULADO')];

// ------------------------------------------------------------ área pública
router.get('/', somenteVisitante, publico.inicio);
router.get('/sobre', publico.sobre);
router.get('/privacidade', publico.privacidade);
router.get('/termos', publico.termos);
router.get('/entrar', somenteVisitante, auth.mostrarLogin);
router.post('/entrar', somenteVisitante, auth.entrar);
router.get('/cadastro', somenteVisitante, auth.mostrarCadastro);
router.post('/cadastro', somenteVisitante, v.cadastro, auth.cadastrar);
router.post('/sair', auth.sair);

// ------------------------------------------------------------ comum a todos os autenticados
router.get('/primeiro-acesso', exigirLogin, auth.mostrarPrimeiroAcesso);
router.post('/primeiro-acesso', exigirLogin, auth.salvarPrimeiroAcesso);
router.get('/painel', logado, painel.mostrar);
router.get('/perfil', logado, perfil.mostrar);
router.post('/perfil', logado, v.perfil, perfil.salvar);
router.post('/perfil/senha', logado, v.trocaSenha, perfil.trocarSenha);
router.post('/perfil/excluir', logado, perfil.excluirConta);

// ------------------------------------------------------------ pessoal e administrador (dados próprios)
router.use('/treinos', pessoalOuAdmin, ctxProprio, recursos.treinos());
router.use('/metas', pessoalOuAdmin, ctxProprio, recursos.metas());
router.use('/medidas', pessoalOuAdmin, ctxProprio, recursos.medidas());

// ------------------------------------------------------------ administrador: usuários vinculados
router.get('/admin/vinculados', soAdmin, admin.listar);
router.get('/admin/vinculados/novo', soAdmin, admin.novo);
router.post('/admin/vinculados', soAdmin, v.novoVinculado, admin.criar);
const ficha = '/admin/vinculados/:vid(\\d+)';
router.get(ficha, soAdmin, ctxVinculado, admin.ficha);
router.get(`${ficha}/credenciais`, soAdmin, ctxVinculado, admin.credenciais);
router.get(`${ficha}/editar`, soAdmin, ctxVinculado, admin.editar);
router.post(`${ficha}/editar`, soAdmin, ctxVinculado, v.editarVinculado, admin.atualizar);
router.post(`${ficha}/desativar`, soAdmin, ctxVinculado, admin.desativar);
router.post(`${ficha}/reativar`, soAdmin, ctxVinculado, admin.reativar);
router.post(`${ficha}/senha`, soAdmin, ctxVinculado, admin.redefinirSenha);
router.use(`${ficha}/treinos`, soAdmin, ctxVinculado, recursos.treinos());
router.use(`${ficha}/metas`, soAdmin, ctxVinculado, recursos.metas());
router.use(`${ficha}/medidas`, soAdmin, ctxVinculado, recursos.medidas());

// ------------------------------------------------------------ usuário vinculado (somente leitura)
router.use('/atribuidos/treinos', soVinculado, ctxAtribuido, recursos.treinos());
router.use('/atribuidos/metas', soVinculado, ctxAtribuido, recursos.metas());
router.use('/atribuidos/medidas', soVinculado, ctxAtribuido, recursos.medidas());

module.exports = router;
