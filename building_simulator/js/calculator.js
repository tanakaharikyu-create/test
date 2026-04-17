// calculator.js — 返済計算・CF計算エンジン
'use strict';

const Calculator = (() => {

  // ── 元利均等 月額返済 ────────────────────────────
  function equalPayment(principal, annualRate, years) {
    if (annualRate === 0) return Math.round(principal / (years * 12));
    const r = annualRate / 100 / 12;
    const n = years * 12;
    return Math.round(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  }

  // ── 元金均等 月次返済（n: 1始まり） ─────────────
  function equalPrincipalPayment(principal, annualRate, years, month) {
    const n = years * 12;
    const monthlyPrincipal = principal / n;
    const r = annualRate / 100 / 12;
    const remaining = principal - monthlyPrincipal * (month - 1);
    const interest = remaining * r;
    return {
      principal: Math.round(monthlyPrincipal),
      interest:  Math.round(interest),
      total:     Math.round(monthlyPrincipal + interest),
    };
  }

  // ── 月次CF（n月目） ───────────────────────────────
  // params: { principal, annualRate, years, method, monthlyRent, monthlyExpenses,
  //           vacancyRate, declineRate, annualPropertyTax }
  function monthlyCF(month, params) {
    const { principal, annualRate, years, method, monthlyRent,
            monthlyExpenses, vacancyRate, declineRate } = params;

    // 何年目か（1始まり）
    const year = Math.ceil(month / 12);

    // 賃料下落適用
    const rent = monthlyRent * (1 - vacancyRate / 100)
               * Math.pow(1 - declineRate / 100, year - 1);

    // 月額返済
    let payment;
    if (method === 'equal_payment') {
      payment = month <= years * 12 ? equalPayment(principal, annualRate, years) : 0;
    } else {
      payment = month <= years * 12
        ? equalPrincipalPayment(principal, annualRate, years, month).total
        : 0;
    }

    return Math.round(rent) - monthlyExpenses - payment;
  }

  // ── 年間純収支（year年目、1〜返済年数は精密計算） ──
  function annualNetIncome(year, params) {
    const { annualPropertyTax } = params;
    let total = 0;
    const startMonth = (year - 1) * 12 + 1;
    for (let m = startMonth; m < startMonth + 12; m++) {
      total += monthlyCF(m, params);
    }
    return total - annualPropertyTax;
  }

  // ── 初月CF（ダッシュボード・シナリオ比較用） ────
  function firstMonthlyCF(params) {
    const { principal, annualRate, years, method, monthlyRent,
            monthlyExpenses, vacancyRate } = params;

    const rent = monthlyRent * (1 - vacancyRate / 100);
    let payment;
    if (method === 'equal_payment') {
      payment = equalPayment(principal, annualRate, years);
    } else {
      payment = equalPrincipalPayment(principal, annualRate, years, 1).total;
    }
    return Math.round(rent) - monthlyExpenses - payment;
  }

  // ── 年間純収支（初月CF×12 方式・橋山試算照合用） ─
  function annualNetSimple(params) {
    return firstMonthlyCF(params) * 12 - params.annualPropertyTax;
  }

  // ── 35年累積CF ────────────────────────────────────
  function cumulativeCF(params, totalYears) {
    let cum = 0;
    const years = totalYears || params.years;
    for (let y = 1; y <= years; y++) {
      cum += annualNetIncome(y, params);
    }
    return cum;
  }

  // ── 総返済額・利息総額 ──────────────────────────
  function totalRepayment(principal, annualRate, years, method) {
    let total = 0;
    const n = years * 12;
    if (method === 'equal_payment') {
      total = equalPayment(principal, annualRate, years) * n;
    } else {
      for (let m = 1; m <= n; m++) {
        total += equalPrincipalPayment(principal, annualRate, years, m).total;
      }
    }
    return {
      total,
      interest: total - principal,
    };
  }

  // ── 売却価格シミュレーション ────────────────────
  // 橋山試算方式: 表面利回り（NOI = 月額賃料 × 12、ローン返済・経費・固資税を引かない）
  function salePrice(params) {
    const { monthlyRent } = params;
    const annualNOI = monthlyRent * 12;
    return {
      noi:      Math.round(annualNOI),
      price5:   Math.round(annualNOI / 0.05),
      price7:   Math.round(annualNOI / 0.07),
      price10:  Math.round(annualNOI / 0.10),
    };
  }

  // ── 元利均等 vs 元金均等 交差月を検出 ───────────
  function findCrossoverMonth(principal, annualRate, years) {
    const ep = equalPayment(principal, annualRate, years);
    const n  = years * 12;
    for (let m = 1; m <= n; m++) {
      const epq = equalPrincipalPayment(principal, annualRate, years, m);
      if (epq.total <= ep) return m;
    }
    return null;
  }

  return {
    equalPayment,
    equalPrincipalPayment,
    monthlyCF,
    annualNetIncome,
    firstMonthlyCF,
    annualNetSimple,
    cumulativeCF,
    totalRepayment,
    salePrice,
    findCrossoverMonth,
  };
})();
