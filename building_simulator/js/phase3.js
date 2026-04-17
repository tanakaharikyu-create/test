// phase3.js — 真紀子個人CFパネル（Sec.18）
'use strict';

const Phase3 = (() => {

  // ── 状態 ─────────────────────────────────────────────
  const state = {
    loanBalance:      25992000,  // 土地借入残高（2026年4月時点）
    monthlyPrincipal: 167000,    // 月額元本返済（固定）
    loanRate:         2.525,     // 金利 (%) 変動
    remainingYears:   8,         // 返済残年数（〜2034年3月）
    landTax:          768000,    // 土地固都税+都計税年額（R7基準）
    rentMultiplier:   6,         // 地代倍率（固都税×倍）
  };

  // ── 計算 ─────────────────────────────────────────────

  function calcGroundRent() {
    // 地代月額 = 固都税年額 × 倍率 / 12
    return Math.round(state.landTax * state.rentMultiplier / 12);
  }

  function calcMonthly(balance) {
    const groundRent      = calcGroundRent();
    const monthlyInterest = Math.round(balance * state.loanRate / 100 / 12);
    const landTaxMo       = Math.round(state.landTax / 12);
    const cf              = groundRent - state.monthlyPrincipal - monthlyInterest - landTaxMo;
    return { groundRent, monthlyInterest, landTaxMo, cf };
  }

  function calcCurrent() {
    return calcMonthly(state.loanBalance);
  }

  function calcBalloonBalance() {
    // 返済残年数 × 12ヶ月 × 月額元本 を現残高から引いた額
    return Math.max(0, state.loanBalance - state.monthlyPrincipal * state.remainingYears * 12);
  }

  function calcTimeline() {
    const result  = [];
    let balance   = state.loanBalance;
    const showYrs = state.remainingYears + 3;

    for (let y = 1; y <= showYrs; y++) {
      if (y <= state.remainingYears) {
        // 返済期間中
        const { groundRent, monthlyInterest, landTaxMo, cf } = calcMonthly(balance);
        result.push({
          year:     y,
          balance:  Math.round(balance / 10000),
          annualCF: Math.round(cf * 12 / 10000),
          balloon:  false,
        });
        balance = Math.max(0, balance - state.monthlyPrincipal * 12);
      } else if (y === state.remainingYears + 1) {
        // 一括返済の年（残額を年のCFから差し引く）
        const balloon    = calcBalloonBalance();
        const groundRent = calcGroundRent();
        const landTaxMo  = Math.round(state.landTax / 12);
        const yearlyNetAfterBalloon = (groundRent - landTaxMo) * 12 - balloon;
        result.push({
          year:     y,
          balance:  Math.round(balloon / 10000),
          annualCF: Math.round(yearlyNetAfterBalloon / 10000),
          balloon:  true,
        });
      } else {
        // 完済後: 地代 − 固都税のみ
        const groundRent = calcGroundRent();
        const landTaxMo  = Math.round(state.landTax / 12);
        result.push({
          year:     y,
          balance:  0,
          annualCF: Math.round((groundRent - landTaxMo) * 12 / 10000),
          balloon:  false,
        });
      }
    }
    return result;
  }

  // ── UI 更新 ──────────────────────────────────────────

  function setCell(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function updateSignals() {
    const m        = calcCurrent();
    const balloon  = calcBalloonBalance();

    setCell('p3-groundrent-val', fmt(m.groundRent));
    setCell('p3-cf-val',         fmt(m.cf));
    setCell('p3-balloon-val',    fmt(balloon));

    function setSig(id, val, green, yellow) {
      const el = document.getElementById(id);
      if (!el) return;
      const cls = val > green ? 'signal-green' : val > yellow ? 'signal-yellow' : 'signal-red';
      el.className = 'signal-card ' + cls;
    }
    setSig('p3-card-rent',    m.groundRent, 0,       -999999);  // 収入なので常に緑
    setSig('p3-card-cf',      m.cf,         50000,   0);
    setSig('p3-card-balloon', -balloon,     -5000000,-10000000); // 残高小さい=緑
  }

  function updateSummary() {
    const m      = calcCurrent();
    const annual = state.landTax * state.rentMultiplier;

    setCell('p3-sum-rent',      fmt(m.groundRent));
    setCell('p3-sum-principal', fmt(-state.monthlyPrincipal));
    setCell('p3-sum-interest',  fmt(-m.monthlyInterest));
    setCell('p3-sum-landtax',   fmt(-m.landTaxMo));
    setCell('p3-sum-cf',        fmt(m.cf));
    setCell('p3-sum-annual',    fmt(m.cf * 12));
    setCell('p3-compass-rent',  fmt(annual));
    setCell('p3-balloon-disp',  fmt(calcBalloonBalance()));
    setCell('p3-rent-formula',
      `¥${state.landTax.toLocaleString()} × ${state.rentMultiplier}倍 ÷ 12 = 月¥${m.groundRent.toLocaleString()}`
    );
  }

  // ── グラフ ────────────────────────────────────────────
  let p3Chart = null;

  function renderChart() {
    const ctx = document.getElementById('p3Chart');
    if (!ctx) return;
    const data   = calcTimeline();
    const labels = data.map(d => `${d.year}年目`);
    if (p3Chart) p3Chart.destroy();

    const bgCF  = data.map(d => d.balloon ? 'rgba(244,67,54,0.8)' : d.annualCF >= 0 ? 'rgba(76,175,80,0.7)' : 'rgba(244,67,54,0.7)');
    const borCF = data.map(d => d.balloon ? '#F44336' : d.annualCF >= 0 ? '#4CAF50' : '#F44336');

    p3Chart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '年間CF（万円）',
            data: data.map(d => d.annualCF),
            backgroundColor: bgCF,
            borderColor: borCF,
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            label: '借入残高（万円）',
            data: data.map(d => d.balance),
            type: 'line',
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33,150,243,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            fill: false,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: c => {
                const v = c.parsed.y;
                return `${c.dataset.label}: ${v < 0 ? '▲' : ''}${Math.abs(v).toLocaleString()}万円`;
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: '返済経過年' } },
          y: {
            position: 'left',
            title: { display: true, text: '年間CF（万円）' },
            ticks: { callback: v => `${v}万` },
          },
          y1: {
            position: 'right',
            title: { display: true, text: '残高（万円）' },
            ticks: { callback: v => `${v}万` },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  // ── 全更新 ────────────────────────────────────────────
  function updateAll() {
    updateSignals();
    updateSummary();
    renderChart();
  }

  // ── イベントバインディング ────────────────────────────
  function bindEvents() {
    function bindNumber(id, key, isFloat) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', e => {
        const v = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value.replace(/,/g, ''), 10);
        if (!isNaN(v) && v >= 0) { state[key] = v; updateAll(); }
      });
    }

    bindNumber('p3-balance-in',   'loanBalance',      false);
    bindNumber('p3-principal-in', 'monthlyPrincipal', false);
    bindNumber('p3-rate-in',      'loanRate',         true);
    bindNumber('p3-years-in',     'remainingYears',   false);
    bindNumber('p3-landtax-in',   'landTax',          false);

    const sel = document.getElementById('p3-mult-sel');
    if (sel) sel.addEventListener('change', e => {
      state.rentMultiplier = parseInt(e.target.value, 10);
      updateAll();
    });
  }

  // ── 初期化 ────────────────────────────────────────────
  let initialized = false;

  function init() {
    if (initialized) { updateAll(); return; }
    const inits = {
      'p3-balance-in':   state.loanBalance,
      'p3-principal-in': state.monthlyPrincipal,
      'p3-rate-in':      state.loanRate,
      'p3-years-in':     state.remainingYears,
      'p3-landtax-in':   state.landTax,
    };
    Object.entries(inits).forEach(([id, val]) => {
      const el = document.getElementById(id); if (el) el.value = val;
    });
    const sel = document.getElementById('p3-mult-sel');
    if (sel) sel.value = state.rentMultiplier;
    bindEvents();
    updateAll();
    initialized = true;
  }

  return { init, getGroundRent: calcGroundRent };
})();
