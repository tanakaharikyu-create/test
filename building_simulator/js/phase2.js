// phase2.js — 3本の矢シミュレーター v3（消費税積立・支払い月追加）
'use strict';

const Phase2 = (() => {

  // ── 状態 ─────────────────────────────────────────────
  const state = {
    // 矢② 鍼灸院（Sec.12-2）
    treatmentPrice:  6000,
    dailyPatients:   25,
    workingDays:     25,      // 月間診療日数（25日）
    staffCost:       1500000,
    miscExpenses:    300000,
    room701Rent:     418329,  // 7F 701号室家賃（Phase 1 config から固定）
    interiorLoan:    20000000,
    interiorRate:    2.0,
    interiorYears:   10,
    branch2Revenue:  0,       // 2号店売上
    branch2Expenses: 0,       // 2号店経費

    // 消費税（積立・支払い）
    vatReserve:    200000,  // 毎月積立額（概算）
    vatPayMonth1:  3,       // 支払い月1（3月）
    vatPayAmount1: 1200000, // 支払い額1
    vatPayMonth2:  9,       // 支払い月2（9月）
    vatPayAmount2: 1200000, // 支払い額2

    // 矢③ kintone外販 3プラン制（Sec.12-3）
    kA_price:   50000, kA_clients: 0,   // A: ファーストクラス
    kB_price:   20000, kB_clients: 0,   // B: ビジネスクラス
    kC_price:   10000, kC_clients: 0,   // C: エコノミー

    // 給与設計（Sec.12-4）
    makikoCompass:   300000,  // 真紀子 COMPASS報酬（代表取締役）
    makikoClinic:    100000,  // 真紀子 鍼灸院報酬（取締役）
    akihiroCompass:  100000,  // 彰宏 COMPASS報酬（取締役）
    akihiroClinic:   400000,  // 彰宏 鍼灸院報酬（代表取締役）

    // 逆算目標
    targetMonthlyCF: 3000000,
  };

  // ── 計算エンジン ──────────────────────────────────────

  // 社保会社負担（役員報酬総額 × 15%）
  function socialIns(officerPay) {
    return Math.round(officerPay * 0.15);
  }

  function getGroundRent() {
    return (typeof Phase3 !== 'undefined' && Phase3.getGroundRent)
      ? Phase3.getGroundRent() : 0;
  }

  function calcArrow1() {
    if (typeof buildParams === 'function') {
      const p              = buildParams();
      const baseCF         = Calculator.firstMonthlyCF(p);
      // firstMonthlyCF は propTax を含まないので月割を控除
      const propTaxMo      = Math.round(p.annualPropertyTax / 12);
      // COMPASS分の役員報酬＋社保を費用として控除
      const compassOfficer = state.makikoCompass + state.akihiroCompass;
      const compassSocIns  = socialIns(compassOfficer);
      // 地代（真紀子個人CFパネルの地代倍率から取得）をCOMPASS経費として控除
      const groundRent     = getGroundRent();
      return baseCF - propTaxMo - compassOfficer - compassSocIns - groundRent;
    }
    return 0;
  }

  // 消費税の月平均負担額（積立 + 年2回支払いの按分）
  function calcVatMonthly() {
    return state.vatReserve + Math.round((state.vatPayAmount1 + state.vatPayAmount2) / 12);
  }

  function calcArrow2() {
    const mainRevenue   = state.treatmentPrice * state.dailyPatients * state.workingDays;
    const revenue       = mainRevenue + state.branch2Revenue;
    const loanPayment   = Calculator.equalPayment(
      state.interiorLoan, state.interiorRate, state.interiorYears
    );
    // 鍼灸院分の役員報酬＋社保を費用として計上
    const clinicOfficer = state.makikoClinic + state.akihiroClinic;
    const clinicSocIns  = socialIns(clinicOfficer);
    // 消費税（月次平均: 積立 + 支払い按分）
    const vatMonthly    = calcVatMonthly();
    const totalExpenses = state.staffCost + state.miscExpenses + state.room701Rent
                        + state.branch2Expenses + loanPayment
                        + clinicOfficer + clinicSocIns + vatMonthly;
    return {
      revenue, mainRevenue, loanPayment,
      clinicOfficer, clinicSocIns, vatMonthly,
      totalExpenses,
      cf: revenue - totalExpenses,
    };
  }

  function calcArrow3() {
    const revenueA     = state.kA_price * state.kA_clients;
    const revenueB     = state.kB_price * state.kB_clients;
    const revenueC     = state.kC_price * state.kC_clients;
    const revenue      = revenueA + revenueB + revenueC;
    const totalClients = state.kA_clients + state.kB_clients + state.kC_clients;
    return { revenueA, revenueB, revenueC, revenue, cf: revenue, totalClients };
  }

  function calcSalary() {
    const makikoTotal  = state.makikoCompass  + state.makikoClinic;
    const akihiroTotal = state.akihiroCompass + state.akihiroClinic;
    return {
      makikoTotal,
      akihiroTotal,
      combined:     makikoTotal + akihiroTotal,
      compassTotal: state.makikoCompass  + state.akihiroCompass,
      clinicTotal:  state.makikoClinic   + state.akihiroClinic,
    };
  }

  function calcAll() {
    const a1  = calcArrow1();
    const a2  = calcArrow2();
    const a3  = calcArrow3();
    const sal = calcSalary();
    const combined = a1 + a2.cf + a3.cf;
    // 各社CFには既に役員報酬+社保が含まれているため、combined = 会社留保合計（二重計上しない）
    return { a1, a2, a3, sal, combined, retained: combined };
  }

  function calcReverse() {
    const a1     = calcArrow1();
    const a2     = calcArrow2();
    const a3     = calcArrow3();
    const target = state.targetMonthlyCF;
    const gap    = target - (a1 + a2.cf + a3.cf);

    // 矢②必要Q（2号店除く主施術のみで試算）
    const neededRevenue = a2.totalExpenses + (target - a1 - a3.cf) - state.branch2Revenue;
    const neededQ       = Math.ceil(neededRevenue / (state.treatmentPrice * state.workingDays));

    // 矢③必要クライアント（Bプラン単価で試算）
    const kintoneGap    = target - a1 - a2.cf;
    const neededClients = kintoneGap > 0 ? Math.ceil(kintoneGap / (state.kB_price || 20000)) : 0;

    return { target, gap, neededQ, neededClients };
  }

  function calcTimeline(totalYears) {
    const years      = totalYears || 40;
    const a2RevMo    = state.treatmentPrice * state.dailyPatients * state.workingDays
                     + state.branch2Revenue;
    const a3Mo       = state.kA_price * state.kA_clients
                     + state.kB_price * state.kB_clients
                     + state.kC_price * state.kC_clients;
    const phase1Params = typeof buildParams === 'function' ? buildParams() : null;

    // 役員報酬+社保（全年共通）
    const compassOfficer = state.makikoCompass + state.akihiroCompass;
    const compassSocIns  = socialIns(compassOfficer);
    const clinicOfficer  = state.makikoClinic + state.akihiroClinic;
    const clinicSocIns   = socialIns(clinicOfficer);
    // 地代（全年共通）
    const groundRentAnnual = getGroundRent() * 12;
    // 消費税（月平均 × 12 = 年間負担額）
    const vatAnnual = calcVatMonthly() * 12;

    const result = [];
    for (let y = 1; y <= years; y++) {
      // 矢①: Phase 1 の正確な年次CF（固定資産税込み）- COMPASS役員報酬+社保+地代（年額）を控除
      const a1Annual = phase1Params
        ? Calculator.annualNetIncome(y, phase1Params) - (compassOfficer + compassSocIns) * 12 - groundRentAnnual
        : 0;

      // 矢②: 内装ローンは interiorYears 年で完済、役員報酬+社保・消費税は全期間発生
      const loanPmt  = (y <= state.interiorYears)
        ? Calculator.equalPayment(state.interiorLoan, state.interiorRate, state.interiorYears)
        : 0;
      const a2Annual = (a2RevMo - state.staffCost - state.miscExpenses
                       - state.room701Rent - state.branch2Expenses - loanPmt
                       - clinicOfficer - clinicSocIns) * 12 - vatAnnual;

      // 矢③: 現状維持（成長モデルなし）
      const a3Annual = a3Mo * 12;

      result.push({
        year: y,
        a1:       Math.round(a1Annual / 10000),
        a2:       Math.round(a2Annual / 10000),
        a3:       Math.round(a3Annual / 10000),
        combined: Math.round((a1Annual + a2Annual + a3Annual) / 10000),
      });
    }
    return result;
  }

  // ── 信号機クラス ──────────────────────────────────────
  function sigClass(val, green, yellow) {
    if (val > green)  return 'signal-green';
    if (val > yellow) return 'signal-yellow';
    return 'signal-red';
  }

  // ── UI 更新ヘルパー ───────────────────────────────────
  function setCell(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  // ── 各セクション更新 ──────────────────────────────────
  function updateSignals() {
    const c = calcAll();
    setCell('s2-arrow1-val',   fmt(c.a1));
    setCell('s2-arrow2-val',   fmt(c.a2.cf));
    setCell('s2-arrow3-val',   fmt(c.a3.cf));
    setCell('s2-combined-val', fmt(c.combined));

    function applySig(cardId, val, green, yellow) {
      const el = document.getElementById(cardId);
      if (el) el.className = 'signal-card ' + sigClass(val, green, yellow);
    }
    applySig('s2-card-arrow1',   c.a1,       200000,  0);
    applySig('s2-card-arrow2',   c.a2.cf,    500000,  0);
    applySig('s2-card-arrow3',   c.a3.cf,    300000,  0);
    applySig('s2-card-combined', c.combined, 1000000, 0);
  }

  function updateSummaryTable() {
    const c = calcAll();
    const p = typeof buildParams === 'function' ? buildParams() : null;

    const rentEff    = p ? Math.round(p.monthlyRent * (1 - p.vacancyRate / 100)) : 0;
    const loanPmt1   = p ? Calculator.equalPayment(p.principal, p.annualRate, p.years) : 0;
    const propTaxMo  = p ? Math.round(p.annualPropertyTax / 12) : 0;

    // COMPASS役員報酬・社保（表示用）
    const compassOfficer = state.makikoCompass + state.akihiroCompass;
    const compassSocIns  = socialIns(compassOfficer);
    // 地代（真紀子個人CFパネルから取得、表示用）
    const groundRentMo   = getGroundRent();
    // c.a1 = baseCF - propTaxMo - officer - socIns - groundRent（完全な COMPASS 月次CF）
    // ※ 二重計上防止: ここで再度 propTaxMo を引かない

    // COMPASS
    setCell('sum-b-rent',     fmt(rentEff));
    setCell('sum-b-expenses', fmt(-(p ? p.monthlyExpenses : 0)));
    setCell('sum-b-loan',     fmt(-loanPmt1));
    setCell('sum-b-proptax',  fmt(-(propTaxMo + groundRentMo)));  // 固資税＋地代
    setCell('sum-b-director', fmt(-compassOfficer));
    setCell('sum-b-socins',   fmt(-compassSocIns));
    setCell('sum-b-cf',       fmt(c.a1));   // c.a1 が完全な COMPASS CF（propTax含む）

    // 鍼灸院（c.a2.cf は既に役員報酬+社保+消費税を含む）
    setCell('sum-c-revenue',  fmt(c.a2.revenue));
    setCell('sum-c-staff',    fmt(-state.staffCost));
    setCell('sum-c-rent701',  fmt(-state.room701Rent));
    setCell('sum-c-misc',     fmt(-state.miscExpenses));
    setCell('sum-c-loan',     fmt(-c.a2.loanPayment));
    setCell('sum-c-vat',      fmt(-c.a2.vatMonthly));
    setCell('sum-c-salary',   fmt(-c.a2.clinicOfficer));
    setCell('sum-c-socins',   fmt(-c.a2.clinicSocIns));
    setCell('sum-c-cf',       fmt(c.a2.cf));

    // kintone
    setCell('sum-k-revenue',  fmt(c.a3.revenue));
    setCell('sum-k-cf',       fmt(c.a3.cf));

    // 給与（家族手取り表示：COMPASS列=COMPASS報酬合計、鍼灸院列=鍼灸院報酬合計）
    setCell('sum-sal-makiko',  fmt(compassOfficer));
    setCell('sum-sal-akihiro', fmt(c.a2.clinicOfficer));
    setCell('sum-sal-total',   fmt(c.sal.combined));
    setCell('sum-sal-total-b', fmt(c.sal.combined));
    setCell('sum-sal-annual',  fmt(c.sal.combined * 12));

    // 合計 = c.combined（各社CF合算。役員報酬・地代は各社CFに含み、ここでは引かない）
    setCell('sum-total-cf',  fmt(c.combined));
    setCell('sum-retained',  fmt(c.combined));
  }

  function updateReversePanel() {
    const rev = calcReverse();
    setCell('rev-target-disp',    fmt(rev.target));
    setCell('rev-needed-q',       `${rev.neededQ}人/日`);
    setCell('rev-needed-clients', `${rev.neededClients}社`);

    const gapEl = document.getElementById('rev-gap');
    if (gapEl) {
      gapEl.textContent = rev.gap > 0
        ? `${fmt(rev.gap)} 不足`
        : `達成（余剰 ${fmt(Math.abs(rev.gap))}）`;
      gapEl.style.color      = rev.gap > 0 ? '#F44336' : '#4CAF50';
      gapEl.style.fontWeight = '700';
    }
  }

  function syncDisplays() {
    const a2  = calcArrow2();
    const a3  = calcArrow3();
    const sal = calcSalary();

    // 矢②
    setCell('disp2-revenue',  fmt(a2.revenue));
    setCell('disp2-rent701',  fmt(state.room701Rent));
    setCell('disp2-loan',     fmt(a2.loanPayment));
    setCell('disp2-vat',      fmt(a2.vatMonthly));
    setCell('disp2-cf',       fmt(a2.cf));

    // 矢③ 3プラン
    setCell('ka-revenue',      fmt(state.kA_price * state.kA_clients));
    setCell('kb-revenue',      fmt(state.kB_price * state.kB_clients));
    setCell('kc-revenue',      fmt(state.kC_price * state.kC_clients));
    setCell('k-total-clients', `${a3.totalClients}社`);
    setCell('disp3-revenue',   fmt(a3.revenue));

    // 給与
    setCell('sal-makiko-tot',  fmt(sal.makikoTotal));
    setCell('sal-akihiro-tot', fmt(sal.akihiroTotal));
    setCell('disp-target',     fmt(state.targetMonthlyCF));
  }

  // ── タイムラインチャート ──────────────────────────────
  let timelineChart = null;

  function renderTimeline() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;
    const data   = calcTimeline(40);
    const labels = data.map(d => `${d.year}年`);
    if (timelineChart) timelineChart.destroy();

    timelineChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '矢①ビル',    data: data.map(d => d.a1), borderColor: '#2196F3', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 1 },
          { label: '矢②鍼灸院', data: data.map(d => d.a2), borderColor: '#4CAF50', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 1 },
          { label: '矢③kintone', data: data.map(d => d.a3), borderColor: '#FF9800', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 1 },
          { label: '3矢合計',    data: data.map(d => d.combined), borderColor: '#9C27B0', backgroundColor: 'rgba(156,39,176,0.08)', borderWidth: 3, pointRadius: 2, fill: true },
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
                return `${c.dataset.label}: ${v < 0 ? '▲' : ''}${Math.abs(v).toLocaleString()}万円/年`;
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: '経過年数' } },
          y: { title: { display: true, text: '年間CF（万円）' }, ticks: { callback: v => `${v}万` } },
        },
      },
    });
  }

  // ── 全更新 ────────────────────────────────────────────
  function updateAll() {
    syncDisplays();
    updateSignals();
    updateSummaryTable();
    updateReversePanel();
    renderTimeline();
  }

  // ── イベントバインディング ────────────────────────────
  function bindEvents() {
    function bindSlider(sliderId, inputId, key, isFloat) {
      const sl  = document.getElementById(sliderId);
      const inp = document.getElementById(inputId);
      if (sl) sl.addEventListener('input', e => {
        state[key] = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        updateAll();
      });
      if (inp) inp.addEventListener('change', e => {
        const v = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        if (!isNaN(v)) { state[key] = v; if (sl) sl.value = v; updateAll(); }
      });
    }

    function bindNumber(id, key) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', e => {
        const v = parseInt(e.target.value.replace(/,/g, ''), 10);
        if (!isNaN(v) && v >= 0) { state[key] = v; updateAll(); }
      });
    }

    function bindPrice(id, key) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', e => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v > 0) { state[key] = v; updateAll(); }
      });
    }

    // 矢②
    bindSlider('s2-price-sl', 's2-price-in', 'treatmentPrice', false);
    bindSlider('s2-q-sl',     's2-q-in',     'dailyPatients',  false);
    bindSlider('s2-days-sl',  's2-days-in',  'workingDays',    false);
    bindNumber('s2-staff-in',        'staffCost');
    bindNumber('s2-misc-in',         'miscExpenses');
    bindNumber('s2-vat-reserve-in',  'vatReserve');
    bindNumber('s2-vat-amount1-in',  'vatPayAmount1');
    bindNumber('s2-vat-amount2-in',  'vatPayAmount2');

    // 消費税支払い月（セレクト）
    ['s2-vat-month1-sel', 's2-vat-month2-sel'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', e => {
        const key = i === 0 ? 'vatPayMonth1' : 'vatPayMonth2';
        state[key] = parseInt(e.target.value, 10);
        updateAll();
      });
    });

    // 矢③ kintone 3プラン
    bindSlider('ka-cl-sl', 'ka-cl-in', 'kA_clients', false);
    bindSlider('kb-cl-sl', 'kb-cl-in', 'kB_clients', false);
    bindSlider('kc-cl-sl', 'kc-cl-in', 'kC_clients', false);
    bindPrice('ka-price', 'kA_price');
    bindPrice('kb-price', 'kB_price');
    bindPrice('kc-price', 'kC_price');

    // 給与設計
    bindNumber('s2-makiko-compass-in',  'makikoCompass');
    bindNumber('s2-makiko-clinic-in',   'makikoClinic');
    bindNumber('s2-akihiro-compass-in', 'akihiroCompass');
    bindNumber('s2-akihiro-clinic-in',  'akihiroClinic');

    // 逆算スライダー
    const sl = document.getElementById('s2-target-sl');
    if (sl) sl.addEventListener('input', e => {
      state.targetMonthlyCF = parseInt(e.target.value, 10);
      updateAll();
    });
  }

  // ── 初期化 ────────────────────────────────────────────
  let initialized = false;

  function init() {
    if (initialized) { updateAll(); return; }

    const inits = {
      's2-price-sl': state.treatmentPrice, 's2-price-in': state.treatmentPrice,
      's2-q-sl':     state.dailyPatients,  's2-q-in':    state.dailyPatients,
      's2-days-sl':  state.workingDays,    's2-days-in': state.workingDays,
      's2-staff-in': state.staffCost,      's2-misc-in': state.miscExpenses,
      's2-vat-reserve-in': state.vatReserve,
      's2-vat-amount1-in': state.vatPayAmount1,
      's2-vat-amount2-in': state.vatPayAmount2,
      'ka-price':  state.kA_price, 'ka-cl-sl': state.kA_clients, 'ka-cl-in': state.kA_clients,
      'kb-price':  state.kB_price, 'kb-cl-sl': state.kB_clients, 'kb-cl-in': state.kB_clients,
      'kc-price':  state.kC_price, 'kc-cl-sl': state.kC_clients, 'kc-cl-in': state.kC_clients,
      's2-makiko-compass-in':  state.makikoCompass,
      's2-makiko-clinic-in':   state.makikoClinic,
      's2-akihiro-compass-in': state.akihiroCompass,
      's2-akihiro-clinic-in':  state.akihiroClinic,
      's2-target-sl': state.targetMonthlyCF,
    };
    Object.entries(inits).forEach(([id, val]) => {
      const el = document.getElementById(id); if (el) el.value = val;
    });
    // 支払い月セレクト初期値
    const m1sel = document.getElementById('s2-vat-month1-sel');
    if (m1sel) m1sel.value = state.vatPayMonth1;
    const m2sel = document.getElementById('s2-vat-month2-sel');
    if (m2sel) m2sel.value = state.vatPayMonth2;

    bindEvents();
    updateAll();
    initialized = true;
  }

  function refresh() {
    const tab = document.getElementById('main-tab-arrows');
    if (tab && tab.style.display !== 'none') updateAll();
  }

  return { init, refresh };
})();
