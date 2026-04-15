/* ==========================================================================
 * Rainbow Trial — js/sound.js
 * 効果音システム(AudioContext API)
 *
 * 音源ファイルが存在しない場合はエラーを出さず無音で続行。
 * 設定で ON/OFF・音量・レアリティ別サウンドを制御可能。
 *
 * 依存: window.TrialStore (js/storage.js)
 *
 * 公開グローバル: window.SoundSystem
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. サウンドファイルマップ
   *    key → assets/sounds/ 以下のファイル名
   * -------------------------------------------------------------------------- */
  var SOUND_MAP = {
    signal_normal:    'signal-normal.mp3',
    signal_rare:      'signal-rare.mp3',
    signal_legendary: 'signal-legendary.mp3',
    tp_hit:           'tp-hit.mp3',
    sl_hit:           'sl-hit.mp3',
    level_up:         'level-up.mp3',
    achievement:      'achievement.mp3',
    button_tap:       'button-tap.mp3',
    mission_complete: 'mission-complete.mp3'
  };

  var SOUNDS_DIR = 'assets/sounds/';

  /* --------------------------------------------------------------------------
   * 2. 内部状態
   * -------------------------------------------------------------------------- */
  var audioCtx   = null;
  var bufferCache = {};     // { key: AudioBuffer }
  var loadFailed  = {};     // { key: true } ファイルが見つからなかったキー

  /* --------------------------------------------------------------------------
   * 3. AudioContext の遅延初期化(ユーザー操作後に生成)
   * -------------------------------------------------------------------------- */
  function getAudioCtx() {
    if (audioCtx) return audioCtx;
    try {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }

  /* --------------------------------------------------------------------------
   * 4. 設定ヘルパー
   * -------------------------------------------------------------------------- */
  function getSettings() {
    try {
      var s = global.TrialStore.getState();
      return (s && s.settings && s.settings.sound) || { enabled: true, volume: 0.8, raritySounds: {} };
    } catch (e) {
      return { enabled: true, volume: 0.8, raritySounds: {} };
    }
  }

  function isSoundEnabled() {
    return !!getSettings().enabled;
  }

  function getVolume() {
    var v = parseFloat(getSettings().volume);
    return isNaN(v) ? 0.8 : Math.max(0, Math.min(1, v));
  }

  /* --------------------------------------------------------------------------
   * 5. バッファのプリロード(任意)
   * -------------------------------------------------------------------------- */
  function preload(keys) {
    if (!keys) keys = Object.keys(SOUND_MAP);
    keys.forEach(function (key) { _loadBuffer(key); });
  }

  function _loadBuffer(key) {
    if (bufferCache[key] || loadFailed[key]) return;
    var ctx = getAudioCtx();
    if (!ctx) return;

    var filename = SOUND_MAP[key];
    if (!filename) return;

    var url = SOUNDS_DIR + filename;

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('not found');
        return res.arrayBuffer();
      })
      .then(function (ab) {
        return ctx.decodeAudioData(ab);
      })
      .then(function (buffer) {
        bufferCache[key] = buffer;
      })
      .catch(function () {
        loadFailed[key] = true; // ファイル不在は黙って無音
      });
  }

  /* --------------------------------------------------------------------------
   * 6. 再生
   * -------------------------------------------------------------------------- */
  /**
   * 指定キーの効果音を再生する。
   * ファイルが存在しない / 設定 OFF の場合は無音で返る。
   *
   * @param {string} key  SOUND_MAP のキー
   * @param {Object} [opts]
   * @param {number} [opts.volume]  0.0〜1.0 (省略時はグローバル音量)
   */
  function play(key, opts) {
    if (!isSoundEnabled()) return;

    opts = opts || {};
    var ctx = getAudioCtx();
    if (!ctx) return;

    // suspended 状態のリカバリ(iOS Safari 等)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }

    var buffer = bufferCache[key];
    if (!buffer) {
      // キャッシュになければロードしてリトライ(初回)
      if (!loadFailed[key]) {
        _loadBuffer(key);
        // ロード完了前なので今回は無音
      }
      return;
    }

    try {
      var source = ctx.createBufferSource();
      source.buffer = buffer;

      var gainNode = ctx.createGain();
      var vol = (opts.volume != null) ? opts.volume : getVolume();
      gainNode.gain.value = vol;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      // 再生エラーは無視
    }
  }

  /* --------------------------------------------------------------------------
   * 7. レアリティ別シグナル音の再生ヘルパー
   * -------------------------------------------------------------------------- */
  function playSignalSound(rarity) {
    var settings = getSettings();
    var rs = settings.raritySounds || {};

    // レアリティ別 ON/OFF チェック
    var rarityKey = rarity ? rarity.toLowerCase() : 'normal';
    if (rs[rarityKey] === false) return;

    if (rarityKey === 'legendary') {
      play('signal_legendary');
    } else if (rarityKey === 'rare' || rarityKey === 'epic') {
      play('signal_rare');
    } else {
      play('signal_normal');
    }
  }

  /* --------------------------------------------------------------------------
   * 8. 音量設定の更新
   * -------------------------------------------------------------------------- */
  function setVolume(vol) {
    vol = Math.max(0, Math.min(1, parseFloat(vol) || 0));
    if (global.TrialStore) {
      var s = global.TrialStore.getState();
      if (!s.settings.sound) s.settings.sound = {};
      s.settings.sound.volume = vol;
      global.TrialStore.save(s);
    }
  }

  function setEnabled(bool) {
    if (global.TrialStore) {
      var s = global.TrialStore.getState();
      if (!s.settings.sound) s.settings.sound = {};
      s.settings.sound.enabled = !!bool;
      global.TrialStore.save(s);
    }
  }

  function setRaritySoundEnabled(rarity, bool) {
    if (global.TrialStore) {
      var s = global.TrialStore.getState();
      if (!s.settings.sound) s.settings.sound = {};
      if (!s.settings.sound.raritySounds) s.settings.sound.raritySounds = {};
      s.settings.sound.raritySounds[rarity] = !!bool;
      global.TrialStore.save(s);
    }
  }

  /* --------------------------------------------------------------------------
   * 9. ユーザー操作時に AudioContext を resume する(iOS 対策)
   *    アプリ起動直後に document に1回だけ登録
   * -------------------------------------------------------------------------- */
  (function setupUnlockListener() {
    var unlocked = false;
    function unlock() {
      if (unlocked) return;
      unlocked = true;
      var ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('touchend',   unlock);
      document.removeEventListener('click',      unlock);
    }
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('touchend',   unlock, { passive: true });
    document.addEventListener('click',      unlock);
  })();

  /* --------------------------------------------------------------------------
   * 10. 公開 API
   * -------------------------------------------------------------------------- */
  var SoundSystem = {
    SOUND_MAP:              SOUND_MAP,
    preload:                preload,
    play:                   play,
    playSignalSound:        playSignalSound,
    setVolume:              setVolume,
    setEnabled:             setEnabled,
    setRaritySoundEnabled:  setRaritySoundEnabled,
    isSoundEnabled:         isSoundEnabled,
    getVolume:              getVolume
  };

  global.SoundSystem = SoundSystem;

})(typeof window !== 'undefined' ? window : this);
