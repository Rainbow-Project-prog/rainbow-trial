/* ==========================================================================
 * Rainbow Trial — data/missions-list.js
 * デイリーミッション定義 — Day 1〜7、各日3ミッション
 *
 * type 一覧:
 *   signal_view   — シグナル詳細を開いた回数
 *   entry         — エントリー実行回数
 *   entry_pair    — 指定通貨ペアでエントリー (pair フィールド必須)
 *   tp_hit        — TP到達回数
 *   skip          — 見送り回数(条件問わず)
 *   skip_ng       — 条件NGシグナルを正しく見送った回数
 *   entry_ok      — 条件OKシグナルに正しくエントリーした回数
 *   streak        — 連勝数が target 以上に達する
 *   rarity_win    — 指定レアリティ以上のシグナルでTP到達 (rarity フィールド必須)
 *   any_trade     — エントリーまたは見送り合計回数
 *
 * 公開グローバル: window.DAILY_MISSIONS (object)
 * ========================================================================== */

(function (global) {
  'use strict';

  var DAILY_MISSIONS = {

    /* -----------------------------------------------------------------------
     * Day 1 — 慣れる (簡単)
     * ----------------------------------------------------------------------- */
    day1: [
      {
        id: 'd1_m1',
        title: '初シグナルを確認する',
        description: 'シグナル詳細画面を1回開く',
        target: 1,
        type: 'signal_view',
        xp: 30
      },
      {
        id: 'd1_m2',
        title: '1回エントリーを実行する',
        description: 'エントリーボタンを押してトレードを開始する',
        target: 1,
        type: 'entry',
        xp: 50
      },
      {
        id: 'd1_m3',
        title: 'TPに到達させる',
        description: '保有ポジションをTP(利確)で決着させる',
        target: 1,
        type: 'tp_hit',
        xp: 50
      }
    ],

    /* -----------------------------------------------------------------------
     * Day 2 — 基本を学ぶ (標準)
     * ----------------------------------------------------------------------- */
    day2: [
      {
        id: 'd2_m1',
        title: 'シグナルを3回確認する',
        description: 'シグナル詳細画面を3回開く',
        target: 3,
        type: 'signal_view',
        xp: 30
      },
      {
        id: 'd2_m2',
        title: 'USDJPYでエントリーする',
        description: 'USD/JPYシグナルでエントリーを実行する',
        target: 1,
        type: 'entry_pair',
        pair: 'USDJPY',
        xp: 40
      },
      {
        id: 'd2_m3',
        title: 'BTCUSDでエントリーする',
        description: 'BTC/USDシグナルでエントリーを実行する',
        target: 1,
        type: 'entry_pair',
        pair: 'BTCUSD',
        xp: 40
      }
    ],

    /* -----------------------------------------------------------------------
     * Day 3 — 判定力を鍛える (標準)
     * ----------------------------------------------------------------------- */
    day3: [
      {
        id: 'd3_m1',
        title: '条件NGを2回見送る',
        description: '条件が揃っていないシグナルを正しく見送る',
        target: 2,
        type: 'skip_ng',
        xp: 60
      },
      {
        id: 'd3_m2',
        title: 'RARE以上のシグナルで勝利する',
        description: 'レアリティがRARE以上のシグナルでTPに到達する',
        target: 1,
        type: 'rarity_win',
        rarity: 'rare',
        xp: 80
      },
      {
        id: 'd3_m3',
        title: '2連勝以上達成する',
        description: '2連勝以上の連勝ストリークを記録する',
        target: 2,
        type: 'streak',
        xp: 50
      }
    ],

    /* -----------------------------------------------------------------------
     * Day 4 — 精度を上げる (チャレンジング)
     * ----------------------------------------------------------------------- */
    day4: [
      {
        id: 'd4_m1',
        title: '条件OKシグナルに3回エントリーする',
        description: '条件が揃っているシグナルに正しくエントリーする',
        target: 3,
        type: 'entry_ok',
        xp: 70
      },
      {
        id: 'd4_m2',
        title: '本日3回エントリーする',
        description: '今日だけで3回のエントリーを実行する',
        target: 3,
        type: 'entry',
        xp: 50
      },
      {
        id: 'd4_m3',
        title: '3連勝を達成する',
        description: '3連勝以上の連勝ストリークを記録する',
        target: 3,
        type: 'streak',
        xp: 80
      }
    ],

    /* -----------------------------------------------------------------------
     * Day 5 — 応用力を試す (チャレンジング)
     * ----------------------------------------------------------------------- */
    day5: [
      {
        id: 'd5_m1',
        title: '条件NGを3回連続見送る',
        description: '条件NG判定のシグナルを3回連続で正しく見送る',
        target: 3,
        type: 'skip_ng',
        xp: 90
      },
      {
        id: 'd5_m2',
        title: 'EPIC以上のシグナルで勝利する',
        description: 'レアリティがEPIC以上のシグナルでTPに到達する',
        target: 1,
        type: 'rarity_win',
        rarity: 'epic',
        xp: 100
      },
      {
        id: 'd5_m3',
        title: '本日4回以上トレードする',
        description: 'エントリーまたは見送りを合計4回以上実行する',
        target: 4,
        type: 'any_trade',
        xp: 60
      }
    ],

    /* -----------------------------------------------------------------------
     * Day 6 — 高難度チャレンジ
     * ----------------------------------------------------------------------- */
    day6: [
      {
        id: 'd6_m1',
        title: '条件OKシグナルに5回エントリーする',
        description: '条件が揃っているシグナルを見極めてエントリーする',
        target: 5,
        type: 'entry_ok',
        xp: 100
      },
      {
        id: 'd6_m2',
        title: '4連勝を達成する',
        description: '4連勝以上の連勝ストリークを記録する',
        target: 4,
        type: 'streak',
        xp: 120
      },
      {
        id: 'd6_m3',
        title: 'シグナルを5回確認する',
        description: 'シグナル詳細画面を5回開き、チャートを確認する',
        target: 5,
        type: 'signal_view',
        xp: 50
      }
    ],

    /* -----------------------------------------------------------------------
     * Day 7 — 最終試練 (高難度)
     * ----------------------------------------------------------------------- */
    day7: [
      {
        id: 'd7_m1',
        title: '本日5回エントリーする',
        description: '最終日、5回のエントリーで実力を見せる',
        target: 5,
        type: 'entry',
        xp: 100
      },
      {
        id: 'd7_m2',
        title: '条件NGを4回正しく見送る',
        description: 'ルールを守り、条件NGを4回見送る',
        target: 4,
        type: 'skip_ng',
        xp: 120
      },
      {
        id: 'd7_m3',
        title: '5連勝を達成する',
        description: '7日間の集大成、5連勝を記録せよ',
        target: 5,
        type: 'streak',
        xp: 200
      }
    ]

  };

  /**
   * 指定 day のミッション配列を返す。
   * @param {number} day 1〜7
   * @returns {Array}
   */
  function getMissionsForDay(day) {
    var key = 'day' + day;
    return DAILY_MISSIONS[key] || [];
  }

  /**
   * 全ミッションをフラットな配列で返す。
   * @returns {Array}
   */
  function getAllMissions() {
    var result = [];
    for (var d = 1; d <= 7; d++) {
      var list = getMissionsForDay(d);
      for (var i = 0; i < list.length; i++) {
        result.push(Object.assign({ day: d }, list[i]));
      }
    }
    return result;
  }

  global.DAILY_MISSIONS    = DAILY_MISSIONS;
  global.getMissionsForDay = getMissionsForDay;
  global.getAllMissions     = getAllMissions;

})(typeof window !== 'undefined' ? window : this);
