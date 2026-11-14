// Formatação de números e rótulos para as visões (pt-BR).

function num(v, casas = 1) {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

const ROTULOS = {
  intensidade: { LEVE: 'Leve', MODERADA: 'Moderada', VIGOROSA: 'Vigorosa' },
  statusTreino: { PLANEJADO: 'Planejado', REALIZADO: 'Realizado' },
  statusMeta: { ATIVA: 'Ativa', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' },
  tipoMeta: {
    PESO: 'Peso corporal', FREQUENCIA: 'Frequência semanal', DISTANCIA: 'Distância',
    CARGA: 'Carga', TEMPO: 'Tempo', PERSONALIZADA: 'Personalizada',
  },
  perfil: { PESSOAL: 'Usuário pessoal', ADMINISTRADOR: 'Administrador', VINCULADO: 'Usuário vinculado' },
  sexo: { F: 'Feminino', M: 'Masculino', O: 'Outro / prefiro não informar' },
  categoria: { FORCA: 'Força', AEROBICO: 'Aeróbico', FLEXIBILIDADE: 'Flexibilidade', MISTO: 'Misto' },
};

// Unidade sugerida para cada tipo de meta
const UNIDADE_META = {
  PESO: 'kg', FREQUENCIA: 'treinos/semana', DISTANCIA: 'km', CARGA: 'kg', TEMPO: 'min', PERSONALIZADA: '',
};

// 3 min 20 s
function tempo(seg) {
  if (seg === null || seg === undefined || seg === '') return '';
  const s = Number(seg);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r} s`;
  return r ? `${m} min ${r} s` : `${m} min`;
}

// Resumo de um exercício: "4 × 10 · 50 kg" ou "5 km · 30 min"
function resumoItem(it) {
  const partes = [];
  if (it.series && it.repeticoes) partes.push(`${it.series} × ${it.repeticoes}`);
  else if (it.series) partes.push(`${it.series} séries`);
  else if (it.repeticoes) partes.push(`${it.repeticoes} repetições`);
  if (it.carga_kg) partes.push(`${num(it.carga_kg)} kg`);
  if (it.distancia_km) partes.push(`${num(it.distancia_km, 2)} km`);
  if (it.tempo_seg) partes.push(tempo(it.tempo_seg));
  return partes.join(' · ');
}

function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0];
}

// "Marina A."
function nomeCurto(nome) {
  const p = String(nome || '').trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0];
}

function iniciais(nome) {
  const p = String(nome || '').trim().split(/\s+/);
  return ((p[0] || '')[0] || '').toUpperCase() + ((p.length > 1 ? p[p.length - 1][0] : '') || '').toUpperCase();
}

module.exports = { num, ROTULOS, UNIDADE_META, tempo, resumoItem, primeiroNome, nomeCurto, iniciais };
