// scenarios.js — 3シナリオ比較ロジック
'use strict';

const Scenarios = (() => {

  function buildParams(scenarioKey, currentSet, annualPropertyTax) {
    const setA = CONFIG.SET_A;
    const setB = CONFIG.SET_B;

    const defs = {
      optimistic: {
        label: '🟢 楽観',
        annualRate:  1.5,
        vacancyRate: 0,
        declineRate: 0,
        monthlyRent: setB.monthlyRent,
        monthlyExpenses: setB.monthlyExpenses,
        loan: setB.loan,
      },
      base: {
        label: '🟡 基準',
        annualRate:  2.0,
        vacancyRate: 5,
        declineRate: 0,
        monthlyRent: setA.monthlyRent,
        monthlyExpenses: setA.monthlyExpenses,
        loan: setA.loan,
      },
      pessimistic: {
        label: '🔴 悲観',
        annualRate:  4.0,
        vacancyRate: 15,
        declineRate: 0,
        monthlyRent: setA.monthlyRent * 0.9,
        monthlyExpenses: setA.monthlyExpenses,
        loan: setA.loan,
      },
    };

    const d = defs[scenarioKey];
    return {
      label:          d.label,
      principal:      d.loan,
      annualRate:     d.annualRate,
      years:          35,
      method:         'equal_payment',
      monthlyRent:    d.monthlyRent,
      monthlyExpenses: d.monthlyExpenses,
      vacancyRate:    d.vacancyRate,
      declineRate:    d.declineRate,
      annualPropertyTax,
    };
  }

  function calcAll(annualPropertyTax) {
    const keys = ['optimistic', 'base', 'pessimistic'];
    return keys.map(key => {
      const params = buildParams(key, null, annualPropertyTax);
      const monthly = Calculator.firstMonthlyCF(params);
      const annual  = Calculator.annualNetSimple(params);
      const cum35   = Calculator.cumulativeCF(params, 35);

      // 信号機判定
      const sig = CONFIG.SIGNAL;
      const monthlySig  = monthly  > sig.monthlyCF.green   ? '🟢'
                        : monthly  > sig.monthlyCF.yellow  ? '🟡' : '🔴';
      const annualSig   = annual   > sig.annualNet.green   ? '🟢'
                        : annual   > sig.annualNet.yellow  ? '🟡' : '🔴';

      return {
        label:      params.label,
        rate:       params.annualRate,
        vacancy:    params.vacancyRate,
        rentLabel:  key === 'optimistic' ? 'セットB' : key === 'base' ? 'セットA' : 'セットA×0.9',
        monthly,
        annual,
        cum35,
        monthlySig,
        annualSig,
      };
    });
  }

  return { calcAll };
})();
