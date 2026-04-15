/* ==========================================================================
 * Rainbow Trial — data/members-feed.js
 * 他メンバーの疑似アクティビティフィードデータ
 *
 * 公開グローバル: window.MEMBERS_FEED_DATA
 * ========================================================================== */

(function (global) {
  'use strict';

  /** メンバー名プール */
  var MEMBER_NAMES = [
    'Yuki_trade', 'FX初心者の旅', 'Rainbow信者', 'masa_fx',
    'ゆかり@FX学習中', 'たけし_トレード', 'こうへい先生', 'みなみFX',
    'サラリーマン投資家', 'FXはじめました', 'レインボー追跡者', '主婦トレーダー',
    'ともちゃん投資', 'けんじ@副業', 'あいちゃんFX', 'ひろ_トレード',
    'FXで自由を', 'パート主婦の挑戦', '会社員Sのトレード日記', 'ふわふわ_FX'
  ];

  /** アバター絵文字プール */
  var AVATARS = [
    '👩', '👨', '🧑', '👩‍💼', '👨‍💼', '🧑‍💻', '👩‍🎓', '👨‍🎓',
    '🧑‍🏫', '👩‍🔬', '👨‍💻', '🧑‍🎨', '👸', '🤵', '👳', '🧕'
  ];

  /** イベントテンプレート */
  var FEED_TEMPLATES = [
    // TP達成系
    { type: 'tp_win', msg: '{name} が USDJPY で TP 達成！ +{amount}円 🎉', rarity: 'good' },
    { type: 'tp_win', msg: '{name} が BTCUSD で TP HIT！ +{amount}円 🏆', rarity: 'rare' },
    { type: 'tp_win', msg: '{name} が EPIC シグナルで大勝利！ +{amount}円 ✨', rarity: 'epic' },
    { type: 'tp_win', msg: '{name} が LEGENDARY シグナルで +{amount}円の快勝！ 🌈', rarity: 'legendary' },
    // 連勝系
    { type: 'streak', msg: '{name} が {streak}連勝達成！ 🔥🔥🔥', rarity: 'normal' },
    { type: 'streak', msg: '{name} が {streak}連勝継続中！止まらない！ 🔥', rarity: 'normal' },
    // 実績系
    { type: 'achievement', msg: '{name} が実績「{ach}」を解除！ 🏅', rarity: 'normal' },
    { type: 'achievement', msg: '{name} が実績「{ach}」を獲得しました！ ⭐', rarity: 'good' },
    // エントリー系
    { type: 'entry', msg: '{name} が {pair} にエントリー！ 📈', rarity: 'normal' },
    { type: 'entry', msg: '{name} が RARE シグナルにエントリーしました 👀', rarity: 'rare' },
    // レベルアップ系
    { type: 'levelup', msg: '{name} が Lv.{level} に到達！ 🌟', rarity: 'normal' },
    // 判定スコア系
    { type: 'score', msg: '{name} の判定スコアが {rank} ランクに！ 💎', rarity: 'good' },
    // 参加系
    { type: 'join', msg: '{name} がトライアルを開始しました！ 👋', rarity: 'normal' },
    // コメント系
    { type: 'comment', msg: '{name}: 「{comment}」', rarity: 'normal' }
  ];

  /** コメントプール */
  var COMMENTS = [
    'やっとコツが分かってきた気がする！',
    'Rainbow System すごすぎ…',
    '今日のシグナル全部 OK でした！',
    'NG の見送りが大事ってやっと分かった',
    '3連勝できました！',
    '最初は難しそうだったけど楽しい',
    '条件の見方を覚えれば本当に勝てる',
    'サロン入ろうか真剣に考えてます',
    'もっと早く始めればよかった！',
    '今日も頑張ります💪',
    '昨日 SL 食らったけど今日取り返す！',
    'レアシグナル来た！ドキドキする',
    'みんなどのくらい勝率出てる？',
    '7日間で考え方変わった気がする',
    'FX こんなに楽しいとは思わなかった'
  ];

  /** 実績名プール(フィード用簡易版) */
  var ACH_NAMES = [
    'ファーストトレード', '判定の達人', '3連勝！', '連続NG見送り',
    '初めての EPIC', 'レインボーマスター', '7日間完走', '勝率70%以上',
    '完璧な判定', 'LEGENDARY トレーダー'
  ];

  /**
   * 現在時刻ベースの疑似乱数(シードあり)
   * 再描画してもある程度同じ値が返るようにする
   */
  function seededRand(seed, index) {
    var x = Math.sin((seed * 9301 + index * 49297 + 233280) % 1000000) * 10000;
    return x - Math.floor(x);
  }

  /**
   * フィードアイテムを生成する
   * @param {number} count 件数
   * @param {number} [seed] シード(省略時は現在分単位)
   * @returns {Array<{avatar, name, msg, rarity, timeAgo}>}
   */
  function generateFeed(count, seed) {
    if (seed == null) {
      // 5分刻みでシードを固定(頻繁に変わらないように)
      seed = Math.floor(Date.now() / (5 * 60 * 1000));
    }
    var items = [];
    for (var i = 0; i < count; i++) {
      var r1 = seededRand(seed, i * 7 + 1);
      var r2 = seededRand(seed, i * 7 + 2);
      var r3 = seededRand(seed, i * 7 + 3);
      var r4 = seededRand(seed, i * 7 + 4);
      var r5 = seededRand(seed, i * 7 + 5);

      var nameIdx    = Math.floor(r1 * MEMBER_NAMES.length);
      var avatarIdx  = Math.floor(r2 * AVATARS.length);
      var tmplIdx    = Math.floor(r3 * FEED_TEMPLATES.length);
      var tmpl       = FEED_TEMPLATES[tmplIdx];

      // メッセージ生成
      var amount     = (Math.floor(r4 * 80) + 5) * 1000;
      var streak     = Math.floor(r4 * 6) + 2;
      var level      = Math.floor(r4 * 15) + 2;
      var achIdx     = Math.floor(r4 * ACH_NAMES.length);
      var cmtIdx     = Math.floor(r5 * COMMENTS.length);
      var pair       = r4 > 0.5 ? 'USDJPY' : 'BTCUSD';
      var ranks      = ['B+', 'A', 'A+', 'S', 'S+'];
      var rankIdx    = Math.floor(r4 * ranks.length);

      var msg = tmpl.msg
        .replace('{name}',    MEMBER_NAMES[nameIdx])
        .replace('{amount}',  amount.toLocaleString('ja-JP'))
        .replace('{streak}',  String(streak))
        .replace('{ach}',     ACH_NAMES[achIdx])
        .replace('{pair}',    pair)
        .replace('{level}',   String(level))
        .replace('{rank}',    ranks[rankIdx])
        .replace('{comment}', COMMENTS[cmtIdx]);

      // 経過時間(1分〜30分前)
      var minsAgo = Math.floor(r5 * 29) + 1;
      var timeAgo = minsAgo === 1 ? 'たった今' : minsAgo + '分前';

      items.push({
        avatar:  AVATARS[avatarIdx],
        name:    MEMBER_NAMES[nameIdx],
        msg:     msg,
        rarity:  tmpl.rarity,
        timeAgo: timeAgo
      });
    }
    return items;
  }

  global.MEMBERS_FEED_DATA = {
    generateFeed:   generateFeed,
    MEMBER_NAMES:   MEMBER_NAMES,
    FEED_TEMPLATES: FEED_TEMPLATES
  };

})(typeof window !== 'undefined' ? window : this);
