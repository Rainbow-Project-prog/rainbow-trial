/* ==========================================================================
 * Rainbow Trial — js/final-screen.js
 * Day 7 最終画面
 *   - 累計成績の劇的な発表
 *   - ランク発表 (S+〜C) + アニメーション
 *   - 7日間成長グラフ
 *   - LINE 誘導 CTA
 *   - シェア機能(結果カード生成 / Web Share)
 *
 * 依存: window.TrialStore      (js/storage.js)
 *       window.GameState       (js/game-state.js)
 *       window.JudgmentScore   (js/judgment-score.js)
 *       window.LevelSystem     (js/level-system.js)
 *       window.Effects         (js/effects.js)
 *       window.SoundSystem     (js/sound.js)
 *
 * 公開グローバル: window.FinalScreen
 * ========================================================================== */

(function (global) {
  'use strict';

  /* LINE 設定 (運営側でカスタマイズ) */
  var LINE_CONFIG = {
    url:      'https://lin.ee/XXXXXXXX',  // 実際のLINEオープンチャットURLに変更
    qrSrc:    'assets/line-qr.png',        // QRコード画像(なければ代替表示)
    benefit1: '🎁 体験者限定の特別レポート配布',
    benefit2: '💬 プロトレーダーへの直接相談',
    benefit3: '📊 週次シグナル先行配信(3日間無料)',
    cta:      '今すぐ LINE で無料相談'
  };

  /* ランク定義(JudgmentScore と揃える) */
  var RANKS = [
    { label: 'S+', min: 95, color: '#FFD700', icon: '👑', title: '伝説のトレーダー' },
    { label: 'S',  min: 90, color: '#C0C0C0', icon: '🌟', title: 'エキスパートトレーダー' },
    { label: 'A+', min: 85, color: '#9775FA', icon: '💎', title: 'ハイレベルトレーダー' },
    { label: 'A',  min: 80, color: '#7C3AED', icon: '🏅', title: '上級トレーダー' },
    { label: 'B+', min: 75, color: '#3B82F6', icon: '⭐', title: '中級トレーダー' },
    { label: 'B',  min: 70, color: '#10B981', icon: '✅', title: '安定トレーダー' },
    { label: 'C+', min: 60, color: '#F59E0B', icon: '📈', title: '成長中トレーダー' },
    { label: 'C',  min: 0,  color: '#6B7280', icon: '🌱', title: '見習いトレーダー' }
  ];

  function getRank(score) {
    for (var i = 0; i < RANKS.length; i++) {
      if (score >= RANKS[i].min) return RANKS[i];
    }
    return RANKS[RANKS.length - 1];
  }

  /* --------------------------------------------------------------------------
   * 1. 最終画面を表示すべきか判定
   * -------------------------------------------------------------------------- */
  function shouldShow() {
    var snap = global.GameState && global.GameState.snapshot();
    if (!snap) return false;
    // Day 7 完了(ended) かつ次シグナルなし
    return snap.currentDay === 'ended' || (snap.displayDay === 7 && !snap.next);
  }

  /* --------------------------------------------------------------------------
   * 2. 最終画面を表示
   * -------------------------------------------------------------------------- */
  function show() {
    // 既に表示中なら skip
    if (document.getElementById('final-screen-overlay')) return;

    var state  = global.TrialStore.getState();
    var stats  = global.TrialStore.computeStats();
    var gs     = state.gameStats || {};

    // 判定スコアを計算
    var score = 0;
    if (global.JudgmentScore) {
      var computed = global.JudgmentScore.compute(state);
      score = computed ? computed.score : (gs.judgmentScore || 0);
    } else {
      score = gs.judgmentScore || 0;
    }

    var rank = getRank(score);

    // レベル情報
    var levelInfo = { level: 1, icon: '🌱', title: '見習いトレーダー' };
    if (global.LevelSystem) levelInfo = global.LevelSystem.getLevelInfo(state.user.xp || 0);

    var overlay = document.createElement('div');
    overlay.id = 'final-screen-overlay';
    overlay.className = 'final-screen-overlay';
    overlay.setAttribute('role', 'main');

    overlay.innerHTML = _buildHTML(state, stats, gs, rank, levelInfo);
    document.body.appendChild(overlay);

    // アニメーション開始
    requestAnimationFrame(function () {
      overlay.classList.add('final-screen-overlay--enter');
    });

    // サウンド
    if (global.SoundSystem) global.SoundSystem.play('achievement');

    // Canvas グラフ描画(少し遅らせてDOMを確定させる)
    setTimeout(function () {
      _drawGrowthChart(gs);
    }, 300);

    // 数字カウントアップアニメーション
    setTimeout(function () {
      _animateNumbers(stats, gs, score);
    }, 500);

    // ランクバッジアニメーション
    setTimeout(function () {
      var badge = document.getElementById('final-rank-badge');
      if (badge) badge.classList.add('final-rank-badge--reveal');
      if (global.Effects) {
        global.Effects.launchConfetti(4000);
      }
    }, 1500);

    // イベントバインド
    _bindEvents(overlay);
  }

  /* --------------------------------------------------------------------------
   * 3. HTML 生成
   * -------------------------------------------------------------------------- */
  function _buildHTML(state, stats, gs, rank, levelInfo) {
    var user = state.user || {};
    var pnl  = stats.totalPnL || 0;
    var pnlSign = pnl >= 0 ? '+' : '';

    return (
      '<div class="final-screen">' +

        /* ---- ヘッダー ---- */
        '<div class="final-screen__header">' +
          '<div class="final-screen__logo">🌈 Rainbow Trial</div>' +
          '<h1 class="final-screen__title">7日間の体験、完了！</h1>' +
          '<p class="final-screen__subtitle">お疲れ様でした、' + _esc(user.nickname || 'トレーダー') + 'さん</p>' +
        '</div>' +

        /* ---- ランクバッジ ---- */
        '<div class="final-rank-section">' +
          '<div class="final-rank-badge" id="final-rank-badge" style="border-color:' + rank.color + '">' +
            '<div class="final-rank-badge__icon">' + rank.icon + '</div>' +
            '<div class="final-rank-badge__label" style="color:' + rank.color + '">' + rank.label + '</div>' +
            '<div class="final-rank-badge__title">' + rank.title + '</div>' +
          '</div>' +
          '<div class="final-rank-score">判定スコア: <span id="final-score-num">--</span> 点</div>' +
        '</div>' +

        /* ---- 成績カード ---- */
        '<div class="final-stats-grid">' +
          _statCard('総トレード数', '<span id="cnt-trades">--</span>', '回') +
          _statCard('勝率', '<span id="cnt-winrate">--</span>', '%') +
          _statCard('最大連勝', '<span id="cnt-streak">--</span>', '連勝') +
          _statCard('累計損益', '<span id="cnt-pnl">' + pnlSign + (Math.abs(pnl) > 0 ? '--' : '0') + '</span>', '円') +
        '</div>' +

        /* ---- レベル ---- */
        '<div class="final-level-card">' +
          '<span class="final-level-icon">' + levelInfo.icon + '</span>' +
          '<div class="final-level-text">' +
            '<div class="final-level-name">' + _esc(levelInfo.title) + '</div>' +
            '<div class="final-level-lv">到達レベル: Lv.' + levelInfo.level + '</div>' +
          '</div>' +
        '</div>' +

        /* ---- 7日間成長グラフ ---- */
        '<div class="final-chart-section">' +
          '<div class="final-chart-title">📈 7日間の資金推移</div>' +
          '<div class="final-chart-wrap">' +
            '<canvas id="final-growth-chart"></canvas>' +
          '</div>' +
        '</div>' +

        /* ---- LINE CTA ---- */
        '<div class="final-line-section">' +
          '<div class="final-line-title">🎯 次のステップへ</div>' +
          '<div class="final-line-subtitle">Rainbow System サロンで、本格的なトレードを始めませんか？</div>' +
          '<div class="final-benefits">' +
            '<div class="final-benefit">' + LINE_CONFIG.benefit1 + '</div>' +
            '<div class="final-benefit">' + LINE_CONFIG.benefit2 + '</div>' +
            '<div class="final-benefit">' + LINE_CONFIG.benefit3 + '</div>' +
          '</div>' +
          '<div class="final-line-qr-wrap">' +
            '<div id="final-line-qr-container"></div>' +
          '</div>' +
          '<a href="' + LINE_CONFIG.url + '" target="_blank" rel="noopener" class="btn btn--line btn--lg btn--block" id="final-line-btn">' +
            '<span class="btn--line__icon">LINE</span>' +
            LINE_CONFIG.cta +
          '</a>' +
        '</div>' +

        /* ---- シェアボタン ---- */
        '<div class="final-share-section">' +
          '<div class="final-share-title">📣 結果をシェアする</div>' +
          '<div class="final-share-btns">' +
            '<button class="btn btn--share-twitter" id="final-share-twitter" type="button">𝕏 Xでシェア</button>' +
            '<button class="btn btn--share-img" id="final-share-img" type="button">🖼️ 結果カードを保存</button>' +
          '</div>' +
          '<div id="final-share-canvas-container" style="display:none;text-align:center;margin-top:12px;"></div>' +
        '</div>' +

        /* ---- もう一度ボタン ---- */
        '<div class="final-replay-section">' +
          '<button class="btn btn--ghost btn--block" id="final-close-btn" type="button">ホームに戻る</button>' +
        '</div>' +

      '</div>'
    );
  }

  function _statCard(label, valHTML, unit) {
    return (
      '<div class="final-stat-card">' +
        '<div class="final-stat-card__label">' + label + '</div>' +
        '<div class="final-stat-card__value">' + valHTML + '<span class="final-stat-card__unit">' + unit + '</span></div>' +
      '</div>'
    );
  }

  /* --------------------------------------------------------------------------
   * 4. 数値カウントアップアニメーション
   * -------------------------------------------------------------------------- */
  function _animateNumbers(stats, gs, score) {
    _countUp('final-score-num',  0, Math.round(score),    1200, false);
    _countUp('cnt-trades',       0, stats.totalTrades,    800,  false);
    _countUp('cnt-winrate',      0, stats.winRate || 0,   1000, false, 1);
    _countUp('cnt-streak',       0, gs.maxStreak || 0,    900,  false);
    _countUp('cnt-pnl',          0, stats.totalPnL || 0,  1400, true);
  }

  function _countUp(id, from, to, duration, isCurrency, decimals) {
    var el = document.getElementById(id);
    if (!el) return;
    var start = null;
    var dec = decimals || 0;
    var sign = to >= 0 ? '+' : '';
    if (!isCurrency && to < 0) sign = '';

    function step(ts) {
      if (!start) start = ts;
      var prog = Math.min((ts - start) / duration, 1);
      var cur  = from + (to - from) * _easeOut(prog);
      if (isCurrency) {
        el.textContent = (cur >= 0 ? '+' : '') + Math.round(cur).toLocaleString('ja-JP');
        el.style.color = cur >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
      } else {
        el.textContent = cur.toFixed(dec);
      }
      if (prog < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function _easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /* --------------------------------------------------------------------------
   * 5. 7日間成長グラフ(Canvas)
   * -------------------------------------------------------------------------- */
  function _drawGrowthChart(gs) {
    var canvas = document.getElementById('final-growth-chart');
    if (!canvas) return;

    var container = canvas.parentElement;
    var W = (container && container.offsetWidth) || 340;
    var H = 140;
    canvas.width  = W;
    canvas.height = H;

    var ctx = canvas.getContext('2d');
    var history = (gs && gs.capitalHistory) || [];
    var initial = 300000;

    // データ点を構築(最大70点)
    var pts;
    if (history.length === 0) {
      pts = [{ label: 'START', capital: initial }];
    } else {
      pts = [{ label: 'START', capital: initial }].concat(history.slice(-69));
    }

    if (pts.length < 2) {
      // データ不足時はプレースホルダー
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('トレードを完了すると表示されます', W / 2, H / 2);
      return;
    }

    var values = pts.map(function (p) { return p.capital; });
    var minV = Math.min.apply(null, values);
    var maxV = Math.max.apply(null, values);
    if (maxV === minV) { maxV = minV + 10000; minV = minV - 10000; }
    var range = maxV - minV;
    var padT = 20, padB = 20, padL = 10, padR = 10;
    var gW = W - padL - padR;
    var gH = H - padT - padB;

    function xOf(i) { return padL + (i / (pts.length - 1)) * gW; }
    function yOf(v) { return padT + (1 - (v - minV) / range) * gH; }

    // 背景グラデーション
    var grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,   'rgba(151, 117, 250, 0.15)');
    grad.addColorStop(1,   'rgba(59, 130, 246, 0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ベースライン(initial)
    var basY = yOf(initial);
    ctx.beginPath();
    ctx.moveTo(padL, basY);
    ctx.lineTo(W - padR, basY);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // 折れ線(グラデーション)
    ctx.beginPath();
    pts.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(xOf(i), yOf(p.capital));
      else ctx.lineTo(xOf(i), yOf(p.capital));
    });
    var lineGrad = ctx.createLinearGradient(0, 0, W, 0);
    lineGrad.addColorStop(0, '#9775FA');
    lineGrad.addColorStop(1, '#38BDF8');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 塗りつぶし(下側)
    ctx.lineTo(xOf(pts.length - 1), H - padB);
    ctx.lineTo(xOf(0), H - padB);
    ctx.closePath();
    var fillGrad = ctx.createLinearGradient(0, padT, 0, H - padB);
    var lastVal = values[values.length - 1];
    var fillColor = lastVal >= initial ? 'rgba(151,117,250,' : 'rgba(239,68,68,';
    fillGrad.addColorStop(0, fillColor + '0.35)');
    fillGrad.addColorStop(1, fillColor + '0.0)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // 最終点に丸
    var lastX = xOf(pts.length - 1);
    var lastY = yOf(values[values.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = lastVal >= initial ? '#9775FA' : '#EF4444';
    ctx.fill();

    // ラベル(START / FINISH)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('START', padL, H - 4);
    ctx.textAlign = 'right';
    ctx.fillText('FINISH', W - padR, H - 4);

    // 最終損益表示
    var finalPnl = lastVal - initial;
    var pnlStr = (finalPnl >= 0 ? '+' : '') + Math.round(finalPnl).toLocaleString('ja-JP') + '円';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = finalPnl >= 0 ? '#A3E635' : '#F87171';
    ctx.textAlign = 'right';
    ctx.fillText(pnlStr, W - padR, lastY - 8 > padT ? lastY - 8 : lastY + 16);
  }

  /* --------------------------------------------------------------------------
   * 6. LINE QR 表示(画像 404 の場合はテキストURLで代替)
   * -------------------------------------------------------------------------- */
  function _renderQR() {
    var container = document.getElementById('final-line-qr-container');
    if (!container) return;

    var img = new Image();
    img.onload = function () {
      img.className = 'final-line-qr';
      img.alt = 'LINE QR コード';
      container.appendChild(img);
    };
    img.onerror = function () {
      // QR 画像がない場合はテキストのみ
      container.innerHTML =
        '<div class="final-line-qr-fallback">' +
          '<div style="font-size:0.85rem;opacity:.7">QRコード準備中</div>' +
          '<div style="font-size:0.7rem;word-break:break-all;margin-top:4px;opacity:.5">' +
            LINE_CONFIG.url +
          '</div>' +
        '</div>';
    };
    img.src = LINE_CONFIG.qrSrc;
  }

  /* --------------------------------------------------------------------------
   * 7. シェアカード生成(Canvas)
   * -------------------------------------------------------------------------- */
  function generateShareCard(stats, gs, rank, levelInfo, nickname) {
    var W = 800, H = 420;
    var canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    // 背景グラデーション
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   '#0F0F23');
    bg.addColorStop(0.5, '#1A1A3E');
    bg.addColorStop(1,   '#0F0F23');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // レインボーボーダー(上)
    var border = ctx.createLinearGradient(0, 0, W, 0);
    border.addColorStop(0,    '#FF0080');
    border.addColorStop(0.17, '#FF8C00');
    border.addColorStop(0.33, '#FFD700');
    border.addColorStop(0.5,  '#00FF87');
    border.addColorStop(0.67, '#00BFFF');
    border.addColorStop(0.83, '#7B68EE');
    border.addColorStop(1,    '#FF0080');
    ctx.fillStyle = border;
    ctx.fillRect(0, 0, W, 4);

    // ロゴ
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'left';
    ctx.fillText('🌈 Rainbow Trial', 40, 46);

    // タイトル
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('7日間トライアル 完了！', 40, 96);

    // ユーザー名
    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(_esc(nickname || 'トレーダー') + ' さん', 40, 130);

    // ランクバッジ
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rank.icon, W - 130, 130);
    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = rank.color;
    ctx.fillText(rank.label, W - 130, 190);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(rank.title, W - 130, 210);

    // 仕切り線
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 155); ctx.lineTo(W - 260, 155);
    ctx.stroke();

    // 統計値(4列)
    var statItems = [
      { label: 'トレード数', value: (stats.totalTrades || 0) + '回' },
      { label: '勝率',       value: (stats.winRate || 0).toFixed(1) + '%' },
      { label: '最大連勝',  value: (gs.maxStreak || 0) + '連勝' },
      { label: '累計損益',  value: _formatPnl(stats.totalPnL || 0) }
    ];

    statItems.forEach(function (item, i) {
      var x = 40 + i * 155;
      var y = 200;
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x, y);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = item.label === '累計損益'
        ? ((stats.totalPnL || 0) >= 0 ? '#86EFAC' : '#FCA5A5')
        : '#FFFFFF';
      ctx.fillText(item.value, x, y + 28);
    });

    // レベル
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(levelInfo.icon + ' Lv.' + levelInfo.level + ' ' + _esc(levelInfo.title), 40, 280);

    // フッター
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('#RainbowTrial  #FX体験  #虹系トレード', W / 2, H - 30);

    // レインボーボーダー(下)
    ctx.fillStyle = border;
    ctx.fillRect(0, H - 4, W, 4);

    return canvas;
  }

  function _formatPnl(pnl) {
    var sign = pnl >= 0 ? '+' : '-';
    return sign + '¥' + Math.abs(Math.round(pnl)).toLocaleString('ja-JP');
  }

  /* --------------------------------------------------------------------------
   * 8. イベントバインド
   * -------------------------------------------------------------------------- */
  function _bindEvents(overlay) {
    var state     = global.TrialStore.getState();
    var stats     = global.TrialStore.computeStats();
    var gs        = state.gameStats || {};
    var score     = gs.judgmentScore || 0;
    var rank      = getRank(score);
    var levelInfo = { level: 1, icon: '🌱', title: '見習いトレーダー' };
    if (global.LevelSystem) levelInfo = global.LevelSystem.getLevelInfo(state.user.xp || 0);
    var nickname  = (state.user && state.user.nickname) || 'トレーダー';

    // QR コード表示
    _renderQR();

    // LINE ボタン
    // href はすでに設定済み

    // X (Twitter) シェア
    var twBtn = document.getElementById('final-share-twitter');
    if (twBtn) {
      twBtn.addEventListener('click', function () {
        var pnl = stats.totalPnL || 0;
        var sign = pnl >= 0 ? '+' : '';
        var text = encodeURIComponent(
          '【Rainbow Trial 完了！】\n' +
          '7日間の虹トレ体験を終えました！\n\n' +
          rank.icon + ' 判定ランク: ' + rank.label + '\n' +
          '勝率: ' + (stats.winRate || 0).toFixed(1) + '% / 最大連勝: ' + (gs.maxStreak || 0) + '連勝\n' +
          '累計損益: ' + sign + Math.round(pnl).toLocaleString('ja-JP') + '円\n\n' +
          '#RainbowTrial #FX体験 #虹系トレード'
        );
        global.open('https://twitter.com/intent/tweet?text=' + text, '_blank', 'noopener');
      });
    }

    // 結果カード保存
    var imgBtn = document.getElementById('final-share-img');
    if (imgBtn) {
      imgBtn.addEventListener('click', function () {
        var cardCanvas = generateShareCard(stats, gs, rank, levelInfo, nickname);
        var container  = document.getElementById('final-share-canvas-container');
        if (!container) return;
        container.style.display = 'block';
        container.innerHTML = '';

        // 縮小表示
        var preview = document.createElement('img');
        preview.src = cardCanvas.toDataURL('image/png');
        preview.style.cssText = 'max-width:100%;border-radius:8px;margin-bottom:8px;';
        preview.alt = '結果カード';
        container.appendChild(preview);

        // Web Share API
        if (navigator.share && navigator.canShare) {
          cardCanvas.toBlob(function (blob) {
            var file = new File([blob], 'rainbow-trial-result.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              navigator.share({ files: [file], title: 'Rainbow Trial 結果', text: '7日間の体験結果' })
                .catch(function () {});
              return;
            }
            _showDownloadLink(cardCanvas, container);
          }, 'image/png');
        } else {
          _showDownloadLink(cardCanvas, container);
        }
      });
    }

    // ホームに戻る
    var closeBtn = document.getElementById('final-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (global.App) global.App.goHome();
      });
    }
  }

  function _showDownloadLink(canvas, container) {
    var link = document.createElement('a');
    link.download = 'rainbow-trial-result.png';
    link.href = canvas.toDataURL('image/png');
    link.className = 'btn btn--primary';
    link.textContent = '⬇️ 画像を保存';
    link.style.cssText = 'display:inline-block;margin-top:4px;';
    container.appendChild(link);
  }

  /* --------------------------------------------------------------------------
   * ユーティリティ
   * -------------------------------------------------------------------------- */
  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* --------------------------------------------------------------------------
   * 9. 公開 API
   * -------------------------------------------------------------------------- */
  var FinalScreen = {
    shouldShow:        shouldShow,
    show:              show,
    getRank:           getRank,
    generateShareCard: generateShareCard,
    LINE_CONFIG:       LINE_CONFIG
  };

  global.FinalScreen = FinalScreen;

})(typeof window !== 'undefined' ? window : this);
