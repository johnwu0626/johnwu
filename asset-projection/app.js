/* GENERATED FILE — DO NOT EDIT.
 * 來源：src/*.jsx（00-core.jsx、10-widgets.jsx、20-rules.jsx、30-overview.jsx、40-analysis.jsx、50-chrome.jsx、90-app.jsx）
 * 產生：node build.js @ 2026-08-04T02:30:43.476Z
 */
/* ══════ src/00-core.jsx ══════ */
'use strict';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const E = window.Engine;
const {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} = React;
const RC = window.Recharts;

/* ───────── i18n（中/英雙語）─────────
   LANG 為模組全域，App 每次 render 前會同步成目前語系狀態；t(中,英) 依 LANG 取字。 */
const LANG_KEY = 'asset-projection:lang';
let LANG = (() => {
  try {
    const s = localStorage.getItem(LANG_KEY);
    if (s === 'zh' || s === 'en') return s;
  } catch (e) {}
  return (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
})();
const setLangGlobal = l => {
  LANG = l;
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch (e) {}
};
const t = (zh, en) => LANG === 'en' && en != null ? en : zh;

/* ───────── 格式化（純顯示，不做財務計算；金額單位隨語系：萬/億 ↔ K/M/B） ───────── */
const fmt = n => {
  const v = Math.round(n);
  return (v < 0 ? '-' : '') + new Intl.NumberFormat(LANG === 'en' ? 'en-US' : 'zh-TW').format(Math.abs(v));
};
const fmtWan = n => {
  if (LANG === 'en') {
    const a = Math.abs(n),
      s = n < 0 ? '-' : '';
    if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return s + (a / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return s + (a / 1e3).toFixed(0) + 'K';
    return s + Math.round(a);
  }
  const w = n / 10000;
  return Math.abs(w) >= 10000 ? (w / 10000).toFixed(1) + '億' : Math.round(w) + '萬';
};
const ymD = ym => {
  if (!ym) return '—';
  if (LANG === 'en') {
    const [y, m] = ym.split('-');
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1] + ' ' + y;
  }
  return ym.replace('-', '/');
};
const pct = v => Math.round(v * 1000) / 10 + '%';
const uid = () => 'r' + Math.random().toString(36).slice(2, 9);
const CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR', 'CNY'];
const CUR_SYMBOL = {
  TWD: 'NT$',
  USD: 'US$',
  JPY: 'JP¥',
  EUR: '€',
  CNY: 'RMB¥'
};
const DEFAULT_FX = {
  USD: 32.5,
  JPY: 0.22,
  EUR: 35.5,
  CNY: 4.5
}; /* 假設值 [未驗證]，使用者自行維護 */
const TYPE_META = {
  income: {
    c: 'var(--c-income)',
    bg: 'var(--c-income-subtle)',
    icon: '↑'
  },
  expense: {
    c: 'var(--c-expense)',
    bg: 'var(--c-expense-subtle)',
    icon: '↓'
  },
  invest: {
    c: 'var(--c-invest)',
    bg: 'var(--c-invest-subtle)',
    icon: '◆'
  },
  loan: {
    c: 'var(--c-loan)',
    bg: 'var(--c-loan-subtle)',
    icon: '⌂'
  }
};
const typeLabel = type => t({
  income: '收入',
  expense: '支出',
  invest: '投資',
  loan: '貸款'
}[type], {
  income: 'Income',
  expense: 'Expense',
  invest: 'Invest',
  loan: 'Loan'
}[type]);

/* ───────── 上班族範本（隨語系在地化；全部靜態數字，不含計算式；decision.md 鐵則） ───────── */
function buildTemplate(nowYm) {
  const y = parseInt(nowYm.slice(0, 4), 10);
  const retire = y + 20 + '-12';
  const zh = [{
    id: 't-salary',
    name: '月薪',
    type: 'income',
    category: '薪資',
    amount: 85000,
    frequency: 'monthly',
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: '範本值：請改成實際月薪'
  }, {
    id: 't-bonus',
    name: '年終獎金',
    type: 'income',
    category: '年終',
    amount: 170000,
    frequency: 'yearly',
    month: 2,
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: '範本值：約 2 個月月薪，請自行調整'
  }, {
    id: 't-profit',
    name: '分紅',
    type: 'income',
    category: '分紅',
    amount: 100000,
    frequency: 'yearly',
    month: 8,
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: '範本值'
  }, {
    id: 't-living',
    name: '生活費',
    type: 'expense',
    category: '生活費',
    amount: 40000,
    frequency: 'monthly',
    startMonth: nowYm,
    endMonth: null,
    annualGrowthRate: 0.02,
    growthAnchorMonth: 1,
    enabled: true,
    note: '範本值：含飲食交通日常'
  }, {
    id: 't-labor',
    name: '勞健保自付',
    type: 'expense',
    category: '保險',
    amount: 5500,
    frequency: 'monthly',
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: '範本值'
  }, {
    id: 't-tax',
    name: '所得稅',
    type: 'expense',
    category: '稅金',
    amount: 60000,
    frequency: 'yearly',
    month: 5,
    startMonth: nowYm,
    endMonth: null,
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: '範本值（估算值請自行調整；本工具不自動算稅）'
  }, {
    id: 't-ins',
    name: '商業保險',
    type: 'expense',
    category: '保險',
    amount: 60000,
    frequency: 'yearly',
    month: 7,
    startMonth: nowYm,
    endMonth: null,
    annualGrowthRate: 0,
    growthAnchorMonth: 1,
    enabled: true,
    note: '範本值：年繳'
  }, {
    id: 't-mortgage',
    name: '房貸',
    type: 'loan',
    category: '房貸',
    startMonth: nowYm,
    enabled: true,
    loan: {
      principal: 8000000,
      annualRate: 0.021,
      termMonths: 240,
      assetValue: 10000000
    },
    note: '範本值：800 萬 / 2.1% / 20 年；房產現值 1,000 萬計入淨資產'
  }, {
    id: 't-carloan',
    name: '車貸',
    type: 'loan',
    category: '車貸',
    startMonth: nowYm,
    enabled: true,
    loan: {
      principal: 600000,
      annualRate: 0.028,
      termMonths: 60
    },
    note: '範本值：60 萬 / 2.8% / 5 年'
  }, {
    id: 't-dca',
    name: '定期定額 ETF',
    type: 'invest',
    category: '投資',
    amount: 15000,
    frequency: 'monthly',
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0,
    growthAnchorMonth: 1,
    enabled: true,
    invest: {
      annualReturn: 0.06
    },
    note: '範本值：年報酬 6% 為假設，非保證'
  }];
  const en = [{
    id: 't-salary',
    name: 'Salary',
    type: 'income',
    category: 'Salary',
    amount: 5000,
    frequency: 'monthly',
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: 'Sample: set to your monthly take-home pay'
  }, {
    id: 't-bonus',
    name: 'Annual bonus',
    type: 'income',
    category: 'Bonus',
    amount: 10000,
    frequency: 'yearly',
    month: 12,
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: 'Sample: adjust to your bonus'
  }, {
    id: 't-living',
    name: 'Living expenses',
    type: 'expense',
    category: 'Living',
    amount: 2800,
    frequency: 'monthly',
    startMonth: nowYm,
    endMonth: null,
    annualGrowthRate: 0.02,
    growthAnchorMonth: 1,
    enabled: true,
    note: 'Sample: food, transport, day-to-day'
  }, {
    id: 't-health',
    name: 'Health insurance',
    type: 'expense',
    category: 'Insurance',
    amount: 400,
    frequency: 'monthly',
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: 'Sample'
  }, {
    id: 't-tax',
    name: 'Income tax',
    type: 'expense',
    category: 'Tax',
    amount: 9000,
    frequency: 'yearly',
    month: 4,
    startMonth: nowYm,
    endMonth: null,
    annualGrowthRate: 0.03,
    growthAnchorMonth: 1,
    enabled: true,
    note: 'Sample (adjust yourself; this tool does not compute tax)'
  }, {
    id: 't-mortgage',
    name: 'Mortgage',
    type: 'loan',
    category: 'Mortgage',
    startMonth: nowYm,
    enabled: true,
    loan: {
      principal: 300000,
      annualRate: 0.065,
      termMonths: 360,
      assetValue: 400000
    },
    note: 'Sample: 300k / 6.5% / 30y; home value 400k counts toward net worth'
  }, {
    id: 't-carloan',
    name: 'Car loan',
    type: 'loan',
    category: 'Car loan',
    startMonth: nowYm,
    enabled: true,
    loan: {
      principal: 25000,
      annualRate: 0.07,
      termMonths: 60
    },
    note: 'Sample: 25k / 7% / 5y'
  }, {
    id: 't-401k',
    name: '401k / index fund',
    type: 'invest',
    category: 'Investing',
    amount: 1000,
    frequency: 'monthly',
    startMonth: nowYm,
    endMonth: null,
    endAnchor: 'retirement',
    annualGrowthRate: 0,
    growthAnchorMonth: 1,
    enabled: true,
    invest: {
      annualReturn: 0.07
    },
    note: 'Sample: 7% return is an assumption, not a guarantee'
  }];
  const rules = (LANG === 'en' ? en : zh).map(r => JSON.parse(JSON.stringify(r)));
  const config = {
    startMonth: nowYm,
    months: 360,
    openingCash: LANG === 'en' ? 30000 : 500000,
    openingInvest: 0,
    openingInvestReturn: LANG === 'en' ? 0.07 : 0.06,
    globalParams: {
      retirementMonth: retire,
      inflationRate: 0.02
    },
    safety: {
      mode: 'multiple',
      multiple: 6,
      fixedAmount: LANG === 'en' ? 30000 : 500000
    },
    dcaOnShortfall: 'continue',
    mediumStreakN: 3,
    upcomingWindowMonths: 12
  };
  return {
    rules,
    config,
    scenarios: [],
    templateIds: rules.map(r => r.id)
  };
}

/* ───────── 持久化：localStorage 工作真相 + FSAPI 顯式落檔（decision.md #D） ───────── */
const LS_KEY = 'asset-projection:v1';
function loadDraft() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o.schemaVersion !== E.SCHEMA_VERSION) return null;
    if (!E.validate(o.rules, o.config).ok) return null; // 結構壞掉的草稿不進 render（review-codex 🟡3）
    return o;
  } catch (e) {
    return null;
  }
}
function saveDraft(doc, lastFileJson, savedAtMs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      schemaVersion: E.SCHEMA_VERSION,
      rules: doc.rules,
      config: doc.config,
      scenarios: doc.scenarios,
      templateIds: doc.templateIds,
      lastFileJson: lastFileJson || null,
      savedAtMs: savedAtMs || null
    }));
  } catch (e) {/* quota 滿等罕見情況：不擋操作，由存檔鈕保底 */}
}
/* IndexedDB：只存 FSAPI file handle（沿 decision-legacy 先例） */
function idb() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('asset-projection', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
async function idbGet(k) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction('kv').objectStore('kv').get(k);
    t.onsuccess = () => res(t.result);
    t.onerror = () => rej(t.error);
  });
}
async function idbSet(k, v) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
    t.onsuccess = () => res();
    t.onerror = () => rej(t.error);
  });
}
function download(filename, text, mime) {
  const blob = new Blob([text], {
    type: mime || 'application/json'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ══════ src/10-widgets.jsx ══════ */
/* ───────── 小元件 ───────── */
function Pill({
  bg,
  c,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "pill",
    style: {
      background: bg,
      color: c,
      ...style
    }
  }, children);
}
function Switch({
  on,
  onClick,
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'switch' + (on ? ' on' : ''),
    onClick: onClick,
    title: title,
    style: {
      cursor: 'pointer'
    }
  });
}
function Skeleton({
  w,
  h
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      width: w || '100%',
      height: h || 14
    }
  });
}
function Field({
  label,
  children,
  error,
  hint
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      fontSize: 12,
      color: 'var(--c-text-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, label), children, error && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-danger)',
      fontSize: 12
    }
  }, error), hint && !error && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-text-muted)',
      fontSize: 11
    }
  }, hint));
}
function YmInput({
  value,
  onChange,
  allowNull,
  nullLabel,
  retireOption,
  error
}) {
  const mode = value === null && allowNull ? 'null' : value === 'RETIRE' ? 'retire' : 'ym';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, (allowNull || retireOption) && /*#__PURE__*/React.createElement("select", {
    value: mode,
    onChange: e => {
      const v = e.target.value;
      onChange(v === 'null' ? null : v === 'retire' ? 'RETIRE' : new Date().getFullYear() + '-01');
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "ym"
  }, t('指定年月', 'Specific month')), allowNull && /*#__PURE__*/React.createElement("option", {
    value: "null"
  }, nullLabel || t('至推估期末', 'End of projection')), retireOption && /*#__PURE__*/React.createElement("option", {
    value: "retire"
  }, t('至退休', 'At retirement'))), mode === 'ym' && /*#__PURE__*/React.createElement("input", {
    type: "month",
    className: error ? 'err' : '',
    value: value || '',
    onChange: e => onChange(e.target.value || null),
    style: {
      flex: 1
    }
  }));
}

