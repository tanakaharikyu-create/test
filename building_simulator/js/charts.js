// charts.js — Chart.js グラフ描画
'use strict';

const Charts = (() => {
  let repaymentChart = null;
  let cfChart = null;

  // ── 返済方式比較グラフ ────────────────────────────
  function renderRepaymentChart(params) {
    const { principal, annualRate, years } = params;
    const n = years * 12;
    const epFixed = Calculator.equalPayment(principal, annualRate, years);
    const crossMonth = Calculator.findCrossoverMonth(principal, annualRate, years);
    const crossYear  = crossMonth ? (crossMonth / 12).toFixed(1) : null;

    const labels = [];
    const epData = [];
    const eqData = [];

    for (let y = 1; y <= years; y++) {
      labels.push(`${y}年`);
      epData.push(Math.round(epFixed / 10000));
      // 元金均等: 各年の1月目（代表値）
      const m = (y - 1) * 12 + 1;
      eqData.push(Math.round(
        Calculator.equalPrincipalPayment(principal, annualRate, years, m).total / 10000
      ));
    }

    const ctx = document.getElementById('repaymentChart').getContext('2d');
    if (repaymentChart) repaymentChart.destroy();

    // 背景ゾーン（プラグインなしでdataset塗り分け）
    const crossIdx = crossMonth ? Math.ceil(crossMonth / 12) - 1 : null;

    repaymentChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '元利均等（固定）',
            data: epData,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33,150,243,0.08)',
            borderWidth: 2.5,
            pointRadius: 2,
            fill: false,
          },
          {
            label: '元金均等（逓減）',
            data: eqData,
            borderColor: '#F44336',
            backgroundColor: 'rgba(244,67,54,0.08)',
            borderWidth: 2.5,
            pointRadius: 2,
            fill: false,
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
              label: ctx => `¥${(ctx.parsed.y * 10000).toLocaleString()}`,
            },
          },
          annotation: crossYear ? {
            annotations: {
              crossLine: {
                type: 'line',
                xMin: crossIdx,
                xMax: crossIdx,
                borderColor: '#4CAF50',
                borderWidth: 2,
                borderDash: [6, 3],
                label: {
                  content: `交差点 約${crossYear}年目`,
                  enabled: true,
                  position: 'start',
                  backgroundColor: 'rgba(76,175,80,0.85)',
                  color: '#fff',
                  font: { size: 12 },
                },
              },
            },
          } : {},
        },
        scales: {
          x: { title: { display: true, text: '経過年数' } },
          y: {
            title: { display: true, text: '月額返済（万円）' },
            ticks: { callback: v => `${v}万` },
          },
        },
      },
    });
  }

  // ── 月次CF推移グラフ ──────────────────────────────
  function renderCFChart(params) {
    const maxYears = 40;
    const labels = [];
    const data   = [];

    for (let y = 1; y <= maxYears; y++) {
      labels.push(`${y}年`);
      const net = Calculator.annualNetIncome(y, params);
      data.push(Math.round(net / 10000));
    }

    const ctx = document.getElementById('cfChart').getContext('2d');
    if (cfChart) cfChart.destroy();

    // ゼロライン色分け
    const colors = data.map(v => v >= 0 ? 'rgba(76,175,80,0.7)' : 'rgba(244,67,54,0.7)');
    const borders = data.map(v => v >= 0 ? '#4CAF50' : '#F44336');

    cfChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '年間純収支（万円）',
          data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y * 10000;
                return v >= 0 ? `▲0以上: ¥${v.toLocaleString()}` : `▲¥${Math.abs(v).toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: '経過年数' } },
          y: {
            title: { display: true, text: '年間純収支（万円）' },
            ticks: {
              callback: v => v >= 0 ? `${v}万` : `▲${Math.abs(v)}万`,
            },
          },
        },
      },
    });
  }

  return { renderRepaymentChart, renderCFChart };
})();
