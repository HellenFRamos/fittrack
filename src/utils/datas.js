// Datas como texto 'AAAA-MM-DD', sempre no fuso local.

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function pad(n) { return String(n).padStart(2, '0'); }

function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function hojeISO() { return toISO(new Date()); }

function addDias(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// Diferença em dias inteiros (b − a)
function diffDias(aISO, bISO) {
  return Math.round((parseISO(bISO) - parseISO(aISO)) / 86400000);
}

// Semana de segunda a domingo
function semana(iso = hojeISO()) {
  const d = parseISO(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  const inicio = addDias(iso, -dow);
  return { inicio, fim: addDias(inicio, 6) };
}

// 05/11/2026
function br(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// 05/11
function brCurta(iso) {
  if (!iso) return '';
  const [, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}`;
}

// Sáb 07/11
function diaSemana(iso) {
  return `${DIAS[parseISO(iso).getDay()]} ${brCurta(iso)}`;
}

// "Semana de 02 a 08 de novembro"
function rotuloSemana({ inicio, fim }) {
  const a = parseISO(inicio);
  const b = parseISO(fim);
  if (a.getMonth() === b.getMonth()) {
    return `Semana de ${pad(a.getDate())} a ${pad(b.getDate())} de ${MESES[b.getMonth()]}`;
  }
  return `Semana de ${pad(a.getDate())} de ${MESES[a.getMonth()]} a ${pad(b.getDate())} de ${MESES[b.getMonth()]}`;
}

// "Hoje", "Ontem", "há 9 dias"
function relativo(iso) {
  if (!iso) return '—';
  const n = diffDias(iso, hojeISO());
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Ontem';
  if (n < 0) return `em ${-n} dias`;
  return `há ${n} dias`;
}

function idade(nascISO) {
  if (!nascISO) return null;
  const h = new Date();
  const n = parseISO(nascISO);
  let a = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a -= 1;
  return a;
}

module.exports = {
  DIAS, MESES, toISO, parseISO, hojeISO, addDias, diffDias, semana, br, brCurta,
  diaSemana, rotuloSemana, relativo, idade,
};
