/* ==========================================================================
 * Rainbow Trial — js/phase4-hooks.js
 * Phase 4 フック統合
 *
 * - Day 遷移検知 → マスターメッセージ表示
 * - Day 7 完了 → 最終画面表示
 * - ホーム画面へのフィード & マスターメッセージプレビュー挿入
 * - Day ごとのミッション初期化(Phase 3 継続)
 *
 * 依存:
 *   window.GameState       (js/game-state.js)
 *   window.TrialStore      (js/storage.js)
 *   window.MasterMessage   (js/master-message.js)
 *   window.MembersFeed     (js/members-feed.js)
 *   window.FinalScreen     (js/final-screen.js)
 *   window.App             (js/app.js)
 *   window.Effects         (js/effects.js)
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 初期化
   * -------------------------------------------------------------------------- */
  function init() {
    if (!global.GameState || !global.TrialStore) {
      console.warn('[Phase4Hooks] 依存モジュールが未ロードです');
      return;
    }

    _patchRenderHome();
    _checkDayTransition();
    _checkFinalScreen();
    _startDayPoll();

    console.log('[Phase4Hooks] 初期化完了');
  }

  /* --------------------------------------------------------------------------
   * 1. App.renderHome をパッチしてフィード & プレビューを追加
   * -------------------------------------------------------------------------- */
  function _patchRenderHome() {
    if (!global.App || typeof global.App.renderHome !== 'function') return;

    var _origRenderHome = global.App.renderHome.bind(global.App);

    global.App.renderHome = function () {
      _origRenderHome();
      _injectPhase4HomeContent();
    };

    // 初回実行時もフィードを挿入
    setTimeout(_injectPhase4HomeContent, 50);
  }

  /* --------------------------------------------------------------------------
   * 2. ホームにフィード / マスターメッセージプレビュー / Day完了バナー を挿入
   * -------------------------------------------------------------------------- */
  function _injectPhase4HomeContent() {
    var root = document.getElementById('panel-home');
    if (!root) return;

    var snap  = global.GameState && global.GameState.snapshot();
    var state = global.TrialStore.getState();
    var day   = snap ? snap.displayDay : ((state.user && state.user.currentDay) || 1);

    /* --- マスターメッセージプレビュー (Day 2, 5, 7) --- */
    if ([2, 5, 7].indexOf(day) !== -1) {
      if (!document.getElementById('ph4-master-preview')) {
        var previewEl = document.createElement('div');
        previewEl.id  = 'ph4-master-preview';
        var msg = global.getMessageForDay && global.getMessageForDay(day);
        if (msg) {
          previewEl.innerHTML = _buildMasterPreview(msg);
          previewEl.addEventListener('click', function () {
            if (global.MasterMessage) global.MasterMessage.showModal(msg);
          });
          // 資金カードの後ろに挿入
          var capitalCard = root.querySelector('.capital-card');
          if (capitalCard && capitalCard.nextSibling) {
            root.insertBefore(previewEl, capitalCard.nextSibling);
          } else {
            root.appendChild(previewEl);
          }
        }
      }
    }

    /* --- Day 7 完了バナー --- */
    var isEnded = snap && (snap.currentDay === 'ended' || (snap.displayDay === 7 && !snap.next));
    if (isEnded && !document.getElementById('ph4-final-cta')) {
      var ctaEl = document.createElement('div');
      ctaEl.id  = 'ph4-final-cta';
      ctaEl.innerHTML =
        '<div class="final-cta-banner" id="btn-open-final-screen">' +
          '<div class="final-cta-banner__title">🎊 7日間のトライアル完了！</div>' +
          '<div class="final-cta-banner__sub">あなたの7日間の成績を確認しましょう</div>' +
          '<button class="btn btn--primary btn--block" type="button">📊 最終成績を見る</button>' +
        '</div>';
      ctaEl.addEventListener('click', function () {
        if (global.FinalScreen) global.FinalScreen.show();
      });
      // プログレスバーの直後に挿入
      var progressEl = root.querySelector('.progress');
      if (progressEl && progressEl.nextSibling) {
        root.insertBefore(ctaEl, progressEl.nextSibling);
      } else {
        root.insertBefore(ctaEl, root.firstChild);
      }
    }

    /* --- メンバーフィード --- */
    if (!document.getElementById('ph4-feed')) {
      var feedEl = document.createElement('div');
      feedEl.id  = 'ph4-feed';
      if (global.MembersFeed) {
        global.MembersFeed.renderFeedCard(feedEl);
        global.MembersFeed.startRefresh();
      }
      // 学習リンクカードの直後に挿入
      var learnCard = root.querySelector('#learn-link-card');
      if (learnCard && learnCard.nextSibling) {
        root.insertBefore(feedEl, learnCard.nextSibling);
      } else {
        root.appendChild(feedEl);
      }
    }
  }

  function _buildMasterPreview(msg) {
    return (
      '<div class="master-msg-preview">' +
        '<span class="master-msg-preview__icon">👨‍🏫</span>' +
        '<div class="master-msg-preview__text">' +
          '<div class="master-msg-preview__title">マスターからのメッセージ</div>' +
          '<div class="master-msg-preview__sub">' + (msg.title || '') + '</div>' +
        '</div>' +
        '<span class="master-msg-preview__arrow">›</span>' +
      '</div>'
    );
  }

  /* --------------------------------------------------------------------------
   * 3. Day 遷移チェック(起動時)
   * -------------------------------------------------------------------------- */
  function _checkDayTransition() {
    var snap = global.GameState && global.GameState.snapshot();
    if (!snap) return;

    var day = snap.displayDay;

    // 現在の Day に対応するマスターメッセージを確認・表示
    if (global.MasterMessage) {
      global.MasterMessage.checkAndShow(day);
    }

    // Day 変更を localStorage に記録(次回起動時比較用)
    var state = global.TrialStore.getState();
    var prevDay = (state.settings && state.settings._lastKnownDay) || 0;

    if (day > prevDay) {
      var s = Object.assign({}, state.settings || {}, { _lastKnownDay: day });
      global.TrialStore.setState({ settings: s });

      // Day 切り替え演出
      if (prevDay > 0 && global.Effects) {
        setTimeout(function () {
          global.Effects.flash('purple');
        }, 500);
      }
    }
  }

  /* --------------------------------------------------------------------------
   * 4. 最終画面チェック(起動時・Day 7)
   * -------------------------------------------------------------------------- */
  function _checkFinalScreen() {
    var state = global.TrialStore.getState();

    // 一度見た場合は自動表示しない(ホームのCTAボタンから開く)
    var shown = state.settings && state.settings._finalScreenAutoShown;
    if (shown) return;

    if (global.FinalScreen && global.FinalScreen.shouldShow()) {
      // 初回のみ自動表示(2秒後)
      setTimeout(function () {
        var s = Object.assign({}, global.TrialStore.getState().settings || {}, { _finalScreenAutoShown: true });
        global.TrialStore.setState({ settings: s });
        global.FinalScreen.show();
      }, 2000);
    }
  }

  /* --------------------------------------------------------------------------
   * 5. 定期ポーリング: Day 遷移・最終画面の検出(60秒毎)
   * -------------------------------------------------------------------------- */
  var _pollTimer = null;
  var _lastPollDay = -1;

  function _startDayPoll() {
    if (_pollTimer) return;
    _pollTimer = setInterval(function () {
      var snap = global.GameState && global.GameState.snapshot();
      if (!snap) return;

      var day = snap.displayDay;

      // Day が変わったら遷移処理
      if (day !== _lastPollDay && _lastPollDay !== -1) {
        _checkDayTransition();

        // ホーム画面なら再描画(フィード・プレビュー更新)
        if (global.App && global.App.state.screen === 'main' && global.App.state.tab === 'home') {
          global.App.renderHome();
        }
      }
      _lastPollDay = day;

      // 最終画面チェック
      if (global.FinalScreen && global.FinalScreen.shouldShow()) {
        _checkFinalScreen();
      }

    }, 60000);
  }

  /* --------------------------------------------------------------------------
   * Boot
   * -------------------------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 0);
    });
  } else {
    setTimeout(init, 0);
  }

})(typeof window !== 'undefined' ? window : this);
