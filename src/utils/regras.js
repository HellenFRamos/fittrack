// Regras de negócio do FitTrack (Seção 3.4 do documento do projeto).

// RN06 – percentual da meta: (atual − inicial) / (alvo − inicial) × 100, limitado a 0–100%.
// Funciona para metas de aumento e de redução (ex.: perder peso).
function percentualMeta(inicial, alvo, atual) {
  const ini = Number(inicial);
  const alv = Number(alvo);
  const at = Number(atual);
  if (alv === ini) return 0;
  const p = ((at - ini) / (alv - ini)) * 100;
  return Math.round(Math.min(100, Math.max(0, p)));
}

// RN07 – calorias estimadas = MET da modalidade × peso (kg) × duração (h).
// Sem peso registrado, o campo fica vazio (null).
function caloriasEstimadas(met, pesoKg, duracaoMin) {
  if (!met || !pesoKg || !duracaoMin) return null;
  return Math.round(Number(met) * Number(pesoKg) * (Number(duracaoMin) / 60));
}

// IMC = peso / altura² (altura em metros). Sem altura, não há IMC (UC09 A1).
function imc(pesoKg, alturaCm) {
  if (!pesoKg || !alturaCm) return null;
  const m = Number(alturaCm) / 100;
  return Math.round((Number(pesoKg) / (m * m)) * 10) / 10;
}

function classificacaoImc(valor) {
  if (valor == null) return null;
  if (valor < 18.5) return 'Abaixo do peso';
  if (valor < 25) return 'Peso adequado';
  if (valor < 30) return 'Sobrepeso';
  if (valor < 35) return 'Obesidade grau I';
  if (valor < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

// RN09 – mínimo de 8 caracteres, com pelo menos uma letra e um número.
function senhaForte(senha) {
  return typeof senha === 'string' && senha.length >= 8 && /[A-Za-zÀ-ÿ]/.test(senha) && /\d/.test(senha);
}
const MSG_SENHA = 'A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra e um número.';

// RN05 – treino com data futura fica planejado.
function statusPorData(dataISO, hojeISO) {
  return dataISO > hojeISO ? 'PLANEJADO' : 'REALIZADO';
}

// Meta da OMS: 150 minutos semanais de atividade moderada [WHO 2020].
const META_OMS_MIN = 150;

module.exports = {
  percentualMeta,
  caloriasEstimadas,
  imc,
  classificacaoImc,
  senhaForte,
  MSG_SENHA,
  statusPorData,
  META_OMS_MIN,
};
