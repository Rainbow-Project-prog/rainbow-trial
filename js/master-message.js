/* ==========================================================================
 * Rainbow Trial — js/master-message.js
 * サロンマスターからのメッセージモーダル表示システム
 *
 * 依存: window.MASTER_MESSAGES / window.getMessageForDay (data/master-messages.js)
 *       window.TrialStore   (js/storage.js)
 *       window.SoundSystem  (js/sound.js)
 *
 * 公開グローバル: window.MasterMessage
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. Day 開始時にメッセージ表示が必要か判断し、必要なら表示する
   *    - 各 Day は 1 回のみ表示
   * -------------------------------------------------------------------------- */
  function checkAndShow(day) {
    if (typeof day !== 'number') return;
    // Day 2, 5, 7 のみ
    if ([2, 5, 7].indexOf(day) === -1) return;

    var msg = global.getMessageForDay ? global.getMessageForDay(day) : null;
    if (!msg) return;

    // 既に表示済みなら skip
    var s = global.TrialStore.getState();
    var shown = s.settings && s.settings.masterMessageShown || {};
    if (shown[msg.id]) return;

    // 表示済みフラグを保存
    var next = Object.assign({}, s.settings || {});
    if (!next.masterMessageShown) next.masterMessageShown = {};
    next.masterMessageShown[msg.id] = true;
    global.TrialStore.setState({ settings: next });

    // モーダル表示
    setTimeout(function () { showModal(msg); }, 800);
  }

  /* --------------------------------------------------------------------------
   * 2. モーダル表示
   * -------------------------------------------------------------------------- */
  function showModal(msg) {
    // 既存の同種モーダルを削除
    var existing = document.getElementById('master-message-overlay');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.id = 'master-message-overlay';
    overlay.className = 'overlay is-active master-msg-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    var tipsHTML = '';
    if (msg.tips && msg.tips.length) {
      tipsHTML =
        '<div class="master-msg__tips">' +
          msg.tips.map(function (t) {
            return '<div class="master-msg__tip">' + t + '</div>';
          }).join('') +
        '</div>';
    }

    var specialClass = msg.special ? ' master-msg-overlay--special' : '';

    overlay.innerHTML =
      '<div class="overlay__card master-msg-card' + specialClass + '">' +
        '<div class="master-msg__badge">' + msg.badge + '</div>' +
        '<div class="master-msg__avatar">👨‍🏫</div>' +
        '<h2 class="master-msg__title">' + msg.title + '</h2>' +
        '<div class="master-msg__body">' + msg.body + '</div>' +
        tipsHTML +
        '<div class="master-msg__from">' + msg.from + '</div>' +
        '<button class="btn btn--primary btn--block master-msg__close" type="button">読んだ！</button>' +
      '</div>';

    document.body.appendChild(overlay);

    // 入場アニメーション
    requestAnimationFrame(function () {
      overlay.classList.add('master-msg-overlay--enter');
    });

    // SE
    if (global.SoundSystem) {
      global.SoundSystem.play('notification');
    }

    // 閉じるボタン
    var closeBtn = overlay.querySelector('.master-msg__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { closeModal(overlay); });
    }
    // 背景クリックでも閉じる
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  }

  function closeModal(overlay) {
    overlay.classList.add('master-msg-overlay--leave');
    overlay.addEventListener('transitionend', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, { once: true });
  }

  /* --------------------------------------------------------------------------
   * 3. 公開 API
   * -------------------------------------------------------------------------- */
  var MasterMessage = {
    checkAndShow: checkAndShow,
    showModal:    showModal
  };

  global.MasterMessage = MasterMessage;

})(typeof window !== 'undefined' ? window : this);