/* ══════ src/20-rules.jsx ══════ */
/* ───────── 1. RuleCard（v2：兩層欄位——常用常駐／進階摺疊，error 自動展開） ───────── */
const ADV_FIELD_PREFIXES = ['currency', 'startMonth', 'month', 'growthAnchorMonth', 'loan.assetValue', 'note', 'category'];
function RuleCard({
  rule,
  preview,
  isTemplate,
  scenarioDiff,
  errors,
  config,
  onChange,
  onToggle,
  onDelete,
  onDuplicate,
  onRestore,
  onEnsureFx,
  onCollapse,
  readOnlyStructure
}) {
  const meta = TYPE_META[rule.type];
  const err = f => (errors || []).find(e => e.field === f || e.field.startsWith(f + '.'));
  const hasErr = (errors || []).length > 0;
  const advHasErr = (errors || []).some(e => ADV_FIELD_PREFIXES.some(p => e.field === p || e.field.startsWith(p)));
  const [advOpenUser, setAdvOpenUser] = useState(false);
  const advOpen = advOpenUser || advHasErr; // 驗證錯誤在進階欄位 → 強制展開（decision 條款）
  const disabled = rule.enabled === false;
  const set = (f, v) => onChange(rule.id, {
    [f]: v
  });
  const setLoan = (f, v) => onChange(rule.id, {
    loan: {
      ...rule.loan,
      [f]: v
    }
  });
  const num = (v, fallback) => {
    const n = parseFloat(v);
    return isNaN(n) ? fallback ?? 0 : n;
  };
  const cur = rule.currency || 'TWD';
  const isFx = cur !== 'TWD';
  const amtText = amt => isFx ? /*#__PURE__*/React.createElement(React.Fragment, null, CUR_SYMBOL[cur], fmt(amt), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--c-text-muted)'
    }
  }, t(`（≈NT$${fmt(E.convertToTwd(amt, cur, config))}）`, `(≈NT$${fmt(E.convertToTwd(amt, cur, config))})`))) : fmt(amt);
  const previewLine = () => {
    if (hasErr) return /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--c-danger)'
      }
    }, t('⚠ 參數有誤，未納入推估', '⚠ Invalid parameters, excluded from projection'));
    if (!preview) return /*#__PURE__*/React.createElement(Skeleton, {
      w: 220,
      h: 12
    });
    if (preview.kind === 'loan') return /*#__PURE__*/React.createElement(React.Fragment, null, t('▸ 月付 ', '▸ Pmt '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, fmt(preview.monthlyPayment)), t('，', '/mo, paid off '), ymD(preview.payoffYm), t(' 繳清，總利息 ', ', interest '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, fmt(preview.totalInterest)));
    if (preview.kind === 'invest') return /*#__PURE__*/React.createElement(React.Fragment, null, t('▸ 每月投入 ', '▸ Invest '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, amtText(rule.amount)), preview.endYear !== preview.horizonYear ? t(` 至 ${preview.endYear} 年`, ` until ${preview.endYear}`) : '', t('，', '/mo, '), preview.horizonYear, t(' 年市值約 ', 'yr value ≈ '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, fmtWan(preview.projectedValue)));
    if (preview.kind === 'once') return /*#__PURE__*/React.createElement(React.Fragment, null, "\u25B8 ", ymD(rule.startMonth), t(' 一次性 ', ' one-time '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, amtText(preview.amount)));
    return /*#__PURE__*/React.createElement(React.Fragment, null, "\u25B8 ", rule.frequency === 'monthly' ? t('每月', 'Monthly') : t('每年', 'Yearly'), " ", /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, amtText(rule.amount)), t(' → 至 ', ' → by '), preview.endYear, t(' 年累計約 ', ' total ≈ '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, fmtWan(preview.totalOverHorizon)), rule.annualGrowthRate ? t(`（年成長 ${pct(rule.annualGrowthRate)}）`, ` (grows ${pct(rule.annualGrowthRate)}/yr)`) : '');
  };
  /* 進階收合列的摘要膠囊：摺疊資訊可見（decision 條款） */
  const advSummary = [];
  if (isFx) advSummary.push(cur);
  advSummary.push(t('起 ', 'from ') + ymD(rule.startMonth));
  if (rule.frequency === 'yearly' && rule.month) advSummary.push(t(`${rule.month} 月發生`, `mo ${rule.month}`));
  if ((rule.growthAnchorMonth || 1) !== 1) advSummary.push(t(`錨 ${rule.growthAnchorMonth} 月`, `anchor mo ${rule.growthAnchorMonth}`));
  if (rule.type === 'loan' && rule.loan?.assetValue > 0) advSummary.push(t('資產 ', 'asset ') + fmtWan(rule.loan.assetValue));
  if (rule.note) advSummary.push('📝');
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 'var(--sp-lg)',
      opacity: disabled ? .55 : 1,
      borderLeft: `4px solid ${hasErr ? 'var(--c-danger)' : meta.c}`,
      borderRadius: 'var(--r-lg)',
      marginBottom: 'var(--sp-xs)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-sm)',
      marginBottom: 'var(--sp-md)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: meta.c,
      fontWeight: 900
    }
  }, meta.icon), /*#__PURE__*/React.createElement("input", {
    value: rule.name,
    disabled: disabled,
    onChange: e => set('name', e.target.value),
    style: {
      fontWeight: 700,
      fontSize: 15,
      border: 'none',
      background: 'transparent',
      padding: 0,
      width: 120
    }
  }), isTemplate && /*#__PURE__*/React.createElement(Pill, {
    bg: "var(--c-warning-subtle)",
    c: "var(--c-warning-strong)"
  }, t('範本值', 'Sample')), scenarioDiff && /*#__PURE__*/React.createElement(Pill, {
    bg: "var(--c-warning-subtle)",
    c: "var(--c-warning-strong)"
  }, t('已修改', 'Modified'), " ", /*#__PURE__*/React.createElement("button", {
    onClick: () => onRestore(rule.id),
    style: {
      color: 'var(--c-warning-strong)',
      textDecoration: 'underline',
      fontSize: 10,
      padding: 0
    }
  }, t('還原', 'Reset'))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-sm)'
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    on: !disabled,
    onClick: () => onToggle(rule.id),
    title: disabled ? t('啟用', 'Enable') : t('停用', 'Disable')
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onCollapse,
    title: t('收合', 'Collapse'),
    style: {
      color: 'var(--c-text-muted)',
      fontSize: 16,
      padding: '0 4px'
    }
  }, "\u25B4"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--c-surface-subtle)',
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-md) var(--sp-lg)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--sp-md)',
      pointerEvents: disabled ? 'none' : 'auto'
    }
  }, rule.type === 'loan' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
    label: t('本金', 'Principal'),
    error: err('loan.principal')?.message
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    value: rule.loan?.principal ?? '',
    onChange: e => setLoan('principal', num(e.target.value))
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('年利率 %', 'Annual rate %'),
    error: err('loan.annualRate')?.message
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    step: "0.01",
    value: rule.loan ? (rule.loan.annualRate * 100).toFixed(2).replace(/\.?0+$/, '') : '',
    onChange: e => setLoan('annualRate', num(e.target.value) / 100)
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('期數（月）', 'Term (months)'),
    error: err('loan.termMonths')?.message
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    value: rule.loan?.termMonths ?? '',
    onChange: e => setLoan('termMonths', Math.round(num(e.target.value)))
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
    label: isFx ? t(`金額（${cur}）`, `Amount (${cur})`) : t('金額', 'Amount'),
    error: err('amount')?.message,
    hint: isFx ? t(`≈NT$${fmt(E.convertToTwd(rule.amount || 0, cur, config))}（匯率於 ⚙ 全域參數）`, `≈NT$${fmt(E.convertToTwd(rule.amount || 0, cur, config))} (rate in ⚙ global params)`) : undefined
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    value: rule.amount ?? '',
    onChange: e => set('amount', num(e.target.value))
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('頻率', 'Frequency'),
    error: err('frequency')?.message || err('month')?.message
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: rule.frequency,
    onChange: e => set('frequency', e.target.value),
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "monthly"
  }, t('每月', 'Monthly')), /*#__PURE__*/React.createElement("option", {
    value: "yearly"
  }, t('每年', 'Yearly')), /*#__PURE__*/React.createElement("option", {
    value: "once"
  }, t('一次性', 'One-time'))), rule.frequency === 'yearly' && /*#__PURE__*/React.createElement("select", {
    value: rule.month || 1,
    onChange: e => set('month', parseInt(e.target.value, 10))
  }, Array.from({
    length: 12
  }, (_, i) => /*#__PURE__*/React.createElement("option", {
    key: i + 1,
    value: i + 1
  }, t(`${i + 1} 月`, `Mo ${i + 1}`)))))), rule.frequency !== 'once' && /*#__PURE__*/React.createElement(Field, {
    label: t('年成長率 %', 'Annual growth %'),
    error: err('annualGrowthRate')?.message
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    step: "0.1",
    value: rule.annualGrowthRate != null ? (rule.annualGrowthRate * 100).toFixed(1).replace(/\.0$/, '') : '',
    onChange: e => set('annualGrowthRate', num(e.target.value) / 100)
  })), rule.type === 'invest' && /*#__PURE__*/React.createElement(Field, {
    label: t('預期年報酬率 %', 'Expected annual return %'),
    error: err('invest.annualReturn')?.message,
    hint: t('假設值，非保證報酬', 'Assumption, not a guaranteed return')
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    step: "0.1",
    value: rule.invest ? (rule.invest.annualReturn * 100).toFixed(1).replace(/\.0$/, '') : '',
    onChange: e => onChange(rule.id, {
      invest: {
        ...rule.invest,
        annualReturn: num(e.target.value) / 100
      }
    })
  })), rule.frequency !== 'once' && /*#__PURE__*/React.createElement(Field, {
    label: t('迄止', 'Ends'),
    error: err('endMonth')?.message || err('endAnchor')?.message || err('termYears')?.message,
    hint: rule.termYears != null ? t(`${rule.termYears} 年期 → 至 ${ymD(E.resolveEndMonth(rule, config))}（改起始年月會自動跟動）`, `${rule.termYears}-year term → ends ${ymD(E.resolveEndMonth(rule, config))} (auto-follows start month)`) : undefined
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: rule.endAnchor === 'retirement' ? 'retire' : rule.termYears != null ? 'term' : rule.endMonth == null ? 'null' : 'ym',
    onChange: e => {
      const v = e.target.value;
      if (v === 'retire') onChange(rule.id, {
        endAnchor: 'retirement',
        endMonth: null,
        termYears: null
      });else if (v === 'null') onChange(rule.id, {
        endAnchor: null,
        endMonth: null,
        termYears: null
      });else if (v === 'term') onChange(rule.id, {
        endAnchor: null,
        endMonth: null,
        termYears: 6
      });else onChange(rule.id, {
        endAnchor: null,
        endMonth: rule.startMonth,
        termYears: null
      });
    },
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "null"
  }, t('至推估期末', 'End of projection')), /*#__PURE__*/React.createElement("option", {
    value: "retire"
  }, t('至退休（連動全域）', 'At retirement (global)')), /*#__PURE__*/React.createElement("option", {
    value: "term"
  }, t('年期（N 年）', 'Term (N years)')), /*#__PURE__*/React.createElement("option", {
    value: "ym"
  }, t('指定年月', 'Specific month'))), rule.termYears != null && /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    min: "1",
    max: "100",
    style: {
      width: 56
    },
    value: rule.termYears,
    onChange: e => {
      const n = Math.round(parseFloat(e.target.value));
      set('termYears', isNaN(n) ? 1 : n);
    }
  }), rule.termYears != null && /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'center',
      fontSize: 12,
      color: 'var(--c-text-muted)'
    }
  }, t('年', 'yrs')), rule.endAnchor !== 'retirement' && rule.termYears == null && rule.endMonth != null && /*#__PURE__*/React.createElement("input", {
    type: "month",
    value: rule.endMonth,
    onChange: e => set('endMonth', e.target.value)
  }))))), /*#__PURE__*/React.createElement("div", {
    onClick: () => setAdvOpenUser(o => !o),
    style: {
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-sm)',
      padding: 'var(--sp-sm) 2px',
      fontSize: 11,
      color: advHasErr ? 'var(--c-danger)' : 'var(--c-text-muted)',
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, advOpen ? '▾' : '▸', " ", t('進階', 'Advanced'), advHasErr ? t('（有錯誤）', '(errors)') : ''), !advOpen && advSummary.map((s, i) => /*#__PURE__*/React.createElement(Pill, {
    key: i,
    bg: "var(--c-surface-subtle)",
    c: "var(--c-text-2)",
    style: {
      border: '1px solid var(--c-border-strong)',
      fontWeight: 500
    }
  }, s))), advOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--c-surface-subtle)',
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-md) var(--sp-lg)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--sp-md)',
      pointerEvents: disabled ? 'none' : 'auto'
    }
  }, rule.type !== 'loan' && /*#__PURE__*/React.createElement(Field, {
    label: t('幣別', 'Currency'),
    error: err('currency')?.message,
    hint: isFx ? t('金額以外幣填寫，推估時換算台幣', 'Enter amount in foreign currency; converted to TWD in projection') : undefined
  }, /*#__PURE__*/React.createElement("select", {
    value: cur,
    onChange: e => {
      const v = e.target.value;
      onEnsureFx && onEnsureFx(v);
      onChange(rule.id, {
        currency: v
      });
    }
  }, CURRENCIES.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, c)))), /*#__PURE__*/React.createElement(Field, {
    label: t('起始年月', 'Start month'),
    error: err('startMonth')?.message
  }, /*#__PURE__*/React.createElement(YmInput, {
    value: rule.startMonth,
    onChange: v => set('startMonth', v)
  })), rule.type !== 'loan' && rule.frequency !== 'once' && /*#__PURE__*/React.createElement(Field, {
    label: t('成長錨定月', 'Growth anchor month'),
    hint: t('每年幾月套用新金額（跟公司調薪月）', 'Which month each year the new amount applies (matches raise month)'),
    error: err('growthAnchorMonth')?.message
  }, /*#__PURE__*/React.createElement("select", {
    value: rule.growthAnchorMonth || 1,
    onChange: e => set('growthAnchorMonth', parseInt(e.target.value, 10))
  }, Array.from({
    length: 12
  }, (_, i) => /*#__PURE__*/React.createElement("option", {
    key: i + 1,
    value: i + 1
  }, t(`${i + 1} 月`, `Mo ${i + 1}`))))), rule.type === 'loan' && /*#__PURE__*/React.createElement(Field, {
    label: t('對應資產現值', 'Asset value'),
    hint: t('如房價；計入淨資產、不隨時間增值。純負債填 0', 'e.g. home price; counts toward net worth, no appreciation. Pure debt = 0'),
    error: err('loan.assetValue')?.message
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    value: rule.loan?.assetValue ?? 0,
    onChange: e => setLoan('assetValue', num(e.target.value))
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('分類（統計歸戶）', 'Category'),
    hint: t('支出結構分析依此分組', 'Groups the expense breakdown analysis')
  }, /*#__PURE__*/React.createElement("input", {
    value: rule.category || '',
    placeholder: rule.name,
    onChange: e => set('category', e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('備註', 'Note')
  }, /*#__PURE__*/React.createElement("input", {
    value: rule.note || '',
    onChange: e => set('note', e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--sp-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--c-text-muted)',
      flex: 1
    },
    className: "mono-preview"
  }, previewLine()), !readOnlyStructure && /*#__PURE__*/React.createElement("button", {
    className: "btn-ghost btn",
    style: {
      padding: '2px 10px',
      fontSize: 12
    },
    onClick: () => onDuplicate(rule.id)
  }, t('複製', 'Copy')), !readOnlyStructure && /*#__PURE__*/React.createElement("button", {
    className: "btn-ghost btn",
    style: {
      padding: '2px 10px',
      fontSize: 12,
      color: 'var(--c-danger)'
    },
    onClick: () => onDelete(rule.id)
  }, t('刪除', 'Delete'))));
}

