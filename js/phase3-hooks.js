/* ==========================================================================
 * Rainbow Trial — js/phase3-hooks.js
 * Phase 3 フック統合
 *
 * App.init() の後に読み込まれ、以下をフックする:
 *   1. Trade.subscribe → エントリー / 見送り / 決着 の XP・実績・ミッション判定
 *   2. App.openSignalDetail を拡張 → シグナル受信 XP
 *   3. gameStats のカウンタ更新
 *   4. レベルアップ演出の発火
 *   5. 資金推移履歴の記録
 *
 * 依存:
 *   window.Trade         (js/trade.js)
 *   window.App           (js/app.js)
 *   window.TrialStore    (js/storage.js)
 *   window.LevelSystem   (js/level-system.js)
 *   window.AchievementSystem (js/achievements.js)
 *   window.MissionSystem (js/missions.js)
 *   window.JudgmentScore (js/judgment-score.js)
 *   window.Effects       (js/effects.js)
 *   window.SoundSystem   (js/sound.js)
 *   window.Judgment      (js/judgment.js)
 *   window.ScenarioUtil  (data/scenarios.js)
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. 初期化ガード: 依存モジュールが揃ってから実行
   * -------------------------------------------------------------------------- */
  function init() {
    if (!global.Trade || !global.LevelSystem || !global.TrialStore) {
      console.warn('[Phase3Hooks] 依存モジュールが未ロードです');
      return;
    }

    _hookTradeEvents();
    _hookSignalView();
    _initDayMissions();

    console.log('[Phase3Hooks] 初期化完了');
  }

  /* --------------------------------------------------------------------------
   * 2. Trade イベントフック
   * -------------------------------------------------------------------------- */
  function _hookTradeEvents() {
    global.Trade.subscribe(function (evt) {
      switch (evt.type) {

        // ---- エントリー ----
        case 'position_opened':
          _onEntry(evt.signal);
          break;

        // ---- 見送り ----
        case 'skip_recorded':
          _onSkip(evt.signal);
          break;

        // ---- 決着(TP / SL) ----
        case 'position_closed':
          _onClose(evt.signal, evt.trade, evt.pnl);
          break;
      }
    });
  }

  /* --------------------------------------------------------------------------
   * 3. シグナル詳細を開く(signal_view)フック
   *    App.openSignalDetail をラップして XP・ミッション処理を差し込む
   * -------------------------------------------------------------------------- */
  function _hookSignalView() {
    if (!global.App || typeof global.App.openSignalDetail !== 'function') return;

    var original = global.App.openSignalDetail.bind(global.App);
    global.App.openSignalDetail = function (signalId) {
      original(signalId);
      _onSignalView(signalId);
    };
  }

  /* --------------------------------------------------------------------------
   * 4. 現在 Day のミッション初期化
   * -------------------------------------------------------------------------- */
  function _initDayMissions() {
    if (!global.MissionSystem) return;
    var s   = global.TrialStore.getState();
    var day = (s.user && s.user.currentDay) || 1;
    global.MissionSystem.initDay(day);
  }

  /* --------------------------------------------------------------------------
   * 5. シグナル受信 / 詳細閲覧
   * -------------------------------------------------------------------------- */
  function _onSignalView(signalId) {
    var signal = global.ScenarioUtil && global.ScenarioUtil.getById(signalId);
    if (!signal) return;

    // gameStats カウント
    global.TrialStore.incrementGameStats({ totalSignalsReceived: 1 });

    // 条件 OK / NG をカウント
    var judgResult = global.Judgment && global.Judgment.judge(signal);
    if (judgResult) {
      if (judgResult.condition === 'ok') {
        global.TrialStore.incrementGameStats({ totalOKSignals: 1 });
      } else {
        global.TrialStore.incrementGameStats({ totalNGSignals: 1 });
      }
    }

    // XP 付与
    var result = _addXP('signal_view', {});
    if (result) _showXPPopup(result.addedXP);

    // ミッション
    if (global.MissionSystem) {
      global.MissionSystem.recordEvent('signal_view', {});
    }

    // 実績チェック
    _checkAchievements();
  }

  /* --------------------------------------------------------------------------
   * 6. エントリー実行
   * -------------------------------------------------------------------------- */
  function _onEntry(signal) {
    if (!signal) return;

    // 条件判定
    var judgResult = global.Judgment && global.Judgment.judge(signal);
    var isOK       = judgResult && judgResult.condition === 'ok';

    // gameStats カウント
    global.TrialStore.incrementGameStats({ totalEntries: 1 });

    // 連続カウンタ更新
    if (isOK) {
      // 条件 OK でエントリー = 正解
      global.TrialStore.incrementGameStats({ correctEntriesOK: 1, consecutiveOKEntries: 1 });
      global.TrialStore.setGameStats({ consecutiveNGSkips: 0 });
    } else {
      // 条件 NG でエントリー = 誤り
      global.TrialStore.setGameStats({ consecutiveOKEntries: 0, consecutiveNGSkips: 0 });
    }

    // XP 計算
    var xpOpts  = { correctEntry: isOK };
    var result  = _addXP('entry', xpOpts);
    if (result) _showXPPopup(result.addedXP);

    // ミッション
    if (global.MissionSystem) {
      global.MissionSystem.recordEvent('entry', { pair: signal.pair });
      if (isOK) {
        global.MissionSystem.recordEvent('entry_ok', { pair: signal.pair });
      }
    }

    // 実績チェック
    _checkAchievements();

    // 判定スコア更新
    if (global.JudgmentScore) {
      var st = global.TrialStore.getState();
      global.JudgmentScore.compute(st);
    }
  }

  /* --------------------------------------------------------------------------
   * 7. 見送り実行
   * -------------------------------------------------------------------------- */
  function _onSkip(signal) {
    if (!signal) return;

    // 条件判定
    var judgResult = global.Judgment && global.Judgment.judge(signal);
    var isNG       = judgResult && judgResult.condition === 'ng';

    // gameStats カウント
    global.TrialStore.incrementGameStats({ totalSkips: 1 });

    if (isNG) {
      // 条件 NG を正しく見送り = 正解
      global.TrialStore.incrementGameStats({ correctSkipsNG: 1, consecutiveNGSkips: 1 });
      global.TrialStore.setGameStats({ consecutiveOKEntries: 0 });
    } else {
      // 条件 OK を見送り = 誤り
      global.TrialStore.setGameStats({ consecutiveNGSkips: 0 });
    }

    // XP 計算
    var xpOpts = { correctSkip: isNG };
    var result = _addXP('skip', xpOpts);
    if (result) _showXPPopup(result.addedXP);

    // ミッション
    if (global.MissionSystem) {
      global.MissionSystem.recordEvent('skip', {});
      if (isNG) {
        global.MissionSystem.recordEvent('skip_ng', {});
      }
    }

    // 実績チェック
    _checkAchievements();

    // 判定スコア更新
    if (global.JudgmentScore) {
      var st = global.TrialStore.getState();
      global.JudgmentScore.compute(st);
    }
  }

  /* --------------------------------------------------------------------------
   * 8. 決着(TP / SL)
   * -------------------------------------------------------------------------- */
  function _onClose(signal, trade, pnl) {
    if (!signal || !trade) return;

    var isWin = (trade.result === 'tp_hit');

    // 連勝ストリーク更新
    var s  = global.TrialStore.getState();
    var gs = s.gameStats || {};
    var currentStreak = gs.currentStreak || 0;
    var maxStreak     = gs.maxStreak     || 0;

    if (isWin) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }

    // gameStats 更新
    var statsPatch = isWin
      ? { totalTPHits: 1 }
      : { totalSLHits: 1 };

    global.TrialStore.incrementGameStats(statsPatch);

    // 連勝/連敗記録
    var loseStreak    = isWin ? 0 : (gs.currentLoseStreak || 0) + 1;
    var maxLoseStreak = Math.max(gs.maxLoseStreak || 0, loseStreak);

    global.TrialStore.setGameStats({
      currentStreak:    currentStreak,
      maxStreak:        maxStreak,
      currentLoseStreak: loseStreak,
      maxLoseStreak:    maxLoseStreak
    });

    // 資金推移に記録
    var updatedState = global.TrialStore.getState();
    global.TrialStore.pushCapitalHistory(
      'Day' + ((updatedState.user && updatedState.user.currentDay) || 1),
      updatedState.account.currentCapital
    );

    // XP 計算(連勝ボーナス・レアリティボーナス込み)
    var eventType = isWin ? 'tp_hit' : 'sl_hit';
    var xpOpts    = {
      rarity: signal.rarity,
      streak: isWin ? currentStreak : 0
    };
    var result = _addXP(eventType, xpOpts);

    // 演出
    if (global.Effects) {
      if (isWin) {
        global.Effects.showTPHit(Math.abs(pnl), trade.pnlPips || 0);
      } else {
        global.Effects.showSLHit(Math.abs(pnl), trade.pnlPips || 0);
      }
      global.Effects.updateStreakBanner(currentStreak);
    }

    if (result && result.addedXP > 0) {
      _showXPPopup(result.addedXP);
    }

    // レベルアップ演出
    if (result && result.leveledUp && global.Effects) {
      setTimeout(function () {
        global.Effects.showLevelUp(result.fromLevel, result.toLevel, function () {
          if (global.App) global.App.renderHome();
        });
      }, 2000); // TP/SL 演出が終わってから
    }

    // ミッション
    if (global.MissionSystem) {
      if (isWin) {
        global.MissionSystem.recordEvent('tp_hit', { rarity: signal.rarity });
      }
      global.MissionSystem.recordEvent('streak_update', { streak: currentStreak });
    }

    // 実績チェック
    _checkAchievements();

    // 判定スコア更新
    if (global.JudgmentScore) {
      var st = global.TrialStore.getState();
      global.JudgmentScore.compute(st);
    }

    // ホームを再描画(連勝バナー等を更新)
    if (global.App) {
      setTimeout(function () {
        if (global.App.state.screen === 'main' && global.App.state.tab === 'home') {
          global.App.renderHome();
        }
      }, 100);
    }
  }

  /* --------------------------------------------------------------------------
   * 9. XP 付与ラッパー(レベルアップ判定含む)
   * -------------------------------------------------------------------------- */
  function _addXP(eventType, opts) {
    if (!global.LevelSystem) return null;

    var amount = global.LevelSystem.calcXP(eventType, opts);
    if (!amount) return null;

    var result = global.LevelSystem.addXP(amount);
    return result;
  }

  /* --------------------------------------------------------------------------
   * 10. 実績チェック
   * -------------------------------------------------------------------------- */
  function _checkAchievements() {
    if (!global.AchievementSystem) return;
    var state = global.TrialStore.getState();
    global.AchievementSystem.checkAll(state);
    global.AchievementSystem.updateProgress(state);
  }

  /* --------------------------------------------------------------------------
   * 11. XP ポップアップ表示
   * -------------------------------------------------------------------------- */
  function _showXPPopup(amount) {
    if (!amount || !global.Effects) return;
    // ポジション画面またはホーム画面の中心付近に表示
    global.Effects.showXPPopup(amount, null);
  }

  /* --------------------------------------------------------------------------
   * 12. DOMContentLoaded 後に初期化
   * -------------------------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // すでに DOMContentLoaded 済みの場合(スクリプトが最後に読み込まれた場合)
    // App.init() の後に実行されるよう setTimeout で 1 tick 遅らせる
    setTimeout(init, 0);
  }

})(typeof window !== 'undefined' ? window : this);
