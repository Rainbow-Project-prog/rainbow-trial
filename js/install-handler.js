/* ==========================================================================
 * Rainbow Trial — js/install-handler.js
 * OS 別インストール最適化ハンドラー
 *   - Android/PC : beforeinstallprompt → 1タップ自動プロンプト
 *   - iOS        : アニメーション付きステップガイド(3ステップ)
 *   - 成功時     : 紙吹雪 + 祝福モーダル
 *
 * 公開グローバル: window.InstallHandler
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 内部ユーティリティ
   * -------------------------------------------------------------------------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function removeById(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /* --------------------------------------------------------------------------
   * SVG モックアップ生成
   * -------------------------------------------------------------------------- */
  function _svgStep1() {
    // iPhone Safari — 画面下の共有ボタンをパルスでハイライト
    return (
      '<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" class="ios-mockup">' +
        // フレーム
        '<rect x="20" y="0" width="160" height="340" rx="22" fill="#1C1C1E" stroke="#3A3A3C" stroke-width="2"/>' +
        // ノッチ
        '<rect x="70" y="0" width="60" height="20" rx="10" fill="#0A0A0A"/>' +
        // 画面
        '<rect x="24" y="24" width="152" height="292" fill="#1A1A2E"/>' +
        // Safari アドレスバー
        '<rect x="34" y="34" width="132" height="22" rx="11" fill="#2C2C2E"/>' +
        '<text x="100" y="49" text-anchor="middle" font-size="9" fill="#8E8E93">rainbow-project-prog.github.io</text>' +
        // コンテンツ(ダミー行)
        '<rect x="34" y="70" width="132" height="10" rx="5" fill="#2C2C2E" opacity="0.6"/>' +
        '<rect x="34" y="88" width="100" height="10" rx="5" fill="#2C2C2E" opacity="0.4"/>' +
        '<rect x="34" y="106" width="120" height="10" rx="5" fill="#2C2C2E" opacity="0.4"/>' +
        // Safariボトムバー
        '<rect x="24" y="268" width="152" height="48" fill="#1C1C1E" stroke="#3A3A3C" stroke-width="0.5"/>' +
        // 共有ボタン(パルス)
        '<circle cx="100" cy="292" r="14" fill="#007AFF" class="share-btn-pulse"/>' +
        '<text x="100" y="289" text-anchor="middle" font-size="12" fill="white">⬆</text>' +
        '<text x="100" y="299" text-anchor="middle" font-size="6" fill="white">共有</text>' +
        // 指示矢印
        '<text x="100" y="260" text-anchor="middle" font-size="11" fill="#FFD54F" class="tap-arrow">↓ ここをタップ</text>' +
        // ホームインジケーター
        '<rect x="75" y="322" width="50" height="4" rx="2" fill="#555"/>' +
      '</svg>'
    );
  }

  function _svgStep2() {
    // 共有シートが開いた状態 — 「ホーム画面に追加」をハイライト
    return (
      '<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" class="ios-mockup">' +
        '<rect x="20" y="0" width="160" height="340" rx="22" fill="#1C1C1E" stroke="#3A3A3C" stroke-width="2"/>' +
        '<rect x="70" y="0" width="60" height="20" rx="10" fill="#0A0A0A"/>' +
        '<rect x="24" y="24" width="152" height="292" fill="#1A1A2E"/>' +
        // 共有シート背景
        '<rect x="24" y="150" width="152" height="166" rx="14" fill="#2C2C2E"/>' +
        // シートタイトル
        '<text x="100" y="172" text-anchor="middle" font-size="9" fill="#8E8E93">Safari から共有</text>' +
        // アイコン行
        '<circle cx="52" cy="200" r="16" fill="#3A3A3C"/>' +
        '<circle cx="84" cy="200" r="16" fill="#3A3A3C"/>' +
        '<circle cx="116" cy="200" r="16" fill="#3A3A3C"/>' +
        '<circle cx="148" cy="200" r="16" fill="#3A3A3C"/>' +
        // 「ホーム画面に追加」ハイライト行
        '<rect x="30" y="222" width="140" height="32" rx="10" fill="#007AFF" opacity="0.9" class="menu-highlight"/>' +
        '<text x="55" y="241" font-size="14" fill="white">📱</text>' +
        '<text x="76" y="242" font-size="10" fill="white" font-weight="bold">ホーム画面に追加</text>' +
        // 矢印
        '<text x="100" y="268" text-anchor="middle" font-size="10" fill="#FFD54F" class="tap-arrow">↑ これを選択</text>' +
        '<rect x="75" y="322" width="50" height="4" rx="2" fill="#555"/>' +
      '</svg>'
    );
  }

  function _svgStep3() {
    // 「追加」確認ダイアログ — 「追加」ボタンをハイライト
    return (
      '<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" class="ios-mockup">' +
        '<rect x="20" y="0" width="160" height="340" rx="22" fill="#1C1C1E" stroke="#3A3A3C" stroke-width="2"/>' +
        '<rect x="70" y="0" width="60" height="20" rx="10" fill="#0A0A0A"/>' +
        '<rect x="24" y="24" width="152" height="292" fill="#1A1A2E"/>' +
        // ナビゲーションバー
        '<rect x="24" y="24" width="152" height="44" fill="#1C1C1E" stroke="#3A3A3C" stroke-width="0.5"/>' +
        '<text x="44" y="50" font-size="10" fill="#007AFF">キャンセル</text>' +
        '<text x="100" y="50" text-anchor="middle" font-size="11" fill="white" font-weight="bold">ホーム画面に追加</text>' +
        // 「追加」ボタン(ハイライト)
        '<rect x="148" y="36" width="24" height="20" rx="6" fill="#007AFF" class="menu-highlight"/>' +
        '<text x="160" y="50" text-anchor="middle" font-size="10" fill="white" font-weight="bold">追加</text>' +
        // アイコンプレビュー
        '<rect x="74" y="90" width="52" height="52" rx="12" fill="#9775FA"/>' +
        '<text x="100" y="122" text-anchor="middle" font-size="22" fill="white">🌈</text>' +
        '<text x="100" y="160" text-anchor="middle" font-size="10" fill="white">Rainbow Trial</text>' +
        // 名前フィールド
        '<rect x="34" y="180" width="132" height="30" rx="8" fill="#2C2C2E"/>' +
        '<text x="100" y="200" text-anchor="middle" font-size="10" fill="white">Rainbow Trial</text>' +
        // 矢印
        '<text x="158" y="30" font-size="10" fill="#FFD54F" class="tap-arrow">← 追加</text>' +
        '<rect x="75" y="322" width="50" height="4" rx="2" fill="#555"/>' +
      '</svg>'
    );
  }

  /* --------------------------------------------------------------------------
   * iOS アニメーションガイド
   * -------------------------------------------------------------------------- */
  var _iosTimer = null;
  var _iosCurrentStep = 1;

  function _buildIOSGuideHTML() {
    return (
      '<div class="install-guide">' +
        '<button class="install-guide__close" type="button" aria-label="閉じる">×</button>' +
        '<h2 class="install-guide__title">📲 ホーム画面に追加する手順</h2>' +
        '<p class="install-guide__subtitle">3ステップで完了します</p>' +

        // ステップ1
        '<div class="ios-step is-active" data-step="1">' +
          '<div class="ios-step__illust">' + _svgStep1() + '</div>' +
          '<div class="ios-step__num">STEP 1 / 3</div>' +
          '<p class="ios-step__desc">画面下の <strong>【共有ボタン ⬆】</strong> をタップ</p>' +
        '</div>' +

        // ステップ2
        '<div class="ios-step" data-step="2">' +
          '<div class="ios-step__illust">' + _svgStep2() + '</div>' +
          '<div class="ios-step__num">STEP 2 / 3</div>' +
          '<p class="ios-step__desc">メニューを下にスクロールして<br><strong>【ホーム画面に追加】</strong> を選択</p>' +
        '</div>' +

        // ステップ3
        '<div class="ios-step" data-step="3">' +
          '<div class="ios-step__illust">' + _svgStep3() + '</div>' +
          '<div class="ios-step__num">STEP 3 / 3</div>' +
          '<p class="ios-step__desc">右上の <strong>【追加】</strong> をタップして完了 ✅</p>' +
        '</div>' +

        // ナビ
        '<div class="ios-guide__nav">' +
          '<button class="ios-guide__prev" type="button" aria-label="前のステップ">← 戻る</button>' +
          '<div class="ios-guide__dots">' +
            '<span class="ios-guide__dot is-active" data-step="1"></span>' +
            '<span class="ios-guide__dot" data-step="2"></span>' +
            '<span class="ios-guide__dot" data-step="3"></span>' +
          '</div>' +
          '<button class="ios-guide__next" type="button" aria-label="次のステップ">次へ →</button>' +
        '</div>' +

        '<button class="install-guide__done" type="button">✅ ホーム画面に追加しました</button>' +
      '</div>'
    );
  }

  function _goToIOSStep(overlay, step) {
    _iosCurrentStep = step;
    overlay.querySelectorAll('.ios-step').forEach(function (el) {
      el.classList.toggle('is-active', parseInt(el.getAttribute('data-step'), 10) === step);
    });
    overlay.querySelectorAll('.ios-guide__dot').forEach(function (el) {
      el.classList.toggle('is-active', parseInt(el.getAttribute('data-step'), 10) === step);
    });
    var prev = overlay.querySelector('.ios-guide__prev');
    var next = overlay.querySelector('.ios-guide__next');
    if (prev) prev.disabled = (step === 1);
    if (next) next.disabled = (step === 3);
  }

  function _bindIOSGuideEvents(overlay) {
    var self = InstallHandler;

    // 閉じる
    var closeBtn = overlay.querySelector('.install-guide__close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      _stopIOSTimer();
      overlay.classList.remove('is-open');
      overlay.addEventListener('transitionend', function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, { once: true });
    });

    // 前へ
    var prevBtn = overlay.querySelector('.ios-guide__prev');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      _stopIOSTimer();
      if (_iosCurrentStep > 1) _goToIOSStep(overlay, _iosCurrentStep - 1);
    });

    // 次へ
    var nextBtn = overlay.querySelector('.ios-guide__next');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      _stopIOSTimer();
      if (_iosCurrentStep < 3) _goToIOSStep(overlay, _iosCurrentStep + 1);
    });

    // ドットクリック
    overlay.querySelectorAll('.ios-guide__dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        _stopIOSTimer();
        _goToIOSStep(overlay, parseInt(this.getAttribute('data-step'), 10));
      });
    });

    // 「完了しました」
    var doneBtn = overlay.querySelector('.install-guide__done');
    if (doneBtn) doneBtn.addEventListener('click', function () {
      _stopIOSTimer();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      self.onInstalled();
    });

    // オーバーレイ背景クリックで閉じる
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        _stopIOSTimer();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });

    // 5秒ごとに自動進行
    _startIOSTimer(overlay);
  }

  function _startIOSTimer(overlay) {
    _stopIOSTimer();
    _iosTimer = setInterval(function () {
      if (_iosCurrentStep < 3) {
        _goToIOSStep(overlay, _iosCurrentStep + 1);
      } else {
        _stopIOSTimer();
      }
    }, 5000);
  }

  function _stopIOSTimer() {
    if (_iosTimer) { clearInterval(_iosTimer); _iosTimer = null; }
  }

  /* --------------------------------------------------------------------------
   * Android 手動ガイド(自動プロンプト不可時のフォールバック)
   * -------------------------------------------------------------------------- */
  function _buildAndroidGuideHTML() {
    return (
      '<div class="install-guide">' +
        '<button class="install-guide__close" type="button" aria-label="閉じる">×</button>' +
        '<h2 class="install-guide__title">📲 ホーム画面に追加する手順</h2>' +
        '<ol class="install-guide__steps">' +
          '<li><span class="install-step__num">1</span><span>Chrome 右上の <strong>「⋮」メニュー</strong> をタップ</span></li>' +
          '<li><span class="install-step__num">2</span><span><strong>「ホーム画面に追加」</strong> を選択</span></li>' +
          '<li><span class="install-step__num">3</span><span><strong>「追加」</strong> をタップして完了 ✅</span></li>' +
        '</ol>' +
        '<p class="install-modal__note">※ Chrome ブラウザからのみ追加できます</p>' +
        '<button class="install-guide__done" type="button">✅ ホーム画面に追加しました</button>' +
      '</div>'
    );
  }

  /* --------------------------------------------------------------------------
   * PC 手動ガイド(自動プロンプト不可時のフォールバック)
   * -------------------------------------------------------------------------- */
  function _buildPCGuideHTML() {
    return (
      '<div class="install-guide">' +
        '<button class="install-guide__close" type="button" aria-label="閉じる">×</button>' +
        '<h2 class="install-guide__title">💻 アプリとしてインストール</h2>' +
        '<ol class="install-guide__steps">' +
          '<li><span class="install-step__num">1</span><span>アドレスバー右側の <strong>「⊕ インストール」アイコン</strong> をクリック</span></li>' +
          '<li><span class="install-step__num">2</span><span>「<strong>インストール</strong>」をクリックして完了 ✅</span></li>' +
        '</ol>' +
        '<p class="install-modal__note">※ アイコンが表示されない場合は Chrome / Edge をお試しください</p>' +
        '<button class="install-guide__done" type="button">✅ インストールしました</button>' +
      '</div>'
    );
  }

  /* --------------------------------------------------------------------------
   * 共通ガイドオーバーレイ表示
   * -------------------------------------------------------------------------- */
  function _showGuideOverlay(id, innerHTML, isIOS) {
    removeById(id);
    var overlay = document.createElement('div');
    overlay.id        = id;
    overlay.className = 'install-guide-overlay';
    overlay.innerHTML = innerHTML;
    document.body.appendChild(overlay);

    requestAnimationFrame(function () { overlay.classList.add('is-open'); });

    if (isIOS) {
      _iosCurrentStep = 1;
      _goToIOSStep(overlay, 1);
      _bindIOSGuideEvents(overlay);
    } else {
      // Android / PC: 閉じる + 完了ボタン
      var closeBtn = overlay.querySelector('.install-guide__close');
      if (closeBtn) closeBtn.addEventListener('click', function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
      var doneBtn = overlay.querySelector('.install-guide__done');
      if (doneBtn) doneBtn.addEventListener('click', function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        InstallHandler.onInstalled();
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
    }
  }

  /* --------------------------------------------------------------------------
   * 成功モーダル + 紙吹雪
   * -------------------------------------------------------------------------- */
  function _launchConfetti() {
    var container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    var colors = ['#FF6B6B','#FFD93D','#6BCB77','#4DABF7','#A855F7','#FF9F43'];
    for (var i = 0; i < 60; i++) {
      (function (i) {
        var piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.cssText = [
          'left:' + Math.random() * 100 + 'vw',
          'background:' + colors[Math.floor(Math.random() * colors.length)],
          'width:'  + (6 + Math.random() * 8) + 'px',
          'height:' + (6 + Math.random() * 8) + 'px',
          'animation-delay:' + (Math.random() * 1.2) + 's',
          'animation-duration:' + (2 + Math.random() * 2) + 's',
          'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px')
        ].join(';');
        container.appendChild(piece);
      })(i);
    }

    setTimeout(function () {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 4000);
  }

  function _buildSuccessHTML() {
    return (
      '<div class="install-success-card">' +
        '<div class="install-success-card__icon">🎉</div>' +
        '<h2 class="install-success-card__title">インストール完了!</h2>' +
        '<p class="install-success-card__body">' +
          'Rainbow Trial がホーム画面に追加されました。' +
        '</p>' +
        '<p class="install-success-card__sub">🌈 これでより快適に体験できます!</p>' +
        '<ul class="install-success-card__list">' +
          '<li>✓ 通知でシグナルを見逃さない</li>' +
          '<li>✓ 1タップで起動</li>' +
          '<li>✓ オフラインでも使える</li>' +
        '</ul>' +
        '<button class="install-success-card__btn btn btn--primary btn--block" type="button">続ける</button>' +
      '</div>'
    );
  }

  /* --------------------------------------------------------------------------
   * ボタン文言の動的更新
   * -------------------------------------------------------------------------- */
  function _updateButtonLabels(canAutoInstall) {
    var label = canAutoInstall ? '📲 1タップでインストール' : '📲 ホーム画面に追加する';
    var selectors = [
      '#welcome-install-btn',
      '.install-banner-action',
      '#hikari-modal-install-btn',
      '#settings-install-btn'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el) el.textContent = label;
      });
    });
  }

  /* ========================================================================
   * 公開 API
   * ======================================================================== */
  var InstallHandler = {
    deferredPrompt: null,
    _os: null,

    init: function () {
      var self = this;
      this._os = this.detectOS();

      // <head> で早期キャプチャ済みのプロンプトを引き継ぐ
      if (global._deferredInstallPrompt) {
        self.deferredPrompt = global._deferredInstallPrompt;
        global._deferredInstallPrompt = null;
        if (self._os !== 'ios') _updateButtonLabels(true);
        console.log('[PWA] InstallHandler: picked up early-captured prompt');
      }

      // 以降に発火する場合も捕捉(二重登録防止)
      if (!this._initDone) {
        this._initDone = true;
        global.addEventListener('beforeinstallprompt', function (e) {
          e.preventDefault();
          self.deferredPrompt = e;
          if (self._os !== 'ios') _updateButtonLabels(true);
          console.log('[PWA] beforeinstallprompt received');
        });

        global.addEventListener('appinstalled', function () {
          self.onInstalled();
        });
      }

      // スタンドアロン起動中は全インストールUIを非表示
      if (this.isStandalone()) {
        this._hideAllInstallUI();
      }
    },

    detectOS: function () {
      var ua = navigator.userAgent;
      if (/iPad|iPhone|iPod/.test(ua) && !global.MSStream) return 'ios';
      if (/Android/.test(ua)) return 'android';
      return 'pc';
    },

    isStandalone: function () {
      return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
             global.navigator.standalone === true ||
             (document.referrer && document.referrer.includes('android-app://'));
    },

    /** メイン起動関数 — 全インストールボタンからこれを呼ぶ */
    install: function () {
      var self = this;
      var os   = this._os || this.detectOS();

      if (os === 'ios') {
        this.showIOSAnimatedGuide();
      } else if (this.deferredPrompt) {
        // Android/PC: 1タップ自動プロンプト
        var p = this.deferredPrompt;
        this.deferredPrompt = null;
        p.prompt();
        p.userChoice.then(function (result) {
          if (result.outcome === 'accepted') self.onInstalled();
          // rejected でもボタン文言を元に戻す
          else _updateButtonLabels(false);
        }).catch(function () { _updateButtonLabels(false); });
      } else if (os === 'android') {
        this.showAndroidManualGuide();
      } else {
        this.showPCManualGuide();
      }
    },

    onInstalled: function () {
      localStorage.setItem('user_installed', 'true');
      this._hideAllInstallUI();
      this.showSuccessModal();
      if (global.SoundSystem) global.SoundSystem.play('achievement');
    },

    _hideAllInstallUI: function () {
      document.querySelectorAll('#install-banner, .install-section').forEach(function (el) {
        el.style.display = 'none';
      });
    },

    /* ---- ガイド表示 ---- */

    showIOSAnimatedGuide: function () {
      _showGuideOverlay('ios-install-guide', _buildIOSGuideHTML(), true);
    },

    showAndroidManualGuide: function () {
      _showGuideOverlay('android-install-guide', _buildAndroidGuideHTML(), false);
    },

    showPCManualGuide: function () {
      _showGuideOverlay('pc-install-guide', _buildPCGuideHTML(), false);
    },

    /* ---- 成功モーダル ---- */

    showSuccessModal: function () {
      removeById('install-success-overlay');
      var overlay = document.createElement('div');
      overlay.id        = 'install-success-overlay';
      overlay.className = 'install-guide-overlay';
      overlay.innerHTML = _buildSuccessHTML();
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });

      _launchConfetti();

      var btn = overlay.querySelector('.install-success-card__btn');
      if (btn) btn.addEventListener('click', function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
    }
  };

  global.InstallHandler = InstallHandler;

})(typeof window !== 'undefined' ? window : this);