/* ───────── 2. 精簡列（v2：唯一清單形態，附摘要膠囊） ───────── */
function CompactRow({
  rule,
  preview,
  isTemplate,
  errors,
  config,
  onExpand,
  onToggle,
  onDuplicate,
  canDuplicate
}) {
  const meta = TYPE_META[rule.type];
  const disabled = rule.enabled === false;
  const amountText = rule.type === 'loan' ? preview ? fmt(preview.monthlyPayment) + t('/月', '/mo') : '…' : (rule.currency && rule.currency !== 'TWD' ? CUR_SYMBOL[rule.currency] : '') + fmt(rule.amount || 0);
  const pills = [];
  if (rule.currency && rule.currency !== 'TWD') pills.push(rule.currency);
  if (rule.termYears != null) pills.push(rule.termYears + t('年期', 'yr'));else if (rule.endAnchor === 'retirement') pills.push(t('至退休', 'To retire'));else if (rule.endMonth) pills.push(t('至 ', 'To ') + rule.endMonth.slice(0, 4));
  return /*#__PURE__*/React.createElement("div", {
    onClick: onExpand,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-sm)',
      background: 'var(--c-surface)',
      borderRadius: 'var(--r-md)',
      height: 40,
      padding: '0 var(--sp-md)',
      marginBottom: 'var(--sp-xs)',
      cursor: 'pointer',
      opacity: disabled ? .55 : 1,
      transition: 'background var(--m-base)',
      border: '1px solid var(--c-border)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--c-brand-subtle)',
    onMouseLeave: e => e.currentTarget.style.background = 'var(--c-surface)'
  }, (errors || []).length > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-danger)'
    }
  }, "\u26A0") : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: meta.c,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      minWidth: 84,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, rule.name), pills.map((p, i) => /*#__PURE__*/React.createElement(Pill, {
    key: i,
    bg: "var(--c-surface-subtle)",
    c: "var(--c-text-muted)",
    style: {
      border: '1px solid var(--c-border)',
      fontWeight: 500
    }
  }, p)), isTemplate && /*#__PURE__*/React.createElement(Pill, {
    bg: "var(--c-warning-subtle)",
    c: "var(--c-warning-strong)"
  }, t('範本', 'Sample')), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      marginLeft: 'auto'
    }
  }, amountText), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-text-muted)',
      fontSize: 12,
      width: 34,
      textAlign: 'right'
    }
  }, rule.type === 'loan' ? t('貸款', 'Loan') : {
    monthly: t('每月', 'Monthly'),
    yearly: t('每年', 'Yearly'),
    once: t('一次', 'Once')
  }[rule.frequency]), /*#__PURE__*/React.createElement("span", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement(Switch, {
    on: !disabled,
    onClick: () => onToggle(rule.id)
  })), canDuplicate !== false && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onDuplicate(rule.id);
    },
    title: t('複製', 'Copy'),
    style: {
      color: 'var(--c-text-muted)'
    }
  }, "\u29C9"));
}

/* ───────── 3. RuleList（v2：精簡列唯一形態、一次展開一張） ───────── */
const GROUPS = [{
  key: 'income',
  label: '收入',
  types: ['income']
}, {
  key: 'outflow',
  label: '支出與貸款',
  types: ['expense', 'loan']
}, {
  key: 'invest',
  label: '投資',
  types: ['invest']
}];
function RuleList({
  rules,
  previews,
  errorsByRule,
  templateIds,
  scenarioOverrides,
  config,
  onChange,
  onToggle,
  onDelete,
  onDuplicate,
  onRestore,
  onAdd,
  onLoadTemplate,
  onEnsureFx,
  isBase,
  globalError
}) {
  const [collapsed, setCollapsed] = useState({});
  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const expandedRef = useRef(null);
  useEffect(() => {
    if (expandedId && expandedRef.current) expandedRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }, [expandedId]);
  const templateLeft = rules.filter(r => templateIds.includes(r.id)).length;
  if (rules.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 'var(--sp-2xl)',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 40,
        marginBottom: 'var(--sp-md)'
      }
    }, "\uD83D\uDDC2\uFE0F"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--c-text-2)',
        marginBottom: 'var(--sp-lg)'
      }
    }, t('還沒有任何收支規則', 'No rules yet')), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-primary",
      onClick: onLoadTemplate
    }, t('載入上班族範本', 'Load sample template')), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 'var(--sp-md)'
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        color: 'var(--c-text-muted)',
        textDecoration: 'underline',
        fontSize: 12
      },
      onClick: () => onAdd('income')
    }, t('從空白開始', 'Start blank'))));
  }
  const filtered = q ? rules.filter(r => r.name.includes(q) || (r.category || '').includes(q)) : rules;
  return /*#__PURE__*/React.createElement("div", null, globalError && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--c-danger-subtle)',
      color: 'var(--c-danger)',
      borderRadius: 'var(--r-md)',
      padding: 'var(--sp-md)',
      marginBottom: 'var(--sp-md)',
      fontSize: 13
    }
  }, globalError), templateLeft > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--c-warning-subtle)',
      color: 'var(--c-warning-strong)',
      borderRadius: 'var(--r-md)',
      padding: 'var(--sp-sm) var(--sp-md)',
      marginBottom: 'var(--sp-md)',
      fontSize: 12
    }
  }, t('還有 ', ''), /*#__PURE__*/React.createElement("b", null, templateLeft), t(' 張卡是範本預設值——改成自己的數字後此提示消失', ' cards still use sample defaults — enter your own numbers to hide this')), rules.length > 12 && /*#__PURE__*/React.createElement("input", {
    placeholder: t('搜尋規則…', 'Search rules…'),
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      width: '100%',
      marginBottom: 'var(--sp-md)'
    }
  }), GROUPS.map(g => {
    const list = filtered.filter(r => g.types.includes(r.type)).sort((a, b) => (b.amount || b.loan?.principal || 0) - (a.amount || a.loan?.principal || 0));
    if (!list.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: g.key,
      style: {
        marginBottom: 'var(--sp-lg)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setCollapsed(c => ({
        ...c,
        [g.key]: !c[g.key]
      })),
      style: {
        cursor: 'pointer',
        fontSize: 10,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: 'var(--c-text-muted)',
        fontWeight: 700,
        padding: 'var(--sp-sm) 0',
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", null, collapsed[g.key] ? '▸' : '▾'), t(g.label, {
      income: 'Income',
      outflow: 'Expenses & loans',
      invest: 'Investing'
    }[g.key]), /*#__PURE__*/React.createElement("span", null, "(", list.length, ")")), !collapsed[g.key] && list.map(r => {
      const common = {
        rule: r,
        preview: previews[r.id],
        isTemplate: templateIds.includes(r.id),
        errors: errorsByRule[r.id],
        config,
        onToggle,
        onDuplicate
      };
      if (expandedId !== r.id) return /*#__PURE__*/React.createElement(CompactRow, _extends({
        key: r.id
      }, common, {
        canDuplicate: isBase,
        onExpand: () => setExpandedId(r.id)
      }));
      return /*#__PURE__*/React.createElement("div", {
        key: r.id,
        ref: expandedRef
      }, /*#__PURE__*/React.createElement(RuleCard, _extends({}, common, {
        scenarioDiff: scenarioOverrides && scenarioOverrides[r.id],
        onChange: onChange,
        onDelete: onDelete,
        onRestore: onRestore,
        onEnsureFx: onEnsureFx,
        onCollapse: () => setExpandedId(null),
        readOnlyStructure: !isBase
      })));
    }));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: '100%'
    },
    onClick: () => setAddOpen(o => !o),
    disabled: !isBase,
    title: !isBase ? t('請切回「基準」再新增規則', 'Switch back to Base to add rules') : ''
  }, t('＋ 新增規則', '＋ Add rule')), addOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: '110%',
      left: 0,
      right: 0,
      background: 'var(--c-surface)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--sh-modal)',
      padding: 'var(--sp-sm)',
      zIndex: 30
    }
  }, [['income', '一般收入'], ['expense', '一般支出'], ['loan', '貸款'], ['invest', '定期定額'], ['once', '一次性事件']].map(([k, label]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: 'var(--sp-sm) var(--sp-md)',
      borderRadius: 'var(--r-sm)'
    },
    onMouseEnter: e => e.target.style.background = 'var(--c-brand-subtle)',
    onMouseLeave: e => e.target.style.background = 'transparent',
    onClick: () => {
      setAddOpen(false);
      onAdd(k);
    }
  }, t(label, {
    income: 'Income',
    expense: 'Expense',
    loan: 'Loan',
    invest: 'Recurring investment',
    once: 'One-time event'
  }[k]))))));
}

/* ══════ src/30-overview.jsx ══════ */
/* ───────── 4a. HealthBanner（全寬敘事橫幅：開頁 10 秒的答案；值全來自 analyze()） ───────── */
function HealthBanner({
  analysis,
  error
}) {
  if (error) return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--c-danger-subtle)',
      color: 'var(--c-danger)',
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-md) var(--sp-xl)',
      fontSize: 14,
      marginBottom: 'var(--sp-lg)'
    }
  }, "\u26A0 ", t('推估失敗：', 'Projection failed: '), error);
  if (!analysis) return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 'var(--sp-lg)'
    }
  }, /*#__PURE__*/React.createElement(Skeleton, {
    h: 44
  }));
  const fs = analysis.firstStress;
  const sev = fs ? fs.severity : null;
  const meta = {
    critical: {
      bg: 'var(--c-danger-subtle)',
      c: 'var(--c-stress-critical)',
      icon: '⚠'
    },
    high: {
      bg: 'var(--c-danger-subtle)',
      c: 'var(--c-stress-high)',
      icon: '⚠'
    },
    medium: {
      bg: 'var(--c-stress-medium-subtle)',
      c: 'var(--c-warning-strong)',
      icon: '△'
    },
    ok: {
      bg: 'var(--c-success-subtle)',
      c: 'var(--c-success)',
      icon: '✓'
    }
  }[sev || 'ok'];
  const text = !fs ? /*#__PURE__*/React.createElement(React.Fragment, null, t('全期無現金壓力——期末淨資產約 ', 'No cash stress all period — ending net worth about '), /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, fmtWan(analysis.endNetWorth)), analysis.upcoming ? /*#__PURE__*/React.createElement(React.Fragment, null, t(`（留意：${ymD(analysis.upcoming.ym)} 接近安全水位）`, `(Note: ${ymD(analysis.upcoming.ym)} nears the safety line)`)) : null) : sev === 'critical' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, ymD(fs.ym)), t(' 現金將轉負（主因：', ' cash will go negative (cause: '), fs.topContributors.slice(0, 2).map(t => t.category).join('＋') || '—', t('）——最低點 ', ') — lowest point '), /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, fmt(analysis.minCash?.value ?? 0)), t(' 於 ', ' in '), ymD(analysis.minCash?.ym)) : sev === 'high' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, ymD(fs.ym)), t(' 現金將低於安全水位（主因：', ' cash will fall below the safety line (cause: '), fs.topContributors.slice(0, 2).map(t => t.category).join('＋') || '—', t('），共 ', ') — '), /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, analysis.monthsBelowThreshold), t(' 個月低於水位', ' months below the line')) : /*#__PURE__*/React.createElement(React.Fragment, null, t('自 ', 'Since '), /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, ymD(fs.ym)), t(' 起出現連續入不敷出（主因：', ' recurring shortfall begins (cause: '), fs.topContributors.slice(0, 2).map(t => t.category).join('＋') || '—', t('）', ')'));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: meta.bg,
      borderLeft: `5px solid ${meta.c}`,
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-md) var(--sp-xl)',
      fontSize: 14,
      color: 'var(--c-text)',
      marginBottom: 'var(--sp-lg)',
      display: 'flex',
      gap: 'var(--sp-sm)',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: meta.c,
      fontWeight: 900
    }
  }, meta.icon), /*#__PURE__*/React.createElement("span", null, text));
}

/* ───────── 4b. StatChips（右欄 sticky 上半的關鍵數字列，含情境 Δ） ───────── */
function StatChips({
  analysis,
  baseAnalysis,
  comparing,
  onJumpTo
}) {
  if (!analysis) return null;
  const fs = analysis.firstStress;
  const sevC = {
    critical: 'var(--c-stress-critical)',
    high: 'var(--c-stress-high)',
    medium: 'var(--c-stress-medium)'
  };
  const delta = (fmtFn, cur, base, goodWhenUp) => {
    if (!comparing || !baseAnalysis) return null;
    const d = cur - base;
    if (d === 0) return null;
    const good = goodWhenUp ? d > 0 : d < 0;
    return /*#__PURE__*/React.createElement("span", {
      style: {
        color: good ? 'var(--c-success)' : 'var(--c-danger)',
        fontSize: 10,
        marginLeft: 4
      }
    }, d > 0 ? '+' : '', fmtFn(d));
  };
  const Chip = ({
    label,
    value,
    accent,
    onClick,
    extra
  }) => /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border)',
      borderRadius: 'var(--r-md)',
      padding: '4px 12px',
      cursor: onClick ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      boxShadow: 'var(--sh-card)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--c-text-muted)',
      fontWeight: 700
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 15,
      color: accent || 'var(--c-text)'
    }
  }, value), extra);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-sm)',
      flexWrap: 'wrap'
    }
  }, fs ? /*#__PURE__*/React.createElement(Chip, {
    label: t('最早壓力', 'First stress'),
    value: ymD(fs.ym),
    accent: sevC[fs.severity],
    onClick: () => onJumpTo(fs.ym)
  }) : /*#__PURE__*/React.createElement(Chip, {
    label: t('現金壓力', 'Cash stress'),
    value: t('全期無', 'No stress'),
    accent: "var(--c-success)"
  }), /*#__PURE__*/React.createElement(Chip, {
    label: t('最低現金', 'Lowest cash'),
    value: fmt(analysis.minCash?.value ?? 0),
    accent: analysis.minCash?.value < 0 ? 'var(--c-stress-critical)' : undefined,
    onClick: () => analysis.minCash && onJumpTo(analysis.minCash.ym),
    extra: delta(fmt, analysis.minCash?.value ?? 0, baseAnalysis?.minCash?.value ?? 0, true)
  }), /*#__PURE__*/React.createElement(Chip, {
    label: t('低於水位', 'Below line'),
    value: t(`${analysis.monthsBelowThreshold} 月`, `${analysis.monthsBelowThreshold} mo`),
    accent: analysis.monthsBelowThreshold > 0 ? 'var(--c-warning-strong)' : undefined,
    extra: delta(v => v + t(' 月', ' mo'), analysis.monthsBelowThreshold, baseAnalysis?.monthsBelowThreshold ?? 0, false)
  }), /*#__PURE__*/React.createElement(Chip, {
    label: t('期末淨資產', 'Ending net worth'),
    value: fmtWan(analysis.endNetWorth),
    extra: delta(fmtWan, analysis.endNetWorth, baseAnalysis?.endNetWorth ?? 0, true)
  }));
}

