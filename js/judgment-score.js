/* ==========================================================================
 * Rainbow Trial — js/judgment-score.js
 * 判定スコア(独自指標)システム
 *
 * 【計算ロジック】
 *   条件OK時エントリー率 = 条件OKシグナル中のエントリー数 / 条件OKシグナル受信数
 *   条件NG時見送り率     = 条件NGシグナル中の見送り数     / 条件NGシグナル受信数
 *   総合判定スコア       = (OK時エントリー率 × 0.5 + NG時見送り率 × 0.5) × 100
 *
 * 依存: window.TrialStore (js/storage.js)
 *
 * 公開グローバル: window.JudgmentScore
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. ランクテーブル
   * -------------------------------------------------------------------------- */
  var RANKS = [
    { min: 95,  label: 'S+', color: '#FF6B6B', desc: 'マスター級' },
    { min: 90,  label: 'S',  color: '#FF8E53', desc: 'エキスパート' },
    { min: 85,  label: 'A+', color: '#FFC048', desc: '上級者' },
    { min: 80,  label: 'A',  color: '#FFE048', desc: '熟練者' },
    { min: 75,  label: 'B+', color: '#9CCC65', desc: '中級者' },
    { min: 70,  label: 'B',  color: '#66BB6A', desc: '標準' },
    { min: 60,  label: 'C+', color: '#42A5F5', desc: '初心者' },
    { min: 0,   label: 'C',  color: '#78909C', desc: '要練習' }
  ];

  function getRank(score) {
    for (var i = 0; i < RANKS.length; i++) {
      if (score >= RANKS[i].min) return RANKS[i];
    }
    return RANKS[RANKS.length - 1];
  }

  /* --------------------------------------------------------------------------
   * 2. スコア計算
   * -------------------------------------------------------------------------- */
  function compute(state) {
    var gs = state && state.gameStats;

    // 判定ソースが不足している場合はスコアなし
    var okReceived  = (gs && gs.totalOKSignals)  || 0;  // 条件OKシグナル受信数
    var okEntered   = (gs && gs.correctEntriesOK) || 0;  // 条件OKで正しくエントリー
    var ngReceived  = (gs && gs.totalNGSignals)   || 0;  // 条件NGシグナル受信数
    var ngSkipped   = (gs && gs.correctSkipsNG)   || 0;  // 条件NGで正しく見送り

    var okRate  = okReceived > 0 ? okEntered  / okReceived  : null;
    var ngRate  = ngReceived > 0 ? ngSkipped  / ngReceived  : null;

    // 両方データがある場合のみスコア計算
    var score   = null;
    var validCount = (okRate !== null ? 1 : 0) + (ngRate !== null ? 1 : 0);

    if (validCount === 2) {
      score = Math.round((okRate * 0.5 + ngRate * 0.5) * 100);
    } else if (validCount === 1) {
      // 片方しかデータがない場合は片方のみで算出(参考値)
      score = Math.round(((okRate !== null ? okRate : ngRate)) * 100);
    }

    // スコアを gameStats に保存
    if (score !== null) {
      var s = global.TrialStore.getState();
      if (!s.gameStats) s.gameStats = {};
      if (s.gameStats.judgmentScore !== score) {
        s.gameStats.judgmentScore = score;
        global.TrialStore.save(s);
      }
    }

    var rank = score !== null ? getRank(score) : null;

    return {
      score:       score,
      okRate:      okRate   !== null ? Math.round(okRate  * 100) : null,
      ngRate:      ngRate   !== null ? Math.round(ngRate  * 100) : null,
      okReceived:  okReceived,
      okEntered:   okEntered,
      ngReceived:  ngReceived,
      ngSkipped:   ngSkipped,
      rank:        rank,
      hasData:     validCount > 0
    };
  }

  /* --------------------------------------------------------------------------
   * 3. ホーム画面カード HTML 生成
   * -------------------------------------------------------------------------- */
  function renderSkillCard(state) {
    var data = compute(state);

    var html = '<div class="skill-card card">';
    html += '<div class="skill-card__header">';
    html += '<span class="skill-card__icon">🎯</span>';
    html += '<span class="skill-card__title">判定スキル</span>';
    if (data.rank) {
      html += '<span class="skill-card__rank" style="color:' + data.rank.color + '">' + data.rank.label + ' ' + data.rank.desc + '</span>';
    }
    html += '</div>';

    if (!data.hasData) {
      html += '<div class="skill-card__empty">シグナルを判定するとスコアが表示されます</div>';
      html += '</div>';
      return html;
    }

    // 総合スコア
    html += '<div class="skill-card__score">';
    if (data.score !== null) {
      html += '<span class="skill-card__score-num">' + data.score + '</span>';
      html += '<span class="skill-card__score-label">点</span>';
    } else {
      html += '<span class="skill-card__score-num">--</span>';
    }
    html += '</div>';

    // 内訳
    html += '<div class="skill-card__breakdown">';

    // 条件OK時エントリー率
    if (data.okRate !== null) {
      var okFilled = Math.round(data.okRate / 10);
      var okBar    = '━'.repeat(okFilled) + '░'.repeat(10 - okFilled);
      html += '<div class="skill-card__row">';
      html += '<span class="skill-card__row-label">条件OK時のエントリー</span>';
      html += '<span class="skill-card__row-pct">' + data.okRate + '%</span>';
      html += '</div>';
      html += '<div class="skill-card__bar skill-card__bar--ok">' + okBar + '</div>';
    } else {
      html += '<div class="skill-card__row">';
      html += '<span class="skill-card__row-label">条件OK時のエントリー</span>';
      html += '<span class="skill-card__row-pct">--</span>';
      html += '</div>';
    }

    // 条件NG時見送り率
    if (data.ngRate !== null) {
      var ngFilled = Math.round(data.ngRate / 10);
      var ngBar    = '━'.repeat(ngFilled) + '░'.repeat(10 - ngFilled);
      html += '<div class="skill-card__row">';
      html += '<span class="skill-card__row-label">条件NG時の見送り</span>';
      html += '<span class="skill-card__row-pct">' + data.ngRate + '%</span>';
      html += '</div>';
      html += '<div class="skill-card__bar skill-card__bar--ng">' + ngBar + '</div>';
    } else {
      html += '<div class="skill-card__row">';
      html += '<span class="skill-card__row-label">条件NG時の見送り</span>';
      html += '<span class="skill-card__row-pct">--</span>';
      html += '</div>';
    }

    html += '</div>'; // breakdown
    html += '</div>'; // card
    return html;
  }

  /* --------------------------------------------------------------------------
   * 4. 統計画面用 詳細 HTML 生成
   * -------------------------------------------------------------------------- */
  function renderScoreDetail(state) {
    var data = compute(state);

    var html = '<div class="score-detail">';
    html += '<div class="score-detail__title">🎯 判定スコア詳細</div>';

    if (!data.hasData) {
      html += '<div class="score-detail__empty">まだ判定データがありません。シグナルを受信してエントリー/見送りを実行してください。</div>';
      html += '</div>';
      return html;
    }

    // スコアサークル
    html += '<div class="score-detail__score-wrap">';
    if (data.score !== null && data.rank) {
      html += '<div class="score-detail__circle" style="border-color:' + data.rank.color + '">';
      html += '<span class="score-detail__circle-num">' + data.score + '</span>';
      html += '<span class="score-detail__circle-label">点</span>';
      html += '</div>';
      html += '<div class="score-detail__rank" style="color:' + data.rank.color + '">';
      html += data.rank.label + ' — ' + data.rank.desc;
      html += '</div>';
    }
    html += '</div>';

    // 内訳テーブル
    html += '<div class="score-detail__table">';
    html += '<div class="score-detail__row">';
    html += '<span>条件OKシグナル受信数</span><strong>' + data.okReceived + ' 件</strong></div>';
    html += '<div class="score-detail__row">';
    html += '<span>条件OK時エントリー数</span><strong>' + data.okEntered + ' 回</strong></div>';
    html += '<div class="score-detail__row score-detail__row--rate">';
    html += '<span>条件OK時エントリー率</span>';
    html += '<strong>' + (data.okRate !== null ? data.okRate + '%' : '--') + '</strong></div>';

    html += '<div class="score-detail__divider"></div>';

    html += '<div class="score-detail__row">';
    html += '<span>条件NGシグナル受信数</span><strong>' + data.ngReceived + ' 件</strong></div>';
    html += '<div class="score-detail__row">';
    html += '<span>条件NG時見送り数</span><strong>' + data.ngSkipped + ' 回</strong></div>';
    html += '<div class="score-detail__row score-detail__row--rate">';
    html += '<span>条件NG時見送り率</span>';
    html += '<strong>' + (data.ngRate !== null ? data.ngRate + '%' : '--') + '</strong></div>';
    html += '</div>';

    // ランク一覧
    html += '<div class="score-detail__ranks">';
    html += '<div class="score-detail__ranks-title">ランク基準</div>';
    html += '<div class="score-detail__ranks-list">';
    RANKS.forEach(function (r) {
      var active = data.rank && data.rank.label === r.label;
      html += '<span class="score-detail__rank-badge' + (active ? ' is-active' : '') + '" style="' + (active ? 'background:' + r.color + ';color:#000' : 'color:' + r.color) + '">' + r.label + '</span>';
    });
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  /* --------------------------------------------------------------------------
   * 5. 公開 API
   * -------------------------------------------------------------------------- */
  var JudgmentScore = {
    RANKS:            RANKS,
    getRank:          getRank,
    compute:          compute,
    renderSkillCard:  renderSkillCard,
    renderScoreDetail: renderScoreDetail
  };

  global.JudgmentScore = JudgmentScore;

})(typeof window !== 'undefined' ? window : this);
