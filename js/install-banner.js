/* ==========================================================================
 * Rainbow Trial — js/install-banner.js
 * 常時表示インストールバナー(タブバー上部固定)
 * InstallHandler.install() に委譲
 * 公開グローバル: window.InstallBanner
 * ========================================================================== */

(function (global) {
  'use strict';

  var DISMISS_KEY      = 'install-banner-dismissed';
  var DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24時間

  var InstallBanner = {
    shouldShow: function () {
      // スタンドアロン起動中は表示しない
      if (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) return false;
      if (global.navigator && global.navigator.standalone === true) return false;
      if (global.InstallDetector && global.InstallDetector.isInstalled()) return false;
      // 24時間以内に × で閉じた場合は非表示
      var dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        var elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < DISMISS_DURATION) return false;
      }
      return true;
    },

    init: function () {
      var self = this;
      if (!this.shouldShow()) return;

      var banner = document.getElementById('install-banner');
      if (!banner) return;
      banner.style.display = 'flex';

      // 「追加方法」ボタン
      var actionBtn = banner.querySelector('.install-banner-action');
      if (actionBtn) {
        actionBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (global.InstallHandler) global.InstallHandler.install();
        });
      }

      // × ボタン
      var closeBtn = document.getElementById('install-banner-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          self.dismiss();
        });
      }

      // バナー本体タップ
      banner.addEventListener('click', function () {
        if (global.InstallHandler) global.InstallHandler.install();
      });

      // インストール完了で永久非表示
      global.addEventListener('appinstalled', function () { self.hide(); });
    },

    hide: function () {
      var banner = document.getElementById('install-banner');
      if (banner) banner.style.display = 'none';
    },

    dismiss: function () {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      this.hide();
    }
  };

  global.InstallBanner = InstallBanner;

})(typeof window !== 'undefined' ? window : this);
