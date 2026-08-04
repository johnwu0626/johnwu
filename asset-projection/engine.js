// @ts-check
/**
 * engine.js — 資產推估工具純函式引擎
 *
 * 設計依據：handoff/consensus/asset-projection-tool/decision.md（2026/07/11 生效）
 * 管線四步：驗證規則 → 展開月度事件 → 逐月 ledger → 分析。
 * 鐵則：
 *  - 純函式，不碰 DOM / localStorage / fetch / Date.now（推估起點一律由 config 傳入）
 *  - 金額一律新台幣整數（每筆現金流 Math.round），投資市值內部保留浮點、輸出四捨五入
 *  - 投資市值與現金分離：未賣出的投資報酬不得補現金缺口
 *  - 貸款拆本金/利息，否則淨資產錯
 *  - 成長率/報酬率一律小數（3% = 0.03），UI 層自行轉換百分比
 *
 * 同檔支援瀏覽器 <script src> 與 Node require（UMD 式收尾），測試：node --test engine.test.js
 */
(function (globalScope, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.Engine = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';

  var SCHEMA_VERSION = 1;

  /**
   * @typedef {Object} LoanParams
   * @property {number} principal   本金（元）
   * @property {number} annualRate  年利率（小數，2.1% = 0.021）
   * @property {number} termMonths  期數（月）
   * @property {number} [assetValue] 貸款對應資產現值（如房價），自貸款起始月起計入淨資產；
   *                                 不隨時間增值（保守估計）。省略或 0 = 純負債（如信貸）。
   *
   * @typedef {Object} InvestParams
   * @property {number} annualReturn 假設年報酬率（小數）
   *
   * @typedef {Object} Rule
   * @property {string} id
   * @property {string} name
   * @property {'income'|'expense'|'invest'|'loan'} type
   * @property {string} [category]        分類（薪資/年終/稅金/房貸…），歸因用；預設同 name
   * @property {number} [amount]          金額；loan 型不使用（月付金由 loan 參數推得）
   * @property {'monthly'|'yearly'|'once'} [frequency]  loan 型不使用
   * @property {number} [month]           yearly/once 的發生月（1–12；once 為 startMonth 當月時可省略）
   * @property {string} startMonth        'YYYY-MM'
   * @property {string|null} [endMonth]   'YYYY-MM'；null = 至推估期末
   * @property {'retirement'|null} [endAnchor] 'retirement' = endMonth 連動 config.globalParams.retirementMonth
   * @property {number} [termYears]       年期：自 startMonth 起算 N 年（含首月，迄止 = startMonth + N*12 - 1 個月）。
   *                                      迄止優先序：endAnchor > termYears > endMonth；改 startMonth 時年期語意自動跟動
   * @property {string} [currency]        幣別代碼（'TWD' 預設；非 TWD 需 globalParams.fxRates 對應匯率，
   *                                       金額欄以該幣別填寫，引擎展開時以固定匯率換算回台幣整數；loan 型不支援）
   * @property {number} [annualGrowthRate]     逐年成長率（小數，可為負但 > -1）
   * @property {number} [growthAnchorMonth]    每年幾月套用新金額（1–12，預設 1）
   * @property {boolean} [enabled]             預設 true
   * @property {LoanParams} [loan]
   * @property {InvestParams} [invest]
   * @property {string} [note]
   *
   * @typedef {Object} SafetyConfig
   * @property {'multiple'|'fixed'} mode
   * @property {number} [multiple]     月必要支出倍數（mode=multiple，預設 6）
   * @property {number} [fixedAmount]  固定金額（mode=fixed）
   *
   * @typedef {Object} GlobalParams
   * @property {string|null} [retirementMonth] 'YYYY-MM'
   * @property {number} [inflationRate]        目前僅供 UI 顯示與範本引用 [推測用途]，引擎不隱式套用
   * @property {Object<string, number>} [fxRates] 匯率表：1 單位外幣 = N 台幣（如 {USD: 32.5}）。
   *                                              使用者維護的假設值（零外部請求，不接匯率 API）；全程固定，不模擬匯率波動
   *
   * @typedef {Object} Config
   * @property {string} startMonth        推估起點 'YYYY-MM'
   * @property {number} months            推估月數（如 360）
   * @property {number} openingCash       期初現金
   * @property {number} [openingInvest]   期初投資市值
   * @property {number} [openingInvestReturn] 期初投資市值的年報酬假設（小數，預設 0）
   * @property {GlobalParams} [globalParams]
   * @property {SafetyConfig} [safety]
   * @property {'continue'|'pause'} [dcaOnShortfall] 定期定額現金不足策略（預設 continue：照扣顯示負現金）
   * @property {number} [mediumStreakN]        連續淨流出幾個月列 Medium（預設 3）
   * @property {number} [upcomingWindowMonths] 前瞻預警視窗（預設 12）
   *
   * @typedef {Object} MonthPoint
   * @property {string} ym
   * @property {number} startCash
   * @property {number} income
   * @property {number} expense          一般支出（不含貸款、不含投資扣款）
   * @property {number} loanPayment
   * @property {number} loanInterest
   * @property {number} loanPrincipal
   * @property {number} investContribution
   * @property {number} endCash
   * @property {number} investValue
   * @property {number} loanBalance
   * @property {number} netWorth         endCash + investValue + loanAssets - loanBalance
   * @property {number} netFlow          income - expense - loanPayment（必要現金流，不含投資扣款）
   * @property {number} totalOutflow     expense + loanPayment（UI「支出」口徑的唯一來源；不含投資扣款）
   * @property {number} netCashChange    endCash - startCash（當月現金淨變動）
   * @property {number} safetyThreshold
   * @property {Object<string, number>} incomeByCategory
   * @property {Object<string, number>} outflowByCategory  含支出/貸款/投資扣款
   * @property {string[]} pausedDca      本月被暫停的定期定額 rule id（dcaOnShortfall='pause' 時）
   *
   * @typedef {Object} StressPoint
   * @property {string} ym
   * @property {'critical'|'high'|'medium'} severity
   * @property {number} endCash
   * @property {number} threshold
   * @property {{category: string, amount: number}[]} topContributors 當月前三大流出
   *
   * @typedef {Object} Scenario
   * @property {string} id
   * @property {string} name
   * @property {Object<string, Partial<Rule>>} [ruleOverrides]  ruleId → 欄位覆寫
   * @property {string[]} [disabledRuleIds]
   * @property {Partial<Config>} [configOverrides]  淺層合併；globalParams/safety 深一層合併
   */

  // ---------- 月份工具 ----------

  var YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

  /** @param {string} ym @returns {number} 絕對月序（year*12 + month-1） */
  function ymToIndex(ym) {
    var y = parseInt(ym.slice(0, 4), 10);
    var m = parseInt(ym.slice(5, 7), 10);
    return y * 12 + (m - 1);
  }

  /** @param {number} idx @returns {string} */
  function indexToYm(idx) {
    var y = Math.floor(idx / 12);
    var m = (idx % 12) + 1;
    return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0');
  }

  /** @param {number} idx @returns {number} 1–12 */
  function monthOfYear(idx) { return (idx % 12) + 1; }

  // ---------- 驗證（管線第 1 步） ----------

  var TYPES = ['income', 'expense', 'invest', 'loan'];
  var FREQS = ['monthly', 'yearly', 'once'];

  /**
   * @param {Rule[]} rules
   * @param {Config} config
   * @returns {{ok: boolean, errors: {ruleId: string|null, field: string, message: string}[]}}
   */
  function validate(rules, config) {
    /** @type {{ruleId: string|null, field: string, message: string}[]} */
    var errors = [];
    function err(ruleId, field, message) { errors.push({ ruleId: ruleId, field: field, message: message }); }

    if (!config || typeof config !== 'object') {
      err(null, 'config', 'config 缺失');
      return { ok: false, errors: errors };
    }
    if (!YM_RE.test(String(config.startMonth || ''))) err(null, 'config.startMonth', 'startMonth 須為 YYYY-MM');
    if (!(config.months > 0 && config.months <= 1200)) err(null, 'config.months', 'months 須為 1–1200');
    if (typeof config.openingCash !== 'number' || !isFinite(config.openingCash)) err(null, 'config.openingCash', 'openingCash 須為數字');
    var gp = config.globalParams || {};
    if (gp.retirementMonth != null && !YM_RE.test(gp.retirementMonth)) err(null, 'globalParams.retirementMonth', '須為 YYYY-MM');
    var safety = config.safety || { mode: 'multiple', multiple: 6 };
    if (safety.mode !== 'multiple' && safety.mode !== 'fixed') err(null, 'safety.mode', "須為 'multiple' 或 'fixed'");
    if (safety.mode === 'fixed' && !(typeof safety.fixedAmount === 'number' && safety.fixedAmount >= 0)) err(null, 'safety.fixedAmount', 'fixed 模式須給 fixedAmount ≥ 0');
    if (safety.mode === 'multiple' && safety.multiple != null && !(safety.multiple >= 0)) err(null, 'safety.multiple', 'multiple 須 ≥ 0');

    if (!Array.isArray(rules)) {
      err(null, 'rules', 'rules 須為陣列');
      return { ok: false, errors: errors };
    }

    var seen = {};
    rules.forEach(function (r) {
      if (!r || typeof r !== 'object') { err(null, 'rule', '規則須為物件'); return; }
      var id = r.id;
      if (!id || typeof id !== 'string') { err(null, 'id', '規則缺 id'); return; }
      if (seen[id]) err(id, 'id', 'id 重複：' + id + '（同名規則不得互相覆蓋）');
      seen[id] = true;

      if (TYPES.indexOf(r.type) < 0) err(id, 'type', '未知 type：' + r.type);
      if (!YM_RE.test(String(r.startMonth || ''))) err(id, 'startMonth', 'startMonth 須為 YYYY-MM');

      var endYm = resolveEndMonth(r, config);
      if (r.endMonth != null && !YM_RE.test(r.endMonth)) err(id, 'endMonth', 'endMonth 須為 YYYY-MM 或 null');
      if (endYm && YM_RE.test(String(r.startMonth || '')) && ymToIndex(endYm) < ymToIndex(r.startMonth)) {
        err(id, 'endMonth', 'endMonth (' + endYm + ') 早於 startMonth (' + r.startMonth + ')');
      }
      if (r.endAnchor === 'retirement' && !(gp.retirementMonth && YM_RE.test(gp.retirementMonth))) {
        err(id, 'endAnchor', "endAnchor='retirement' 但 globalParams.retirementMonth 未設定");
      }
      if (r.termYears != null && !(r.termYears >= 1 && r.termYears <= 100 && r.termYears === Math.floor(r.termYears))) {
        err(id, 'termYears', '年期須為 1–100 的整數');
      }

      if (r.currency != null && r.currency !== 'TWD') {
        if (r.type === 'loan') err(id, 'currency', '貸款規則僅支援台幣');
        else {
          var rate = (gp.fxRates || {})[r.currency];
          if (!(rate > 0)) err(id, 'currency', '幣別 ' + r.currency + ' 未在全域參數設定匯率（globalParams.fxRates）');
        }
      }
      if (r.annualGrowthRate != null && !(r.annualGrowthRate > -1)) err(id, 'annualGrowthRate', '成長率須 > -1（-100%）');
      if (r.growthAnchorMonth != null && !(r.growthAnchorMonth >= 1 && r.growthAnchorMonth <= 12)) err(id, 'growthAnchorMonth', '須為 1–12');

      if (r.type === 'loan') {
        var L = r.loan;
        if (!L) { err(id, 'loan', 'type=loan 須附 loan 參數'); }
        else {
          if (!(L.principal > 0)) err(id, 'loan.principal', '本金須 > 0');
          if (!(L.annualRate >= 0)) err(id, 'loan.annualRate', '年利率須 ≥ 0（小數）');
          if (L.annualRate >= 1) err(id, 'loan.annualRate', '年利率 ≥ 100%？請確認用小數（2.1% = 0.021）');
          if (!(L.termMonths > 0 && L.termMonths === Math.floor(L.termMonths))) err(id, 'loan.termMonths', '期數須為正整數');
          if (L.assetValue != null && !(L.assetValue >= 0)) err(id, 'loan.assetValue', '資產現值須 ≥ 0');
        }
      } else {
        if (!(typeof r.amount === 'number' && isFinite(r.amount) && r.amount >= 0)) err(id, 'amount', '金額須為 ≥ 0 的數字');
        if (FREQS.indexOf(r.frequency || '') < 0) err(id, 'frequency', '未知 frequency：' + r.frequency);
        if (r.frequency === 'yearly' && !(r.month >= 1 && r.month <= 12)) err(id, 'month', 'yearly 須指定發生月 1–12');
        if (r.type === 'invest') {
          if (!r.invest || typeof r.invest.annualReturn !== 'number') err(id, 'invest.annualReturn', 'type=invest 須附 invest.annualReturn（小數）');
          else if (!(r.invest.annualReturn > -1)) err(id, 'invest.annualReturn', '年報酬須 > -1');
        }
      }
    });
    return { ok: errors.length === 0, errors: errors };
  }

  /**
   * 規則迄止解析（優先序：endAnchor > termYears > endMonth）。
   * @param {Rule} r @param {Config} config @returns {string|null}
   */
  function resolveEndMonth(r, config) {
    if (r.endAnchor === 'retirement') {
      var gp = config.globalParams || {};
      return gp.retirementMonth || null;
    }
    if (r.termYears != null && YM_RE.test(String(r.startMonth || ''))) {
      return indexToYm(ymToIndex(r.startMonth) + r.termYears * 12 - 1);
    }
    return r.endMonth != null ? r.endMonth : null;
  }

  // ---------- 成長與貸款數學 ----------

  /**
   * 規則幣別 → 台幣匯率（TWD 或未設定 = 1）。驗證階段已保證非 TWD 幣別必有匯率。
   * @param {Rule} r @param {Config} config @returns {number}
   */
  function fxRate(r, config) {
    if (!r.currency || r.currency === 'TWD') return 1;
    return ((config.globalParams || {}).fxRates || {})[r.currency] || 1;
  }

  /**
   * 單筆外幣金額換算台幣（UI 顯示用的唯一換算來源；元件不得自行乘匯率）。
   * @param {number} amount @param {string|undefined} currency @param {Config} config @returns {number}
   */
  function convertToTwd(amount, currency, config) {
    return Math.round(amount * fxRate(/** @type {Rule} */({ currency: currency }), config));
  }

  /**
   * 成長倍率：自 startIdx 之後（不含當月），每經過一次 growthAnchorMonth 乘一次 (1+g)。
   * 語意＝「每年錨月全面調整」：不滿一年也在下個錨月調（新進人員跟著全公司調薪日）。
   * 例：2026-06 起、錨 1 月 → 2027-01 調；2026-01 起、錨 4 月 → 2026-04 即調。
   * @param {number} t 目標月 idx @param {number} startIdx @param {number} g @param {number} anchor 1–12
   */
  function growthFactor(t, startIdx, g, anchor) {
    if (!g) return 1;
    var crossings = 0;
    // 第一個 >= startIdx+1 的 anchor 月
    var first = startIdx + 1;
    var mo = monthOfYear(first);
    var diff = (anchor - mo + 12) % 12;
    var a = first + diff;
    if (a <= t) crossings = Math.floor((t - a) / 12) + 1;
    return Math.pow(1 + g, crossings);
  }

  /**
   * 等額本息月付金（元，四捨五入）。r=0 時為本金/期數。
   * @param {number} principal @param {number} annualRate @param {number} termMonths
   */
  function loanMonthlyPayment(principal, annualRate, termMonths) {
    var r = annualRate / 12;
    if (r === 0) return Math.round(principal / termMonths);
    return Math.round(principal * r / (1 - Math.pow(1 + r, -termMonths)));
  }

  /**
   * 攤還表（整數元；末期調整清零）。
   * @param {number} principal @param {number} annualRate @param {number} termMonths
   * @returns {{payment: number, interest: number, principalPaid: number, balance: number}[]}
   */
  function loanSchedule(principal, annualRate, termMonths) {
    var r = annualRate / 12;
    var pay = loanMonthlyPayment(principal, annualRate, termMonths);
    var bal = Math.round(principal);
    var rows = [];
    for (var k = 0; k < termMonths; k++) {
      var interest = Math.round(bal * r);
      var principalPaid, payment;
      if (k === termMonths - 1) {
        principalPaid = bal;               // 末期清零（容差以整數收斂）
        payment = bal + interest;
      } else {
        payment = pay;
        principalPaid = pay - interest;
        if (principalPaid > bal) { principalPaid = bal; payment = bal + interest; }
      }
      bal -= principalPaid;
      rows.push({ payment: payment, interest: interest, principalPaid: principalPaid, balance: bal });
      if (bal <= 0 && k < termMonths - 1) {
        // 提前收斂（利率極低或末期前已清），其餘期數為 0
        for (var j = k + 1; j < termMonths; j++) rows.push({ payment: 0, interest: 0, principalPaid: 0, balance: 0 });
        break;
      }
    }
    return rows;
  }

  // ---------- 展開 + 逐月 ledger（管線第 2、3 步） ----------

  /**
   * 主推估：project(rules, config) → MonthPoint[]
   * @param {Rule[]} rules @param {Config} config @returns {MonthPoint[]}
   */
  function project(rules, config) {
    var v = validate(rules, config);
    if (!v.ok) {
      var e = new Error('規則驗證失敗：' + v.errors.map(function (x) { return (x.ruleId ? x.ruleId + '.' : '') + x.field + ' — ' + x.message; }).join('；'));
      /** @type {any} */ (e).validationErrors = v.errors;
      throw e;
    }

    var start = ymToIndex(config.startMonth);
    var N = config.months;
    var dcaMode = config.dcaOnShortfall || 'continue';
    var active = rules.filter(function (r) { return r.enabled !== false; });

    // 貸款預計算
    var loans = {};
    active.forEach(function (r) {
      if (r.type === 'loan' && r.loan) {
        loans[r.id] = { schedule: loanSchedule(r.loan.principal, r.loan.annualRate, r.loan.termMonths), startIdx: ymToIndex(r.startMonth) };
      }
    });

    var cash = Math.round(config.openingCash);
    var investValue = (config.openingInvest || 0);
    var openMr = Math.pow(1 + (config.openingInvestReturn || 0), 1 / 12) - 1;

    // 各 invest 規則的月報酬與既有累積值（統一滾入 investValue，但報酬率各自套用 → 分桶）
    var investBuckets = { opening: { value: investValue, mr: openMr } };
    active.forEach(function (r) {
      if (r.type === 'invest') investBuckets[r.id] = { value: 0, mr: Math.pow(1 + r.invest.annualReturn, 1 / 12) - 1 };
    });

    /** @type {MonthPoint[]} */
    var points = [];

    for (var t = start; t < start + N; t++) {
      var ym = indexToYm(t);
      var startCash = cash;
      var income = 0, expense = 0, loanPayment = 0, loanInterest = 0, loanPrincipal = 0;
      /** @type {Object<string,number>} */ var incomeByCategory = {};
      /** @type {Object<string,number>} */ var outflowByCategory = {};
      /** @type {{rule: Rule, amount: number}[]} */ var dcaQueue = [];
      /** @type {string[]} */ var pausedDca = [];

      active.forEach(function (r) {
        var cat = r.category || r.name;
        if (r.type === 'loan') {
          var L = loans[r.id];
          var k = t - L.startIdx;
          if (k >= 0 && k < L.schedule.length) {
            var row = L.schedule[k];
            if (row.payment > 0) {
              loanPayment += row.payment; loanInterest += row.interest; loanPrincipal += row.principalPaid;
              outflowByCategory[cat] = (outflowByCategory[cat] || 0) + row.payment;
            }
          }
          return;
        }

        var sIdx = ymToIndex(r.startMonth);
        var endYm = resolveEndMonth(r, config);
        var eIdx = endYm ? ymToIndex(endYm) : Infinity;
        if (t < sIdx || t > eIdx) return;

        var occurs = false;
        if (r.frequency === 'monthly') occurs = true;
        else if (r.frequency === 'yearly') occurs = monthOfYear(t) === r.month;
        else if (r.frequency === 'once') occurs = t === (r.month ? ymToIndex(r.startMonth.slice(0, 4) + '-' + String(r.month).padStart(2, '0')) : sIdx);
        if (!occurs) return;

        var amt = Math.round(r.amount * fxRate(r, config) * growthFactor(t, sIdx, r.annualGrowthRate || 0, r.growthAnchorMonth || 1));
        if (r.type === 'income') {
          income += amt; incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amt;
        } else if (r.type === 'expense') {
          expense += amt; outflowByCategory[cat] = (outflowByCategory[cat] || 0) + amt;
        } else if (r.type === 'invest') {
          dcaQueue.push({ rule: r, amount: amt }); // 投資扣款最後結算（pause 判斷需先知現金）
        }
      });

      // 投資市值先按月報酬成長（期初值成長，扣款當月月底投入、當月不計報酬）
      Object.keys(investBuckets).forEach(function (k) {
        var b = investBuckets[k];
        b.value = b.value * (1 + b.mr);
      });

      var cashBeforeDca = startCash + income - expense - loanPayment;
      var investContribution = 0;
      dcaQueue.forEach(function (q) {
        var cat = q.rule.category || q.rule.name;
        if (dcaMode === 'pause' && cashBeforeDca - investContribution - q.amount < 0) {
          pausedDca.push(q.rule.id);
          return;
        }
        investContribution += q.amount;
        investBuckets[q.rule.id].value += q.amount;
        outflowByCategory[cat] = (outflowByCategory[cat] || 0) + q.amount;
      });

      cash = cashBeforeDca - investContribution;

      var totalInvest = 0;
      Object.keys(investBuckets).forEach(function (k) { totalInvest += investBuckets[k].value; });

      var loanBalance = 0, loanAssets = 0;
      active.forEach(function (r) {
        if (r.type !== 'loan' || !loans[r.id]) return;
        var L = loans[r.id];
        var k2 = t - L.startIdx;
        if (k2 < 0) loanBalance += Math.round(r.loan.principal);
        else if (k2 < L.schedule.length) loanBalance += L.schedule[k2].balance;
        // k2 >= length → 已清償，餘額 0
        if (k2 >= 0 && r.loan.assetValue) loanAssets += Math.round(r.loan.assetValue); // 資產自購入起持續存在
      });

      points.push({
        ym: ym,
        startCash: startCash,
        income: income,
        expense: expense,
        loanPayment: loanPayment,
        loanInterest: loanInterest,
        loanPrincipal: loanPrincipal,
        investContribution: investContribution,
        endCash: cash,
        investValue: Math.round(totalInvest),
        loanBalance: loanBalance,
        netWorth: cash + Math.round(totalInvest) + loanAssets - loanBalance,
        netFlow: income - expense - loanPayment,
        totalOutflow: expense + loanPayment,
        netCashChange: cash - startCash,
        safetyThreshold: 0, // 第二遍補
        incomeByCategory: incomeByCategory,
        outflowByCategory: outflowByCategory,
        pausedDca: pausedDca
      });
    }

    fillSafetyThreshold(points, config);
    return points;
  }

  /**
   * 安全水位（第二遍）：
   *  - fixed：固定金額
   *  - multiple：倍數 ×「未來 12 個月（含當月，期末截斷）的平均必要月流出」；必要流出 = expense + loanPayment（不含投資扣款）
   * @param {MonthPoint[]} points @param {Config} config
   */
  function fillSafetyThreshold(points, config) {
    var safety = config.safety || { mode: 'multiple', multiple: 6 };
    if (safety.mode === 'fixed') {
      points.forEach(function (p) { p.safetyThreshold = Math.round(safety.fixedAmount || 0); });
      return;
    }
    var mult = safety.multiple != null ? safety.multiple : 6;
    for (var i = 0; i < points.length; i++) {
      var sum = 0, n = 0;
      for (var j = i; j < Math.min(i + 12, points.length); j++) { sum += points[j].expense + points[j].loanPayment; n++; }
      points[i].safetyThreshold = n ? Math.round(mult * sum / n) : 0;
    }
  }

  // ---------- 分析（管線第 4 步） ----------

  /**
   * @param {MonthPoint[]} points
   * @param {Config} config
   * @param {Rule[]} [rules] 供事件時間軸使用（可省略）
   */
  function analyze(points, config, rules) {
    var streakN = config.mediumStreakN != null ? config.mediumStreakN : 3;
    var windowM = config.upcomingWindowMonths != null ? config.upcomingWindowMonths : 12;

    // medium 連續淨流出標記
    var mediumFlag = new Array(points.length).fill(false);
    var run = 0;
    for (var i = 0; i < points.length; i++) {
      run = points[i].netFlow < 0 ? run + 1 : 0;
      if (run >= streakN) for (var j = i - run + 1; j <= i; j++) mediumFlag[j] = true;
    }

    /** @type {StressPoint[]} */
    var stressPoints = [];
    points.forEach(function (p, idx) {
      var severity = null;
      if (p.endCash < 0) severity = 'critical';
      else if (p.endCash < p.safetyThreshold) severity = 'high';
      else if (mediumFlag[idx]) severity = 'medium';
      if (!severity) return;
      stressPoints.push({
        ym: p.ym,
        severity: severity,
        endCash: p.endCash,
        threshold: p.safetyThreshold,
        topContributors: topOutflows(p, 3)
      });
    });

    var minCash = null, firstStress = null, firstBelow = null;
    points.forEach(function (p) {
      if (!minCash || p.endCash < minCash.value) minCash = { ym: p.ym, value: p.endCash };
      if (!firstBelow && (p.endCash < p.safetyThreshold)) firstBelow = p.ym;
    });
    if (stressPoints.length) firstStress = stressPoints[0];

    // 前瞻預警：推估起點起 windowM 個月內首次低於安全水位
    var upcoming = null;
    if (firstBelow) {
      var away = ymToIndex(firstBelow) - ymToIndex(points[0].ym);
      if (away >= 0 && away <= windowM) upcoming = { ym: firstBelow, monthsAway: away };
    }

    // 事件時間軸
    /** @type {{ym: string, kind: string, label: string}[]} */
    var events = [];
    var gp = (config.globalParams || {});
    if (gp.retirementMonth) {
      var rIdx = ymToIndex(gp.retirementMonth);
      var s0 = ymToIndex(points[0].ym), s1 = ymToIndex(points[points.length - 1].ym);
      if (rIdx >= s0 && rIdx <= s1) events.push({ ym: gp.retirementMonth, kind: 'retirement', label: '退休' });
    }
    (rules || []).forEach(function (r) {
      if (r.enabled === false) return;
      if (r.type === 'loan' && r.loan) {
        var payoffIdx = ymToIndex(r.startMonth) + r.loan.termMonths - 1;
        var a = ymToIndex(points[0].ym), b = ymToIndex(points[points.length - 1].ym);
        if (payoffIdx >= a && payoffIdx <= b) events.push({ ym: indexToYm(payoffIdx), kind: 'loan-paid-off', label: r.name + ' 繳清' });
      }
      if (r.type !== 'loan' && r.frequency === 'once') {
        events.push({ ym: r.month ? r.startMonth.slice(0, 4) + '-' + String(r.month).padStart(2, '0') : r.startMonth, kind: 'one-time', label: r.name });
      }
    });
    // DCA 暫停區間
    var pauseStart = null;
    points.forEach(function (p, idx) {
      var paused = p.pausedDca.length > 0;
      if (paused && pauseStart == null) pauseStart = p.ym;
      var last = idx === points.length - 1;
      if ((!paused || last) && pauseStart != null) {
        var endYm2 = paused && last ? p.ym : points[idx - 1].ym;
        events.push({ ym: pauseStart, kind: 'dca-paused', label: '定期定額暫停 ' + pauseStart + '〜' + endYm2 });
        pauseStart = null;
      }
    });
    events.sort(function (a, b) { return ymToIndex(a.ym) - ymToIndex(b.ym); });

    var below = points.filter(function (p) { return p.endCash < p.safetyThreshold; }).length;

    return {
      stressPoints: stressPoints,
      firstStress: firstStress,              // {ym, severity, endCash, threshold, topContributors} | null
      minCash: minCash,                      // {ym, value}
      maxShortfall: minCash && minCash.value < 0 ? -minCash.value : 0,
      monthsBelowThreshold: below,
      upcoming: upcoming,                    // {ym, monthsAway} | null
      events: events,
      endNetWorth: points.length ? points[points.length - 1].netWorth : 0
    };
  }

  /** @param {MonthPoint} p @param {number} n */
  function topOutflows(p, n) {
    return Object.keys(p.outflowByCategory)
      .map(function (c) { return { category: c, amount: p.outflowByCategory[c] }; })
      .sort(function (a, b) { return b.amount - a.amount; })
      .slice(0, n);
  }

  // ---------- 情境（what-if） ----------

  /**
   * 情境套用：基準 + 差異 overlay（decision.md #A：覆寫集中在 Scenario 物件）。
   * 懸空引用不丟例外：收進 warnings，該條覆寫失效。
   * @param {Rule[]} rules @param {Config} config @param {Scenario} scenario
   * @returns {{rules: Rule[], config: Config, warnings: string[]}}
   */
  function applyScenario(rules, config, scenario) {
    /** @type {string[]} */ var warnings = [];
    var byId = {};
    rules.forEach(function (r) { byId[r.id] = true; });

    var ro = (scenario && scenario.ruleOverrides) || {};
    Object.keys(ro).forEach(function (id) {
      if (!byId[id]) warnings.push('情境「' + scenario.name + '」引用的規則已刪除：' + id + '（該條覆寫已失效）');
    });
    (scenario && scenario.disabledRuleIds || []).forEach(function (id) {
      if (!byId[id]) warnings.push('情境「' + scenario.name + '」停用的規則已刪除：' + id);
    });

    var newRules = rules.map(function (r) {
      var out = shallowClone(r);
      var ov = ro[r.id];
      if (ov) {
        Object.keys(ov).forEach(function (k) {
          if (k === 'loan' || k === 'invest') out[k] = Object.assign({}, r[k] || {}, ov[k]);
          else out[k] = ov[k];
        });
      }
      if (scenario && scenario.disabledRuleIds && scenario.disabledRuleIds.indexOf(r.id) >= 0) out.enabled = false;
      return out;
    });

    var newConfig = shallowClone(config);
    var co = (scenario && scenario.configOverrides) || {};
    Object.keys(co).forEach(function (k) {
      if (k === 'globalParams' || k === 'safety') newConfig[k] = Object.assign({}, config[k] || {}, co[k]);
      else newConfig[k] = co[k];
    });

    return { rules: newRules, config: newConfig, warnings: warnings };
  }

  function shallowClone(o) { return Object.assign({}, o); }

  // ---------- 單規則預覽（規則卡「即時展開預覽」的唯一計算來源） ----------

  /**
   * @param {Rule} rule @param {Config} config
   * @returns {{kind: string, monthlyPayment?: number, totalInterest?: number, totalOverHorizon?: number, projectedValue?: number, totalContribution?: number, amount?: number, occurrences?: number}}
   */
  function previewRule(rule, config) {
    if (rule.type === 'loan' && rule.loan) {
      var sched = loanSchedule(rule.loan.principal, rule.loan.annualRate, rule.loan.termMonths);
      var ti = 0; sched.forEach(function (r) { ti += r.interest; });
      return { kind: 'loan', monthlyPayment: sched.length ? sched[0].payment : 0, totalInterest: ti };
    }
    var single = [Object.assign({}, rule, { enabled: true })];
    var pts = project(single, Object.assign({}, config, { openingCash: 0, openingInvest: 0 }));
    if (rule.type === 'invest') {
      var last = pts[pts.length - 1];
      var contrib = 0; pts.forEach(function (p) { contrib += p.investContribution; });
      return { kind: 'invest', totalContribution: contrib, projectedValue: last ? last.investValue : 0 };
    }
    var total = 0, occ = 0;
    pts.forEach(function (p) {
      var v = rule.type === 'income' ? p.income : p.expense;
      if (v > 0) occ++;
      total += v;
    });
    if (rule.frequency === 'once') return { kind: 'once', amount: rule.amount };
    return { kind: rule.type, totalOverHorizon: total, occurrences: occ };
  }

  // ---------- 退休搜尋（退休達標儀表） ----------

  /**
   * 最早可退休年月：二分搜尋最小的 retirementMonth，使推估全程無 critical 壓力點。
   * 單調性依據：越晚退休 → 累積越多、退休後負擔期越短 → 可行性單調遞增。
   * 依賴規則使用 endAnchor='retirement'（薪資等在退休停止）。
   * @param {Rule[]} rules @param {Config} config
   * @param {{minYm?: string, maxYm?: string}} [opts] 預設搜尋範圍 = 推估起點+12 〜 期末
   * @returns {string|null} 'YYYY-MM'；連推估期末退休都不可行時 null
   */
  function findEarliestRetirement(rules, config, opts) {
    var lo = ymToIndex((opts && opts.minYm) || indexToYm(ymToIndex(config.startMonth) + 12));
    var hi = ymToIndex((opts && opts.maxYm) || indexToYm(ymToIndex(config.startMonth) + config.months - 1));
    function feasible(idx) {
      var cfg = Object.assign({}, config, { globalParams: Object.assign({}, config.globalParams || {}, { retirementMonth: indexToYm(idx) }) });
      var pts = project(rules, cfg);
      // 只看「退休當月起」的現金是否見底——退休後靠既有現金支應（本引擎不自動賣出投資變現）。
      // 退休前（工作期間）的現金週轉屬另一議題，由壓力分析/橫幅呈現，不在此擋退休可行性。
      for (var i = 0; i < pts.length; i++) {
        if (ymToIndex(pts[i].ym) >= idx && pts[i].endCash < 0) return false;
      }
      return true;
    }
    if (!feasible(hi)) return null;
    while (lo < hi) {
      var mid = Math.floor((lo + hi) / 2);
      if (feasible(mid)) hi = mid; else lo = mid + 1;
    }
    return indexToYm(lo);
  }

  // ---------- 序列化 ----------

  /**
   * @param {{rules: Rule[], config: Config, scenarios?: Scenario[]}} data
   * @returns {string} JSON 字串（正本檔格式）
   */
  function serialize(data) {
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      rules: data.rules,
      config: data.config,
      scenarios: data.scenarios || []
    }, null, 2);
  }

  /**
   * 匯入：版本不相容明確報錯，不靜默失敗。
   * @param {string} json
   * @returns {{ok: true, data: {rules: Rule[], config: Config, scenarios: Scenario[]}} | {ok: false, error: string}}
   */
  function deserialize(json) {
    var obj;
    try { obj = JSON.parse(json); } catch (e) { return { ok: false, error: 'JSON 解析失敗：' + /** @type {Error} */(e).message }; }
    if (!obj || typeof obj !== 'object') return { ok: false, error: '檔案內容不是物件' };
    if (obj.schemaVersion !== SCHEMA_VERSION) {
      return { ok: false, error: '資料版本不相容：檔案為 v' + obj.schemaVersion + '，本引擎支援 v' + SCHEMA_VERSION };
    }
    var v = validate(obj.rules, obj.config);
    if (!v.ok) return { ok: false, error: '匯入資料驗證失敗：' + v.errors.map(function (x) { return (x.ruleId ? x.ruleId + '.' : '') + x.field + ' — ' + x.message; }).join('；') };
    return { ok: true, data: { rules: obj.rules, config: obj.config, scenarios: obj.scenarios || [] } };
  }

  /**
   * 年度小計（鑽取表格的資料來源；元件不得自行加總）。
   * @param {MonthPoint[]} points
   * @returns {{year: string, income: number, expense: number, loanPayment: number, totalOutflow: number, investContribution: number, netCashChange: number, endCash: number, endNetWorth: number, months: MonthPoint[], worstSeverity: string|null}[]}
   */
  function yearlySummary(points) {
    /** @type {Object<string, any>} */ var byYear = {};
    /** @type {string[]} */ var order = [];
    points.forEach(function (p) {
      var y = p.ym.slice(0, 4);
      if (!byYear[y]) { byYear[y] = { year: y, income: 0, expense: 0, loanPayment: 0, totalOutflow: 0, investContribution: 0, netCashChange: 0, endCash: 0, endNetWorth: 0, months: [], worstSeverity: null }; order.push(y); }
      var Y = byYear[y];
      Y.income += p.income; Y.expense += p.expense; Y.loanPayment += p.loanPayment; Y.totalOutflow += p.totalOutflow; Y.investContribution += p.investContribution;
      Y.netCashChange += p.endCash - p.startCash;
      Y.endCash = p.endCash; Y.endNetWorth = p.netWorth;
      Y.months.push(p);
      var sev = p.endCash < 0 ? 'critical' : (p.endCash < p.safetyThreshold ? 'high' : null);
      var rank = { critical: 2, high: 1 };
      if (sev && (!Y.worstSeverity || rank[sev] > rank[Y.worstSeverity])) Y.worstSeverity = sev;
    });
    return order.map(function (y) { return byYear[y]; });
  }

  /**
   * 支出結構分析（分類彙總；元件不得自行加總——圖表與排行表的唯一資料來源）。
   * @param {MonthPoint[]} points
   * @param {Rule[]} rules  用於分類→型別對映（判斷投資扣款）
   * @param {{includeInvest?: boolean, topN?: number}} [opts] includeInvest 預設 false；topN 預設 8，其餘併入「其他」
   * @returns {{years: string[], categories: {category: string, type: string, total: number, monthlyAvg: number, share: number, byYear: Object<string,number>}[], yearRows: Object<string,number|string>[], totalAll: number}}
   *          yearRows 每列含 year、各分類金額與 __total（該年合計），可直接餵堆疊圖
   */
  function categoryBreakdown(points, rules, opts) {
    opts = opts || {};
    var includeInvest = opts.includeInvest === true;
    var topN = opts.topN || 8;
    /** @type {Object<string,string>} */ var catType = {};
    (rules || []).forEach(function (r) {
      var c = r.category || r.name;
      if (!catType[c]) catType[c] = r.type;
    });
    /** @type {Object<string,number>} */ var totals = {};
    /** @type {Object<string,Object<string,number>>} */ var byYear = {};
    /** @type {string[]} */ var years = [];
    points.forEach(function (p) {
      var y = p.ym.slice(0, 4);
      if (years[years.length - 1] !== y) years.push(y);
      Object.keys(p.outflowByCategory).forEach(function (c) {
        if (!includeInvest && catType[c] === 'invest') return;
        totals[c] = (totals[c] || 0) + p.outflowByCategory[c];
        (byYear[c] = byYear[c] || {})[y] = ((byYear[c] || {})[y] || 0) + p.outflowByCategory[c];
      });
    });
    var cats = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });
    var head = cats.slice(0, topN), tail = cats.slice(topN);
    if (tail.length) {
      totals['其他'] = 0; byYear['其他'] = {};
      tail.forEach(function (c) {
        totals['其他'] += totals[c];
        Object.keys(byYear[c]).forEach(function (y2) { byYear['其他'][y2] = (byYear['其他'][y2] || 0) + byYear[c][y2]; });
        delete totals[c]; delete byYear[c];
      });
      head.push('其他');
    }
    var totalAll = 0;
    head.forEach(function (c) { totalAll += totals[c]; });
    var categories = head.map(function (c) {
      return {
        category: c,
        type: c === '其他' ? 'mixed' : (catType[c] || 'expense'),
        total: totals[c],
        monthlyAvg: points.length ? Math.round(totals[c] / points.length) : 0,
        share: totalAll ? totals[c] / totalAll : 0,
        byYear: byYear[c]
      };
    });
    var yearRows = years.map(function (y) {
      /** @type {Object<string,number|string>} */ var row = { year: y, __total: 0 };
      head.forEach(function (c) {
        var v = (byYear[c] || {})[y] || 0;
        row[c] = v;
        row.__total = /** @type {number} */(row.__total) + v;
      });
      return row;
    });
    return { years: years, categories: categories, yearRows: yearRows, totalAll: totalAll };
  }

  /**
   * timeline.csv 匯出（Excel 驗算通道；UTF-8 BOM 由 UI 層加）。
   * @param {MonthPoint[]} points @returns {string}
   */
  function toTimelineCsv(points) {
    var head = ['month', 'startCash', 'income', 'expense', 'loanPayment', 'loanInterest', 'loanPrincipal', 'investContribution', 'endCash', 'investValue', 'loanBalance', 'netWorth', 'safetyThreshold'];
    var lines = [head.join(',')];
    points.forEach(function (p) {
      lines.push([p.ym, p.startCash, p.income, p.expense, p.loanPayment, p.loanInterest, p.loanPrincipal, p.investContribution, p.endCash, p.investValue, p.loanBalance, p.netWorth, p.safetyThreshold].join(','));
    });
    return lines.join('\r\n');
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    ymToIndex: ymToIndex,
    indexToYm: indexToYm,
    validate: validate,
    resolveEndMonth: resolveEndMonth,
    convertToTwd: convertToTwd,
    growthFactor: growthFactor,
    loanMonthlyPayment: loanMonthlyPayment,
    loanSchedule: loanSchedule,
    project: project,
    analyze: analyze,
    applyScenario: applyScenario,
    previewRule: previewRule,
    findEarliestRetirement: findEarliestRetirement,
    serialize: serialize,
    deserialize: deserialize,
    yearlySummary: yearlySummary,
    categoryBreakdown: categoryBreakdown,
    toTimelineCsv: toTimelineCsv
  };
});
