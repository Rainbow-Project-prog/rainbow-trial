/* ==========================================================================
 * Rainbow Trial — js/level-system.js
 * レベル・XP システム
 *
 * 公開グローバル: window.LevelSystem
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. レベルテーブル (Lv1〜20)
   * -------------------------------------------------------------------------- */
  var LEVELS = [
    { level: 1,  requiredXP: 0,     title: '見習いトレーダー',      icon: '🌱' },
    { level: 2,  requiredXP: 100,   title: '新米トレーダー',        icon: '🌿' },
    { level: 3,  requiredXP: 250,   title: '駆け出しトレーダー',    icon: '🍀' },
    { level: 4,  requiredXP: 450,   title: '見えてきたトレーダー',  icon: '🌾' },
    { level: 5,  requiredXP: 700,   title: '中堅トレーダー',        icon: '🌲' },
    { level: 6,  requiredXP: 1000,  title: 'ベテラントレーダー',    icon: '🌳' },
    { level: 7,  requiredXP: 1400,  title: '熟練トレーダー',        icon: '⭐' },
    { level: 8,  requiredXP: 1900,  title: '達人トレーダー',        icon: '🌟' },
    { level: 9,  requiredXP: 2500,  title: 'プロトレーダー',        icon: '💫' },
    { level: 10, requiredXP: 3200,  title: 'Rainbow Master',        icon: '🌈' },
    { level: 11, requiredXP: 4000,  title: 'Rainbow Master II',     icon: '🌈⭐' },
    { level: 12, requiredXP: 4900,  title: 'Rainbow Master III',    icon: '🌈🌟' },
    { level: 13, requiredXP: 5900,  title: 'Rainbow Elite',         icon: '💎' },
    { level: 14, requiredXP: 7000,  title: 'Rainbow Elite II',      icon: '💎⭐' },
    { level: 15, requiredXP: 8200,  title: 'Rainbow Elite III',     icon: '💎🌟' },
    { level: 16, requiredXP: 9500,  title: 'Rainbow Champion',      icon: '👑' },
    { level: 17, requiredXP: 10900, title: 'Rainbow Champion II',   icon: '👑⭐' },
    { level: 18, requiredXP: 12400, title: 'Rainbow Champion III',  icon: '👑🌟' },
    { level: 19, requiredXP: 14000, title: 'Rainbow Legend',        icon: '🔱' },
    { level: 20, requiredXP: 16000, title: 'Legendary Trader',      icon: '🌈👑' }
  ];

  var MAX_LEVEL = 20;

  /* --------------------------------------------------------------------------
   * 2. XP 獲得ルール
   * -------------------------------------------------------------------------- */
  var XP_RULES = {
    signal_view:      5,   // シグナル詳細を開く
    entry:            10,  // エントリー実行
    skip:             5,   // 見送り実行
    tp_hit:           30,  // TP HIT (勝利)
    sl_hit:           10,  // SL HIT (挑戦評価)
    correct_entry_ok: 15,  // 条件OK時の正しいエントリーボーナス
    correct_skip_ng:  15,  // 条件NG時の正しい見送りボーナス
    daily_mission:    50,  // デイリーミッション1個達成
    day_clear:        100  // Dayクリアボーナス
  };

  /* --------------------------------------------------------------------------
   * 3. レアリティ別 XP ボーナス
   * -------------------------------------------------------------------------- */
  var RARITY_XP_BONUS = {
    normal:    0,
    good:      5,
    rare:      15,
    epic:      30,
    legendary: 100
  };

  /* --------------------------------------------------------------------------
   * 4. 連勝ボーナス XP
   * -------------------------------------------------------------------------- */
  function getStreakBonus(streak) {
    if (streak < 2) return 0;
    // 2連勝+10, 3連勝+20, 4連勝+30, 5連勝以上+50
    if (streak === 2) return 10;
    if (streak === 3) return 20;
    if (streak === 4) return 30;
    return 50;
  }

  /* --------------------------------------------------------------------------
   * 5. 現在 XP からレベル情報を計算
   * -------------------------------------------------------------------------- */
  function getLevelInfo(xp) {
    xp = Math.max(0, xp || 0);
    var currentLevel = LEVELS[0];
    var nextLevel    = LEVELS[1] || null;

    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].requiredXP) {
        currentLevel = LEVELS[i];
        nextLevel    = LEVELS[i + 1] || null;
        break;
      }
    }

    var xpInLevel   = xp - currentLevel.requiredXP;
    var xpToNext    = nextLevel ? nextLevel.requiredXP - currentLevel.requiredXP : 0;
    var progressPct = (nextLevel && xpToNext > 0)
      ? Math.min(100, Math.floor(xpInLevel / xpToNext * 100))
      : 100;

    return {
      level:       currentLevel.level,
      title:       currentLevel.title,
      icon:        currentLevel.icon,
      xp:          xp,
      xpInLevel:   xpInLevel,
      xpToNext:    xpToNext,
      progressPct: progressPct,
      nextLevel:   nextLevel,
      isMaxLevel:  currentLevel.level >= MAX_LEVEL
    };
  }

  /* --------------------------------------------------------------------------
   * 6. XP 付与 & レベルアップ判定
   *    returns { newXP, newLevel, leveledUp, levelsGained, fromLevel, toLevel }
   * -------------------------------------------------------------------------- */
  function addXP(amount) {
    var s = global.TrialStore.getState();
    var oldXP    = s.user.xp || 0;
    var newXP    = oldXP + Math.max(0, amount);

    var oldInfo  = getLevelInfo(oldXP);
    var newInfo  = getLevelInfo(newXP);
    var leveledUp = newInfo.level > oldInfo.level;

    // state を更新
    s.user.xp            = newXP;
    s.user.level         = newInfo.level;
    s.user.titleAchieved = newInfo.title;
    global.TrialStore.save(s);

    return {
      newXP:       newXP,
      addedXP:     amount,
      newLevel:    newInfo.level,
      leveledUp:   leveledUp,
      levelsGained: newInfo.level - oldInfo.level,
      fromLevel:   oldInfo,
      toLevel:     newInfo
    };
  }

  /* --------------------------------------------------------------------------
   * 7. XP 計算ヘルパー
   *    イベント種別と付随データから総獲得 XP を返す
   * -------------------------------------------------------------------------- */
  function calcXP(eventType, opts) {
    opts = opts || {};
    var base = XP_RULES[eventType] || 0;

    // レアリティボーナス(TP/SL時のみ)
    var rarityBonus = 0;
    if ((eventType === 'tp_hit' || eventType === 'sl_hit') && opts.rarity) {
      rarityBonus = RARITY_XP_BONUS[opts.rarity] || 0;
    }

    // 連勝ボーナス(TP時のみ)
    var streakBonus = 0;
    if (eventType === 'tp_hit' && opts.streak) {
      streakBonus = getStreakBonus(opts.streak);
    }

    // 正判定ボーナス
    var correctBonus = 0;
    if (opts.correctEntry) correctBonus += XP_RULES.correct_entry_ok;
    if (opts.correctSkip)  correctBonus += XP_RULES.correct_skip_ng;

    return base + rarityBonus + streakBonus + correctBonus;
  }

  /* --------------------------------------------------------------------------
   * 8. プログレスバー HTML 生成
   * -------------------------------------------------------------------------- */
  function renderXPBar(xp) {
    var info = getLevelInfo(xp);
    var filled = Math.round(info.progressPct / 10);   // 0〜10 ブロック
    var empty  = 10 - filled;
    var bar    = '━'.repeat(filled) + '░'.repeat(empty);

    if (info.isMaxLevel) {
      return (
        '<span class="xp-bar__level">' + info.icon + ' Lv.' + info.level + '</span>' +
        '<span class="xp-bar__title">' + info.title + '</span>' +
        '<span class="xp-bar__bar">MAX</span>'
      );
    }

    return (
      '<span class="xp-bar__level">' + info.icon + ' Lv.' + info.level + '</span>' +
      '<span class="xp-bar__title">' + info.title + '</span>' +
      '<span class="xp-bar__bar">' + bar + '</span>' +
      '<span class="xp-bar__xp">' + info.xpInLevel + ' / ' + info.xpToNext + ' XP</span>'
    );
  }

  /* --------------------------------------------------------------------------
   * 9. レベルアップモーダル HTML 生成
   * -------------------------------------------------------------------------- */
  function buildLevelUpHTML(fromLevel, toLevel) {
    return (
      '<div class="levelup-modal__wrap">' +
        '<div class="levelup-modal__flash"></div>' +
        '<div class="levelup-modal__content">' +
          '<div class="levelup-modal__label">LEVEL UP!</div>' +
          '<div class="levelup-modal__num">Lv.' + toLevel.level + '</div>' +
          '<div class="levelup-modal__icon">' + toLevel.icon + '</div>' +
          '<div class="levelup-modal__title">' + toLevel.title + '</div>' +
          '<div class="levelup-modal__from">(' + fromLevel.icon + ' ' + fromLevel.title + ' → ' + toLevel.icon + ' ' + toLevel.title + ')</div>' +
          '<button class="levelup-modal__btn btn btn--primary" id="levelup-continue">続ける</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* --------------------------------------------------------------------------
   * 10. 公開 API
   * -------------------------------------------------------------------------- */
  var LevelSystem = {
    LEVELS:          LEVELS,
    XP_RULES:        XP_RULES,
    RARITY_XP_BONUS: RARITY_XP_BONUS,
    MAX_LEVEL:       MAX_LEVEL,

    getLevelInfo:    getLevelInfo,
    addXP:           addXP,
    calcXP:          calcXP,
    getStreakBonus:  getStreakBonus,
    renderXPBar:     renderXPBar,
    buildLevelUpHTML: buildLevelUpHTML
  };

  global.LevelSystem = LevelSystem;

})(typeof window !== 'undefined' ? window : this);
