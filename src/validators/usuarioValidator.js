// Regras de validação (express-validator) dos formulários de usuário.
const { body } = require('express-validator');
const usuarioModel = require('../models/usuarioModel');
const { senhaForte, MSG_SENHA } = require('../utils/regras');
const { dataValida } = require('../utils/validacao');
const { hojeISO } = require('../utils/datas');

const nome = () => body('nome').trim().isLength({ min: 2, max: 100 }).withMessage('Informe o nome completo.');

const email = (excetoFn = () => 0) => body('email').trim().toLowerCase()
  .matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/).withMessage('Informe um e-mail válido.')
  .bail()
  .custom(async (v, { req }) => {
    if (await usuarioModel.emailEmUso(v, excetoFn(req))) throw new Error('emUso'); // RN01
    return true;
  });

const nascimento = () => body('data_nascimento').trim()
  .custom((v) => dataValida(v) && v < hojeISO()).withMessage('Informe uma data de nascimento válida.');

const sexo = () => body('sexo').trim().isIn(['F', 'M', 'O']).withMessage('Selecione uma opção.');

const altura = () => body('altura_cm').trim().customSanitizer((v) => String(v ?? '').replace(',', '.'))
  .optional({ values: 'falsy' })
  .isFloat({ min: 50, max: 260 }).withMessage('Informe a altura em centímetros (entre 50 e 260).');

const senha = (campo = 'senha') => body(campo).custom((v) => senhaForte(v)).withMessage(MSG_SENHA);

const confirmacao = (campo = 'confirmacao', ref = 'senha') => body(campo)
  .custom((v, { req }) => v === req.body[ref]).withMessage('As senhas não conferem.');

// UC01 – cadastro de conta pessoal
const cadastro = [
  nome(), email(), senha(), confirmacao(), nascimento(), sexo(), altura(),
  body('termos').equals('on').withMessage('É preciso aceitar os termos de uso.'),
  body('consentimento').equals('on').withMessage('É preciso consentir com o tratamento dos dados de saúde.'),
];

// UC04 – dados do perfil (e-mail não é alterado pelo próprio usuário: é o identificador de login)
const perfil = [nome(), nascimento(), sexo(), altura()];

// UC04 A1 – troca de senha
const trocaSenha = [
  body('senha_atual').notEmpty().withMessage('Informe a senha atual.'),
  senha('nova_senha'), confirmacao('confirmacao', 'nova_senha'),
];

// UC10 – cadastro de vinculado pelo administrador (senha provisória)
const novoVinculado = [nome(), email(), nascimento(), sexo(), altura(), senha('senha_provisoria')];

// UC10 – edição do vinculado
const editarVinculado = [
  nome(), email((req) => Number(req.params.vid)), nascimento(), sexo(), altura(),
];

module.exports = { cadastro, perfil, trocaSenha, novoVinculado, editarVinculado };