/* ───────── 5. 主圖（v2 減負：預設三線＋最嚴重一級壓力帶；圖層 chips 漸進揭露） ───────── */
function groupStressRanges(stressPoints, severity) {
  const ranges = [];
  let cur = null;
  const pts = stressPoints.filter(s => s.severity === severity);
  const idx = ym => E.ymToIndex(ym);
  pts.forEach(s => {
    if (cur && idx(s.ym) === idx(cur.end) + 1) cur.end = s.ym;else {
      cur = {
        start: s.ym,
        end: s.ym
      };
      ranges.push(cur);
    }
  });
  return ranges;
}
function MainChart({
  series,
  analysis,
  error,
  empty,
  onBandClick
}) {
  const [range, setRange] = useState('all');
  const [layers, setLayers] = useState({
    stressAll: false,
    events: false,
    focusCash: false
  });
  if (error) return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 'var(--sp-2xl)',
      textAlign: 'center',
      color: 'var(--c-danger)'
    }
  }, "\u26A0 ", t('推估失敗，請檢查左側標紅的規則列', 'Projection failed — check the rules highlighted in red on the left'));
  if (empty) return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 'var(--sp-2xl)',
      textAlign: 'center',
      color: 'var(--c-text-2)'
    }
  }, "\u2190 ", t('開啟至少一條規則即可看到推估', 'Enable at least one rule to see the projection'));
  if (!series || !series.length) return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 'var(--sp-2xl)'
    }
  }, /*#__PURE__*/React.createElement(Skeleton, {
    h: 240
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--c-text-muted)',
      marginTop: 8
    }
  }, t('計算中…', 'Calculating…')));
  const focus = series[0];
  const showNw = !layers.focusCash;
  let data = focus.points.map((p, i) => {
    const row = {
      ym: p.ym,
      netWorth: p.netWorth,
      cash: p.endCash,
      safety: p.safetyThreshold
    };
    series.slice(1).forEach((s, si) => {
      if (s.points[i]) row['nw' + si] = s.points[i].netWorth;
    });
    return row;
  });
  if (range === '10y') data = data.slice(0, 120);
  const inRange = ym => data.length && E.ymToIndex(ym) >= E.ymToIndex(data[0].ym) && E.ymToIndex(ym) <= E.ymToIndex(data[data.length - 1].ym);
  const clampYm = ym => {
    const a = data[0].ym,
      b = data[data.length - 1].ym;
    const i = E.ymToIndex(ym);
    return i < E.ymToIndex(a) ? a : i > E.ymToIndex(b) ? b : ym;
  };
  let yMin = 0,
    yMax = 0;
  data.forEach(r => {
    yMin = Math.min(yMin, r.cash, showNw ? r.netWorth : r.cash);
    yMax = Math.max(yMax, r.cash, r.safety, showNw ? r.netWorth : r.cash);
  });
  const pad = (yMax - yMin) * 0.06 || 1000;
  yMin -= pad;
  yMax += pad;
  const sp = analysis?.stressPoints || [];
  const severityOrder = ['critical', 'high', 'medium'];
  const worst = severityOrder.find(s => sp.some(x => x.severity === s)) || null;
  const bandsToDraw = layers.stressAll ? severityOrder.filter(s => sp.some(x => x.severity === s)) : worst ? [worst] : [];
  const BAND_STYLE = {
    critical: {
      fill: 'var(--c-stress-critical-band)',
      full: true,
      labelC: 'var(--c-stress-critical)'
    },
    high: {
      fill: 'var(--c-stress-high-band)',
      full: true,
      labelC: 'var(--c-stress-high)'
    },
    medium: {
      fill: 'var(--c-stress-medium)',
      full: false
    }
  };
  const events = layers.events && analysis ? analysis.events.filter(e => inRange(e.ym)) : [];
  const Tt = ({
    active,
    payload,
    label
  }) => {
    if (!active || !payload || !payload.length) return null;
    const p = focus.points.find(x => x.ym === label);
    if (!p) return null;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--c-surface)',
        boxShadow: 'var(--sh-modal)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--sp-md)',
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        marginBottom: 4
      }
    }, ymD(p.ym)), [[t('收入', 'Income'), p.income], [t('支出', 'Expense'), p.totalOutflow], [t('投資投入', 'Invested'), p.investContribution], [t('當月淨額', 'Net this month'), p.netCashChange], [t('現金餘額', 'Cash balance'), p.endCash], [t('淨資產', 'Net worth'), p.netWorth]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--c-text-muted)'
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        color: v < 0 ? 'var(--c-danger)' : 'var(--c-text)'
      }
    }, fmt(v)))));
  };
  const LayerChip = ({
    k,
    label
  }) => /*#__PURE__*/React.createElement("button", {
    className: "pill",
    onClick: () => setLayers(l => ({
      ...l,
      [k]: !l[k]
    })),
    style: {
      border: '1px solid ' + (layers[k] ? 'var(--c-brand)' : 'var(--c-border-strong)'),
      background: layers[k] ? 'var(--c-brand-subtle)' : 'transparent',
      color: layers[k] ? 'var(--c-brand)' : 'var(--c-text-muted)',
      cursor: 'pointer'
    }
  }, label);
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 'var(--sp-md) var(--sp-lg)',
      borderRadius: 'var(--r-lg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 'var(--sp-xs)',
      gap: 'var(--sp-sm)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--c-text-muted)',
      fontWeight: 700
    }
  }, t('資產與現金水位', 'Assets & cash')), /*#__PURE__*/React.createElement(LayerChip, {
    k: "stressAll",
    label: t('全部壓力層', 'All stress')
  }), /*#__PURE__*/React.createElement(LayerChip, {
    k: "events",
    label: t('事件', 'Events')
  }), /*#__PURE__*/React.createElement(LayerChip, {
    k: "focusCash",
    label: t('聚焦現金', 'Focus cash')
  }), /*#__PURE__*/React.createElement("div", {
    className: "seg",
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: range === 'all' ? 'on' : '',
    onClick: () => setRange('all')
  }, t('全期', 'All')), /*#__PURE__*/React.createElement("button", {
    className: range === '10y' ? 'on' : '',
    onClick: () => setRange('10y')
  }, t('10 年', '10y')))), (() => {
    // 現金有負月份、且尚未聚焦現金時：提示——負值在總覽軸上被淨資產壓扁，引導切換
    const neg = focus.points.filter(p => p.endCash < 0);
    if (!neg.length || layers.focusCash) return null;
    const low = neg.reduce((a, b) => b.endCash < a.endCash ? b : a);
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => setLayers(l => ({
        ...l,
        focusCash: true
      })),
      title: t('切換為聚焦現金視圖', 'Switch to focus-cash view'),
      style: {
        cursor: 'pointer',
        fontSize: 12,
        color: 'var(--c-warning-strong)',
        background: 'var(--c-warning-subtle)',
        borderRadius: 'var(--r-md)',
        padding: '4px 10px',
        marginBottom: 'var(--sp-xs)'
      }
    }, "\u26A0 ", t('現金有 ', 'Cash is negative for '), /*#__PURE__*/React.createElement("b", null, neg.length), t(' 個月為負（最低 ', ' months (low '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, fmt(low.endCash)), t(' 於 ', ' in '), ymD(low.ym), t('）——負值在此圖被淨資產壓扁看不出，', ') — hidden by the net-worth scale here; '), /*#__PURE__*/React.createElement("u", null, t('點這裡用「聚焦現金」看清楚', 'click to use "Focus cash"')));
  })(), /*#__PURE__*/React.createElement(RC.ResponsiveContainer, {
    width: "100%",
    height: 250
  }, /*#__PURE__*/React.createElement(RC.ComposedChart, {
    data: data,
    margin: {
      top: 8,
      right: 12,
      bottom: 0,
      left: 8
    }
  }, /*#__PURE__*/React.createElement(RC.CartesianGrid, {
    stroke: "var(--c-chart-grid)",
    vertical: false
  }), /*#__PURE__*/React.createElement(RC.XAxis, {
    dataKey: "ym",
    tick: {
      fill: 'var(--c-chart-axis)',
      fontSize: 11
    },
    interval: 0,
    tickLine: false,
    axisLine: {
      stroke: 'var(--c-chart-grid)'
    },
    minTickGap: 0,
    tickFormatter: v => {
      if (!v.endsWith('-01')) return '';
      const y = parseInt(v.slice(0, 4), 10);
      const span = Math.ceil(data.length / 12);
      const step = span > 20 ? 5 : span > 8 ? 2 : 1;
      return (y - parseInt(data[0].ym.slice(0, 4), 10)) % step === 0 ? String(y) : '';
    }
  }), /*#__PURE__*/React.createElement(RC.YAxis, {
    domain: [yMin, yMax],
    tick: {
      fill: 'var(--c-chart-axis)',
      fontSize: 11
    },
    tickFormatter: fmtWan,
    width: 56,
    tickLine: false,
    axisLine: false
  }), /*#__PURE__*/React.createElement(RC.Tooltip, {
    content: /*#__PURE__*/React.createElement(Tt, null)
  }), /*#__PURE__*/React.createElement(RC.Legend, {
    wrapperStyle: {
      fontSize: 12
    },
    formatter: v => ({
      netWorth: t('淨資產', 'Net worth'),
      cash: t('現金', 'Cash'),
      safety: t('安全水位', 'Safety line'),
      nw0: series[1] ? series[1].name : '',
      nw1: series[2] ? series[2].name : ''
    })[v] || v
  }), bandsToDraw.flatMap(sev => {
    const st = BAND_STYLE[sev];
    return groupStressRanges(sp, sev).filter(r => inRange(r.start) || inRange(r.end)).map((r, i) => {
      const single = clampYm(r.start) === clampYm(r.end);
      /* 單月區帶 x1==x2 會渲染成 0 寬（feedback-v2 🔴#1）→ 改粗 ReferenceLine 保證可見 */
      if (single) return /*#__PURE__*/React.createElement(RC.ReferenceLine, {
        key: sev + i,
        x: clampYm(r.start),
        stroke: st.labelC || st.fill,
        strokeOpacity: 0.45,
        strokeWidth: 6,
        onClick: () => onBandClick(r.start)
      });
      return st.full ? /*#__PURE__*/React.createElement(RC.ReferenceArea, {
        key: sev + i,
        x1: clampYm(r.start),
        x2: clampYm(r.end),
        y1: yMin,
        y2: yMax,
        fill: st.fill,
        strokeOpacity: 0,
        onClick: () => onBandClick(r.start)
      }) : /*#__PURE__*/React.createElement(RC.ReferenceArea, {
        key: sev + i,
        x1: clampYm(r.start),
        x2: clampYm(r.end),
        y1: yMin,
        y2: yMin + (yMax - yMin) * 0.015,
        fill: st.fill,
        strokeOpacity: 0
      });
    });
  }), events.map((ev, i) => /*#__PURE__*/React.createElement(RC.ReferenceLine, {
    key: 'e' + i,
    x: clampYm(ev.ym),
    stroke: "var(--c-text-muted)",
    strokeDasharray: "2 4"
  })), /*#__PURE__*/React.createElement(RC.Line, {
    type: "monotone",
    dataKey: "safety",
    stroke: "var(--c-chart-safety)",
    strokeDasharray: "6 4",
    dot: false,
    strokeWidth: 1.5,
    name: "safety"
  }), /*#__PURE__*/React.createElement(RC.Line, {
    type: "monotone",
    dataKey: "cash",
    stroke: "var(--c-chart-cash)",
    dot: false,
    strokeWidth: layers.focusCash ? 2.5 : 1.5,
    name: "cash"
  }), showNw && /*#__PURE__*/React.createElement(RC.Line, {
    type: "monotone",
    dataKey: "netWorth",
    stroke: "var(--c-chart-asset)",
    dot: false,
    strokeWidth: 2.5,
    name: "netWorth"
  }), showNw && series[1] && /*#__PURE__*/React.createElement(RC.Line, {
    type: "monotone",
    dataKey: "nw0",
    stroke: "var(--c-chart-b)",
    dot: false,
    strokeWidth: 2,
    strokeDasharray: "8 4",
    name: "nw0"
  }), showNw && series[2] && /*#__PURE__*/React.createElement(RC.Line, {
    type: "monotone",
    dataKey: "nw1",
    stroke: "var(--c-chart-c)",
    dot: false,
    strokeWidth: 2,
    strokeDasharray: "8 4",
    name: "nw1"
  }))));
}

/* ───────── 8. 事件時間軸（v2：移入分析 tabs） ───────── */
function EventTimeline({
  events,
  startYm,
  months
}) {
  if (!events) return null;
  const KIND_C = {
    'loan-paid-off': 'var(--c-loan)',
    retirement: 'var(--c-brand)',
    'one-time': 'var(--c-expense)',
    'dca-paused': 'var(--c-stress-upcoming)'
  };
  if (!events.length) return /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--c-text-muted)',
      fontSize: 12,
      padding: 'var(--sp-sm) var(--sp-xl)'
    }
  }, t('推估期內無結構性事件', 'No structural events in the horizon'));
  const s0 = E.ymToIndex(startYm);
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-md) var(--sp-xl)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--c-text-muted)',
      fontWeight: 700,
      marginBottom: 4
    }
  }, t('財務事件時間軸', 'Financial event timeline')), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 0,
      right: 0,
      height: 2,
      background: 'var(--c-border-strong)'
    }
  }), events.map((ev, i) => {
    const x = Math.min(100, Math.max(0, (E.ymToIndex(ev.ym) - s0) / (months - 1) * 100));
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'absolute',
        left: x + '%',
        top: 0,
        bottom: 0
      },
      title: ymD(ev.ym) + t('：', ': ') + ev.label
    }, /*#__PURE__*/React.createElement("div", {
      className: "evt-dot",
      style: {
        background: KIND_C[ev.kind] || 'var(--c-text-muted)'
      }
    }), events.length <= 8 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: i % 2 ? 36 : 20,
        transform: 'translateX(-50%)',
        fontSize: 10,
        color: 'var(--c-text-2)',
        whiteSpace: 'nowrap'
      }
    }, ev.label));
  })));
}

