// phasex.js — CF-STRAC 資金繰りレイヤー（Phase X）
// コア式:
//   G  = MQ - F              （利益）
//   W  = U + Z - K           （運転資金増分）
//   CF = G - R + W + SS      （資金繰りCF）
//   ※ Notion仕様では "CF = F - R + W + SS" と記載されているが
//      F→G（利益）の意と解釈（テスト例: MQ=697,CF=474 と一致する式）
//   C_end = C_start + CF     （期末口座残高）
//   fmC%  = CF / MQ × 100   （資金効率指標）
//   将来: 収支分岐点 PQ = F / (P-V) = F × MQ_per_unit^-1
'use strict';

const PhaseX = (() => {

  // 単位: 万円
  const state = {
    mq:           0,    // 限界利益（万円/月）
    f:            0,    // 固定費（万円/月）
    r:            0,    // 返済額（万円/月）
    u:            0,    // 売上債権増分（万円）
    z:            0,    // 固定費・在庫等増分（万円）
    k:            0,    // 買入債務増分（万円）
    ss:           0,    // 戦略投資（万円/月）
    startBalance: 0,    // 期首口座残高（万円）
    safetyMonths: 2,    // 安全ライン = 固定費 × ○ヶ月
  };

  // ── 計算 ──────────────────────────────────────────────
  function calc() {
    const g          = state.mq - state.f;
    const w          = state.u + state.z - state.k;
    const cf         = g - state.r + w + state.ss;
    const endBalance = state.startBalance + cf;
    const safetyLine = state.f * state.safetyMonths;
    const fmcPct     = state.mq !== 0 ? (cf / state.mq * 100) : null;
    // 収支分岐点（将来実装: MQ単位単価が確定したら PQ = F / (P-V) を追加）
    return { g, w, cf, endBalance, safetyLine, fmcPct };
  }

  // ── ユーティリティ ────────────────────────────────────
  function fmtM(n) {
    const v   = Math.round(n);
    const abs = Math.abs(v);
    return (v < 0 ? '▲' : '') + '¥' + abs.toLocaleString() + '万';
  }

  function setCell(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function setColor(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color      = val < 0 ? '#F44336' : val > 0 ? '#4CAF50' : '#333';
    el.style.fontWeight = '700';
  }

  // ── UI 更新 ───────────────────────────────────────────
  function updateAll() {
    const r = calc();

    // 信号機カードの値
    setCell('px-cf-val',   fmtM(r.cf));
    setCell('px-end-val',  fmtM(r.endBalance));
    setCell('px-fmc-val',  r.fmcPct !== null ? r.fmcPct.toFixed(1) + '%' : '—');
    setColor('px-cf-val',  r.cf);
    setColor('px-end-val', r.endBalance - r.safetyLine);

    // 信号機クラス更新
    const cfCard  = document.getElementById('px-card-cf');
    const endCard = document.getElementById('px-card-end');
    const fmcCard = document.getElementById('px-card-fmc');
    if (cfCard)  cfCard.className  = 'signal-card ' + (r.cf  > 0 ? 'signal-green' : r.cf  > -50 ? 'signal-yellow' : 'signal-red');
    if (endCard) endCard.className = 'signal-card ' + (r.endBalance >= r.safetyLine ? 'signal-green' : r.endBalance >= 0 ? 'signal-yellow' : 'signal-red');
    if (fmcCard) {
      const pct = r.fmcPct;
      fmcCard.className = 'signal-card ' + (pct === null ? 'signal-yellow' : pct >= 30 ? 'signal-green' : pct >= 0 ? 'signal-yellow' : 'signal-red');
    }

    // 内訳テーブル（右カード）
    setCell('px-g-mq',    fmtM(state.mq));
    setCell('px-g-f',     fmtM(-state.f));
    setCell('px-g-val',   fmtM(r.g));
    setCell('px-r-val',   fmtM(-state.r));
    setCell('px-w-val',   fmtM(r.w));
    setCell('px-ss-val',  fmtM(state.ss));
    setCell('px-cf-val2', fmtM(r.cf));
    setCell('px-start-val', fmtM(state.startBalance));
    setCell('px-end-val2',  fmtM(r.endBalance));
    setCell('px-safe-val',  fmtM(r.safetyLine));
    setColor('px-cf-val2',  r.cf);
    setColor('px-end-val2', r.endBalance - r.safetyLine);

    // 入力欄横の中間値（G, W）
    const gRow = document.getElementById('px-g-display');
    if (gRow) gRow.textContent = fmtM(r.g);
    const wRow = document.getElementById('px-w-display');
    if (wRow) wRow.textContent = fmtM(r.w);

    // 安全ライン警告
    const alertEl = document.getElementById('px-alert');
    if (alertEl) {
      if (r.endBalance < r.safetyLine) {
        alertEl.textContent =
          `⚠️ 期末残高 ${fmtM(r.endBalance)} が安全ライン（固定費×${state.safetyMonths}ヶ月 = ${fmtM(r.safetyLine)}）を下回っています`;
        alertEl.style.display = 'block';
      } else {
        alertEl.textContent = `✅ 期末残高 ${fmtM(r.endBalance)} — 安全ライン（${fmtM(r.safetyLine)}）を確保`;
        alertEl.style.display = 'block';
        alertEl.style.background  = '#E8F5E9';
        alertEl.style.borderColor = '#4CAF50';
        alertEl.style.color       = '#2E7D32';
      }
      if (r.endBalance < r.safetyLine) {
        alertEl.style.background  = '#FFEBEE';
        alertEl.style.borderColor = '#F44336';
        alertEl.style.color       = '#B71C1C';
      }
    }
  }

  // ── イベントバインディング ────────────────────────────
  function bindEvents() {
    function bindNum(id, key) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) { state[key] = v; updateAll(); }
      });
    }
    bindNum('px-in-mq',      'mq');
    bindNum('px-in-f',       'f');
    bindNum('px-in-r',       'r');
    bindNum('px-in-u',       'u');
    bindNum('px-in-z',       'z');
    bindNum('px-in-k',       'k');
    bindNum('px-in-ss',      'ss');
    bindNum('px-in-start',   'startBalance');
    bindNum('px-in-safety',  'safetyMonths');
  }

  // ── 初期化 ────────────────────────────────────────────
  let initialized = false;

  function init() {
    if (initialized) { updateAll(); return; }
    bindEvents();
    updateAll();
    initialized = true;
  }

  return { init };
})();
