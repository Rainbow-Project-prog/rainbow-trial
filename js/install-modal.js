/* ==========================================================================
 * Rainbow Trial — js/install-modal.js
 * 後方互換ラッパー: InstallHandler.install() に委譲
 * 公開グローバル: window.InstallModal
 * ========================================================================== */

(function (global) {
  'use strict';

  var InstallModal = {
    setDeferredPrompt: function (e) {
      if (global.InstallHandler) global.InstallHandler.deferredPrompt = e;
    },
    show: function () {
      if (global.InstallHandler) global.InstallHandler.install();
    },
    hide: function () {}
  };

  global.InstallModal = InstallModal;

})(typeof window !== 'undefined' ? window : this);
