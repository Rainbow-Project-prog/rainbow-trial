/* ==========================================================================
 * Rainbow Trial — data/scenarios.js
 * Day1〜Day3 の30シグナル分のシナリオデータ。
 * メタ情報(直接記述)+ チャートデータ(自動生成)で構築される。
 *
 * 公開グローバル:
 *   window.SCENARIOS         — { day1: [...], day2: [...], day3: [...] }
 *   window.ScenarioUtil      — 便利関数群
 *   window.PAIR_CONFIG       — 通貨ペア別設定
 *
 * シグナル分布(30件):
 *   - USD/JPY 15 / BTC/USD 15
 *   - 条件OK 18件(勝率約89%) / 条件NG 12件(勝率約42%)
 *   - レアリティ:
 *       Day1: normal 7 / good 2 / rare 1
 *       Day2: normal 6 / good 3 / rare 1
 *       Day3: normal 5 / good 3 / rare 1 / epic 1
 *
 * 配信時刻スケジュール(各Day共通、起動からの相対分数):
 *   1, 2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5 時間後
 *   = 60, 150, 240, 330, 420, 510, 600, 690, 780, 870 分後
 *
 * テストモード時は signals.js 側で 1 分間隔に圧縮される(データは本番値を保持)
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 0. 通貨ペア別の設定
   * -------------------------------------------------------------------------- */
  // pipSize   : 1pip(または1ポイント)に相当する価格幅
  // pipValue  : 1pipあたりの損益(JPY、当該ロット想定)
  // lotSize   : 推奨ロット(疑似表示用)
  // decimals  : 価格の小数点以下桁数
  // volatility: チャート生成時の 1 本あたりの揺らぎ基準(価格単位)
  const PAIR_CONFIG = {
    USDJPY: {
      pipSize: 0.01,
      pipValue: 300,      // 0.3 lot 想定: 0.01 × 30,000 = 300 JPY/pip
      lotSize: 0.3,
      decimals: 3,
      volatility: 0.065,
      candleMinutes: 15,  // 1本 = 15分
      labelStart: [8, 0]  // 最初のローソクを 08:00 起点として表示
    },
    BTCUSD: {
      pipSize: 1.0,       // 1 pip = $1
      pipValue: 45,       // 0.3 BTC × $1 × 150 JPY/USD ≈ 45 JPY/pip
      lotSize: 0.3,       // USDJPY と同スケール(0.3 BTC ≒ $19,500 notional)
      decimals: 1,
      volatility: 95,
      candleMinutes: 15,
      labelStart: [8, 0]
    }
  };

  /* --------------------------------------------------------------------------
   * 1. シード付き PRNG (mulberry32)
   *    各シグナルが常に同じチャートを生成するための決定論的乱数生成器
   * -------------------------------------------------------------------------- */
  function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --------------------------------------------------------------------------
   * 2. 時刻ラベル生成
   * -------------------------------------------------------------------------- */
  function formatTimeLabel(index, pair) {
    const conf = PAIR_CONFIG[pair];
    const [sh, sm] = conf.labelStart;
    const total = sh * 60 + sm + index * conf.candleMinutes;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  /* --------------------------------------------------------------------------
   * 3. チャートデータ自動生成
   *    - 130 本を内部生成して末尾 50 本を表示(MA80 のウォームアップ用)
   *    - 条件 (ok/ng) と方向 (long/short) に応じて MA 配置を整える
   * -------------------------------------------------------------------------- */
  function generateChart(meta) {
    const conf = PAIR_CONFIG[meta.pair];
    const rng = mulberry32(meta.id * 9973 + 1);
    const total = 130;
    const show = 50;
    const isOk = meta.chartCondition === 'ok';
    const isLong = meta.direction === 'long';

    // トレンド方向(OK時は方向に強い傾斜、NG時は弱い/ランダム)
    const trendSign = isOk ? (isLong ? 1 : -1) : (rng() - 0.5 > 0 ? 1 : -1);
    const trendStrength = isOk ? conf.volatility * 0.11 : conf.volatility * 0.035;

    // 末尾を meta.entry に合わせるため、起点をバックキャストで算出
    const totalDrift = total * trendSign * trendStrength;
    let price = meta.entry - totalDrift;

    const closes = new Array(total);
    const opens = new Array(total);
    const highs = new Array(total);
    const lows = new Array(total);

    for (let i = 0; i < total; i++) {
      const drift = trendSign * trendStrength;
      const noise = (rng() - 0.5) * conf.volatility * 1.9;
      const o = price;
      let c = o + drift + noise;

      // 終端に近いローソクは entry に収束するよう補正
      if (i >= total - 6) {
        const pull = (total - 1 - i) / 6;     // 0..1
        c = c * pull + meta.entry * (1 - pull);
      }
      const h = Math.max(o, c) + rng() * conf.volatility * 0.65;
      const l = Math.min(o, c) - rng() * conf.volatility * 0.65;

      opens[i] = o;
      closes[i] = c;
      highs[i] = h;
      lows[i] = l;
      price = c;
    }

    // 最終バーの close を entry ピッタリに調整
    const lastIdx = total - 1;
    closes[lastIdx] = meta.entry;
    highs[lastIdx] = Math.max(highs[lastIdx], meta.entry);
    lows[lastIdx] = Math.min(lows[lastIdx], meta.entry);

    // 移動平均の計算 (単純移動平均)
    const ma20 = new Array(total);
    const ma80 = new Array(total);
    for (let i = 0; i < total; i++) {
      ma20[i] = sma(closes, i, 20);
      ma80[i] = sma(closes, i, 80);
    }

    // 末尾の MA 位置を「条件を満たす/満たさない」よう最終調整
    const gap = conf.volatility * (meta.pair === 'USDJPY' ? 3.5 : 2.8);
    const lastClose = closes[lastIdx];
    if (isOk) {
      if (isLong) {
        // ロング条件: close > MA20 > MA80(すべて close 以下)
        ma20[lastIdx] = Math.min(ma20[lastIdx], lastClose - gap);
        ma80[lastIdx] = Math.min(ma80[lastIdx], ma20[lastIdx] - gap);
      } else {
        // ショート条件: close < MA20 < MA80(すべて close 以上)
        ma20[lastIdx] = Math.max(ma20[lastIdx], lastClose + gap);
        ma80[lastIdx] = Math.max(ma80[lastIdx], ma20[lastIdx] + gap);
      }
    } else {
      // NG: 3パターンのうちシグナル ID に応じて選択
      const scenario = meta.id % 3;
      if (scenario === 0) {
        // MA20 が close の上、MA80 が close の下(挟まれる)
        ma20[lastIdx] = lastClose + gap;
        ma80[lastIdx] = lastClose - gap;
      } else if (scenario === 1) {
        // 両MAとも方向と逆側に位置
        if (isLong) {
          ma20[lastIdx] = lastClose + gap;
          ma80[lastIdx] = lastClose + gap * 2;
        } else {
          ma20[lastIdx] = lastClose - gap;
          ma80[lastIdx] = lastClose - gap * 2;
        }
      } else {
        // MA20 / MA80 の順序が逆(MA80 が上、MA20 が下 など)
        if (isLong) {
          ma80[lastIdx] = lastClose - gap * 0.4;
          ma20[lastIdx] = lastClose - gap * 2.2;
        } else {
          ma80[lastIdx] = lastClose + gap * 0.4;
          ma20[lastIdx] = lastClose + gap * 2.2;
        }
      }
    }

    // 手前数本を滑らかにブレンド
    for (let k = 1; k <= 6; k++) {
      const idx = lastIdx - k;
      if (idx < 0) break;
      const t = k / 7;
      ma20[idx] = ma20[idx] * t + ma20[lastIdx] * (1 - t);
      ma80[idx] = ma80[idx] * t + ma80[lastIdx] * (1 - t);
    }

    // 表示範囲(末尾 50 本)を切り出し + 桁丸め
    const d = conf.decimals;
    const out = {
      candles: [],
      ma20: [],
      ma80: []
    };
    const startShow = total - show;
    for (let i = startShow; i < total; i++) {
      const idx = i - startShow;
      out.candles.push({
        time: formatTimeLabel(idx, meta.pair),
        o: round(opens[i], d),
        h: round(highs[i], d),
        l: round(lows[i], d),
        c: round(closes[i], d)
      });
      out.ma20.push(round(ma20[i], d));
      out.ma80.push(round(ma80[i], d));
    }
    return out;
  }

  function sma(arr, upto, period) {
    const start = Math.max(0, upto - period + 1);
    let sum = 0;
    let count = 0;
    for (let k = start; k <= upto; k++) {
      sum += arr[k];
      count++;
    }
    return sum / count;
  }

  function round(v, d) {
    const f = Math.pow(10, d);
    return Math.round(v * f) / f;
  }

  /* --------------------------------------------------------------------------
   * 4. シグナルメタデータ(30件、手書き)
   *    relativeTime は起動からの経過分(Day1 0:00 起点)
   *    Day1:    60,  150,  240,  330,  420,  510,  600,  690,  780,  870
   *    Day2:  1500, 1590, 1680, 1770, 1860, 1950, 2040, 2130, 2220, 2310
   *    Day3:  2940, 3030, 3120, 3210, 3300, 3390, 3480, 3570, 3660, 3750
   * -------------------------------------------------------------------------- */
  const SIGNAL_META = [
    /* ---- Day 1 --------------------------------------------------------- */
    { id: 1,  day: 1, number: 1247, relativeTime:   60,
      pair: 'USDJPY', direction: 'long',  entry: 154.230, tp: 154.580, sl: 154.080,
      rarity: 'normal', chartCondition: 'ok',  result: 'tp_hit', duration: 7200 },

    { id: 2,  day: 1, number: 1248, relativeTime:  150,
      pair: 'BTCUSD', direction: 'short', entry: 66820.0, tp: 66500.0, sl: 66970.0,
      rarity: 'normal', chartCondition: 'ok',  result: 'tp_hit', duration: 6000 },

    { id: 3,  day: 1, number: 1249, relativeTime:  240,
      pair: 'USDJPY', direction: 'short', entry: 157.420, tp: 157.120, sl: 157.570,
      rarity: 'good',   chartCondition: 'ok',  result: 'tp_hit', duration: 7200 },

    { id: 4,  day: 1, number: 1250, relativeTime:  330,
      pair: 'BTCUSD', direction: 'long',  entry: 65230.0, tp: 65680.0, sl: 65030.0,
      rarity: 'normal', chartCondition: 'ng', result: 'tp_hit', duration: 7800 },

    { id: 5,  day: 1, number: 1251, relativeTime:  420,
      pair: 'USDJPY', direction: 'long',  entry: 155.830, tp: 156.180, sl: 155.680,
      rarity: 'normal', chartCondition: 'ok',  result: 'sl_hit', duration: 6600 },

    { id: 6,  day: 1, number: 1252, relativeTime:  510,
      pair: 'BTCUSD', direction: 'long',  entry: 67320.0, tp: 67740.0, sl: 67170.0,
      rarity: 'rare',   chartCondition: 'ok',  result: 'tp_hit', duration: 7200 },

    { id: 7,  day: 1, number: 1253, relativeTime:  600,
      pair: 'USDJPY', direction: 'short', entry: 156.210, tp: 155.880, sl: 156.370,
      rarity: 'normal', chartCondition: 'ng', result: 'tp_hit', duration: 6000 },

    { id: 8,  day: 1, number: 1254, relativeTime:  690,
      pair: 'BTCUSD', direction: 'short', entry: 64810.0, tp: 64460.0, sl: 64960.0,
      rarity: 'normal', chartCondition: 'ok',  result: 'tp_hit', duration: 6600 },

    { id: 9,  day: 1, number: 1255, relativeTime:  780,
      pair: 'USDJPY', direction: 'long',  entry: 153.780, tp: 154.130, sl: 153.620,
      rarity: 'good',   chartCondition: 'ok',  result: 'tp_hit', duration: 7800 },

    { id: 10, day: 1, number: 1256, relativeTime:  870,
      pair: 'BTCUSD', direction: 'long',  entry: 66140.0, tp: 66560.0, sl: 65960.0,
      rarity: 'normal', chartCondition: 'ng', result: 'sl_hit', duration: 6000 },

    /* ---- Day 2 --------------------------------------------------------- */
    { id: 11, day: 2, number: 1257, relativeTime: 1500,
      pair: 'USDJPY', direction: 'long',  entry: 156.340, tp: 156.680, sl: 156.170,
      rarity: 'normal', chartCondition: 'ok',  result: 'tp_hit', duration: 7200 },

    { id: 12, day: 2, number: 1258, relativeTime: 1590,
      pair: 'BTCUSD', direction: 'long',  entry: 68210.0, tp: 68590.0, sl: 68050.0,
      rarity: 'normal', chartCondition: 'ok',  result: 'tp_hit', duration: 6600 },

    { id: 13, day: 2, number: 1259, relativeTime: 1680,
      pair: 'USDJPY', direction: 'short', entry: 155.910, tp: 155.600, sl: 156.060,
      rarity: 'good',   chartCondition: 'ng', result: 'sl_hit', duration: 7200 },

    { id: 14, day: 2, number: 1260, relativeTime: 1770,
      pair: 'BTCUSD', direction: 'short', entry: 67460.0, tp: 67010.0, sl: 67660.0,
      rarity: 'good',   chartCondition: 'ok',  result: 'tp_hit', duration: 8400 },

    { id: 15, day: 2, number: 1261, relativeTime: 1860,
      pair: 'USDJPY', direction: 'long',  entry: 154.680, tp: 155.030, sl: 154.520,
      rarity: 'normal', chartCondition: 'ng', result: 'tp_hit', duration: 6600 },

    { id: 16, day: 2, number: 1262, relativeTime: 1950,
      pair: 'BTCUSD', direction: 'short', entry: 66910.0, tp: 66560.0, sl: 67070.0,
      rarity: 'normal', chartCondition: 'ng', result: 'sl_hit', duration: 7200 },

    { id: 17, day: 2, number: 1263, relativeTime: 2040,
      pair: 'USDJPY', direction: 'short', entry: 158.120, tp: 157.810, sl: 158.290,
      rarity: 'good',   chartCondition: 'ok',  result: 'tp_hit', duration: 6600 },

    { id: 18, day: 2, number: 1264, relativeTime: 2130,
      pair: 'BTCUSD', direction: 'long',  entry: 65720.0, tp: 66170.0, sl: 65500.0,
      rarity: 'normal', chartCondition: 'ok',  result: 'tp_hit', duration: 7200 },

    { id: 19, day: 2, number: 1265, relativeTime: 2220,
      pair: 'USDJPY', direction: 'long',  entry: 153.420, tp: 153.770, sl: 153.260,
      rarity: 'rare',   chartCondition: 'ng', result: 'tp_hit', duration: 6000 },

    { id: 20, day: 2, number: 1266, relativeTime: 2310,
      pair: 'BTCUSD', direction: 'long',  entry: 68910.0, tp: 69290.0, sl: 68730.0,
      rarity: 'normal', chartCondition: 'ng', result: 'sl_hit', duration: 7200 },

    /* ---- Day 3 --------------------------------------------------------- */
    { id: 21, day: 3, number: 1267, relativeTime: 2940,
      pair: 'USDJPY', direction: 'short', entry: 157.640, tp: 157.310, sl: 157.800,
      rarity: 'normal', chartCondition: 'ok',  result: 'tp_hit', duration: 7200 },

    { id: 22, day: 3, number: 1268, relativeTime: 3030,
      pair: 'BTCUSD', direction: 'long',  entry: 64220.0, tp: 64640.0, sl: 64020.0,
      rarity: 'good',   chartCondition: 'ng', result: 'sl_hit', duration: 6600 },

    { id: 23, day: 3, number: 1269, relativeTime: 3120,
      pair: 'USDJPY', direction: 'short', entry: 156.500, tp: 156.140, sl: 156.700,
      rarity: 'normal', chartCondition: 'ng', result: 'sl_hit', duration: 7200 },

    { id: 24, day: 3, number: 1270, relativeTime: 3210,
      pair: 'BTCUSD', direction: 'short', entry: 69110.0, tp: 68760.0, sl: 69280.0,
      rarity: 'good',   chartCondition: 'ok',  result: 'sl_hit', duration: 7800 },

    { id: 25, day: 3, number: 1271, relativeTime: 3300,
      pair: 'USDJPY', direction: 'long',  entry: 154.920, tp: 155.270, sl: 154.760,
      rarity: 'normal', chartCondition: 'ng', result: 'sl_hit', duration: 6600 },

    { id: 26, day: 3, number: 1272, relativeTime: 3390,
      pair: 'BTCUSD', direction: 'long',  entry: 67620.0, tp: 68140.0, sl: 67350.0,
      rarity: 'rare',   chartCondition: 'ok',  result: 'tp_hit', duration: 7200 },

    { id: 27, day: 3, number: 1273, relativeTime: 3480,
      pair: 'USDJPY', direction: 'long',  entry: 157.030, tp: 157.420, sl: 156.840,
      rarity: 'good',   chartCondition: 'ok',  result: 'tp_hit', duration: 7800 },

    { id: 28, day: 3, number: 1274, relativeTime: 3570,
      pair: 'BTCUSD', direction: 'short', entry: 66320.0, tp: 65940.0, sl: 66490.0,
      rarity: 'normal', chartCondition: 'ng', result: 'tp_hit', duration: 6000 },

    { id: 29, day: 3, number: 1275, relativeTime: 3660,
      pair: 'USDJPY', direction: 'short', entry: 159.240, tp: 158.870, sl: 159.430,
      rarity: 'normal', chartCondition: 'ok',  result: 'tp_hit', duration: 6600 },

    { id: 30, day: 3, number: 1276, relativeTime: 3750,
      pair: 'BTCUSD', direction: 'long',  entry: 65810.0, tp: 66810.0, sl: 65320.0,
      rarity: 'epic', chartCondition: 'ok', result: 'tp_hit', duration: 9000 }
  ];

  /* --------------------------------------------------------------------------
   * 5. シグナルのエンリッチ(pips / 損益 / RR比 / チャート)
   * -------------------------------------------------------------------------- */
  function enrichSignal(meta) {
    const conf = PAIR_CONFIG[meta.pair];
    const dir = meta.direction === 'long' ? 1 : -1;

    // pips 計算(方向考慮で正の値になるよう)
    const tpPips = Math.abs(Math.round(((meta.tp - meta.entry) * dir) / conf.pipSize));
    const slPips = Math.abs(Math.round(((meta.entry - meta.sl) * dir) / conf.pipSize));

    const tpProfit = tpPips * conf.pipValue;
    const slLoss = -slPips * conf.pipValue;
    const rr = slPips > 0 ? +(tpPips / slPips).toFixed(2) : 0;

    const chart = generateChart(meta);

    return Object.assign({}, meta, {
      pipSize: conf.pipSize,
      pipValue: conf.pipValue,
      lotSize: conf.lotSize,
      decimals: conf.decimals,
      tpPips: tpPips,
      slPips: slPips,
      tpProfit: tpProfit,
      slLoss: slLoss,
      rr: rr,
      candles: chart.candles,
      ma20: chart.ma20,
      ma80: chart.ma80
    });
  }

  /* --------------------------------------------------------------------------
   * 6. SCENARIOS を組み立て
   * -------------------------------------------------------------------------- */
  const SCENARIOS = { day1: [], day2: [], day3: [] };
  for (let i = 0; i < SIGNAL_META.length; i++) {
    const signal = enrichSignal(SIGNAL_META[i]);
    SCENARIOS['day' + signal.day].push(signal);
  }

  /* --------------------------------------------------------------------------
   * 7. ユーティリティ
   * -------------------------------------------------------------------------- */
  const ALL_SIGNALS = SCENARIOS.day1.concat(SCENARIOS.day2, SCENARIOS.day3);

  const ScenarioUtil = {
    totalDays: 3,
    totalSignals: ALL_SIGNALS.length,

    /** ID からシグナル取得 */
    getById: function (id) {
      for (let i = 0; i < ALL_SIGNALS.length; i++) {
        if (ALL_SIGNALS[i].id === id) return ALL_SIGNALS[i];
      }
      return null;
    },

    /** 指定 Day のシグナル一覧 */
    getForDay: function (day) {
      return SCENARIOS['day' + day] || [];
    },

    /** 全シグナル(時系列昇順) */
    getAll: function () {
      return ALL_SIGNALS.slice();
    },

    /**
     * 経過分数(Day1 0:00起点)から、その時点までに配信されたシグナルを返す
     */
    getUntil: function (elapsedMinutes) {
      return ALL_SIGNALS.filter(function (s) {
        return s.relativeTime <= elapsedMinutes;
      });
    },

    /**
     * 次にトリガーされるシグナルを返す(まだ配信されていないもののうち最も早いもの)
     * @param {number} elapsedMinutes 経過分数
     * @returns シグナル or null
     */
    getNext: function (elapsedMinutes) {
      for (let i = 0; i < ALL_SIGNALS.length; i++) {
        if (ALL_SIGNALS[i].relativeTime > elapsedMinutes) return ALL_SIGNALS[i];
      }
      return null;
    },

    /** 経過分数から Day を計算 (1〜3 or 'ended') */
    calcDay: function (elapsedMinutes) {
      if (elapsedMinutes < 1440) return 1;
      if (elapsedMinutes < 2880) return 2;
      if (elapsedMinutes < 4320) return 3;
      return 'ended'; // Phase1 では Day3 まで。以降は拡張予定
    }
  };

  /* --------------------------------------------------------------------------
   * 8. エクスポート
   * -------------------------------------------------------------------------- */
  global.SCENARIOS = SCENARIOS;
  global.ScenarioUtil = ScenarioUtil;
  global.PAIR_CONFIG = PAIR_CONFIG;

})(typeof window !== 'undefined' ? window : this);
