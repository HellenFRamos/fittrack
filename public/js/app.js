(function () {
  'use strict';

  const VERDE = '#A8D5BA';
  const VERDE_ESCURO = '#2F5640';
  const PALETA = ['#A8D5BA', '#CFC8EE', '#F7CDB0', '#BFDCEF', '#E8D9A8', '#D7B8CF', '#B8D8D0', '#D5D9C5'];
  const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  // gráficos (Chart.js)
  function graficos() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.color = '#5B6B62';
    document.querySelectorAll('canvas[data-grafico]').forEach((cv) => {
      let cfg;
      try { cfg = JSON.parse(cv.dataset.grafico); } catch (e) { return; }
      const sufixo = cfg.sufixo || '';
      const datasets = [];
      if (cfg.tipo === 'doughnut') {
        datasets.push({ data: cfg.valores, backgroundColor: PALETA, borderColor: '#fff', borderWidth: 2 });
      } else if (cfg.tipo === 'line') {
        datasets.push({ data: cfg.valores, borderColor: VERDE_ESCURO, backgroundColor: 'rgba(168,213,186,.35)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: VERDE_ESCURO });
      } else {
        const max = Math.max(...cfg.valores);
        datasets.push({ data: cfg.valores, backgroundColor: cfg.valores.map((v) => (v > 0 && v === max ? '#8FC4A4' : VERDE)), borderRadius: 6, maxBarThickness: 46 });
      }
      if (cfg.referencia !== undefined && cfg.tipo !== 'doughnut') {
        datasets.push({ type: 'line', label: cfg.rotuloReferencia || 'OMS', data: cfg.valores.map(() => cfg.referencia), borderColor: '#C9895F', borderDash: [6, 5], borderWidth: 1.5, pointRadius: 0, fill: false });
      }
      new Chart(cv, {
        type: cfg.tipo,
        data: { labels: cfg.rotulos, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 500 },
          plugins: {
            legend: { display: cfg.tipo === 'doughnut', position: 'right', labels: { boxWidth: 12 } },
            tooltip: { callbacks: { label: (c) => `${c.dataset.label ? c.dataset.label + ': ' : ''}${fmt(c.parsed.y ?? c.parsed)}${sufixo}` } },
          },
          scales: cfg.tipo === 'doughnut' ? {} : {
            x: { grid: { display: false } },
            y: { beginAtZero: cfg.tipo !== 'line', grid: { color: '#EDF3EF' }, ticks: { precision: 0 } },
          },
        },
      });
    });
  }

  // confirmação antes de excluir/desativar
  function confirmacoes() {
    const el = document.getElementById('modalConfirmar');
    if (!el || !window.bootstrap) return;
    const modal = new bootstrap.Modal(el);
    let alvo = null;
    document.addEventListener('submit', (ev) => {
      const form = ev.target;
      if (!form.matches('form[data-confirmar]') || form.dataset.confirmado === '1') return;
      ev.preventDefault();
      alvo = form;
      document.getElementById('modalConfirmarTexto').textContent = form.dataset.confirmar;
      modal.show();
    });
    document.getElementById('modalConfirmarOk').addEventListener('click', () => {
      if (!alvo) return;
      alvo.dataset.confirmado = '1';
      modal.hide();
      alvo.requestSubmit ? alvo.requestSubmit() : alvo.submit();
    });
  }

  // cadastro: consentimento
  function consentimento() {
    const form = document.querySelector('form[data-consentimento]');
    if (!form) return;
    const btn = form.querySelector('[data-requer-consentimento]');
    const caixas = [form.querySelector('#termos'), form.querySelector('#consentimento')];
    const atualizar = () => { btn.disabled = !caixas.every((c) => c && c.checked); };
    caixas.forEach((c) => c && c.addEventListener('change', atualizar));
    atualizar();
  }

  // formulário de treino
  function formTreino() {
    const form = document.getElementById('formTreino');
    if (!form) return;
    const lista = document.getElementById('listaItens');
    const exercicios = JSON.parse(form.dataset.exercicios || '[]');
    const peso = Number(form.dataset.peso) || 0;
    const selMod = form.querySelector('#id_modalidade');
    const dur = form.querySelector('#duracao_min');
    const data = form.querySelector('#data_treino');
    const status = form.querySelector('#status');
    const cal = form.querySelector('#calorias');

    function preencherOpcoes(select) {
      const mod = Number(selMod.value);
      const atual = select.value || select.dataset.valor || '';
      const doMod = exercicios.filter((e) => e.m === mod);
      const outros = exercicios.filter((e) => e.m !== mod);
      select.innerHTML = '';
      select.appendChild(new Option('Selecione o exercício', ''));
      const grupo = (rotulo, itens) => {
        if (!itens.length) return;
        const g = document.createElement('optgroup');
        g.label = rotulo;
        itens.forEach((e) => g.appendChild(new Option(mod && e.m === mod ? e.n : `${e.n} (${e.mod})`, e.id)));
        select.appendChild(g);
      };
      if (mod) { grupo(selMod.options[selMod.selectedIndex].text, doMod); grupo('Outras modalidades', outros); }
      else grupo('Todos os exercícios', exercicios);
      select.value = atual;
    }

    function renumerar() {
      lista.querySelectorAll('[data-item]').forEach((linha, i) => {
        linha.querySelectorAll('[data-num]').forEach((n) => { n.textContent = i + 1; });
        linha.querySelectorAll('[data-campo]').forEach((inp) => {
          inp.name = `itens[${i}][${inp.dataset.campo}]`;
          const novoId = inp.id.replace(/\d+$/, String(i));
          const lbl = linha.querySelector(`label[for="${inp.id}"]`);
          inp.id = novoId;
          if (lbl) lbl.htmlFor = novoId;
        });
      });
    }

    function novaLinha() {
      const modelo = lista.querySelector('[data-item]');
      const linha = modelo.cloneNode(true);
      linha.querySelectorAll('input').forEach((i) => { i.value = ''; i.classList.remove('is-invalid'); });
      linha.querySelectorAll('.invalid-feedback').forEach((e) => e.remove());
      const sel = linha.querySelector('select');
      sel.classList.remove('is-invalid');
      sel.dataset.valor = '';
      sel.value = '';
      lista.appendChild(linha);
      renumerar();
      preencherOpcoes(sel);
      sel.focus();
    }

    function calorias() {
      const opt = selMod.options[selMod.selectedIndex];
      const met = opt ? Number(opt.dataset.met) : 0;
      const min = Number(dur.value);
      cal.value = met && peso && min > 0 ? `≈ ${Math.round(met * peso * (min / 60))} kcal` : '';
    }

    function statusPorData() {
      const futura = data.value && data.value > data.dataset.hoje;
      const opReal = status.querySelector('option[value="REALIZADO"]');
      opReal.disabled = !!futura;
      if (futura) status.value = 'PLANEJADO';
    }

    form.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-acao]');
      if (!b) return;
      if (b.dataset.acao === 'add-item') novaLinha();
      if (b.dataset.acao === 'remover-item') {
        const linhas = lista.querySelectorAll('[data-item]');
        const linha = b.closest('[data-item]');
        if (linhas.length > 1) linha.remove();
        else linha.querySelectorAll('input, select').forEach((i) => { i.value = ''; });
        renumerar();
      }
      if (b.dataset.acao === 'copiar') {
        const sel = document.getElementById('copiarDe');
        if (sel && sel.value) window.location.href = b.closest('[data-copiar]').dataset.copiar + encodeURIComponent(sel.value);
      }
    });
    selMod.addEventListener('change', () => { lista.querySelectorAll('select[data-campo]').forEach(preencherOpcoes); calorias(); });
    dur.addEventListener('input', calorias);
    data.addEventListener('change', statusPorData);

    lista.querySelectorAll('select[data-campo]').forEach(preencherOpcoes);
    calorias();
    statusPorData();
  }

  // formulário de meta: unidade sugerida pelo tipo
  function formMeta() {
    const form = document.querySelector('form[data-unidades]');
    if (!form) return;
    const unidades = JSON.parse(form.dataset.unidades);
    const tipo = form.querySelector('#tipo');
    const un = form.querySelector('#unidade');
    tipo.addEventListener('change', () => {
      const sugeridas = Object.values(unidades);
      if (!un.value || sugeridas.includes(un.value)) un.value = unidades[tipo.value] || '';
    });
  }

  // senha provisória
  function gerarSenha() {
    const b = document.querySelector('[data-acao="gerar-senha"]');
    if (!b) return;
    b.addEventListener('click', () => {
      const letras = 'abcdefghjkmnpqrstuvwxyz';
      const nums = '23456789';
      const r = new Uint32Array(10);
      crypto.getRandomValues(r);
      let s = '';
      r.forEach((x, i) => { s += i % 3 === 2 ? nums[x % nums.length] : letras[x % letras.length]; });
      document.getElementById('senha_provisoria').value = s;
    });
  }

  function autoEnviar() {
    document.querySelectorAll('select[data-autoenviar]').forEach((s) => s.addEventListener('change', () => s.form.submit()));
  }

  document.addEventListener('DOMContentLoaded', () => {
    graficos();
    confirmacoes();
    consentimento();
    formTreino();
    formMeta();
    gerarSenha();
    autoEnviar();
  });
}());