/* ══════ src/40-analysis.jsx ══════ */
/* ───────── 8b. 支出結構分析 ───────── */
const CAT_COLORS = ['var(--c-chart-asset)', 'var(--c-chart-cash)', 'var(--c-loan)', 'var(--c-expense)', 'var(--c-chart-b)', 'var(--c-chart-c)', 'var(--c-warning)', '#0d9488', 'var(--c-text-muted)'];
function ExpenseAnalysis({
  points,
  rules,
  error,
  empty
}) {
  const [includeInvest, setIncludeInvest] = useState(false);
  const [hidden, setHidden] = useState(() => new Set());
  const bd = useMemo(() => {
    if (!points) return null;
    try {
      return E.categoryBreakdown(points, rules, {
        includeInvest,
        topN: 8
      });
    } catch (e) {
      return null;
    }
  }, [points, rules, includeInvest]);
  if (error || empty || !bd || !bd.categories.length) return null;
  const colorOf = {};
  bd.categories.forEach((c, i) => {
    colorOf[c.category] = CAT_COLORS[i % CAT_COLORS.length];
  });
  const startYear = parseInt(bd.years[0], 10);
  const step = bd.years.length > 20 ? 5 : bd.years.length > 8 ? 2 : 1;
  // 點分類 = 切換該分類在圖上顯示/隱藏（隱藏大項目後 Y 軸自動放大，看得清小項目趨勢）
  const toggle = cat => setHidden(h => {
    const n = new Set(h);
    n.has(cat) ? n.delete(cat) : n.add(cat);
    return n;
  });
  const visibleCats = bd.categories.filter(c => !hidden.has(c.category));
  const someHidden = hidden.size > 0;
  const Tt = ({
    active,
    payload,
    label
  }) => {
    if (!active || !payload || !payload.length) return null;
    const row = bd.yearRows.find(r => r.year === label);
    if (!row) return null;
    const items = visibleCats.map(c => ({
      name: c.category,
      v: row[c.category] || 0
    })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    const shownTotal = items.reduce((s, x) => s + x.v, 0);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--c-surface)',
        boxShadow: 'var(--sh-modal)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--sp-md)',
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        marginBottom: 4
      }
    }, t(`${label} 年${someHidden ? '（篩選後）' : ''}`, `spending in ${label}${someHidden ? ' (filtered)' : ''}`), " ", /*#__PURE__*/React.createElement("span", {
      className: "mono"
    }, fmt(shownTotal))), items.map(x => /*#__PURE__*/React.createElement("div", {
      key: x.name,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colorOf[x.name],
        marginRight: 4
      }
    }), x.name), /*#__PURE__*/React.createElement("span", {
      className: "mono"
    }, fmt(x.v)))));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 'var(--sp-xl)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 'var(--sp-md)',
      gap: 'var(--sp-md)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--c-text-muted)',
      fontWeight: 700
    }
  }, t('支出結構分析（依分類）', 'Expense breakdown (by category)')), someHidden && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: '2px 10px',
      fontSize: 12
    },
    onClick: () => setHidden(new Set())
  }, t(`顯示全部（${hidden.size} 項隱藏中）`, `Show all (${hidden.size} hidden)`)), /*#__PURE__*/React.createElement("label", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: 'var(--c-text-2)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: includeInvest,
    onChange: e => setIncludeInvest(e.target.checked)
  }), t('含投資扣款', 'Include investing'))), /*#__PURE__*/React.createElement(RC.ResponsiveContainer, {
    width: "100%",
    height: 260
  }, /*#__PURE__*/React.createElement(RC.BarChart, {
    data: bd.yearRows,
    margin: {
      top: 4,
      right: 8,
      bottom: 0,
      left: 12
    }
  }, /*#__PURE__*/React.createElement(RC.CartesianGrid, {
    stroke: "var(--c-chart-grid)",
    vertical: false
  }), /*#__PURE__*/React.createElement(RC.XAxis, {
    dataKey: "year",
    tick: {
      fill: 'var(--c-chart-axis)',
      fontSize: 11
    },
    interval: 0,
    tickLine: false,
    axisLine: {
      stroke: 'var(--c-chart-grid)'
    },
    tickFormatter: y => (parseInt(y, 10) - startYear) % step === 0 ? y : ''
  }), /*#__PURE__*/React.createElement(RC.YAxis, {
    tick: {
      fill: 'var(--c-chart-axis)',
      fontSize: 11
    },
    tickFormatter: fmtWan,
    width: 56,
    tickLine: false,
    axisLine: false
  }), /*#__PURE__*/React.createElement(RC.Tooltip, {
    content: /*#__PURE__*/React.createElement(Tt, null),
    cursor: {
      fill: 'var(--c-brand-subtle)'
    }
  }), visibleCats.map(c => /*#__PURE__*/React.createElement(RC.Bar, {
    key: c.category,
    dataKey: c.category,
    stackId: "out",
    fill: colorOf[c.category]
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--c-text-muted)',
      margin: 'var(--sp-xs) 0 var(--sp-sm)'
    }
  }, t('👆 點下方分類可切換圖上顯示——隱藏大項目後，剩下的長條會自動放大看得更清楚。', '👆 Click a category below to toggle it — hiding a big one auto-rescales the rest.')), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, t('分類', 'Category')), /*#__PURE__*/React.createElement("th", null, t('月均', 'Monthly avg')), /*#__PURE__*/React.createElement("th", null, t('全期合計', 'Total')), /*#__PURE__*/React.createElement("th", null, t('佔比', 'Share')))), /*#__PURE__*/React.createElement("tbody", null, bd.categories.map(c => {
    const off = hidden.has(c.category);
    return /*#__PURE__*/React.createElement("tr", {
      key: c.category,
      className: "hoverable",
      onClick: () => toggle(c.category),
      style: {
        cursor: 'pointer',
        opacity: off ? .4 : 1
      },
      title: off ? t('點擊：在圖上顯示', 'Click: show on chart') : t('點擊：從圖上隱藏', 'Click: hide from chart')
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        marginRight: 6,
        verticalAlign: 'middle',
        background: off ? 'transparent' : colorOf[c.category],
        border: '2px solid ' + colorOf[c.category],
        boxSizing: 'border-box'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        textDecoration: off ? 'line-through' : 'none'
      }
    }, c.category), c.type === 'loan' && /*#__PURE__*/React.createElement(Pill, {
      bg: "var(--c-loan-subtle)",
      c: "var(--c-loan)",
      style: {
        marginLeft: 6
      }
    }, t('貸款', 'Loan')), c.type === 'invest' && /*#__PURE__*/React.createElement(Pill, {
      bg: "var(--c-invest-subtle)",
      c: "var(--c-invest)",
      style: {
        marginLeft: 6
      }
    }, t('投資', 'Invest'))), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, fmt(c.monthlyAvg)), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, fmtWan(c.total)), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, Math.round(c.share * 1000) / 10, "%"));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--c-text-muted)',
      marginTop: 'var(--sp-sm)'
    }
  }, t('金額均為換算後台幣；月均 = 全期合計 ÷ 推估月數（含未發生月份）；佔比為全部支出中的比例（不隨篩選改變）。', 'Amounts in base currency; Monthly avg = total ÷ months in horizon; Share is of all expenses (unaffected by filter).')));
}

/* ───────── 9. 退休達標儀表 ───────── */
function RetirementDashboard({
  rules,
  config,
  hasIncome,
  onSaveScenario
}) {
  const [ret, setRet] = useState(0); // 報酬率增減（百分點）
  const [exp, setExp] = useState(100); // 生活支出 %
  const trial = useMemo(() => {
    if (!hasIncome) return null;
    const tRules = rules.map(r => {
      let o = {
        ...r
      };
      if (r.type === 'invest' && r.invest) o = {
        ...o,
        invest: {
          ...r.invest,
          annualReturn: Math.max(-0.99, r.invest.annualReturn + ret / 100)
        }
      };
      if (r.type === 'expense' && r.frequency === 'monthly') o = {
        ...o,
        amount: Math.round((r.amount || 0) * exp / 100)
      };
      return o;
    });
    const tConfig = {
      ...config,
      openingInvestReturn: Math.max(-0.99, (config.openingInvestReturn || 0) + ret / 100)
    };
    try {
      const earliest = E.findEarliestRetirement(tRules, tConfig);
      // 退休前（工作期間）的現金短暫見底：獨立提醒，不擋退休可行性。用「工作到期末」情境找退休前的 critical。
      const endYm = E.indexToYm(E.ymToIndex(tConfig.startMonth) + tConfig.months - 1);
      const cfgWork = {
        ...tConfig,
        globalParams: {
          ...(tConfig.globalParams || {}),
          retirementMonth: endYm
        }
      };
      const aWork = E.analyze(E.project(tRules, cfgWork), cfgWork, tRules);
      const cutoff = earliest ? E.ymToIndex(earliest) : Infinity;
      const preRetireCrisis = aWork.stressPoints.find(s => s.severity === 'critical' && E.ymToIndex(s.ym) < cutoff) || null;
      return {
        earliest,
        tRules,
        tConfig,
        preRetireCrisis
      };
    } catch (e) {
      return {
        error: e.message
      };
    }
  }, [rules, config, ret, exp, hasIncome]);
  if (!hasIncome) return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-lg)',
      opacity: .55
    }
  }, t('退休達標儀表：需要至少一條收入規則', 'Retirement check: needs at least one income rule'));
  const changed = ret !== 0 || exp !== 100;
  const pc = trial?.preRetireCrisis;
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-lg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--c-text-muted)',
      fontWeight: 700,
      marginBottom: 'var(--sp-xs)'
    }
  }, t('退休試算', 'Retirement check')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--c-text-2)',
      marginBottom: 'var(--sp-sm)'
    }
  }, t('試算你', 'Find '), /*#__PURE__*/React.createElement("b", null, t('最早哪個月能退休', 'the earliest month you can retire')), t('——退休後收入停止，靠退休當下的', ' — after retiring, income stops and you live on the '), /*#__PURE__*/React.createElement("b", null, t('現金', 'cash')), t('支應到推估結束。（只看退休後現金；工作期間的現金週轉另計。試算副本，不改你的規則）', ' you have until the horizon ends. (Only post-retirement cash; working-period cash flow is separate. Sandbox copy, your rules are untouched.)')), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: '1.75rem',
      color: trial?.earliest ? 'var(--c-success)' : 'var(--c-warning-strong)'
    }
  }, trial?.error ? '⚠ ' + trial.error : trial?.earliest ? t(`最早 ${ymD(trial.earliest)} 可退休`, `Earliest retirement: ${ymD(trial.earliest)}`) : t('推估期內無法退休', 'Cannot retire within the horizon')), trial?.earliest && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--c-text-2)',
      margin: 'var(--sp-xs) 0 var(--sp-sm)'
    }
  }, t(`在此月之後退休，退休後現金全程不會見底。（目前全域退休設定：${ymD(config.globalParams?.retirementMonth)}，可在 ⚙ 參數調整）`, `Retire after this month and post-retirement cash never runs out. (Current global setting: ${ymD(config.globalParams?.retirementMonth)}, adjust in ⚙ Settings)`)), !trial?.earliest && !trial?.error && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--c-text-2)',
      margin: 'var(--sp-xs) 0 var(--sp-sm)'
    }
  }, t('即使工作到推估期末，退休後現金仍會見底。注意：本工具假設退休靠', 'Even working to the end, post-retirement cash still runs out. Note: this tool assumes you live on '), /*#__PURE__*/React.createElement("b", null, t('現金', 'CASH')), t('過活、', ' in retirement — it '), /*#__PURE__*/React.createElement("b", null, t('不會自動賣出投資變現', 'does NOT auto-sell investments')), t('——你的投資市值再高也不算進退休現金。可提高退休當下的現金部位、降低支出，或延後退休。', ", so a large invest balance doesn't count as retirement cash. Raise your cash at retirement, cut spending, or retire later.")), pc && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--c-text-2)',
      margin: '0 0 var(--sp-md)',
      background: 'var(--c-warning-subtle)',
      padding: 'var(--sp-sm) var(--sp-md)',
      borderRadius: 'var(--r-md)'
    }
  }, t('另注意（與退休無關）：工作期間 ', 'Also (unrelated to retirement): during working years cash briefly runs out in '), /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, ymD(pc.ym)), t(' 現金會短暫見底，主因 ', ', mainly '), /*#__PURE__*/React.createElement("b", null, pc.topContributors.slice(0, 2).map(t => t.category).join('＋') || '—'), t('——記得為那段預留週轉金，或調整當時的支出/定期定額。', ' — keep a buffer for that period or adjust spending/investing then.')), !pc && (trial?.earliest || trial == null) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 'var(--sp-md)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--sp-md)'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement(React.Fragment, null, t('投資年報酬率調整：', 'Investment return adj: '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, ret > 0 ? '+' : '', ret, " ", t('百分點', 'pts')))
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "-4",
    max: "4",
    step: "0.5",
    value: ret,
    onChange: e => setRet(parseFloat(e.target.value))
  })), /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement(React.Fragment, null, t('每月生活支出：', 'Monthly living %: '), /*#__PURE__*/React.createElement("b", {
      className: "mono"
    }, exp, "%"))
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "50",
    max: "150",
    step: "5",
    value: exp,
    onChange: e => setExp(parseFloat(e.target.value))
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-sm)',
      marginTop: 'var(--sp-md)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    disabled: !changed,
    onClick: () => {
      setRet(0);
      setExp(100);
    }
  }, t('重設', 'Reset')), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    disabled: !changed || !trial || trial.error,
    onClick: () => onSaveScenario({
      ret,
      exp
    })
  }, t('另存為情境', 'Save as scenario'))));
}

/* ───────── 6. 鑽取表格 ───────── */
function DrilldownTable({
  years,
  error,
  empty,
  expandedYears,
  onToggleYear,
  jumpRef
}) {
  if (error || empty || !years) return null;
  const sevDot = s => s === 'critical' ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-stress-critical)'
    }
  }, "\u25CF") : s === 'high' ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-stress-high)'
    }
  }, "\u25CF") : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 'var(--sp-xl)',
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--c-text-muted)',
      fontWeight: 700,
      marginBottom: 'var(--sp-md)'
    }
  }, t('逐年展開（點年份看逐月）', 'Yearly breakdown (click a year for months)')), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "sticky-col"
  }, t('年份', 'Year')), /*#__PURE__*/React.createElement("th", null, t('收入', 'Income')), /*#__PURE__*/React.createElement("th", null, t('支出', 'Expense')), /*#__PURE__*/React.createElement("th", {
    className: "hide-tablet"
  }, t('投資投入', 'Invested')), /*#__PURE__*/React.createElement("th", null, t('現金淨變動', 'Net cash change')), /*#__PURE__*/React.createElement("th", null, t('年底現金', 'Year-end cash')), /*#__PURE__*/React.createElement("th", null, t('年底淨資產', 'Year-end net worth')))), /*#__PURE__*/React.createElement("tbody", null, years.map(y => {
    const open = expandedYears.includes(y.year);
    const stressBg = y.worstSeverity ? {
      background: 'var(--c-table-stress)'
    } : {};
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: y.year
    }, /*#__PURE__*/React.createElement("tr", {
      className: "hoverable",
      onClick: () => onToggleYear(y.year),
      style: {
        cursor: 'pointer'
      },
      ref: el => {
        if (jumpRef) jumpRef.current[y.year] = el;
      }
    }, /*#__PURE__*/React.createElement("td", {
      className: "sticky-col mono",
      style: stressBg
    }, open ? '▾' : '▸', " ", y.year, " ", sevDot(y.worstSeverity)), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: stressBg
    }, fmt(y.income)), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: stressBg
    }, fmt(y.totalOutflow)), /*#__PURE__*/React.createElement("td", {
      className: "mono hide-tablet",
      style: stressBg
    }, fmt(y.investContribution)), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: {
        ...stressBg,
        color: y.netCashChange < 0 ? 'var(--c-danger)' : 'var(--c-text)'
      }
    }, fmt(y.netCashChange)), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: {
        ...stressBg,
        color: y.endCash < 0 ? 'var(--c-danger)' : 'var(--c-text)'
      }
    }, fmt(y.endCash)), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: stressBg
    }, fmt(y.endNetWorth))), open && y.months.map(p => {
      const sev = p.endCash < 0 ? 'critical' : p.endCash < p.safetyThreshold ? 'high' : null;
      return /*#__PURE__*/React.createElement("tr", {
        key: p.ym,
        style: {
          background: sev ? 'var(--c-table-stress)' : 'var(--c-surface-subtle)',
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("td", {
        className: "sticky-col mono",
        style: {
          paddingLeft: 'var(--sp-2xl)',
          background: 'inherit'
        }
      }, ymD(p.ym), " ", sevDot(sev)), /*#__PURE__*/React.createElement("td", {
        className: "mono"
      }, fmt(p.income)), /*#__PURE__*/React.createElement("td", {
        className: "mono"
      }, fmt(p.totalOutflow)), /*#__PURE__*/React.createElement("td", {
        className: "mono hide-tablet"
      }, fmt(p.investContribution)), /*#__PURE__*/React.createElement("td", {
        className: "mono",
        style: {
          color: p.netCashChange < 0 ? 'var(--c-danger)' : 'inherit'
        }
      }, fmt(p.netCashChange)), /*#__PURE__*/React.createElement("td", {
        className: "mono",
        style: {
          color: p.endCash < 0 ? 'var(--c-danger)' : 'inherit'
        }
      }, fmt(p.endCash)), /*#__PURE__*/React.createElement("td", {
        className: "mono"
      }, fmt(p.netWorth)));
    }));
  }))));
}

