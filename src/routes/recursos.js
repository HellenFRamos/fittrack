// Roteadores de treinos, metas e medidas. São montados em três contextos
// (próprio, vinculado pelo administrador e somente leitura do vinculado);
// as rotas de escrita passam por permitirEscrita (RN03).
const express = require('express');
const treino = require('../controllers/treinoController');
const meta = require('../controllers/metaController');
const medida = require('../controllers/medidaController');
const { permitirEscrita: w } = require('../middlewares/contexto');

function treinos() {
  const r = express.Router({ mergeParams: true });
  r.get('/', treino.listar);
  r.get('/novo', w, treino.novo);
  r.post('/', w, treino.criar);
  r.get('/:id(\\d+)', treino.detalhar);
  r.get('/:id(\\d+)/editar', w, treino.editar);
  r.post('/:id(\\d+)', w, treino.atualizar);
  r.post('/:id(\\d+)/realizado', w, treino.marcarRealizado);
  r.post('/:id(\\d+)/excluir', w, treino.excluir);
  return r;
}

function metas() {
  const r = express.Router({ mergeParams: true });
  r.get('/', meta.listar);
  r.get('/nova', w, meta.novo);
  r.post('/', w, meta.criar);
  r.get('/:id(\\d+)', meta.detalhar);
  r.get('/:id(\\d+)/editar', w, meta.editar);
  r.post('/:id(\\d+)', w, meta.atualizar);
  r.post('/:id(\\d+)/progresso', w, meta.registrarProgresso);
  r.post('/:id(\\d+)/progresso/:pid(\\d+)/excluir', w, meta.excluirProgresso);
  r.post('/:id(\\d+)/cancelar', w, meta.cancelar);
  r.post('/:id(\\d+)/reativar', w, meta.reativar);
  r.post('/:id(\\d+)/excluir', w, meta.excluir);
  return r;
}

function medidas() {
  const r = express.Router({ mergeParams: true });
  r.get('/', medida.listar);
  r.post('/', w, medida.criar);
  r.get('/:id(\\d+)/editar', w, medida.editar);
  r.post('/:id(\\d+)', w, medida.atualizar);
  r.post('/:id(\\d+)/excluir', w, medida.excluir);
  return r;
}

module.exports = { treinos, metas, medidas };
