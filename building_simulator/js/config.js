// config.js — 物件データ・定数
'use strict';

const CONFIG = {

  // ── セットA（実質ベース） ──────────────────────────
  SET_A: {
    label: '実質ベース',
    loan: 436500000,            // 建築費合計（建設費350M×110%+設計35M+解体15M+リノベ1.5M）
    buildingCost: 436500000,    // 建築費合計（表示用）
    monthlyRent: 2660817,       // 賃料+共益費+消費税 合計
    monthlyExpenses: 614041,    // 月額経費合計
    rooms: [
      { id: '101', floor: 1, tsubo: 19.07, rent: 381391, kyoehi:  57209, tax:  43860, total:  482460 },
      { id: '201', floor: 2, tsubo: 19.07, rent: 324183, kyoehi:  57209, tax:  38139, total:  419530 },
      { id: '301', floor: 3, tsubo:  9.53, rent: 123952, kyoehi:  28604, tax:  15256, total:  167812 },
      { id: '302', floor: 3, tsubo:  9.53, rent: 123952, kyoehi:  28604, tax:  15256, total:  167812 },
      { id: '401', floor: 4, tsubo:  9.53, rent: 123952, kyoehi:  28604, tax:  15256, total:  167812 },
      { id: '402', floor: 4, tsubo:  9.53, rent: 123952, kyoehi:  28604, tax:  15256, total:  167812 },
      { id: '501', floor: 5, tsubo:  9.53, rent: 123952, kyoehi:  28604, tax:  15256, total:  167812 },
      { id: '502', floor: 5, tsubo:  9.53, rent: 123952, kyoehi:  28604, tax:  15256, total:  167812 },
      { id: '601', floor: 6, tsubo:  9.53, rent: 123952, kyoehi:  28604, tax:  15256, total:  167812 },
      { id: '602', floor: 6, tsubo:  9.53, rent: 123952, kyoehi:  28604, tax:  15256, total:  167812 },
      { id: '701', floor: 7, tsubo: 23.66, rent: 307516, kyoehi:  70865, tax:  27846, total:  418329 },
    ],
    expenses: [
      { label: '自賠責保険',         monthly: 165000 },
      { label: '定期清掃',           monthly:  25000 },
      { label: '電気工作物検査',     monthly:  37000 },
      { label: '機械警備',           monthly:  12000 },
      { label: '防犯カメラシステム', monthly:  50000 },
      { label: 'エレベーター',       monthly:  60000 },
      { label: '消防用点検・保守',   monthly:  15000 },
      { label: '自動販売機関連',     monthly:   4200 },
      { label: '給排水設備点検',     monthly:  15000 },
      { label: 'ゴミ処理代',         monthly:   7500 },
      { label: '水道代',             monthly:  10000 },
      { label: '電気代',             monthly:  50000 },
      { label: '管理費（賃料5%）',   monthly: 'auto' }, // 自動計算
    ],
  },

  // ── セットB（銀行提出用） ─────────────────────────
  SET_B: {
    label: '銀行提出用',
    loan: 456900000,
    buildingCost: 456900000,
    monthlyRent: 2964576,
    monthlyExpenses: 629229,
    rooms: [
      { id: '101', floor: 1, tsubo: 19.07, rent: 419530, kyoehi:  57209, tax:  47674, total:  524413 },
      { id: '201', floor: 2, tsubo: 19.07, rent: 382222, kyoehi:  57209, tax:  41953, total:  461413 },
      { id: '301', floor: 3, tsubo:  9.53, rent: 143022, kyoehi:  28604, tax:  17163, total:  188789 },
      { id: '302', floor: 3, tsubo:  9.53, rent: 143022, kyoehi:  28604, tax:  17163, total:  188789 },
      { id: '401', floor: 4, tsubo:  9.53, rent: 143022, kyoehi:  28604, tax:  17163, total:  188789 },
      { id: '402', floor: 4, tsubo:  9.53, rent: 143022, kyoehi:  28604, tax:  17163, total:  188789 },
      { id: '501', floor: 5, tsubo:  9.53, rent: 143022, kyoehi:  28604, tax:  17163, total:  188789 },
      { id: '502', floor: 5, tsubo:  9.53, rent: 143022, kyoehi:  28604, tax:  17163, total:  188789 },
      { id: '601', floor: 6, tsubo:  9.53, rent: 143022, kyoehi:  28604, tax:  17163, total:  188789 },
      { id: '602', floor: 6, tsubo:  9.53, rent: 143022, kyoehi:  28604, tax:  17163, total:  188789 },
      { id: '701', floor: 7, tsubo: 23.66, rent: 354826, kyoehi:  70865, tax:  42579, total:  488370 },
    ],
  },

  // ── 固定パラメータ ────────────────────────────────
  CONSTRUCTION_COST_DEFAULT: 350000000,
  CONSTRUCTION_COST_MIN:     300000000,
  CONSTRUCTION_COST_MAX:     450000000,
  CONSTRUCTION_COST_STEP:      5000000,
  DESIGN_COST:                35000000,
  DEMOLITION_COST:            15000000,
  RENOVATION_COST:             1500000,
  // 消費税は建設費×10%で動的計算（固定値廃止）
  PERSONAL_LOAN:              30000000,
  ACQUISITION_COST:           10900000,
  ANNUAL_PROPERTY_TAX:         5100000,

  // ── 変動パラメータ デフォルト ─────────────────────
  DEFAULT_RATE:    2.0,
  DEFAULT_YEARS:   35,
  DEFAULT_VACANCY: 0,
  DEFAULT_DECLINE: 0,
  DEFAULT_METHOD:  'equal_payment',   // 元利均等
  DEFAULT_SET:     'A',

  // ── 信号機しきい値 ────────────────────────────────
  SIGNAL: {
    monthlyCF:   { green: 200000, yellow: 0 },       // > 20万: 🟢, 0~20万: 🟡, < 0: 🔴
    vacancyRate: { green: 10,     yellow: 25 },       // < 10%: 🟢, 10~25%: 🟡, > 25%: 🔴
    annualNet:   { green: 0,      yellow: -2000000 }, // > 0: 🟢, ▲200万~0: 🟡, < ▲200万: 🔴
  },
};