/* ══════ src/50-chrome.jsx ══════ */
/* ───────── 7. 情境列 ───────── */
function ScenarioBar({
  scenarios,
  activeId,
  compareIds,
  comparing,
  warnings,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onToggleCompare,
  onPickCompare
}) {
  const pillStyle = on => ({
    padding: '4px 12px',
    borderRadius: 'var(--r-pill)',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    background: on ? 'var(--c-brand)' : 'var(--c-surface)',
    color: on ? 'var(--c-text-inv)' : 'var(--c-text-2)',
    border: on ? '1px solid var(--c-brand)' : '1px solid var(--c-border-strong)',
    transition: 'all var(--m-base)'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-sm)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: pillStyle(activeId === 'base'),
    onClick: () => onSwitch('base')
  }, t('基準', 'Base')), scenarios.map(s => {
    const n = Object.keys(s.ruleOverrides || {}).length + Object.keys(s.configOverrides || {}).length;
    const warn = warnings[s.id] && warnings[s.id].length > 0;
    return /*#__PURE__*/React.createElement("span", {
      key: s.id,
      style: {
        ...pillStyle(activeId === s.id),
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center'
      },
      onClick: () => onSwitch(s.id),
      onDoubleClick: () => onRename(s.id),
      title: warn ? warnings[s.id].join('\n') : t('雙擊改名', 'Double-click to rename')
    }, warn && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--c-warning)'
      }
    }, "\u26A0"), s.name, n > 0 && /*#__PURE__*/React.createElement("span", {
      className: "pill",
      style: {
        background: activeId === s.id ? 'rgba(255,255,255,.25)' : 'var(--c-warning-subtle)',
        color: activeId === s.id ? '#fff' : 'var(--c-warning-strong)'
      }
    }, t(`${n} 處修改`, `${n} changes`)), comparing && /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: compareIds.includes(s.id),
      onClick: e => e.stopPropagation(),
      onChange: () => onPickCompare(s.id),
      title: t('加入圖表比較（上限 3 條）', 'Add to chart comparison (up to 3)')
    }), /*#__PURE__*/React.createElement("span", {
      onClick: e => {
        e.stopPropagation();
        onDelete(s.id);
      },
      style: {
        opacity: .6
      }
    }, "\xD7"));
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn-ghost btn",
    style: {
      padding: '3px 10px',
      fontSize: 12,
      borderRadius: 'var(--r-pill)'
    },
    onClick: onCreate,
    disabled: comparing,
    title: comparing ? t('比較模式中無法新增', 'Cannot add while comparing') : ''
  }, t('＋ 新情境', '＋ New scenario')), scenarios.length === 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--c-text-muted)'
    }
  }, t('複製一份改參數，比較兩種人生', 'Copy and tweak to compare two paths')), scenarios.length > 0 && /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: 'var(--c-text-2)',
      marginLeft: 'var(--sp-sm)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    on: comparing,
    onClick: onToggleCompare
  }), t('比較', 'Compare')));
}

/* ───────── 10. 同步指示器＋存檔 ───────── */
function SyncBar({
  syncState,
  lastSavedAt,
  daysSince,
  saving,
  fsapiOk,
  onSave,
  onMenu
}) {
  const meta = {
    synced: {
      bg: 'var(--c-success-subtle)',
      c: 'var(--c-success)',
      icon: '✓',
      text: t('已同步', 'Saved') + (lastSavedAt ? ' ' + lastSavedAt : '')
    },
    dirty: {
      bg: 'var(--c-warning-subtle)',
      c: 'var(--c-warning-strong)',
      icon: '●',
      text: t('草稿未落檔', 'Unsaved draft') + (daysSince >= 3 ? t(`（距上次存檔 ${daysSince} 天）`, ` (${daysSince} days since last save)`) : '')
    },
    fileNewer: {
      bg: 'var(--c-info-subtle)',
      c: 'var(--c-info)',
      icon: '⇅',
      text: t('檔案較新', 'File is newer')
    }
  }[syncState];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-sm)'
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    bg: meta.bg,
    c: meta.c
  }, meta.icon, " ", meta.text), /*#__PURE__*/React.createElement("button", {
    className: 'btn ' + (syncState === 'dirty' ? 'btn-primary' : 'btn-ghost'),
    disabled: syncState === 'fileNewer' || saving,
    onClick: onSave,
    title: fsapiOk ? t('寫入 rules.json（進 OneDrive 自動備份）', 'Write rules.json (auto-backup)') : t('此瀏覽器不支援直接寫檔，將下載 JSON', "This browser can't write files; JSON will download")
  }, saving ? t('存檔中…', 'Saving…') : fsapiOk ? t('存檔', 'Save') : t('下載 JSON', 'Download JSON')), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onMenu,
    title: t('匯入/匯出', 'Import/Export')
  }, "\u22EF"));
}

/* ───────── 11. 全域參數面板 ───────── */
function GlobalParamsPanel({
  config,
  onChange,
  errors,
  forceOpen,
  embedded
}) {
  const [openState, setOpen] = useState(window.innerWidth >= 1024);
  const open = forceOpen || openState;
  const gp = config.globalParams || {};
  const sf = config.safety || {
    mode: 'multiple',
    multiple: 6
  };
  const setC = patch => onChange(patch);
  const err = f => (errors || []).filter(e => !e.ruleId).find(e => e.field.includes(f))?.message;
  const grid = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--sp-md)',
      marginTop: embedded ? 0 : 'var(--sp-md)'
    }
  }, GLOBAL_PARAM_FIELDS(gp, sf, config, setC, err));
  /* modal 內嵌時：去掉外層卡片與摺疊標題，直接給欄位格（容器由 modal 提供） */
  if (embedded) return grid;
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 'var(--sp-lg)',
      marginBottom: 'var(--sp-lg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(o => !o),
    style: {
      cursor: 'pointer',
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--c-text-muted)',
      fontWeight: 700,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("span", null, t('全域參數', 'Global settings')), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, open ? '▾' : '▸')), open && grid);
}
function GLOBAL_PARAM_FIELDS(gp, sf, config, setC, err) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
    label: t('退休年月', 'Retirement month'),
    hint: t('規則可設「至退休」連動此值', 'Rules can anchor "at retirement" to this'),
    error: err('retirementMonth')
  }, /*#__PURE__*/React.createElement("input", {
    type: "month",
    value: gp.retirementMonth || '',
    onChange: e => setC({
      globalParams: {
        ...gp,
        retirementMonth: e.target.value || null
      }
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('通膨率 %', 'Inflation %'),
    hint: t('供支出卡成長率參考的全域假設', 'A global assumption for expense growth')
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    step: "0.1",
    value: ((gp.inflationRate || 0) * 100).toFixed(1).replace(/\.0$/, ''),
    onChange: e => setC({
      globalParams: {
        ...gp,
        inflationRate: (parseFloat(e.target.value) || 0) / 100
      }
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('起始現金', 'Starting cash'),
    error: err('openingCash')
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    value: config.openingCash,
    onChange: e => setC({
      openingCash: parseFloat(e.target.value) || 0
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('推估期（年）', 'Horizon (years)'),
    error: err('months')
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    value: Math.round(config.months / 12),
    onChange: e => setC({
      months: Math.max(1, Math.min(100, Math.round(parseFloat(e.target.value) || 30))) * 12
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('期初投資市值', 'Initial investment value'),
    hint: t('既有投資部位現值', 'Current value of existing investments')
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    value: config.openingInvest || 0,
    onChange: e => setC({
      openingInvest: parseFloat(e.target.value) || 0
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: t('期初部位年報酬 %', 'Initial position annual return %')
  }, /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    step: "0.1",
    value: ((config.openingInvestReturn || 0) * 100).toFixed(1).replace(/\.0$/, ''),
    onChange: e => setC({
      openingInvestReturn: (parseFloat(e.target.value) || 0) / 100
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: t('現金安全水位（低於它即標示壓力）', 'Cash safety line (below it flags stress)'),
    hint: t('兩種模式皆可用，此處切換預設', 'Both modes available; switch the default here'),
    error: err('safety')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-sm)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, /*#__PURE__*/React.createElement("button", {
    className: sf.mode === 'multiple' ? 'on' : '',
    onClick: () => setC({
      safety: {
        ...sf,
        mode: 'multiple',
        multiple: sf.multiple ?? 6
      }
    })
  }, t('月支出倍數', 'Months of expenses')), /*#__PURE__*/React.createElement("button", {
    className: sf.mode === 'fixed' ? 'on' : '',
    onClick: () => setC({
      safety: {
        ...sf,
        mode: 'fixed',
        fixedAmount: sf.fixedAmount ?? 500000
      }
    })
  }, t('固定金額', 'Fixed amount'))), sf.mode === 'multiple' ? /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    step: "0.5",
    style: {
      width: 80
    },
    value: sf.multiple ?? 6,
    onChange: e => setC({
      safety: {
        ...sf,
        multiple: parseFloat(e.target.value) || 0
      }
    })
  }) : /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    style: {
      width: 120
    },
    value: sf.fixedAmount ?? 0,
    onChange: e => setC({
      safety: {
        ...sf,
        fixedAmount: parseFloat(e.target.value) || 0
      }
    })
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--c-text-muted)'
    }
  }, sf.mode === 'multiple' ? t('× 未來 12 月平均必要月支出', '× avg required monthly spending (next 12 mo)') : t('元', ''))))), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: t('匯率表（1 外幣 = N 台幣）', 'Exchange rates (1 foreign = N base)'),
    hint: t('假設值請自行維護；外幣規則展開時以此固定匯率換算回台幣，不模擬匯率波動', 'You maintain these; foreign rules convert at this fixed rate, no FX volatility modeled')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-md)',
      flexWrap: 'wrap'
    }
  }, ['USD', 'JPY', 'EUR', 'CNY'].map(c => /*#__PURE__*/React.createElement("label", {
    key: c,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-text-muted)'
    }
  }, c), /*#__PURE__*/React.createElement("input", {
    className: "mono",
    type: "number",
    step: "0.01",
    style: {
      width: 76
    },
    value: (gp.fxRates || {})[c] ?? '',
    placeholder: String({
      USD: 32.5,
      JPY: 0.22,
      EUR: 35.5,
      CNY: 4.5
    }[c]),
    onChange: e => {
      const v = parseFloat(e.target.value);
      setC({
        globalParams: {
          ...gp,
          fxRates: {
            ...(gp.fxRates || {}),
            [c]: isNaN(v) ? undefined : v
          }
        }
      });
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: t('定期定額遇現金不足', 'When cash is short for investing'),
    hint: t('照扣會顯示負現金——暴露壓力而非掩蓋', 'Deducting anyway shows negative cash — exposes stress instead of hiding it')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-lg)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: (config.dcaOnShortfall || 'continue') === 'continue',
    onChange: () => setC({
      dcaOnShortfall: 'continue'
    })
  }), t('照扣並顯示負現金（預設）', 'Deduct anyway, show negative cash (default)')), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: config.dcaOnShortfall === 'pause',
    onChange: () => setC({
      dcaOnShortfall: 'pause'
    })
  }), t('自動暫停（圖上標記）', 'Auto-pause (marked on chart)'))))));
}

