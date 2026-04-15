/* ==========================================================================
 * Rainbow Trial — js/effects.js
 * Phase 3 エフェクト・アニメーション制御
 *
 * 依存: window.SoundSystem (js/sound.js)
 *       window.LevelSystem (js/level-system.js)
 *
 * 公開グローバル: window.Effects
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 0. prefers-reduced-motion チェック
   * -------------------------------------------------------------------------- */
  function isReducedMotion() {
    try {
      var s = global.TrialStore && global.TrialStore.getState();
      if (s && s.settings && s.settings.animations && s.settings.animations.reduced) return true;
    } catch (e) { /* skip */ }
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* --------------------------------------------------------------------------
   * 1. 全画面フラッシュ
   * -------------------------------------------------------------------------- */
  var flashEl = null;

  function _getFlashEl() {
    if (!flashEl) {
      flashEl = document.createElement('div');
      flashEl.className = 'screen-flash';
      document.body.appendChild(flashEl);
    }
    return flashEl;
  }

  function flash(colorClass) {
    if (isReducedMotion()) return;
    var el = _getFlashEl();
    el.className = 'screen-flash screen-flash--' + colorClass;
    // 強制リフロー
    void el.offsetWidth;
    el.classList.add('screen-flash--active');
    el.addEventListener('animationend', function () {
      el.classList.remove('screen-flash--active');
    }, { once: true });
  }

  /* --------------------------------------------------------------------------
   * 2. 紙吹雪(TP HIT 演出)— 自前 Canvas 実装
   * -------------------------------------------------------------------------- */
  var confettiCanvas = null;
  var confettiCtx    = null;
  var confettiPieces = [];
  var confettiRafId  = null;

  function _initConfettiCanvas() {
    if (confettiCanvas) return;
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'confetti-canvas';
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');
  }

  function launchConfetti(duration) {
    if (isReducedMotion()) return;
    _initConfettiCanvas();
    confettiCanvas.width  = global.innerWidth;
    confettiCanvas.height = global.innerHeight;

    var colors = ['#9775FA','#FFD700','#4CAF50','#FF6B6B','#42A5F5','#FF8C00','#EC407A'];
    var count  = global.innerWidth < 500 ? 60 : 100;

    confettiPieces = [];
    for (var i = 0; i < count; i++) {
      confettiPieces.push({
        x:    Math.random() * confettiCanvas.width,
        y:    Math.random() * -confettiCanvas.height,
        w:    6 + Math.random() * 8,
        h:    4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx:   (Math.random() - 0.5) * 3,
        vy:   2 + Math.random() * 4,
        rot:  Math.random() * 360,
        vrot: (Math.random() - 0.5) * 6
      });
    }

    var startTime = Date.now();
    var totalMs   = (duration || 3000);

    if (confettiRafId) cancelAnimationFrame(confettiRafId);

    function tick() {
      var elapsed = Date.now() - startTime;
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

      var alive = false;
      for (var j = 0; j < confettiPieces.length; j++) {
        var p = confettiPieces[j];
        p.x   += p.vx;
        p.y   += p.vy;
        p.rot += p.vrot;
        p.vy  *= 1.005; // 重力

        if (p.y < confettiCanvas.height + 20) alive = true;

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot * Math.PI / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.globalAlpha = elapsed > totalMs ? Math.max(0, 1 - (elapsed - totalMs) / 500) : 1;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      }

      if (alive && elapsed < totalMs + 600) {
        confettiRafId = requestAnimationFrame(tick);
      } else {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiRafId = null;
      }
    }
    confettiRafId = requestAnimationFrame(tick);
  }

  /* --------------------------------------------------------------------------
   * 3. パーティクル(レアリティ別)
   * -------------------------------------------------------------------------- */
  var particleCanvas = null;
  var particleCtx    = null;
  var particles      = [];
  var particleRafId  = null;

  function _initParticleCanvas() {
    if (particleCanvas) return;
    particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'particle-canvas';
    document.body.appendChild(particleCanvas);
    particleCtx = particleCanvas.getContext('2d');
  }

  function launchParticles(count, colorList) {
    if (isReducedMotion()) return;
    _initParticleCanvas();
    particleCanvas.width  = global.innerWidth;
    particleCanvas.height = global.innerHeight;

    var cx = global.innerWidth  / 2;
    var cy = global.innerHeight / 2;

    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 2 + Math.random() * 5;
      particles.push({
        x:     cx,
        y:     cy,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed - 2,
        r:     3 + Math.random() * 4,
        color: colorList[Math.floor(Math.random() * colorList.length)],
        life:  1.0,
        decay: 0.015 + Math.random() * 0.015
      });
    }

    if (particleRafId) return; // 既に走っている場合は追加のみ

    function tick() {
      particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      particles = particles.filter(function (p) {
        p.x    += p.vx;
        p.y    += p.vy;
        p.vy   += 0.12; // 重力
        p.life -= p.decay;

        if (p.life <= 0) return false;
        particleCtx.beginPath();
        particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        particleCtx.fillStyle = p.color;
        particleCtx.globalAlpha = p.life;
        particleCtx.fill();
        return true;
      });

      if (particles.length > 0) {
        particleRafId = requestAnimationFrame(tick);
      } else {
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        particleRafId = null;
      }
    }
    particleRafId = requestAnimationFrame(tick);
  }

  /* --------------------------------------------------------------------------
   * 4. 炎キャンバス (連勝演出)
   * -------------------------------------------------------------------------- */
  var flameCanvas  = null;
  var flameCtx     = null;
  var flameRafId   = null;
  var flameParticles = [];
  var flameActive  = false;

  function _initFlameCanvas() {
    if (flameCanvas) return;
    flameCanvas = document.createElement('canvas');
    flameCanvas.id = 'flame-canvas';
    document.body.appendChild(flameCanvas);
    flameCtx = flameCanvas.getContext('2d');
  }

  function startFlame() {
    if (isReducedMotion() || flameActive) return;
    _initFlameCanvas();
    flameActive = true;
    flameCanvas.width  = global.innerWidth;
    flameCanvas.height = global.innerHeight * 0.3;
    flameCanvas.classList.add('is-active');

    function spawnFlame() {
      if (!flameActive) return;
      for (var i = 0; i < 3; i++) {
        flameParticles.push({
          x:    Math.random() * flameCanvas.width,
          y:    flameCanvas.height,
          vx:   (Math.random() - 0.5) * 1.5,
          vy:   -(1 + Math.random() * 3),
          r:    4 + Math.random() * 8,
          life: 1.0,
          decay: 0.012 + Math.random() * 0.012,
          hue:  Math.random() * 40  // 0〜40 (赤〜オレンジ)
        });
      }
    }

    var spawnTimer = setInterval(spawnFlame, 50);

    function tick() {
      if (!flameActive) {
        clearInterval(spawnTimer);
        flameCtx.clearRect(0, 0, flameCanvas.width, flameCanvas.height);
        return;
      }
      flameCtx.clearRect(0, 0, flameCanvas.width, flameCanvas.height);
      flameParticles = flameParticles.filter(function (p) {
        p.x    += p.vx;
        p.y    += p.vy;
        p.r    *= 0.98;
        p.life -= p.decay;
        if (p.life <= 0 || p.r < 0.5) return false;

        var grad = flameCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, 'hsla(' + p.hue + ',100%,60%,' + p.life + ')');
        grad.addColorStop(1, 'hsla(' + (p.hue + 20) + ',100%,40%,0)');
        flameCtx.beginPath();
        flameCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        flameCtx.fillStyle = grad;
        flameCtx.fill();
        return true;
      });
      flameRafId = requestAnimationFrame(tick);
    }
    flameRafId = requestAnimationFrame(tick);
  }

  function stopFlame() {
    flameActive = false;
    if (flameCanvas) flameCanvas.classList.remove('is-active');
    if (flameRafId)  { cancelAnimationFrame(flameRafId); flameRafId = null; }
  }

  /* --------------------------------------------------------------------------
   * 5. レアリティ別シグナル受信演出
   * -------------------------------------------------------------------------- */
  function playRarityEffect(rarity) {
    rarity = (rarity || 'normal').toLowerCase();

    switch (rarity) {
      case 'good':
        flash('purple');
        break;

      case 'rare':
        flash('purple');
        launchParticles(15, ['#CE93D8','#9C27B0','#E1BEE7','#fff']);
        break;

      case 'epic':
        flash('orange');
        launchParticles(30, ['#FFCC80','#FF8C00','#FF6B6B','#FFD700']);
        _showRarityBadge('🔥 EPIC 🔥', 'epic');
        break;

      case 'legendary':
        flash('rainbow');
        launchParticles(60, ['#FF0000','#FF8C00','#FFD700','#00C853','#2979FF','#D500F9','#fff']);
        _showLegendaryBadge();
        break;

      default:
        // NORMAL: 演出なし
        break;
    }

    if (global.SoundSystem) {
      global.SoundSystem.playSignalSound(rarity);
    }
  }

  function _showRarityBadge(text, cls) {
    if (isReducedMotion()) return;
    var el = document.createElement('div');
    el.className = 'legendary-badge';
    el.innerHTML =
      '<div class="legendary-badge__inner">' +
        '<span class="rarity-badge rarity-badge--' + cls + '" style="font-size:1.4rem;padding:8px 20px">' + text + '</span>' +
      '</div>';
    document.body.appendChild(el);
    setTimeout(function () {
      el.querySelector('.legendary-badge__inner').classList.add('is-out');
      el.addEventListener('transitionend', function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, { once: true });
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
    }, 2000);
  }

  function _showLegendaryBadge() {
    if (isReducedMotion()) return;
    var el = document.createElement('div');
    el.className = 'legendary-badge';
    el.innerHTML =
      '<div class="legendary-badge__inner">' +
        '<span class="legendary-badge__icon">🌈</span>' +
        '<span class="legendary-badge__label">LEGENDARY</span>' +
      '</div>';
    document.body.appendChild(el);
    setTimeout(function () {
      var inner = el.querySelector('.legendary-badge__inner');
      if (inner) inner.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
    }, 5000);
  }

  /* --------------------------------------------------------------------------
   * 6. TP HIT 演出
   * -------------------------------------------------------------------------- */
  function showTPHit(pnl, pips) {
    flash('green');
    launchConfetti(3000);

    if (isReducedMotion()) return;

    var el = document.createElement('div');
    el.className = 'result-splash result-splash--tp';
    el.innerHTML =
      '<div class="result-splash__inner">' +
        '<span class="result-splash__icon">🏆</span>' +
        '<span class="result-splash__label">TP HIT!</span>' +
        '<span class="result-splash__pnl">+¥' + Math.abs(pnl).toLocaleString() + ' (+' + Math.abs(pips) + 'pips)</span>' +
      '</div>';
    document.body.appendChild(el);

    if (global.SoundSystem) global.SoundSystem.play('tp_hit');

    setTimeout(function () {
      var inner = el.querySelector('.result-splash__inner');
      if (inner) inner.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, 2200);
  }

  /* --------------------------------------------------------------------------
   * 7. SL HIT 演出
   * -------------------------------------------------------------------------- */
  function showSLHit(pnl, pips) {
    flash('red');

    if (isReducedMotion()) return;

    var msg = [
      '次は必ず取り返せる！',
      'この経験が糧になる。',
      '損切りは勇気の証だ。',
      'ルールを守ったことに価値がある。'
    ];
    var el = document.createElement('div');
    el.className = 'result-splash result-splash--sl';
    el.innerHTML =
      '<div class="result-splash__inner">' +
        '<span class="result-splash__icon">📉</span>' +
        '<span class="result-splash__label">SL HIT</span>' +
        '<span class="result-splash__pnl" style="color:#F44336">-¥' + Math.abs(pnl).toLocaleString() + '</span>' +
        '<span class="result-splash__pnl" style="font-size:0.9rem;color:#aaa;margin-top:6px">' + msg[Math.floor(Math.random() * msg.length)] + '</span>' +
      '</div>';
    document.body.appendChild(el);

    if (global.SoundSystem) global.SoundSystem.play('sl_hit');

    setTimeout(function () {
      var inner = el.querySelector('.result-splash__inner');
      if (inner) inner.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, 2500);
  }

  /* --------------------------------------------------------------------------
   * 8. レベルアップモーダル
   * -------------------------------------------------------------------------- */
  function showLevelUp(fromLevel, toLevel, onClose) {
    flash('purple');
    launchParticles(40, ['#9775FA','#FFD700','#fff','#FF6B6B','#42A5F5']);

    if (global.SoundSystem) global.SoundSystem.play('level_up');

    var overlay = document.createElement('div');
    overlay.className = 'levelup-overlay';

    if (global.LevelSystem) {
      overlay.innerHTML = global.LevelSystem.buildLevelUpHTML(fromLevel, toLevel);
    } else {
      overlay.innerHTML =
        '<div class="levelup-modal__wrap">' +
          '<div class="levelup-modal__label">LEVEL UP!</div>' +
          '<div class="levelup-modal__num">Lv.' + toLevel.level + '</div>' +
          '<div class="levelup-modal__icon">' + toLevel.icon + '</div>' +
          '<div class="levelup-modal__title">' + toLevel.title + '</div>' +
          '<button class="levelup-modal__btn btn btn--primary" id="levelup-continue">続ける</button>' +
        '</div>';
    }

    document.body.appendChild(overlay);

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onClose === 'function') onClose();
    }

    var btn = overlay.querySelector('#levelup-continue');
    if (btn) btn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
  }

  /* --------------------------------------------------------------------------
   * 9. XP 獲得ポップアップ
   * -------------------------------------------------------------------------- */
  function showXPPopup(amount, anchorEl) {
    if (isReducedMotion() || !amount) return;

    var el = document.createElement('div');
    el.className = 'xp-popup';
    el.textContent = '+' + amount + ' XP';

    // アンカー要素の近くに表示
    var x = global.innerWidth  / 2;
    var y = global.innerHeight / 2;
    if (anchorEl) {
      var rect = anchorEl.getBoundingClientRect();
      x = rect.left + rect.width  / 2;
      y = rect.top  + rect.height / 2;
    }
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.style.transform = 'translateX(-50%)';

    document.body.appendChild(el);
    el.addEventListener('animationend', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, { once: true });
  }

  /* --------------------------------------------------------------------------
   * 10. 連勝バナー更新
   * -------------------------------------------------------------------------- */
  function updateStreakBanner(streak) {
    var container = document.getElementById('streak-banner-container');
    if (!container) return;

    if (streak < 2) {
      container.innerHTML = '';
      stopFlame();
      return;
    }

    var fireIcons = '';
    if (streak >= 5) {
      fireIcons = '🔥🔥🔥🔥🔥';
      startFlame();
    } else if (streak === 4) {
      fireIcons = '🔥🔥🔥🔥';
      startFlame();
    } else if (streak === 3) {
      fireIcons = '🔥🔥🔥';
      stopFlame();
    } else {
      fireIcons = '🔥🔥';
      stopFlame();
    }

    var msgs = {
      2: 'この調子で続けよう！',
      3: '乗ってきた！次も決めよう！',
      4: '止まらない！完璧だ！',
      5: '伝説が始まった！'
    };
    var msg = streak >= 5 ? '神がかり的な連勝！' : (msgs[streak] || '止まらない！');

    container.innerHTML =
      '<div class="streak-banner">' +
        '<span class="streak-banner__fire">' + fireIcons.slice(0, 2) + '</span>' +
        '<div>' +
          '<div class="streak-banner__text">' + streak + '連勝中！</div>' +
          '<div class="streak-banner__sub">' + msg + '</div>' +
        '</div>' +
      '</div>';
  }

  /* --------------------------------------------------------------------------
   * 11. 公開 API
   * -------------------------------------------------------------------------- */
  var Effects = {
    flash:              flash,
    launchConfetti:     launchConfetti,
    launchParticles:    launchParticles,
    startFlame:         startFlame,
    stopFlame:          stopFlame,
    playRarityEffect:   playRarityEffect,
    showTPHit:          showTPHit,
    showSLHit:          showSLHit,
    showLevelUp:        showLevelUp,
    showXPPopup:        showXPPopup,
    updateStreakBanner: updateStreakBanner
  };

  global.Effects = Effects;

})(typeof window !== 'undefined' ? window : this);
