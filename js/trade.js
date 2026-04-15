/* ==========================================================================
 * Rainbow Trial — js/trade.js
 * トレード処理とポジション管理。
 *
 * 役割:
 *   - エントリー / 見送り の確定記録
 *   - ポジション保有中のライブ価格シミュレーション
 *   - 早送り(5秒)/ リアルタイム(signal.duration 秒)モード切替
 *   - タブ閉じた間も時刻で進行(startAt / endAt 絶対時刻で管理)
 *   - 決着時に P&L を口座に反映 + トレード履歴に記録
 *
 * 内部シミュレーション:
 *   現在価格 = entry + (target - entry) * smoothstep(progress) + 減衰ノイズ
 *   progress = (now - startAt) / (endAt - startAt) を [0..1] にクランプ
 *   target は signal.result に従い tp or sl を固定(シナリオに従って必ず決着)
 *
 * 公開グローバル: window.Trade
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. 定数
   * -------------------------------------------------------------------------- */
  const FAST_DURATION_MS = 5000;   // 早送り: 5 秒で決着
  const TICK_MS          = 100;    // 価格更新の刻み
  const LANDING_DELAY_MS = 900;    // progress=1 到達後、結果画面遷移までの余韻

  /* --------------------------------------------------------------------------
   * 2. 状態
   * -------------------------------------------------------------------------- */
  let tickTimer    = null;
  let landingTimer = null;       // 着地後の余韻用(progress=1 → closePosition)
  const listeners = new Set();

  /* --------------------------------------------------------------------------
   * 3. 依存
   * -------------------------------------------------------------------------- */
  function G()  { return global.GameState; }
  function S()  { return global.TrialStore; }
  function N()  { return global.Notifications; }
  function SG() { return global.Signals; }
  function SC() { return global.ScenarioUtil; }

  /* --------------------------------------------------------------------------
   * 4. 購読
   * -------------------------------------------------------------------------- */
  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.add(fn);
    return function () { listeners.delete(fn); };
  }

  function emit(evt) {
    listeners.forEach(function (fn) {
      try { fn(evt); } catch (e) { console.error('[Trade] listener error', e); }
    });
  }

  /* --------------------------------------------------------------------------
   * 5. ポジションを開く
   * -------------------------------------------------------------------------- */
  function openPosition(signalId, mode) {
    const signal = SC().getById(signalId);
    if (!signal) throw new Error('[Trade] signal not found: ' + signalId);

    const useMode = (mode === 'realtime') ? 'realtime' : 'fast';
    const now = Date.now();
    const durationMs = (useMode === 'fast') ? FAST_DURATION_MS : (signal.duration || 0) * 1000;
    const targetPrice = (signal.result === 'tp_hit') ? signal.tp : signal.sl;

    const position = {
      signalId:     signal.id,
      mode:         useMode,
      entryTime:    new Date(now).toISOString(),
      entryPrice:   signal.entry,
      startAt:      now,
      endAt:        now + durationMs,
      targetResult: signal.result,  // 'tp_hit' | 'sl_hit'
      targetPrice:  targetPrice
    };

    S().setCurrentPosition(position);
    SG().markEntered(signal.id);

    startTicking();
    emit({ type: 'position_opened', position: position, signal: signal });
    return position;
  }

  /* --------------------------------------------------------------------------
   * 6. 見送り記録(エントリーなし)
   * -------------------------------------------------------------------------- */
  function skipSignal(signalId) {
    const signal = SC().getById(signalId);
    if (!signal) return null;

    SG().markSkipped(signalId);

    const trade = G().recordTrade({
      signalId:   signal.id,
      signalNumber: signal.number,
      type:       'skip',
      pair:       signal.pair,
      direction:  signal.direction,
      rarity:     signal.rarity,
      entry:      signal.entry,
      exit:       null,
      pnl:        0,
      pnlPips:    0,
      result:     'skipped',
      wouldHaveBeen: signal.result,  // 結果画面で「もしエントリーしていたら」用
      lotSize:    signal.lotSize
    });

    SG().markCompleted(signal.id, 'skipped');
    emit({ type: 'skip_recorded', signal: signal, trade: trade });
    return { trade: trade, signal: signal };
  }

  /* --------------------------------------------------------------------------
   * 7. 現在ポジションの取得
   * -------------------------------------------------------------------------- */
  function getCurrentPosition() {
    return S().getCurrentPosition();
  }

  function getCurrentSignal() {
    const pos = getCurrentPosition();
    if (!pos) return null;
    return SC().getById(pos.signalId);
  }

  /* --------------------------------------------------------------------------
   * 8. 進捗 / 価格シミュレーション
   * -------------------------------------------------------------------------- */
  function getProgress(pos) {
    pos = pos || getCurrentPosition();
    if (!pos) return 0;
    const total = pos.endAt - pos.startAt;
    if (total <= 0) return 1;
    const p = (Date.now() - pos.startAt) / total;
    return p < 0 ? 0 : (p > 1 ? 1 : p);
  }

  /**
   * シグナル ID から決定論的に価格推移パターンを選ぶ。
   *   'smooth'  : なだらかに target へ(従来挙動)
   *   'choppy'  : ノイズ振幅と周波数を増やし、揉み合い強め
   *   'retrace' : 序盤で target とは反対方向へ戻してから本命方向へ(騙しあり)
   * 最終的に target に収束する点は共通。
   */
  function getPricePattern(signal) {
    const m = signal.id % 3;
    if (m === 0) return 'smooth';
    if (m === 1) return 'choppy';
    return 'retrace';
  }

  /**
   * entry→target を smoothstep 補間、両端にいくほどノイズ減衰。
   * 決定論的: (signal, pos, progress) が同じなら常に同じ価格を返す。
   * これにより過去の bucket を再サンプリングしても OHLC が安定する。
   */
  function simulateCurrentPrice(signal, pos, progress) {
    const entry  = signal.entry;
    const target = pos.targetPrice;
    const t = progress;
    const pattern = getPricePattern(signal);

    // ベース進行: smoothstep をパターンで歪める。retrace は序盤反対方向へ
    let eased = t * t * (3 - 2 * t);
    if (pattern === 'retrace') {
      // t^0.5 の sin バンプで t≈0.3 付近に底を作る(両端は 0 に戻る)
      const bump = Math.sin(Math.PI * Math.pow(t, 0.5));
      eased = eased - 0.45 * bump;
    }

    let price = entry + (target - entry) * eased;

    // progress 中盤でノイズ最大、両端に向かって収束(ベル曲線)
    // choppy はベルを太らせて中盤の揉み合いを長引かせ、振幅も増やす
    const bellRaw = 1 - Math.abs(progress - 0.5) * 2;
    const bell = pattern === 'choppy' ? Math.pow(bellRaw, 0.35) : bellRaw;
    const noiseMul = pattern === 'choppy'  ? 0.42
                   : pattern === 'retrace' ? 0.28
                   :                         0.22;
    const noiseScale = Math.abs(target - entry) * noiseMul * bell;
    if (noiseScale > 0) {
      // progress ベース(時刻非依存)のノイズ刻み → 過去 bucket も安定
      const totalMs = Math.max(1, pos.endAt - pos.startAt);
      const tick = Math.floor(progress * totalMs / 180);
      let n = Math.sin(tick * 1.7 + signal.id * 0.31) * 0.6
            + Math.sin(tick * 3.1 + signal.id * 0.57) * 0.25
            + Math.sin(tick * 5.3 + signal.id * 0.83) * 0.15;
      if (pattern === 'choppy') {
        // 高周波成分を追加してヒゲの多いチャートに
        n += Math.sin(tick * 7.9 + signal.id * 1.13) * 0.18;
      }
      price += n * noiseScale;
    }
    const d = signal.decimals != null ? signal.decimals
            : (signal.pair === 'USDJPY' ? 3 : 1);
    const factor = Math.pow(10, d);
    return Math.round(price * factor) / factor;
  }

  /* --------------------------------------------------------------------------
   * 8.5 ライブローソク足の生成(チャート右側に追加される)
   *    bucketMs 毎に 1 本のローソク足を作る。最終 bucket は「形成中」。
   *    bucketMs は mode と duration から動的に決定:
   *      fast(5000ms) → 500ms/本(10本)
   *      realtime     → duration/10 ms/本(10本)
   *    simulateCurrentPrice が決定論的なので past bucket の OHLC は安定。
   * -------------------------------------------------------------------------- */
  const MAX_LIVE_CANDLES = 10;
  const MIN_BUCKET_MS    = 300;
  const SAMPLES_PER_BUCKET = 6;

  function buildLiveCandles(signal, pos) {
    const totalMs = pos.endAt - pos.startAt;
    if (totalMs <= 0) return [];
    const bucketMs = Math.max(MIN_BUCKET_MS, Math.floor(totalMs / MAX_LIVE_CANDLES));
    const elapsedMs = Math.max(0, Math.min(totalMs, Date.now() - pos.startAt));
    if (elapsedMs < bucketMs * 0.05) return [];    // 最初の数ms はスキップ

    const bucketCount = Math.min(MAX_LIVE_CANDLES, Math.ceil(elapsedMs / bucketMs));
    const d = signal.decimals != null ? signal.decimals
            : (signal.pair === 'USDJPY' ? 3 : 1);
    const factor = Math.pow(10, d);

    const out = [];
    for (let b = 0; b < bucketCount; b++) {
      const bs = b * bucketMs;
      const be = Math.min((b + 1) * bucketMs, elapsedMs);
      let open = 0, close = 0, high = -Infinity, low = Infinity;

      for (let s = 0; s <= SAMPLES_PER_BUCKET; s++) {
        const t = bs + (be - bs) * (s / SAMPLES_PER_BUCKET);
        const p = t / totalMs;
        const price = simulateCurrentPrice(signal, pos, p);
        if (s === 0) open = price;
        if (s === SAMPLES_PER_BUCKET) close = price;
        if (price > high) high = price;
        if (price < low)  low  = price;
      }

      out.push({
        time: '',           // ラベル空(凡例は LIVE として別途表示)
        o: Math.round(open  * factor) / factor,
        h: Math.round(high  * factor) / factor,
        l: Math.round(low   * factor) / factor,
        c: Math.round(close * factor) / factor,
        isLive: true,
        isForming: b === bucketCount - 1   // 最終 bucket = 形成中
      });
    }
    return out;
  }

  function getCurrentPrice() {
    const pos = getCurrentPosition();
    if (!pos) return null;
    const signal = SC().getById(pos.signalId);
    if (!signal) return null;
    return simulateCurrentPrice(signal, pos, getProgress(pos));
  }

  /** ライブ P&L(ポジション画面の損益表示用) */
  function getPositionPnL() {
    const pos = getCurrentPosition();
    if (!pos) return null;
    const signal = SC().getById(pos.signalId);
    if (!signal) return null;
    const price = simulateCurrentPrice(signal, pos, getProgress(pos));
    const dir = signal.direction === 'long' ? 1 : -1;
    const pipsRaw = ((price - signal.entry) * dir) / signal.pipSize;
    const pips = Math.round(pipsRaw);
    const pnl = Math.round(pips * signal.pipValue);
    return {
      price:    price,
      pips:     pips,
      pnl:      pnl,
      progress: getProgress(pos)
    };
  }

  /** SL↔TP 範囲バー上の現在位置(0〜100%、0=SL側、100=TP側) */
  function getRangeMarkerPercent() {
    const pos = getCurrentPosition();
    if (!pos) return 50;
    const signal = SC().getById(pos.signalId);
    if (!signal) return 50;
    const price = getCurrentPrice();
    if (price == null) return 50;
    const range = signal.tp - signal.sl;
    if (Math.abs(range) < 1e-9) return 50;
    let pct = ((price - signal.sl) / range) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return pct;
  }

  /* --------------------------------------------------------------------------
   * 9. モード切替(進捗を保持したまま)
   * -------------------------------------------------------------------------- */
  function switchMode(newMode) {
    const pos = getCurrentPosition();
    if (!pos) return null;
    // 着地演出中は切替不可(結果画面へ向かう直前のため)
    if (landingTimer) return pos;
    const m = (newMode === 'realtime') ? 'realtime' : 'fast';
    if (pos.mode === m) return pos;

    const signal = SC().getById(pos.signalId);
    if (!signal) return pos;

    const progress = getProgress(pos);
    const now = Date.now();
    const newTotal = (m === 'fast') ? FAST_DURATION_MS : (signal.duration || 0) * 1000;
    const newStart = now - newTotal * progress;
    const newEnd   = now + newTotal * (1 - progress);

    const updated = Object.assign({}, pos, {
      mode:    m,
      startAt: newStart,
      endAt:   newEnd
    });
    S().setCurrentPosition(updated);
    emit({ type: 'mode_switched', position: updated, signal: signal });
    return updated;
  }

  /* --------------------------------------------------------------------------
   * 10. ポジションを閉じる(決着処理)
   * -------------------------------------------------------------------------- */
  function closePosition() {
    const pos = getCurrentPosition();
    if (!pos) return null;
    const signal = SC().getById(pos.signalId);
    if (!signal) {
      S().clearCurrentPosition();
      stopTicking();
      return null;
    }

    const isWin = signal.result === 'tp_hit';
    const pnl     = isWin ? signal.tpProfit : signal.slLoss;  // slLoss は既に負値
    const pnlPips = isWin ? signal.tpPips   : -signal.slPips;
    const exitPrice = pos.targetPrice;

    // 履歴に記録
    const trade = G().recordTrade({
      signalId:     signal.id,
      signalNumber: signal.number,
      type:         'trade',
      pair:         signal.pair,
      direction:    signal.direction,
      rarity:       signal.rarity,
      entry:        signal.entry,
      exit:         exitPrice,
      pnl:          pnl,
      pnlPips:      pnlPips,
      result:       signal.result,
      lotSize:      signal.lotSize,
      mode:         pos.mode,
      durationMs:   pos.endAt - pos.startAt
    });

    // 資金に反映
    G().adjustAccount(pnl);

    // シグナル完了
    SG().markCompleted(signal.id, signal.result);

    // ポジション削除
    S().clearCurrentPosition();
    stopTicking();

    emit({ type: 'position_closed', signal: signal, trade: trade, pnl: pnl });
    return { trade: trade, signal: signal, pnl: pnl };
  }

  /** ユーザー操作の「早送りで結果を見る」: fast モードへ切替えて即座の決着を目指す */
  function fastForward() {
    const pos = getCurrentPosition();
    if (!pos) return null;
    if (pos.mode !== 'fast') {
      switchMode('fast');
    }
    // 残り時間が長い場合、ある程度残す(切替の smoothstep を生かすため進捗保持)
    return getCurrentPosition();
  }

  /* --------------------------------------------------------------------------
   * 11. ティック(価格更新 + 自動決着)
   * -------------------------------------------------------------------------- */
  function startTicking() {
    if (tickTimer) return;
    tickTimer = setInterval(function () {
      const pos = getCurrentPosition();
      if (!pos) { stopTicking(); return; }
      const signal = SC().getById(pos.signalId);
      if (!signal) { stopTicking(); return; }

      const progress = getProgress(pos);
      const price = simulateCurrentPrice(signal, pos, progress);
      const dir = signal.direction === 'long' ? 1 : -1;
      const pips = Math.round(((price - signal.entry) * dir) / signal.pipSize);
      const pnl = Math.round(pips * signal.pipValue);

      emit({
        type:        'price_tick',
        position:    pos,
        signal:      signal,
        price:       price,
        pips:        pips,
        pnl:         pnl,
        progress:    progress,
        liveCandles: buildLiveCandles(signal, pos)
      });

      if (progress >= 1 && !landingTimer) {
        // progress=1 到達: チャートを最終状態のまま一瞬止めて、余韻を与えてから閉じる
        stopTicking();
        emit({
          type:     'position_landed',
          position: pos,
          signal:   signal,
          result:   signal.result,     // 'tp_hit' | 'sl_hit'
          price:    price
        });
        landingTimer = setTimeout(function () {
          landingTimer = null;
          closePosition();
        }, LANDING_DELAY_MS);
      }
    }, TICK_MS);
  }

  function stopTicking() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  function isTicking()  { return !!tickTimer; }
  function isLanding()  { return !!landingTimer; }

  /* --------------------------------------------------------------------------
   * 12. 初期化(アプリロード時の再開)
   * -------------------------------------------------------------------------- */
  function init() {
    const pos = getCurrentPosition();
    if (!pos) return;
    // endAt が過去ならティックの次回で即座に closePosition が発火する
    startTicking();
  }

  /* --------------------------------------------------------------------------
   * 13. 公開 API
   * -------------------------------------------------------------------------- */
  const Trade = {
    // 定数
    FAST_DURATION_MS: FAST_DURATION_MS,
    TICK_MS:          TICK_MS,

    // ライフサイクル
    init: init,

    // 操作
    openPosition:  openPosition,
    closePosition: closePosition,
    skipSignal:    skipSignal,
    switchMode:    switchMode,
    fastForward:   fastForward,

    // 取得
    getCurrentPosition:    getCurrentPosition,
    getCurrentSignal:      getCurrentSignal,
    getCurrentPrice:       getCurrentPrice,
    getPositionPnL:        getPositionPnL,
    getRangeMarkerPercent: getRangeMarkerPercent,
    getProgress:           function () { return getProgress(getCurrentPosition()); },

    // ライブローソク足
    buildLiveCandles:      function () {
      const pos = getCurrentPosition();
      if (!pos) return [];
      const sig = SC().getById(pos.signalId);
      return sig ? buildLiveCandles(sig, pos) : [];
    },

    // ティック
    startTicking: startTicking,
    stopTicking:  stopTicking,
    isTicking:    isTicking,
    isLanding:    isLanding,

    // 購読
    subscribe: subscribe
  };

  global.Trade = Trade;

})(typeof window !== 'undefined' ? window : this);
