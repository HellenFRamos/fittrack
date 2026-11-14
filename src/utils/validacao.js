// Auxiliares de validação no servidor (RNF02 / RNF04: mensagens junto ao campo).
const { validationResult } = require('express-validator');

// Converte os erros do express-validator em { campo: mensagem }
function errosPorCampo(req) {
  const out = {};
  for (const e of validationResult(req).array()) {
    if (!out[e.path]) out[e.path] = e.msg;
  }
  return out;
}

// Campo numérico opcional: '' → null; aceita vírgula decimal
function numOuNulo(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function texto(v, max = 255) {
  return String(v ?? '').trim().slice(0, max);
}

const reData = /^\d{4}-\d{2}-\d{2}$/;
function dataValida(s) {
  if (!reData.test(String(s || ''))) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && y >= 1900 && y <= 2100;
}

module.exports = { errosPorCampo, numOuNulo, texto, dataValida };
