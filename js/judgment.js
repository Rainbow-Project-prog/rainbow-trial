/* ==========================================================================
 * Rainbow Trial — js/judgment.js
 * シグナルの「エントリー条件」判定ロジック + 学習ガイド文生成。
 *
 * 判定ルール(Rainbow System 風の簡易版):
 *   LONG  : 最新ローソクの終値 > MA20 > MA80
 *   SHORT : 最新ローソクの終値 < MA20 < MA80
 *
 * 公開グローバル: window.Judgment
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. 判定
   * -------------------------------------------------------------------------- */
  /**
   * シグナルに対する最新値判定。
   * @param {Object} signal — scenarios.js のエンリッチ済みシグナル
   * @returns {Object} 判定結果
   */
  function judge(signal) {
    if (!signal || !signal.candles || !signal.ma20 || !signal.ma80) {
      return { condition: 'ng', reason: 'invalid_signal', checks: [] };
    }

    const n = signal.candles.length;
    const lastCandle = signal.candles[n - 1];
    const lastClose  = lastCandle.c;
    const lastMa20   = signal.ma20[n - 1];
    const lastMa80   = signal.ma80[n - 1];

    const dir = signal.direction;  // 'long' | 'short'
    const checks = buildChecks(dir, lastClose, lastMa20, lastMa80);
    const allPass = checks.every(function (c) { return c.pass; });

    return {
      condition: allPass ? 'ok' : 'ng',
      rule: dir,
      lastClose: lastClose,
      lastMa20:  lastMa20,
      lastMa80:  lastMa80,
      checks: checks,
      summary: allPass ? '✅ エントリー条件を満たしています' : '⚠️ エントリー条件を満たしていません',
      ngReason: allPass ? null : describeNg(dir, lastClose, lastMa20, lastMa80)
    };
  }

  function buildChecks(direction, close, ma20, ma80) {
    if (direction === 'long') {
      return [
        { label: '終値が MA20 の上',    pass: close > ma20, detail: close.toFixed(3) + ' > ' + ma20.toFixed(3) },
        { label: 'MA20 が MA80 の上',   pass: ma20  > ma80, detail: ma20.toFixed(3)  + ' > ' + ma80.toFixed(3) }
      ];
    }
    // short
    return [
      { label: '終値が MA20 の下',      pass: close < ma20, detail: close.toFixed(3) + ' < ' + ma20.toFixed(3) },
      { label: 'MA20 が MA80 の下',     pass: ma20  < ma80, detail: ma20.toFixed(3)  + ' < ' + ma80.toFixed(3) }
    ];
  }

  function describeNg(direction, close, ma20, ma80) {
    if (direction === 'long') {
      if (close < ma80 && close < ma20) return '価格がまだ下落トレンド圏にあります。';
      if (close < ma20) return '価格が MA20 の下にあります(押し目待ち)。';
      if (ma20 < ma80)  return 'MA20 が MA80 の下で推移しています(長期の下落傾向)。';
      return 'MA の並びがロング条件を満たしていません。';
    }
    // short
    if (close > ma80 && close > ma20) return '価格がまだ上昇トレンド圏にあります。';
    if (close > ma20) return '価格が MA20 の上にあります(戻り待ち)。';
    if (ma20 > ma80)  return 'MA20 が MA80 の上で推移しています(長期の上昇傾向)。';
    return 'MA の並びがショート条件を満たしていません。';
  }

  /* --------------------------------------------------------------------------
   * 2. ガイド文(シグナル詳細画面上の「💡 エントリー条件」カード)
   * -------------------------------------------------------------------------- */
  function getGuideText(direction) {
    if (direction === 'long') {
      return {
        title: '💡 ロングシグナルの条件',
        lines: [
          'ローソク足の <strong>下</strong> に MA20 があり、',
          'さらにその <strong>下</strong> に MA80 がある状態。',
          'つまり <strong>終値 &gt; MA20 &gt; MA80</strong> ならエントリー OK ✅'
        ]
      };
    }
    return {
      title: '💡 ショートシグナルの条件',
      lines: [
        'ローソク足の <strong>上</strong> に MA20 があり、',
        'さらにその <strong>上</strong> に MA80 がある状態。',
        'つまり <strong>終値 &lt; MA20 &lt; MA80</strong> ならエントリー OK ✅'
      ]
    };
  }

  /* --------------------------------------------------------------------------
   * 3. 判定ガイド: 現在のチャートに当てはめた簡潔な解釈文
   *    (判定ボタン上に表示する「なぜOK/NGか」の一言)
   * -------------------------------------------------------------------------- */
  function briefHint(judgeResult) {
    if (!judgeResult) return '';
    if (judgeResult.condition === 'ok') {
      return judgeResult.rule === 'long'
        ? '終値 &gt; MA20 &gt; MA80 の並び。ロング条件成立。'
        : '終値 &lt; MA20 &lt; MA80 の並び。ショート条件成立。';
    }
    return judgeResult.ngReason || '条件を満たしていません。';
  }

  /* --------------------------------------------------------------------------
   * 4. 学習モーダル用の詳細解説 HTML(学習リンク「条件の見方を詳しく見る」押下時)
   * -------------------------------------------------------------------------- */
  function getLearningContent() {
    return [
      {
        title: 'Rainbow System とは',
        body:
          '2 本の移動平均線(<strong>MA20</strong>・<strong>MA80</strong>)とローソク足の位置関係だけで、' +
          'トレンドの方向と勢いを判断する、シンプルな半裁量システムです。'
      },
      {
        title: 'ロングのエントリー条件',
        body:
          '<strong>終値 &gt; MA20 &gt; MA80</strong> の順に並んでいる時。<br>' +
          '「短期の勢い(MA20)」が「中期の流れ(MA80)」よりも上、かつ価格がその両方より上にある = ' +
          '買い方が有利な地合い、と判断します。'
      },
      {
        title: 'ショートのエントリー条件',
        body:
          '<strong>終値 &lt; MA20 &lt; MA80</strong> の順に並んでいる時。<br>' +
          'ロングの逆で、売り方が有利な地合いです。'
      },
      {
        title: '見送るべきケース',
        body:
          '・価格が MA20 と MA80 の<strong>間</strong>にある<br>' +
          '・MA20 と MA80 が<strong>逆の並び</strong>(MA80 の下に MA20)<br>' +
          '・どちらも価格の反対側にある<br>' +
          'これらはトレンドが不明瞭 or 逆行の可能性があるため、見送るのが賢明です。'
      },
      {
        title: 'TP / SL の考え方',
        body:
          'TP(利確)と SL(損切)は、シグナル配信時に自動計算されます。<br>' +
          '推奨 <strong>RR 比 = 1 : 2.0 以上</strong> を基準に、勝率を維持しながら期待値をプラスに保つ設計です。'
      }
    ];
  }

  /* --------------------------------------------------------------------------
   * 5. 見送り結果の解釈(結果画面 ⏸️ 用)
   * -------------------------------------------------------------------------- */
  /**
   * 見送りを選んだ時の「もしエントリーしていたら…」文言
   * @param {Object} signal
   * @returns {Object} { title, message, correct }
   *   correct: 見送りの判断が正しかったか(条件NGを見送り=正しい)
   */
  function judgeSkipFeedback(signal) {
    const j = judge(signal);
    const isOkCondition = (j.condition === 'ok');
    const wouldHaveHit = (signal.result === 'tp_hit');

    if (!isOkCondition) {
      // 条件NGを見送り = 賢明
      return {
        title: '賢明な判断でした!',
        message: wouldHaveHit
          ? 'もしエントリーしていたら偶然 TP にヒットしていましたが、条件を満たさないシグナルを見送ったのは正しい判断です。'
          : '条件を満たさないシグナルを見送り、損失を回避できました。',
        correct: true
      };
    }
    // 条件OKを見送り
    return {
      title: '次は判断してみましょう',
      message: wouldHaveHit
        ? 'このシグナルは条件を満たしており、エントリーしていれば TP にヒットしていました。次はチャレンジしてみましょう。'
        : '条件は満たしていましたが SL にヒットしていたため、結果的には見送りが幸運でした。',
      correct: wouldHaveHit ? false : true
    };
  }

  /* --------------------------------------------------------------------------
   * 6. 公開 API
   * -------------------------------------------------------------------------- */
  const Judgment = {
    judge:              judge,
    getGuideText:       getGuideText,
    briefHint:          briefHint,
    getLearningContent: getLearningContent,
    judgeSkipFeedback:  judgeSkipFeedback
  };

  global.Judgment = Judgment;

})(typeof window !== 'undefined' ? window : this);