/* ══════ src/90-app.jsx ══════ */
/* ───────── App ───────── */
function nowYm() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function App() {
  const [lang, setLangState] = useState(LANG);
  LANG = lang; // 每次 render 前同步模組全域，子元件的 t() 才會取到目前語系
  const changeLang = l => {
    setLangGlobal(l);
    setLangState(l);
  };
  const [doc, setDoc] = useState(() => {
    const draft = loadDraft();
    if (draft) return {
      rules: draft.rules,
      config: draft.config,
      scenarios: draft.scenarios || [],
      templateIds: draft.templateIds || []
    };
    return buildTemplate(nowYm());
  });
  const [lastFileJson, setLastFileJson] = useState(() => {
    const d = loadDraft();
    return d ? d.lastFileJson || null : null;
  });
  const [activeId, setActiveId] = useState('base');
  const [comparing, setComparing] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [paramsOpen, setParamsOpen] = useState(false);
  /* 左欄收合偏好：獨立 key，純 UI 狀態不進 doc（不觸發 dirty） */
  const [leftCollapsed, setLeftCollapsedState] = useState(() => {
    try {
      return localStorage.getItem('asset-projection:ui:leftCollapsed') === '1';
    } catch (e) {
      return false;
    }
  });
  const setLeftCollapsed = v => {
    setLeftCollapsedState(v);
    try {
      localStorage.setItem('asset-projection:ui:leftCollapsed', v ? '1' : '0');
    } catch (e) {}
  };
  /* 圖表釘選偏好：預設不釘（隨頁面捲走，讓閱讀區完整）；釘住則捲動時保持可見。
     不用捲動監聽改變高度——那會讓文件高度在捲動中變動、把捲動位置夾回頂端。 */
  const [pinChart, setPinChartState] = useState(() => {
    try {
      return localStorage.getItem('asset-projection:ui:pinChart') === '1';
    } catch (e) {
      return false;
    }
  });
  const setPinChart = v => {
    setPinChartState(v);
    try {
      localStorage.setItem('asset-projection:ui:pinChart', v ? '1' : '0');
    } catch (e) {}
  };
  const [expandedYears, setExpandedYears] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [conflict, setConflict] = useState(null); // {fileJson, fileMeta}
  const [importErr, setImportErr] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileHandleRef = useRef(null);
  const jumpRef = useRef({});
  const fileInputRef = useRef(null);
  const fsapiOk = typeof window.showSaveFilePicker === 'function';
  const toast = (msg, danger) => {
    const id = Math.random();
    setToasts(t => [...t, {
      id,
      msg,
      danger
    }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  };
  const [savedAtMs, setSavedAtMs] = useState(() => {
    const d = loadDraft();
    return d ? d.savedAtMs || null : null;
  });

  /* 草稿即時入 localStorage（工作真相） */
  useEffect(() => {
    saveDraft(doc, lastFileJson, savedAtMs);
  }, [doc, lastFileJson, savedAtMs]);
  const currentJson = useMemo(() => E.serialize({
    rules: doc.rules,
    config: doc.config,
    scenarios: doc.scenarios
  }), [doc]);
  const currentJsonRef = useRef(currentJson);
  currentJsonRef.current = currentJson;
  const syncState = conflict ? 'fileNewer' : lastFileJson && currentJson === lastFileJson ? 'synced' : 'dirty';
  const daysSince = syncState === 'dirty' && savedAtMs ? Math.floor((Date.now() - savedAtMs) / 86400000) : 0;
  useEffect(() => {
    const h = e => {
      if (syncState === 'dirty' && lastFileJson) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [syncState, lastFileJson]);

  /* 開頁：還原 handle；已授權（Chrome 持久授權情境）就讀檔比對——漸進增強 */
  useEffect(() => {
    (async () => {
      try {
        const h = await idbGet('fileHandle');
        if (!h) return;
        fileHandleRef.current = h;
        if ((await h.queryPermission({
          mode: 'readwrite'
        })) === 'granted') {
          const f = await h.getFile();
          const text = await f.text();
          /* review-codex 🔴：無論有無比對基準，一律拿檔案與「當前草稿」比對；
             不同即進衝突強制二選一——草稿遺失時絕不能讓範本靜默覆寫 rules.json */
          if (text === currentJsonRef.current) {
            setLastFileJson(text);
            return;
          }
          setConflict({
            fileJson: text,
            fileMeta: {
              modified: new Date(f.lastModified).toLocaleString('zh-TW'),
              size: f.size
            }
          });
        }
      } catch (e) {/* 讀不到就保持草稿模式 */}
    })();
  }, []);

  /* 情境套用 → 推估 */
  const activeScenario = doc.scenarios.find(s => s.id === activeId) || null;
  const eff = useMemo(() => activeScenario ? E.applyScenario(doc.rules, doc.config, activeScenario) : {
    rules: doc.rules,
    config: doc.config,
    warnings: []
  }, [doc, activeScenario]);
  const validation = useMemo(() => E.validate(eff.rules, eff.config), [eff]);
  const errorsByRule = useMemo(() => {
    const m = {};
    validation.errors.forEach(e => {
      if (e.ruleId) {
        (m[e.ruleId] = m[e.ruleId] || []).push(e);
      }
    });
    return m;
  }, [validation]);
  const result = useMemo(() => {
    if (!validation.ok) return {
      error: validation.errors.some(e => !e.ruleId) ? t('全域參數有誤：', 'Global settings error: ') + validation.errors.filter(e => !e.ruleId).map(e => e.message).join('；') : null,
      invalidRules: true
    };
    try {
      const points = E.project(eff.rules, eff.config);
      return {
        points,
        analysis: E.analyze(points, eff.config, eff.rules),
        years: E.yearlySummary(points)
      };
    } catch (e) {
      return {
        error: e.message
      };
    }
  }, [eff, validation]);

  /* 比較模式：一律含基準；情境最多再選 2 → 圖上限 3 條（視圖層約束） */
  const compareSeries = useMemo(() => {
    if (!comparing || result.error || !result.points) return null;
    const out = [];
    compareIds.slice(0, 2).forEach(id => {
      const sc = doc.scenarios.find(s => s.id === id);
      if (!sc || sc.id === activeId) return;
      const e2 = E.applyScenario(doc.rules, doc.config, sc);
      try {
        out.push({
          name: sc.name,
          points: E.project(e2.rules, e2.config)
        });
      } catch (err) {}
    });
    if (activeId !== 'base') {
      try {
        out.unshift({
          name: t('基準', 'Base'),
          points: E.project(doc.rules, doc.config)
        });
      } catch (err) {}
    }
    return out.slice(0, 2);
  }, [comparing, compareIds, doc, activeId, result]);
  const baseAnalysis = useMemo(() => {
    if (activeId === 'base') return null;
    try {
      const p = E.project(doc.rules, doc.config);
      return E.analyze(p, doc.config, doc.rules);
    } catch (e) {
      return null;
    }
  }, [doc, activeId]);
  const previews = useMemo(() => {
    const m = {};
    eff.rules.forEach(r => {
      if ((errorsByRule[r.id] || []).length) return;
      try {
        const p = E.previewRule(r, eff.config);
        const horizonIdx = E.ymToIndex(eff.config.startMonth) + eff.config.months - 1;
        /* endYear = 規則自身迄止（引擎 resolveEndMonth：endAnchor > termYears > endMonth）與推估期末取小（feedback 🟡#1） */
        const endYmResolved = E.resolveEndMonth(r, eff.config);
        const endIdx = endYmResolved ? Math.min(horizonIdx, E.ymToIndex(endYmResolved)) : horizonIdx;
        p.endYear = E.indexToYm(endIdx).slice(0, 4);
        p.horizonYear = E.indexToYm(horizonIdx).slice(0, 4);
        if (p.kind === 'loan') p.payoffYm = E.indexToYm(E.ymToIndex(r.startMonth) + r.loan.termMonths - 1);
        m[r.id] = p;
      } catch (e) {}
    });
    return m;
  }, [eff, errorsByRule]);
  const scenarioWarnings = useMemo(() => {
    const m = {};
    doc.scenarios.forEach(s => {
      m[s.id] = E.applyScenario(doc.rules, doc.config, s).warnings;
    });
    return m;
  }, [doc]);

  /* ── 規則操作：基準改本體；情境改 overrides（decision.md #A） ── */
  const markEdited = id => setDoc(d => ({
    ...d,
    templateIds: d.templateIds.filter(t => t !== id)
  }));
  const updateRule = useCallback((id, patch) => {
    if (activeId === 'base') {
      setDoc(d => ({
        ...d,
        templateIds: d.templateIds.filter(t => t !== id),
        rules: d.rules.map(r => r.id === id ? {
          ...r,
          ...patch,
          ...(patch.loan ? {
            loan: {
              ...r.loan,
              ...patch.loan
            }
          } : {}),
          ...(patch.invest ? {
            invest: {
              ...r.invest,
              ...patch.invest
            }
          } : {})
        } : r)
      }));
    } else {
      setDoc(d => ({
        ...d,
        scenarios: d.scenarios.map(s => s.id !== activeId ? s : {
          ...s,
          ruleOverrides: {
            ...(s.ruleOverrides || {}),
            [id]: {
              ...((s.ruleOverrides || {})[id] || {}),
              ...patch
            }
          }
        })
      }));
    }
  }, [activeId]);
  const toggleRule = useCallback(id => {
    const cur = eff.rules.find(r => r.id === id);
    updateRule(id, {
      enabled: cur.enabled === false
    });
  }, [eff, updateRule]);
  const restoreRule = useCallback(id => {
    setDoc(d => ({
      ...d,
      scenarios: d.scenarios.map(s => {
        if (s.id !== activeId) return s;
        const ro = {
          ...(s.ruleOverrides || {})
        };
        delete ro[id];
        return {
          ...s,
          ruleOverrides: ro
        };
      })
    }));
  }, [activeId]);
  const deleteRule = useCallback(id => {
    const refs = doc.scenarios.filter(s => (s.ruleOverrides || {})[id]).map(s => s.name);
    const extra = refs.length ? t(`\n注意：情境「${refs.join('、')}」引用了此卡，刪除後該情境對應修改將標記失效。`, `\nNote: scenario(s) "${refs.join(', ')}" reference this rule; their overrides will be marked invalid after deletion.`) : '';
    if (!window.confirm(t('確定刪除「', 'Delete "') + (doc.rules.find(r => r.id === id)?.name || id) + t('」？', '"?') + extra)) return;
    setDoc(d => ({
      ...d,
      rules: d.rules.filter(r => r.id !== id),
      templateIds: d.templateIds.filter(t => t !== id)
    }));
  }, [doc]);
  const duplicateRule = useCallback(id => {
    setDoc(d => {
      const src = d.rules.find(r => r.id === id);
      if (!src) return d;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = uid();
      copy.name = src.name + t('（複製）', ' (copy)');
      return {
        ...d,
        rules: [...d.rules, copy]
      };
    });
  }, []);
  const addRule = useCallback(kind => {
    const start = doc.config.startMonth;
    const presets = {
      income: {
        name: t('新收入', 'New income'),
        type: 'income',
        amount: 30000,
        frequency: 'monthly',
        annualGrowthRate: 0.03
      },
      expense: {
        name: t('新支出', 'New expense'),
        type: 'expense',
        amount: 10000,
        frequency: 'monthly',
        annualGrowthRate: 0.02
      },
      loan: {
        name: t('新貸款', 'New loan'),
        type: 'loan',
        loan: {
          principal: 1000000,
          annualRate: 0.025,
          termMonths: 84
        }
      },
      invest: {
        name: t('定期定額', 'Recurring invest'),
        type: 'invest',
        amount: 10000,
        frequency: 'monthly',
        annualGrowthRate: 0,
        invest: {
          annualReturn: 0.06
        }
      },
      once: {
        name: t('一次性支出', 'One-time expense'),
        type: 'expense',
        amount: 100000,
        frequency: 'once'
      }
    };
    const p = presets[kind] || presets.income;
    const r = {
      id: uid(),
      category: p.name,
      startMonth: start,
      endMonth: null,
      growthAnchorMonth: 1,
      enabled: true,
      ...p
    };
    setDoc(d => ({
      ...d,
      rules: [...d.rules, r]
    }));
  }, [doc.config.startMonth]);
  /* 規則選了外幣但全域還沒有匯率 → 以預設假設值補種，避免立即驗證錯誤（一律寫進基準 config） */
  const ensureFxRate = useCallback(curCode => {
    if (curCode === 'TWD') return;
    setDoc(d => {
      const gp = d.config.globalParams || {};
      if ((gp.fxRates || {})[curCode] > 0) return d;
      return {
        ...d,
        config: {
          ...d.config,
          globalParams: {
            ...gp,
            fxRates: {
              ...(gp.fxRates || {}),
              [curCode]: DEFAULT_FX[curCode] || 1
            }
          }
        }
      };
    });
  }, []);
  const updateConfig = useCallback(patch => {
    if (activeId === 'base') {
      setDoc(d => ({
        ...d,
        config: {
          ...d.config,
          ...patch,
          ...(patch.globalParams ? {
            globalParams: {
              ...d.config.globalParams,
              ...patch.globalParams
            }
          } : {}),
          ...(patch.safety ? {
            safety: {
              ...d.config.safety,
              ...patch.safety
            }
          } : {})
        }
      }));
    } else {
      setDoc(d => ({
        ...d,
        scenarios: d.scenarios.map(s => s.id !== activeId ? s : {
          ...s,
          configOverrides: {
            ...(s.configOverrides || {}),
            ...patch
          }
        })
      }));
    }
  }, [activeId]);

  /* ── 情境操作 ── */
  const createScenario = overridesInit => {
    const id = uid();
    const base = activeScenario;
    const name = window.prompt(t('情境名稱：', 'Scenario name:'), t('情境 ', 'Scenario ') + (doc.scenarios.length + 1));
    if (name === null) return;
    setDoc(d => ({
      ...d,
      scenarios: [...d.scenarios, {
        id,
        name: name || t('情境 ', 'Scenario ') + (d.scenarios.length + 1),
        ruleOverrides: overridesInit?.ruleOverrides || (base ? JSON.parse(JSON.stringify(base.ruleOverrides || {})) : {}),
        configOverrides: overridesInit?.configOverrides || (base ? JSON.parse(JSON.stringify(base.configOverrides || {})) : {})
      }]
    }));
    setActiveId(id);
  };
  const saveTrialAsScenario = ({
    ret,
    exp
  }) => {
    const ro = {};
    doc.rules.forEach(r => {
      if (r.type === 'invest' && r.invest) ro[r.id] = {
        invest: {
          ...r.invest,
          annualReturn: Math.max(-0.99, r.invest.annualReturn + ret / 100)
        }
      };
      if (r.type === 'expense' && r.frequency === 'monthly') ro[r.id] = {
        amount: Math.round((r.amount || 0) * exp / 100)
      };
    });
    createScenario({
      ruleOverrides: ro,
      configOverrides: {
        openingInvestReturn: Math.max(-0.99, (doc.config.openingInvestReturn || 0) + ret / 100)
      }
    });
  };

  /* ── 存檔（顯式落檔：FSAPI 主通道 + 下載保底） ── */
  const doSave = async () => {
    setSaving(true);
    try {
      if (!fsapiOk) {
        download('rules.json', currentJson);
        setLastFileJson(currentJson);
        setSavedAtMs(Date.now());
        setLastSavedAt(new Date().toLocaleTimeString(LANG === 'en' ? 'en-US' : 'zh-TW', {
          hour: '2-digit',
          minute: '2-digit'
        }));
        toast(t('已下載 rules.json（請放到 data/ 資料夾備份）', 'Downloaded rules.json (keep it as your backup)'));
        return;
      }
      let h = fileHandleRef.current;
      if (h && (await h.requestPermission({
        mode: 'readwrite'
      })) !== 'granted') h = null;
      if (!h) {
        h = await window.showSaveFilePicker({
          suggestedName: 'rules.json',
          types: [{
            description: 'JSON',
            accept: {
              'application/json': ['.json']
            }
          }]
        });
        fileHandleRef.current = h;
        await idbSet('fileHandle', h);
      }
      const w = await h.createWritable();
      await w.write(currentJson);
      await w.close();
      setLastFileJson(currentJson);
      setSavedAtMs(Date.now());
      setLastSavedAt(new Date().toLocaleTimeString(LANG === 'en' ? 'en-US' : 'zh-TW', {
        hour: '2-digit',
        minute: '2-digit'
      }));
      toast(t('已存檔 rules.json ✓', 'Saved rules.json ✓'));
    } catch (e) {
      if (e && e.name === 'AbortError') {/* 使用者取消選檔 */} else toast(t('存檔失敗：', 'Save failed: ') + (e.message || e) + t(' —— 可改用 ⋯ 選單「匯出 JSON」', ' — try "Export JSON" in the ⋯ menu'), true);
      /* 絕不假報 synced：lastFileJson 未更新，指示器停留 dirty */
    } finally {
      setSaving(false);
    }
  };
  const resolveConflict = useFile => {
    if (useFile) {
      const r = E.deserialize(conflict.fileJson);
      if (!r.ok) {
        toast(t('檔案內容無效：', 'Invalid file: ') + r.error, true);
        setConflict(null);
        return;
      }
      setDoc(d => ({
        ...d,
        rules: r.data.rules,
        config: r.data.config,
        scenarios: r.data.scenarios,
        templateIds: []
      }));
      setLastFileJson(conflict.fileJson);
      toast(t('已載入檔案版', 'Loaded the file version'));
    } else {
      setLastFileJson(null); /* 草稿與檔案分歧，以草稿續作；存檔時覆寫 */
      toast(t('保留目前草稿——記得按存檔覆寫檔案', 'Kept current draft — remember to Save to overwrite the file'));
    }
    setConflict(null);
  };

  /* ── 匯入/匯出 ── */
  const doImport = async file => {
    const text = await file.text();
    const r = E.deserialize(text);
    if (!r.ok) {
      setImportErr(r.error);
      return;
    }
    setDoc({
      rules: r.data.rules,
      config: r.data.config,
      scenarios: r.data.scenarios,
      templateIds: []
    });
    setActiveId('base');
    toast(t('匯入成功：', 'Imported: ') + r.data.rules.length + t(' 條規則', ' rules'));
  };
  const exportCsv = () => {
    if (result.error || !result.points) return;
    download('timeline.csv', '﻿' + E.toTimelineCsv(result.points), 'text/csv');
    toast(t('已匯出 timeline.csv（可用 Excel 驗算）', 'Exported timeline.csv (check it in Excel)'));
  };
  const hasEnabled = eff.rules.some(r => r.enabled !== false);
  const hasIncome = doc.rules.some(r => r.type === 'income' && r.enabled !== false);
  const globalErr = validation.errors.filter(e => !e.ruleId).map(e => e.field + '：' + e.message).join('；') || null;
  const series = result.points ? [{
    name: activeScenario ? activeScenario.name : t('基準', 'Base'),
    points: result.points
  }, ...(compareSeries || [])] : null;
  const [analysisTab, setAnalysisTab] = useState('detail');
  const jumpTo = ym => {
    const year = ym.slice(0, 4);
    setAnalysisTab('detail');
    setExpandedYears(ys => ys.includes(year) ? ys : [...ys, year]);
    setTimeout(() => {
      const el = jumpRef.current[year];
      if (el) el.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 120);
  };
  return /*#__PURE__*/React.createElement("div", {
    onDragOver: e => e.preventDefault(),
    onDrop: e => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith('.json')) doImport(f);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-lg)',
      marginBottom: 'var(--sp-xl)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '1.25rem',
      margin: 0
    }
  }, t('資產推估工具', 'Asset Projection')), /*#__PURE__*/React.createElement("div", {
    className: "seg",
    style: {
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: lang === 'zh' ? 'on' : '',
    onClick: () => changeLang('zh')
  }, "\u4E2D"), /*#__PURE__*/React.createElement("button", {
    className: lang === 'en' ? 'on' : '',
    onClick: () => changeLang('en')
  }, "EN")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 280
    }
  }, /*#__PURE__*/React.createElement(ScenarioBar, {
    scenarios: doc.scenarios,
    activeId: activeId,
    comparing: comparing,
    compareIds: compareIds,
    warnings: scenarioWarnings,
    onSwitch: setActiveId,
    onCreate: () => createScenario(null),
    onRename: id => {
      const n = window.prompt(t('新名稱：', 'New name:'));
      if (n) setDoc(d => ({
        ...d,
        scenarios: d.scenarios.map(s => s.id === id ? {
          ...s,
          name: n
        } : s)
      }));
    },
    onDelete: id => {
      if (window.confirm(t('刪除此情境？', 'Delete this scenario?'))) {
        setDoc(d => ({
          ...d,
          scenarios: d.scenarios.filter(s => s.id !== id)
        }));
        if (activeId === id) setActiveId('base');
        setCompareIds(c => c.filter(x => x !== id));
      }
    },
    onToggleCompare: () => setComparing(c => !c),
    onPickCompare: id => setCompareIds(c => {
      if (c.includes(id)) return c.filter(x => x !== id);
      if (c.length >= 2) {
        toast(t('圖表最多同時顯示 3 條（含當前），請先取消一條', 'Chart shows at most 3 lines (incl. current); deselect one first'), true);
        return c;
      }
      return [...c, id];
    })
  })), /*#__PURE__*/React.createElement("button", {
    className: 'btn ' + (paramsOpen ? 'btn-primary' : 'btn-ghost'),
    title: t('全域參數（退休年月/安全水位/匯率…）', 'Global settings (retirement / safety line / FX…)'),
    onClick: () => setParamsOpen(o => !o)
  }, t('⚙ 參數', '⚙ Settings')), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(SyncBar, {
    syncState: syncState,
    lastSavedAt: lastSavedAt,
    daysSince: daysSince,
    saving: saving,
    fsapiOk: fsapiOk,
    onSave: doSave,
    onMenu: () => setMenuOpen(o => !o)
  }), menuOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '110%',
      right: 0,
      background: 'var(--c-surface)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--sh-modal)',
      padding: 'var(--sp-sm)',
      zIndex: 30,
      width: 200
    }
  }, [[t('匯出 JSON', 'Export JSON'), () => {
    download('rules.json', currentJson);
    toast(t('已匯出 rules.json', 'Exported rules.json'));
  }], [t('匯入 JSON', 'Import JSON'), () => fileInputRef.current.click()], [t('匯出逐月 CSV', 'Export monthly CSV'), exportCsv, !result.points]].map(([label, fn, dis]) => /*#__PURE__*/React.createElement("button", {
    key: label,
    disabled: dis,
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: 'var(--sp-sm) var(--sp-md)',
      borderRadius: 'var(--r-sm)',
      opacity: dis ? .4 : 1
    },
    onMouseEnter: e => e.target.style.background = 'var(--c-brand-subtle)',
    onMouseLeave: e => e.target.style.background = 'transparent',
    onClick: () => {
      setMenuOpen(false);
      fn();
    }
  }, label))), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    type: "file",
    accept: ".json",
    style: {
      display: 'none'
    },
    onChange: e => {
      if (e.target.files[0]) doImport(e.target.files[0]);
      e.target.value = '';
    }
  }))), /*#__PURE__*/React.createElement(HealthBanner, {
    analysis: result.analysis,
    error: result.error
  }), /*#__PURE__*/React.createElement("div", {
    className: 'layout' + (leftCollapsed ? ' left-collapsed' : '')
  }, leftCollapsed ? /*#__PURE__*/React.createElement("div", {
    className: "left-rail",
    onClick: () => setLeftCollapsed(false),
    title: t('展開規則清單', 'Expand rules')
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, "\u21E5"), /*#__PURE__*/React.createElement("span", {
    className: "rail-label"
  }, t('規則清單（', 'Rules ('), eff.rules.length, t('）', ')')), Object.keys(errorsByRule).length > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-danger)'
    }
  }, "\u26A0")) : /*#__PURE__*/React.createElement("div", {
    className: "left-col"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: 'var(--sp-xs)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-ghost btn",
    style: {
      padding: '2px 10px',
      fontSize: 12
    },
    onClick: () => setLeftCollapsed(true),
    title: t('收合規則清單，圖表吃滿寬度', 'Collapse rules; chart takes full width')
  }, t('⇤ 收合', '⇤ Collapse'))), /*#__PURE__*/React.createElement(RuleList, {
    rules: eff.rules,
    previews: previews,
    errorsByRule: errorsByRule,
    templateIds: doc.templateIds,
    scenarioOverrides: activeScenario ? activeScenario.ruleOverrides : null,
    config: eff.config,
    onChange: updateRule,
    onToggle: toggleRule,
    onDelete: deleteRule,
    onDuplicate: duplicateRule,
    onRestore: restoreRule,
    onAdd: addRule,
    onLoadTemplate: () => setDoc(buildTemplate(nowYm())),
    onEnsureFx: ensureFxRate,
    isBase: activeId === 'base',
    globalError: globalErr
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "stat-strip"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(StatChips, {
    analysis: result.analysis,
    baseAnalysis: baseAnalysis,
    comparing: activeId !== 'base' || comparing,
    onJumpTo: jumpTo
  })), /*#__PURE__*/React.createElement("button", {
    className: "pill",
    onClick: () => setPinChart(p => !p),
    title: pinChart ? t('取消固定：往下讀時圖表隨頁面捲走、閱讀區更大', 'Unpin: chart scrolls away as you read, more reading space') : t('固定圖表：往下讀時圖表保持可見，方便對照表格', 'Pin the chart: keep it visible while reading tables'),
    style: {
      border: '1px solid ' + (pinChart ? 'var(--c-brand)' : 'var(--c-border-strong)'),
      background: pinChart ? 'var(--c-brand-subtle)' : 'var(--c-surface)',
      color: pinChart ? 'var(--c-brand)' : 'var(--c-text-muted)',
      cursor: 'pointer',
      flex: 'none'
    }
  }, "\uD83D\uDCCC ", pinChart ? t('圖表已釘住', 'Chart pinned') : t('釘住圖表', 'Pin chart'))), /*#__PURE__*/React.createElement("div", {
    className: 'chart-wrap' + (pinChart ? ' pinned' : '')
  }, /*#__PURE__*/React.createElement(MainChart, {
    series: series,
    analysis: result.analysis,
    error: result.error,
    empty: !hasEnabled,
    onBandClick: jumpTo
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-xs)',
      margin: 'var(--sp-lg) 0 var(--sp-md)'
    }
  }, [['detail', t('壓力與明細', 'Stress & detail')], ['expense', t('支出分析', 'Expenses')], ['retire', t('退休試算', 'Retirement')], ['events', t('事件軸', 'Timeline')]].map(([k, label]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setAnalysisTab(k),
    style: {
      padding: '6px 16px',
      borderRadius: 'var(--r-md) var(--r-md) 0 0',
      fontWeight: 700,
      fontSize: 13,
      background: analysisTab === k ? 'var(--c-surface)' : 'transparent',
      color: analysisTab === k ? 'var(--c-brand)' : 'var(--c-text-muted)',
      borderBottom: analysisTab === k ? '2px solid var(--c-brand)' : '2px solid transparent'
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-lg)'
    }
  }, analysisTab === 'detail' && /*#__PURE__*/React.createElement(DrilldownTable, {
    years: result.years,
    error: result.error,
    empty: !hasEnabled,
    expandedYears: expandedYears,
    onToggleYear: y => setExpandedYears(ys => ys.includes(y) ? ys.filter(x => x !== y) : [...ys, y]),
    jumpRef: jumpRef
  }), analysisTab === 'expense' && /*#__PURE__*/React.createElement(ExpenseAnalysis, {
    points: result.points,
    rules: eff.rules,
    error: result.error,
    empty: !hasEnabled
  }), analysisTab === 'retire' && /*#__PURE__*/React.createElement(RetirementDashboard, {
    rules: eff.rules,
    config: eff.config,
    hasIncome: hasIncome,
    onSaveScenario: saveTrialAsScenario
  }), analysisTab === 'events' && result.analysis && /*#__PURE__*/React.createElement(EventTimeline, {
    events: result.analysis.events,
    startYm: eff.config.startMonth,
    months: eff.config.months
  })))), paramsOpen && !conflict && !importErr && /*#__PURE__*/React.createElement("div", {
    className: "modal-mask",
    onClick: () => setParamsOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal modal-scroll",
    onClick: e => e.stopPropagation(),
    style: {
      maxWidth: 600
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 'var(--sp-md)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 16
    }
  }, t('⚙ 全域參數', '⚙ Global settings')), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      marginLeft: 'auto',
      padding: '4px 12px',
      fontSize: 13
    },
    onClick: () => setParamsOpen(false)
  }, t('完成', 'Done'))), /*#__PURE__*/React.createElement(GlobalParamsPanel, {
    config: eff.config,
    onChange: updateConfig,
    errors: validation.errors,
    forceOpen: true,
    embedded: true
  }))), conflict && /*#__PURE__*/React.createElement("div", {
    className: "modal-mask"
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      marginTop: 0
    }
  }, t('檔案與草稿不一致', 'File and draft differ')), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--c-text-2)',
      fontSize: 13
    }
  }, t('rules.json 與此瀏覽器的工作草稿內容不同。請選擇要保留哪一份——另一份將被覆蓋，不會自動合併。', 'rules.json differs from this browser\'s working draft. Choose which to keep — the other is overwritten, no auto-merge.')), (() => {
    let fileRules = '?',
      fileScen = '?';
    try {
      const o = JSON.parse(conflict.fileJson);
      fileRules = (o.rules || []).length;
      fileScen = (o.scenarios || []).length;
    } catch (e) {}
    return /*#__PURE__*/React.createElement("table", {
      style: {
        fontSize: 12,
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null), /*#__PURE__*/React.createElement("th", null, t('檔案版', 'File')), /*#__PURE__*/React.createElement("th", null, t('目前草稿', 'Draft')))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, t('規則數', 'Rules')), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, fileRules), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, doc.rules.length)), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, t('情境數', 'Scenarios')), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, fileScen), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, doc.scenarios.length)), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, t('最後修改', 'Last modified')), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, conflict.fileMeta.modified), /*#__PURE__*/React.createElement("td", {
      className: "mono"
    }, t('此瀏覽器', 'this browser')))));
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-md)',
      marginTop: 'var(--sp-xl)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      flex: 1
    },
    onClick: () => resolveConflict(true)
  }, t('載入檔案版', 'Load file version')), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flex: 1
    },
    onClick: () => resolveConflict(false)
  }, t('以目前草稿為準', 'Keep current draft'))))), importErr && /*#__PURE__*/React.createElement("div", {
    className: "modal-mask",
    onClick: () => setImportErr(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      marginTop: 0,
      color: 'var(--c-danger)'
    }
  }, t('匯入失敗（現有資料未變動）', 'Import failed (your data is unchanged)')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--c-text-2)',
      maxHeight: 240,
      overflowY: 'auto',
      whiteSpace: 'pre-wrap'
    }
  }, importErr), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      marginTop: 'var(--sp-lg)'
    },
    onClick: () => setImportErr(null)
  }, t('知道了', 'Got it')))), /*#__PURE__*/React.createElement("div", {
    className: "toast-wrap"
  }, toasts.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "toast",
    style: t.danger ? {
      background: 'var(--c-danger-subtle)',
      color: 'var(--c-danger)'
    } : {}
  }, t.msg))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
