// app.js — UIバインディング・メインロジック
'use strict';

// ── 現在のパラメータ状態 ─────────────────────────
let state = {
  set:         CONFIG.DEFAULT_SET,
  principal:   CONFIG.SET_A.loan,
  annualRate:  CONFIG.DEFAULT_RATE,
  years:       CONFIG.DEFAULT_YEARS,
  method:      CONFIG.DEFAULT_METHOD,
  vacancyRate: CONFIG.DEFAULT_VACANCY,
  declineRate: CONFIG.DEFAULT_DECLINE,
  annualPropertyTax: CONFIG.ANNUAL_PROPERTY_TAX,
  constructionCost:  CONFIG.CONSTRUCTION_COST_DEFAULT,
};

// ── ユーティリティ ────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(Math.round(n));
  const s   = `¥${abs.toLocaleString()}`;
  return n < 0 ? `▲${s}` : s;
}

function fmtM(n) {
  // 万円表示
  const abs = Math.abs(Math.round(n / 10000));
  return n < 0 ? `▲${abs.toLocaleString()}万円` : `${abs.toLocaleString()}万円`;
}

function signalClass(value, thresholds) {
  if (value > thresholds.green)  return 'signal-green';
  if (value > thresholds.yellow) return 'signal-yellow';
  return 'signal-red';
}

// ── currentSet getter ────────────────────────────
function currentSetData() {
  return state.set === 'A' ? CONFIG.SET_A : CONFIG.SET_B;
}

function buildParams(override = {}) {
  const set = currentSetData();
  return Object.assign({
    principal:        state.principal,
    annualRate:       state.annualRate,
    years:            state.years,
    method:           state.method,
    monthlyRent:      set.monthlyRent,
    monthlyExpenses:  set.monthlyExpenses,
    vacancyRate:      state.vacancyRate,
    declineRate:      state.declineRate,
    annualPropertyTax: state.annualPropertyTax,
  }, override);
}

// ── ダッシュボード更新 ────────────────────────────
function updateDashboard() {
  const params  = buildParams();
  const monthly = Calculator.firstMonthlyCF(params);
  const annual  = Calculator.annualNetSimple(params);
  const sig     = CONFIG.SIGNAL;

  // 月次CF
  const cfCard  = document.getElementById('card-monthly-cf');
  cfCard.querySelectorAll('.signal-value')[0].textContent = fmt(monthly);
  cfCard.className = 'signal-card ' + signalClass(monthly, sig.monthlyCF);

  // 空室率
  const vacCard = document.getElementById('card-vacancy');
  vacCard.querySelectorAll('.signal-value')[0].textContent = `${state.vacancyRate}%`;
  const vClass = state.vacancyRate < sig.vacancyRate.green  ? 'signal-green'
               : state.vacancyRate < sig.vacancyRate.yellow ? 'signal-yellow'
               : 'signal-red';
  vacCard.className = 'signal-card ' + vClass;

  // 年間純収支
  const annCard = document.getElementById('card-annual-net');
  annCard.querySelectorAll('.signal-value')[0].textContent = fmt(annual);
  annCard.className = 'signal-card ' + signalClass(annual, sig.annualNet);
}

