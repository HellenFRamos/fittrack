// Monta os dados do painel de progresso de um usuário (RF11 / UC05 / RC08).
const treinoModel = require('../models/treinoModel');
const metaModel = require('../models/metaModel');
const medidaModel = require('../models/medidaModel');
const { semana, addDias, rotuloSemana } = require('../utils/datas');
const { META_OMS_MIN } = require('../utils/regras');

async function montar(idUsuario) {
  const sem = semana();
  const anterior = { inicio: addDias(sem.inicio, -7), fim: addDias(sem.fim, -7) };

  const [atual, ant, porDia, metasAtivas, ultima, refMes, ultimos, planejados, volume, freq] = await Promise.all([
    treinoModel.resumoPeriodo(idUsuario, sem.inicio, sem.fim),
    treinoModel.resumoPeriodo(idUsuario, anterior.inicio, anterior.fim),
    treinoModel.minutosPorDia(idUsuario, sem.inicio, sem.fim),
    metaModel.listar(idUsuario, 'ATIVA'),
    medidaModel.ultima(idUsuario),
    medidaModel.pesoReferenciaMes(idUsuario),
    treinoModel.ultimosRealizados(idUsuario, 5),
    treinoModel.planejados(idUsuario, 5),
    treinoModel.volumeSemanal(idUsuario, 8),
    treinoModel.frequenciaModalidade(idUsuario, 90),
  ]);

  const minutos = Number(atual.minutos);
  return {
    semana: { ...sem, rotulo: rotuloSemana(sem) },
    treinosSemana: Number(atual.treinos),
    diferencaSemanaAnterior: Number(atual.treinos) - Number(ant.treinos),
    minutos,
    metaOms: META_OMS_MIN,
    percentualOms: Math.min(100, Math.round((minutos / META_OMS_MIN) * 100)),
    calorias: Number(atual.calorias),
    metas: metasAtivas,
    metasVencendo: metasAtivas.filter((m) => m.perto_do_prazo || m.vencida).length,
    pesoAtual: ultima ? Number(ultima.peso_kg) : null,
    variacaoMes: ultima && refMes ? Math.round((Number(ultima.peso_kg) - Number(refMes.peso_kg)) * 10) / 10 : null,
    minutosPorDia: porDia,
    ultimos,
    planejados,
    volume,
    frequencia: freq,
    vazio: !ultimos.length && !planejados.length && !metasAtivas.length && !ultima,
  };
}

module.exports = { montar };
