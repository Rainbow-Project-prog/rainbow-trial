/* ==========================================================================
 * Rainbow Trial — js/install-modal.js
 * 共通インストール詳細モーダル(iOS / Android / PC 対応)
 * 公開グローバル: window.InstallModal
 * ========================================================================== */

(function (global) {
  'use strict';

  var InstallModal = {
    _deferredPrompt: null,

    /** Android の beforeinstallprompt イベントをセット */
    setDeferredPrompt: function (e) {
      this._deferredPrompt = e;
    },

    show: function () {
      var self = this;
      var existing = document.getElementById('install-modal-overlay');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      var ua = navigator.userAgent;
      var defaultOS = 'pc';
      if (/iPad|iPhone|iPod/.test(ua) && !global.MSStream) defaultOS = 'ios';
      else if (/Android/.test(ua)) defaultOS = 'android';

      var overlay = document.createElement('div');
      overlay.id        = 'install-modal-overlay';
      overlay.className = 'install-modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML  = self._buildHTML(defaultOS);
      document.body.appendChild(overlay);

      requestAnimationFrame(function () {
        overlay.classList.add('install-modal-overlay--open');
      });

      self._bindEvents(overlay, defaultOS);
    },

    hide: function () {
      var overlay = document.getElementById('install-modal-overlay');
      if (!overlay) return;
      overlay.classList.remove('install-modal-overlay--open');
      overlay.addEventListener('transitionend', function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, { once: true });
    },

    _buildHTML: function (defaultOS) {
      function activeIf(os) { return defaultOS === os ? ' is-active' : ''; }

      var androidNative = (defaultOS === 'android' && !!this._deferredPrompt)
        ? '<button class="btn btn--primary btn--block install-modal__native-btn" id="install-modal-native-btn" type="button">📲 今すぐホーム画面に追加</button>' +
          '<div class="install-modal__divider">または手動で追加:</div>'
        : '';

      return (
        '<div class="install-modal">' +
          '<button class="install-modal__close" type="button" aria-label="閉じる">×</button>' +
          '<div class="install-modal__header">' +
            '<h2>📲 ホーム画面に追加する方法</h2>' +
            '<p>アプリのように快適に使えるようになります</p>' +
          '</div>' +
          '<div class="install-modal__tabs">' +
            '<button class="install-modal__tab' + activeIf('ios')     + '" data-os="ios"     type="button">iPhone</button>' +
            '<button class="install-modal__tab' + activeIf('android') + '" data-os="android" type="button">Android</button>' +
            '<button class="install-modal__tab' + activeIf('pc')      + '" data-os="pc"      type="button">PC</button>' +
          '</div>' +
          '<div class="install-modal__content">' +

            /* ---- iOS ---- */
            '<div class="install-modal__instruction' + activeIf('ios') + '" data-os="ios">' +
              '<ol class="install-modal__steps">' +
                '<li><span class="install-step__num">1</span><span>画面下部の <strong>「共有」ボタン 📤</strong> をタップ</span></li>' +
                '<li><span class="install-step__num">2</span><span>メニューを下にスクロールして<br><strong>「ホーム画面に追加」</strong>を選択</span></li>' +
                '<li><span class="install-step__num">3</span><span>右上の <strong>「追加」</strong> をタップして完了 ✅</span></li>' +
              '</ol>' +
              '<p class="install-modal__note">※ Safari ブラウザからのみ追加できます</p>' +
            '</div>' +

            /* ---- Android ---- */
            '<div class="install-modal__instruction' + activeIf('android') + '" data-os="android">' +
              androidNative +
              '<ol class="install-modal__steps">' +
                '<li><span class="install-step__num">1</span><span>右上の <strong>「⋮」メニュー</strong> をタップ</span></li>' +
                '<li><span class="install-step__num">2</span><span><strong>「ホーム画面に追加」</strong> を選択</span></li>' +
                '<li><span class="install-step__num">3</span><span><strong>「追加」</strong> をタップして完了 ✅</span></li>' +
              '</ol>' +
              '<p class="install-modal__note">※ Chrome ブラウザからのみ追加できます</p>' +
            '</div>' +

            /* ---- PC ---- */
            '<div class="install-modal__instruction' + activeIf('pc') + '" data-os="pc">' +
              '<ol class="install-modal__steps">' +
                '<li><span class="install-step__num">1</span><span>Chrome / Edge のアドレスバー右側の<br><strong>「⊕ インストール」アイコン</strong>をクリック</span></li>' +
                '<li><span class="install-step__num">2</span><span><strong>「インストール」</strong> をクリックして完了 ✅</span></li>' +
              '</ol>' +
              '<p class="install-modal__note">※ アイコンが表示されない場合は Chrome / Edge をお試しください</p>' +
            '</div>' +

          '</div>' +
        '</div>'
      );
    },

    _bindEvents: function (overlay, defaultOS) {
      var self = this;

      /* 閉じる */
      var closeBtn = overlay.querySelector('.install-modal__close');
      if (closeBtn) closeBtn.addEventListener('click', function () { self.hide(); });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) self.hide();
      });

      /* タブ切替 */
      var tabs = overlay.querySelectorAll('.install-modal__tab');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var os = this.getAttribute('data-os');
          tabs.forEach(function (t) { t.classList.remove('is-active'); });
          this.classList.add('is-active');
          overlay.querySelectorAll('.install-modal__instruction').forEach(function (el) {
            el.classList.toggle('is-active', el.getAttribute('data-os') === os);
          });
        });
      });

      /* Android ネイティブインストール */
      var nativeBtn = overlay.querySelector('#install-modal-native-btn');
      if (nativeBtn && self._deferredPrompt) {
        nativeBtn.addEventListener('click', function () {
          var prompt = self._deferredPrompt;
          if (!prompt) return;
          prompt.prompt();
          prompt.userChoice.then(function () {
            self._deferredPrompt = null;
            localStorage.setItem('user_installed', 'true');
            self.hide();
            self._showSuccess();
          }).catch(function () {});
        });
      }
    },

    _showSuccess: function () {
      var toast = document.createElement('div');
      toast.className = 'install-success-toast';
      toast.textContent = '🎉 インストール完了！ホーム画面から起動できます🌈';
      document.body.appendChild(toast);
      requestAnimationFrame(function () { toast.classList.add('is-visible'); });
      setTimeout(function () {
        toast.classList.remove('is-visible');
        setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
      }, 4000);
    }
  };

  global.InstallModal = InstallModal;

})(typeof window !== 'undefined' ? window : this);