// ── 収支サマリーテーブル更新 ──────────────────────
function updateSummaryTable() {
  const paramsEP = buildParams({ method: 'equal_payment' });
  const paramsEQ = buildParams({ method: 'equal_principal' });

  const epPayment  = Calculator.equalPayment(state.principal, state.annualRate, state.years);
  const eqMonth1   = Calculator.equalPrincipalPayment(state.principal, state.annualRate, state.years, 1);
  const epCF       = Calculator.firstMonthlyCF(paramsEP);
  const eqCF       = Calculator.firstMonthlyCF(paramsEQ);
  const epAnnual   = Calculator.annualNetSimple(paramsEP);
  const eqAnnual   = Calculator.annualNetSimple(paramsEQ);
  const epTotal    = Calculator.totalRepayment(state.principal, state.annualRate, state.years, 'equal_payment');
  const eqTotal    = Calculator.totalRepayment(state.principal, state.annualRate, state.years, 'equal_principal');
  const sp         = Calculator.salePrice(paramsEP);
  // 売却利益 = 売却価格 − 総投資額（建築費合計 + 取得経費10.9M）
  const _tax = state.constructionCost * 0.1;
  const _buildingTotal = state.constructionCost + CONFIG.DESIGN_COST
    + CONFIG.DEMOLITION_COST + CONFIG.RENOVATION_COST + _tax;
  const totalInvestment = Math.round(_buildingTotal) + CONFIG.ACQUISITION_COST;
  const profit     = sp.price5 - totalInvestment;

  function setCell(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  setCell('ep-payment',    fmt(epPayment));
  setCell('eq-payment',    fmt(eqMonth1.total));
  setCell('eq-principal',  fmt(eqMonth1.principal));
  setCell('eq-interest',   fmt(eqMonth1.interest));
  setCell('ep-monthly-cf', fmt(epCF));
  setCell('eq-monthly-cf', fmt(eqCF));
  setCell('ep-annual',     fmt(epAnnual));
  setCell('eq-annual',     fmt(eqAnnual));
  setCell('ep-total-int',  fmt(epTotal.interest));
  setCell('eq-total-int',  fmt(eqTotal.interest));
  setCell('ep-total-pay',  fmt(epTotal.total));
  setCell('eq-total-pay',  fmt(eqTotal.total));
  setCell('sale-price-5',  fmt(sp.price5));
  setCell('sale-price-7',  fmt(sp.price7));
  setCell('sale-profit',   fmt(profit));
}

// ── 賃料明細テーブル更新 ──────────────────────────
function updateRentTable() {
  const tbody = document.getElementById('rent-table-body');
  if (!tbody) return;
  const set = currentSetData();
  tbody.innerHTML = set.rooms.map(r =>
    `<tr>
      <td>${r.id}</td>
      <td>${r.floor}F</td>
      <td>${r.tsubo.toFixed(2)}</td>
      <td>¥${r.rent.toLocaleString()}</td>
      <td>¥${r.kyoehi.toLocaleString()}</td>
      <td>¥${r.tax.toLocaleString()}</td>
      <td class="font-bold">¥${r.total.toLocaleString()}</td>
    </tr>`
  ).join('') + `<tr class="total-row">
    <td colspan="3"><strong>合計</strong></td>
    <td><strong>¥${set.rooms.reduce((s,r)=>s+r.rent,0).toLocaleString()}</strong></td>
    <td><strong>¥${set.rooms.reduce((s,r)=>s+r.kyoehi,0).toLocaleString()}</strong></td>
    <td></td>
    <td class="font-bold"><strong>¥${set.monthlyRent.toLocaleString()}</strong></td>
  </tr>`;
}

// ── シナリオ比較テーブル更新 ──────────────────────
function updateScenarioTable() {
  const results = Scenarios.calcAll(state.annualPropertyTax);
  const tbody   = document.getElementById('scenario-table-body');
  if (!tbody) return;

  tbody.innerHTML = results.map(r => `
    <tr>
      <td><strong>${r.label}</strong></td>
      <td>${r.rate}%</td>
      <td>${r.vacancy}%</td>
      <td>${r.rentLabel}</td>
      <td class="${r.monthly < 0 ? 'neg' : ''}">${r.monthlySig} ${fmt(r.monthly)}</td>
      <td class="${r.annual  < 0 ? 'neg' : ''}">${r.annualSig}  ${fmt(r.annual)}</td>
      <td class="${r.cum35   < 0 ? 'neg' : ''}">${fmtM(r.cum35)}</td>
    </tr>
  `).join('');
}

// ── 入力表示の同期 ────────────────────────────────
function syncInputDisplay() {
  // 建設費・消費税（建設費×10%で動的計算）
  const consumpTax    = state.constructionCost * 0.1;
  const buildingTotal = state.constructionCost + CONFIG.DESIGN_COST
    + CONFIG.DEMOLITION_COST + CONFIG.RENOVATION_COST + consumpTax;
  document.getElementById('const-cost-display').textContent  = fmt(state.constructionCost);
  document.getElementById('tax-display').textContent         = fmt(consumpTax);
  document.getElementById('building-total-display').textContent = fmt(buildingTotal);

  // セットAは借入金を建築費合計に自動連動
  if (state.set === 'A') {
    state.principal = Math.round(buildingTotal);
  }

  // 借入金表示（SetA連動後の値を反映）
  document.getElementById('loan-display').textContent = fmt(state.principal);
  document.getElementById('loan-input').value = state.principal;

  // スライダー値
  document.getElementById('rate-display').textContent       = `${state.annualRate.toFixed(1)}%`;
  document.getElementById('vac-display').textContent        = `${state.vacancyRate}%`;
  document.getElementById('decline-display').textContent    = `${state.declineRate.toFixed(1)}%`;
}

// ── 全体更新 ─────────────────────────────────────
function updateAll() {
  syncInputDisplay();
  updateDashboard();
  updateSummaryTable();
  updateScenarioTable();
  updateRentTable();
  const params = buildParams();
  Charts.renderRepaymentChart(params);
  Charts.renderCFChart(params);
  if (typeof Phase2 !== 'undefined') Phase2.refresh();
}

// ── イベントバインディング ────────────────────────
function bindEvents() {

  // セットA/B 切替
  document.querySelectorAll('input[name="set-toggle"]').forEach(radio => {
    radio.addEventListener('change', e => {
      state.set = e.target.value;
      state.principal = currentSetData().loan;
      document.getElementById('loan-input').value = state.principal;
      updateAll();
    });
  });

  // 金利スライダー
  const rateSlider = document.getElementById('rate-slider');
  rateSlider.addEventListener('input', e => {
    state.annualRate = parseFloat(e.target.value);
    updateAll();
  });
  document.getElementById('rate-input').addEventListener('change', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0.5 && v <= 5.0) {
      state.annualRate = v;
      rateSlider.value = v;
      updateAll();
    }
  });

  // 返済年数
  document.getElementById('years-select').addEventListener('change', e => {
    state.years = parseInt(e.target.value, 10);
    updateAll();
  });

  // 返済方式
  document.querySelectorAll('input[name="method-toggle"]').forEach(radio => {
    radio.addEventListener('change', e => {
      state.method = e.target.value;
      updateAll();
    });
  });

  // 空室率
  const vacSlider = document.getElementById('vac-slider');
  vacSlider.addEventListener('input', e => {
    state.vacancyRate = parseInt(e.target.value, 10);
    updateAll();
  });
  document.getElementById('vac-input').addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 30) {
      state.vacancyRate = v;
      vacSlider.value = v;
      updateAll();
    }
  });

  // 賃料下落率
  const decSlider = document.getElementById('decline-slider');
  decSlider.addEventListener('input', e => {
    state.declineRate = parseFloat(e.target.value);
    updateAll();
  });
  document.getElementById('decline-input').addEventListener('change', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0 && v <= 2.0) {
      state.declineRate = v;
      decSlider.value = v;
      updateAll();
    }
  });

  // 借入金 直接入力
  document.getElementById('loan-input').addEventListener('change', e => {
    const v = parseInt(e.target.value.replace(/,/g, ''), 10);
    if (!isNaN(v) && v > 0) {
      state.principal = v;
      updateAll();
    }
  });

  // 固定資産税 直接入力
  document.getElementById('tax-input').addEventListener('change', e => {
    const v = parseInt(e.target.value.replace(/,/g, ''), 10);
    if (!isNaN(v) && v >= 0) {
      state.annualPropertyTax = v;
      updateAll();
    }
  });

  // 建設費スライダー（セットAは借入金を自動連動）
  const constSlider = document.getElementById('const-slider');
  constSlider.addEventListener('input', e => {
    state.constructionCost = parseInt(e.target.value, 10);
    updateAll();
  });

  // グラフタブ
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const target = e.target.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });
}

// ── 初期化 ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // スライダー初期値
  document.getElementById('rate-slider').value    = state.annualRate;
  document.getElementById('rate-input').value     = state.annualRate;
  document.getElementById('years-select').value   = state.years;
  document.getElementById('vac-slider').value     = state.vacancyRate;
  document.getElementById('vac-input').value      = state.vacancyRate;
  document.getElementById('decline-slider').value = state.declineRate;
  document.getElementById('decline-input').value  = state.declineRate;
  document.getElementById('loan-input').value     = state.principal;
  document.getElementById('const-slider').value   = state.constructionCost;
  document.getElementById('tax-input').value      = state.annualPropertyTax;

  bindEvents();
  updateAll();
});
