// Carrega dados de demonstração (as mesmas personas dos protótipos do projeto).
// As datas são relativas ao dia em que o script roda, para o painel sempre ter dados recentes.
// Senha de todas as contas de demonstração: fittrack123
require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const db = require('../src/config/db');
const { hojeISO, addDias, semana } = require('../src/utils/datas');
const { caloriasEstimadas } = require('../src/utils/regras');

const SENHA = 'fittrack123';
const HOJE = hojeISO();
const SEM = semana(HOJE);
const dia = (n) => addDias(HOJE, n);              // relativo a hoje
const nasemana = (i) => addDias(SEM.inicio, i);   // 0 = segunda desta semana

let EX = {};
let MOD = {};

async function usuario(u, hash) {
  const r = await db.query(
    `INSERT INTO usuario (nome, email, senha_hash, data_nascimento, sexo, altura_cm, tipo_perfil, id_administrador,
       ativo, senha_provisoria, consentimento_em, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [u.nome, u.email, hash, u.nasc, u.sexo, u.altura, u.perfil, u.admin || null, u.ativo === false ? 0 : 1,
      u.provisoria ? 1 : 0, u.perfil === 'VINCULADO' ? null : new Date(), `${dia(-90)} 10:00:00`]);
  return r.insertId;
}

async function medida(idU, data, peso, gordura = null, cintura = null) {
  await db.query('INSERT INTO medida_corporal (id_usuario, data_medicao, peso_kg, percentual_gordura, cintura_cm) VALUES (?, ?, ?, ?, ?)',
    [idU, data, peso, gordura, cintura]);
}

async function pesoEm(idU, data) {
  const r = await db.one('SELECT peso_kg FROM medida_corporal WHERE id_usuario = ? AND data_medicao <= ? ORDER BY data_medicao DESC LIMIT 1', [idU, data]);
  return r ? Number(r.peso_kg) : null;
}

// itens: [nomeExercicio, séries, reps, carga, distKm, tempoSeg]
async function treino(idU, idCriador, mod, titulo, data, dur, intens, itens, status = null, obs = null) {
  const st = status || (data > HOJE ? 'PLANEJADO' : 'REALIZADO');
  const cal = caloriasEstimadas(MOD[mod].met, await pesoEm(idU, data), dur);
  const r = await db.query(
    `INSERT INTO treino (id_usuario, id_criador, id_modalidade, titulo, data_treino, duracao_min, intensidade,
       calorias_estimadas, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [idU, idCriador, MOD[mod].id, titulo, data, dur, intens, cal, st, obs]);
  let ordem = 1;
  for (const [nome, s, rep, carga, dist, tempo] of itens) {
    if (!EX[nome]) throw new Error(`Exercício não encontrado: ${nome}`);
    await db.query(
      `INSERT INTO treino_exercicio (id_treino, id_exercicio, ordem, series, repeticoes, carga_kg, distancia_km, tempo_seg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [r.insertId, EX[nome], ordem++, s ?? null, rep ?? null, carga ?? null, dist ?? null, tempo ?? null]);
  }
}

async function meta(idU, idCriador, m, progressos = []) {
  const r = await db.query(
    `INSERT INTO meta (id_usuario, id_criador, titulo, tipo, valor_inicial, valor_alvo, unidade, data_inicio, data_limite, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [idU, idCriador, m.titulo, m.tipo, m.ini, m.alvo, m.un, m.inicio, m.limite, m.status || 'ATIVA']);
  for (const [data, valor, obs] of progressos) {
    await db.query('INSERT INTO progresso_meta (id_meta, data_registro, valor, observacao) VALUES (?, ?, ?, ?)', [r.insertId, data, valor, obs || null]);
  }
}

const INF = [['Agachamento livre', 4, 10, 50], ['Leg press 45°', 3, 12, 120], ['Cadeira extensora', 3, 15, 35], ['Panturrilha em pé', 4, 15, 40]];
const SUP = [['Supino reto', 4, 10, 30], ['Puxada frontal', 4, 10, 40], ['Desenvolvimento', 3, 12, 12], ['Rosca direta', 3, 12, 14]];
const CORRIDA = (km, min) => [['Corrida contínua', null, null, null, km, min * 60]];

(async () => {
  const jaTem = await db.one("SELECT COUNT(*) AS n FROM usuario WHERE email LIKE '%@email.com'");
  if (jaTem.n > 0) {
    console.log('Dados de demonstração já existem. Rode "npm run db:reset" para recriar tudo do zero.');
    process.exit(0);
  }
  EX = Object.fromEntries((await db.query('SELECT id_exercicio, nome FROM exercicio')).map((e) => [e.nome, e.id_exercicio]));
  MOD = Object.fromEntries((await db.query('SELECT id_modalidade AS id, nome, met FROM modalidade')).map((m) => [m.nome, m]));
  const hash = await bcrypt.hash(SENHA, 12);

  // ------------------------------------------------------------ Ana Souza – usuária pessoal
  const ana = await usuario({ nome: 'Ana Souza', email: 'ana.souza@email.com', nasc: '1996-04-18', sexo: 'F', altura: 165, perfil: 'PESSOAL' }, hash);
  const pesosAna = [[-63, 66.2, 31.0, 82], [-49, 65.8, 30.6, 81.5], [-35, 65.5, 30.1, 81], [-28, 65.5, 29.9, 80.5], [-21, 65.0, 29.6, 80], [-14, 64.8, 29.3, 79.5], [-7, 64.5, 29.0, 79], [-1, 64.2, 28.7, 78.5]];
  for (const [d, p, g, c] of pesosAna) await medida(ana, dia(d), p, g, c);
  // semanas anteriores: 2 a 4 treinos por semana
  const padrao = [[0, 'Corrida', 'Corrida leve', 40], [2, 'Musculação', 'Treino A – Membros inferiores', 50], [4, 'Musculação', 'Treino B – Membros superiores', 50], [5, 'Caminhada', 'Caminhada no parque', 45]];
  for (let s = 7; s >= 1; s -= 1) {
    for (const [i, [off, mod, tit, dur]] of padrao.entries()) {
      if ((s + i) % 4 === 3) continue; // pula alguns treinos para variar o volume
      const data = addDias(SEM.inicio, -7 * s + off);
      const itens = mod === 'Musculação' ? (tit.includes('inferiores') ? INF : SUP) : mod === 'Corrida' ? CORRIDA(3 + (7 - s) * 0.2, dur) : [['Caminhada rápida', null, null, null, 4, dur * 60]];
      await treino(ana, ana, mod, tit, data, dur, mod === 'Corrida' ? 'MODERADA' : 'MODERADA', itens);
    }
  }
  // semana atual (até hoje): 4 treinos, 185 min
  const atual = [
    [0, 'Corrida', 'Corrida leve', 45, 'MODERADA', CORRIDA(5.2, 45)],
    [2, 'Musculação', 'Treino A – Membros inferiores', 50, 'VIGOROSA', INF],
    [3, 'Caminhada', 'Caminhada no parque', 30, 'LEVE', [['Caminhada leve', null, null, null, 2.5, 1800]]],
    [4, 'Musculação', 'Treino B – Membros superiores', 60, 'MODERADA', SUP],
  ];
  for (const [off, mod, tit, dur, int, itens] of atual) {
    const data = nasemana(off);
    if (data <= HOJE) await treino(ana, ana, mod, tit, data, dur, int, itens);
  }
  await treino(ana, ana, 'Corrida', 'Longão de sábado', dia(1), 50, 'MODERADA', CORRIDA(6, 50), 'PLANEJADO', 'Ritmo confortável.');
  await meta(ana, ana, { titulo: 'Correr 5 km sem parar', tipo: 'DISTANCIA', ini: 0, alvo: 5, un: 'km', inicio: dia(-60), limite: dia(32) },
    [[dia(-45), 2, 'Com duas pausas'], [dia(-25), 3, null], [dia(-4), 3.6, 'Melhor marca!']]);
  await meta(ana, ana, { titulo: 'Chegar a 62 kg', tipo: 'PESO', ini: 66.2, alvo: 62, un: 'kg', inicio: dia(-63), limite: dia(79) },
    [[dia(-35), 65.5], [dia(-14), 64.8], [dia(-1), 64.2]]);
  await meta(ana, ana, { titulo: 'Agachamento 60 kg', tipo: 'CARGA', ini: 30, alvo: 60, un: 'kg', inicio: dia(-50), limite: dia(5) },
    [[dia(-30), 40], [dia(-10), 50]]);
  await meta(ana, ana, { titulo: 'Treinar 4x por semana', tipo: 'FREQUENCIA', ini: 2, alvo: 4, un: 'treinos/semana', inicio: dia(-40), limite: dia(20), status: 'CONCLUIDA' },
    [[dia(-20), 3], [dia(0), 4, 'Semana completa!']]);
  await meta(ana, ana, { titulo: 'Fazer aula de yoga', tipo: 'PERSONALIZADA', ini: 0, alvo: 4, un: 'aulas', inicio: dia(-80), limite: dia(-20), status: 'CANCELADA' }, [[dia(-60), 1]]);

  // ------------------------------------------------------------ Marina Alves – administradora (personal trainer)
  const marina = await usuario({ nome: 'Marina Alves', email: 'marina.alves@email.com', nasc: '1989-09-02', sexo: 'F', altura: 170, perfil: 'ADMINISTRADOR' }, hash);
  for (const [d, p] of [[-40, 61.0], [-10, 60.6]]) await medida(marina, dia(d), p, 22.5, 70);
  await treino(marina, marina, 'Funcional', 'Circuito funcional', nasemana(1) <= HOJE ? nasemana(1) : dia(-6), 40, 'VIGOROSA', [['Burpee', 4, 12], ['Kettlebell swing', 4, 15, 16], ['Prancha', 3, null, null, null, 60]]);
  await treino(marina, marina, 'Corrida', 'Corrida intervalada', dia(-2), 35, 'VIGOROSA', [['Intervalado na esteira', 8, null, null, 5, 1800]]);
  await meta(marina, marina, { titulo: 'Meia maratona', tipo: 'DISTANCIA', ini: 10, alvo: 21, un: 'km', inicio: dia(-30), limite: dia(120) }, [[dia(-8), 14]]);

  // vinculados
  const bruno = await usuario({ nome: 'Bruno Lima', email: 'bruno.lima@email.com', nasc: '1999-01-25', sexo: 'M', altura: 178, perfil: 'VINCULADO', admin: marina }, hash);
  const carla = await usuario({ nome: 'Carla Mendes', email: 'carla.m@email.com', nasc: '1993-07-11', sexo: 'F', altura: 162, perfil: 'VINCULADO', admin: marina }, hash);
  const diego = await usuario({ nome: 'Diego Rocha', email: 'diego.rocha@email.com', nasc: '1987-12-03', sexo: 'M', altura: 182, perfil: 'VINCULADO', admin: marina }, hash);
  const elisa = await usuario({ nome: 'Elisa Prado', email: 'elisa.p@email.com', nasc: '2000-05-30', sexo: 'F', altura: 158, perfil: 'VINCULADO', admin: marina, ativo: false }, hash);

  // Bruno: 4 de 4 nesta semana + próximos planejados
  for (const [d, p, c] of [[-45, 84, 92], [-20, 82.5, 90], [-3, 81.8, 89]]) await medida(bruno, dia(d), p, 18, c);
  for (let s = 4; s >= 1; s -= 1) {
    await treino(bruno, marina, 'Musculação', 'Treino A – Inferiores', addDias(SEM.inicio, -7 * s), 50, 'VIGOROSA', INF);
    await treino(bruno, marina, 'Musculação', 'Treino B – Superiores', addDias(SEM.inicio, -7 * s + 2), 55, 'VIGOROSA', SUP);
    await treino(bruno, marina, 'Corrida', 'Intervalado na esteira', addDias(SEM.inicio, -7 * s + 4), 30, 'VIGOROSA', [['Intervalado na esteira', 6, null, null, 4, 1800]]);
  }
  const semBruno = [
    [0, 'Musculação', 'Treino A – Inferiores', 50, INF], [1, 'Corrida', 'Intervalado na esteira', 30, [['Intervalado na esteira', 6, null, null, 4, 1800]]],
    [2, 'Musculação', 'Treino B – Superiores', 55, SUP], [3, 'Funcional', 'Core e mobilidade', 35, [['Prancha', 3, null, null, null, 60], ['Afundo', 3, 12]]],
  ];
  for (const [off, mod, tit, dur, itens] of semBruno) {
    const data = nasemana(off) <= HOJE ? nasemana(off) : dia(-(4 - off));
    await treino(bruno, marina, mod, tit, data, dur, 'VIGOROSA', itens, 'REALIZADO');
  }
  await treino(bruno, marina, 'Musculação', 'Treino B – Superiores', dia(3), 55, 'VIGOROSA', SUP, 'PLANEJADO', 'Aumentar 2 kg no supino.');
  await treino(bruno, marina, 'Corrida', 'Intervalado na esteira', dia(5), 30, 'VIGOROSA', [['Intervalado na esteira', 8, null, null, 4.5, 1800]], 'PLANEJADO');
  await meta(bruno, marina, { titulo: 'Supino 70 kg', tipo: 'CARGA', ini: 55, alvo: 70, un: 'kg', inicio: dia(-45), limite: dia(45) }, [[dia(-30), 58], [dia(-12), 62], [dia(-2), 64]]);
  await meta(bruno, marina, { titulo: 'Reduzir cintura para 86 cm', tipo: 'PERSONALIZADA', ini: 92, alvo: 86, un: 'cm', inicio: dia(-45), limite: dia(60) }, [[dia(-20), 90], [dia(-3), 89]]);

  // Carla: 2 de 3 nesta semana
  await medida(carla, dia(-15), 68.4, 30.5, 84);
  await treino(carla, marina, 'Musculação', 'Treino A – Inferiores', dia(-9), 45, 'MODERADA', INF);
  await treino(carla, marina, 'Musculação', 'Treino A – Inferiores', nasemana(0) <= HOJE ? nasemana(0) : dia(-1), 45, 'MODERADA', INF, 'REALIZADO');
  await treino(carla, marina, 'Caminhada', 'Caminhada rápida', dia(-1), 40, 'MODERADA', [['Caminhada rápida', null, null, null, 4, 2400]], 'REALIZADO');
  await treino(carla, marina, 'Musculação', 'Treino B – Superiores', HOJE, 45, 'MODERADA', SUP, 'PLANEJADO');
  await meta(carla, marina, { titulo: 'Chegar a 65 kg', tipo: 'PESO', ini: 70, alvo: 65, un: 'kg', inicio: dia(-30), limite: dia(90) }, [[dia(-15), 68.4]]);
  await meta(carla, marina, { titulo: 'Caminhar 30 km no mês', tipo: 'DISTANCIA', ini: 0, alvo: 30, un: 'km', inicio: dia(-12), limite: dia(18) }, [[dia(-1), 12]]);
  await meta(carla, marina, { titulo: 'Treinar 3x por semana', tipo: 'FREQUENCIA', ini: 1, alvo: 3, un: 'treinos/semana', inicio: dia(-12), limite: dia(40) }, [[dia(-1), 2]]);

  // Diego: 0 de 3 nesta semana, último treino há 9 dias
  await medida(diego, dia(-30), 95.2, 27, 101);
  await treino(diego, marina, 'Ciclismo', 'Pedal leve', dia(-9), 60, 'MODERADA', [['Pedal na rua', null, null, null, 18, 3600]]);
  for (const off of [-1, 1, 3]) {
    await treino(diego, marina, 'Caminhada', 'Caminhada rápida', addDias(HOJE, off), 40, 'MODERADA', [['Caminhada rápida', null, null, null, 4, 2400]], 'PLANEJADO');
  }
  await meta(diego, marina, { titulo: 'Chegar a 90 kg', tipo: 'PESO', ini: 96, alvo: 90, un: 'kg', inicio: dia(-35), limite: dia(85) }, [[dia(-30), 95.2]]);

  // Elisa: inativa, com histórico preservado
  await treino(elisa, marina, 'Pilates', 'Pilates solo', dia(-60), 50, 'LEVE', [['Hundred', 1, 100], ['Roll up', 3, 8]]);

  console.log('✔ Dados de demonstração carregados. Contas (senha: fittrack123):');
  console.log('  Pessoal ........ ana.souza@email.com');
  console.log('  Administrador .. marina.alves@email.com');
  console.log('  Vinculado ...... bruno.lima@email.com (também carla.m@, diego.rocha@; elisa.p@ está inativa)');
  await db.pool.end();
})().catch(async (err) => {
  console.error('Erro ao carregar a demonstração:', err);
  await db.pool.end();
  process.exit(1);
});
