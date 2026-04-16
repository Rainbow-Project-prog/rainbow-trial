/* ==========================================================================
 * Rainbow Trial — js/home-install.js
 * ホーム画面のインストール促進セクション
 *
 * renderHTML()  : セクションの HTML 文字列を返す(app.js の renderHome から呼ぶ)
 * init()        : 表示判定 + ボタン文言更新(_bindHomeEvents から呼ぶ)
 * dismiss()     : 「今は表示しない」ボタンから呼ぶ
 *
 * 依存: window.DeviceDetect, window.InstallHandler
 * 公開グローバル: window.HomeInstallSection
 *
 * ボタン click は onclick 属性で直接 InstallHandler.install() を呼ぶ。
 * これにより user gesture を確実に伝搬させる(addEventListener だと二重登録の懸念あり)。
 * ========================================================================== */

(function (global) {
  'use strict';

  var DISMISS_KEY      = 'home-install-section-dismissed';
  var DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7日間

  var HomeInstallSection = {

    /* --- 表示判定 ---- */

    isInstalled: function () {
      var dd = global.DeviceDetect;
      if (dd && dd.isStandalone && dd.isStandalone()) return true;
      return localStorage.getItem('user_installed') === 'true';
    },

    isDismissed: function () {
      var at = localStorage.getItem(DISMISS_KEY);
      if (!at) return false;
      return (Date.now() - parseInt(at, 10)) < DISMISS_DURATION;
    },

    shouldShow: function () {
      return !this.isInstalled() && !this.isDismissed();
    },

    /* --- ボタン文言 ---- */

    _btnLabel: function () {
      var dd = global.DeviceDetect;
      var ih = global.InstallHandler;
      if (dd && dd.isIOS && dd.isIOS())   return '📲 ホーム画面への追加方法';
      if (ih && ih.deferredPrompt)        return '📲 1タップでインストール';
      return '📲 ホーム画面に追加';
    },

    /* --- HTML 生成(renderHome から呼ばれる) ---- */

    renderHTML: function () {
      // インストール済み(スタンドアロン or フラグ)の場合は DOM に入れない
      if (this.isInstalled()) {
        if (global.console) console.log('[HomeInstall] skip renderHTML: already installed');
        return '';
      }

      return (
        '<section class="home-install-section" id="home-install-section" data-install-ui style="display:block">' +
          '<div class="home-install-header">' +
            '<span class="home-install-icon">📲</span>' +
            '<div class="home-install-title">' +
              '<h3>アプリとして使う</h3>' +
              '<p class="home-install-subtitle">ホーム画面に追加してもっと便利に</p>' +
            '</div>' +
          '</div>' +
          '<div class="home-install-benefits">' +
            '<div class="home-benefit-row">' +
              '<span class="benefit-check">✓</span>' +
              '<span>シグナル受信を通知でお知らせ</span>' +
            '</div>' +
            '<div class="home-benefit-row">' +
              '<span class="benefit-check">✓</span>' +
              '<span>ホーム画面から1タップで起動</span>' +
            '</div>' +
            '<div class="home-benefit-row">' +
              '<span class="benefit-check">✓</span>' +
              '<span>オフラインでも使える</span>' +
            '</div>' +
          '</div>' +
          '<button class="home-install-btn-primary" data-install-btn id="home-install-main-btn" type="button" ' +
                  'onclick="if(window.InstallHandler)window.InstallHandler.install();">' +
            this._btnLabel() +
          '</button>' +
          '<button class="home-install-btn-skip" id="home-install-skip-btn" type="button" ' +
                  'onclick="if(window.HomeInstallSection)window.HomeInstallSection.dismiss();">' +
            '今は表示しない' +
          '</button>' +
        '</section>'
      );
    },

    /* --- 初期化(_bindHomeEvents から呼ばれる) ---- */

    init: function () {
      var section = document.getElementById('home-install-section');
      if (!section) {
        if (global.console) console.warn('[HomeInstall] section not found in DOM');
        return;
      }

      if (this.isInstalled()) {
        section.style.display = 'none';
        if (global.console) console.log('[HomeInstall] hidden: isInstalled=true');
        return;
      }

      if (this.isDismissed()) {
        section.style.display = 'none';
        if (global.console) console.log('[HomeInstall] hidden: dismissed');
        return;
      }

      section.style.display = 'block';
      if (global.console) console.log('[HomeInstall] shown');

      // 後から InstallHandler.deferredPrompt が set されたケースにも対応してラベル更新
      var mainBtn = document.getElementById('home-install-main-btn');
      if (mainBtn) mainBtn.textContent = this._btnLabel();
    },

    /* --- 非表示処理 ---- */

    dismiss: function () {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      var section = document.getElementById('home-install-section');
      if (!section) return;
      section.style.transition = 'opacity 0.3s ease, max-height 0.4s ease';
      section.style.opacity    = '0';
      section.style.maxHeight  = '0';
      section.style.overflow   = 'hidden';
      setTimeout(function () {
        if (section.parentNode) section.style.display = 'none';
      }, 400);
    }
  };

  global.HomeInstallSection = HomeInstallSection;

})(typeof window !== 'undefined' ? window : this);
