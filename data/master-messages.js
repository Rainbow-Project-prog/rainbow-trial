/* ==========================================================================
 * Rainbow Trial — data/master-messages.js
 * サロンマスターからのメッセージ定義
 *
 * 公開グローバル: window.MASTER_MESSAGES
 * ========================================================================== */

(function (global) {
  'use strict';

  /**
   * メッセージ定義
   * id, day: 表示タイミング
   * title, body: メッセージ本文 (HTMLタグ使用可)
   * badge: メッセージ種別バッジ
   * tips: ヒント一覧(オプション)
   */
  var MASTER_MESSAGES = [
    {
      id: 'day2_message',
      day: 2,
      badge: '💬 Day 2 メッセージ',
      title: '2日目、よく来てくれました！',
      body: [
        '昨日のシグナルを確認できましたか？',
        '',
        '初日にしては <strong>素晴らしいスタート</strong> でした。',
        'Rainbow System のシグナルには、すべて「条件」があります。',
        '',
        '大事なのは <strong>条件を満たした時だけエントリーする</strong> という徹底した規律です。',
        '今日もその判断を意識しながら取り組んでみてください。'
      ].join('<br>'),
      tips: [
        '📌 エントリー前に必ず条件を確認',
        '📌 NG の時は潔く見送りが正解',
        '📌 1日3〜5本のシグナルに集中する'
      ],
      from: '— Rainbow System マスター'
    },
    {
      id: 'day5_message',
      day: 5,
      badge: '💬 Day 5 メッセージ',
      title: '折り返し地点を超えましたね',
      body: [
        '5日目に突入しました。ここまで来られたあなたは <strong>本物のトレーダーの素質</strong> があります。',
        '',
        'この5日間で、シグナルのパターンや条件の見方が',
        '少しずつ身についてきていると思います。',
        '',
        '<strong>勝率より「判断の質」</strong> を意識してください。',
        '正しい判断を積み重ねることが、長期的な勝利への道です。'
      ].join('<br>'),
      tips: [
        '💡 レア以上のシグナルは特に高確率',
        '💡 条件NGの見送りも「正解」',
        '💡 連勝中は慢心せず、同じ判断基準を維持'
      ],
      from: '— Rainbow System マスター'
    },
    {
      id: 'day7_message',
      day: 7,
      badge: '🎊 最終日メッセージ',
      title: '最終日です。全力で楽しんでください！',
      body: [
        '<strong>7日間のトライアルも、いよいよ最終日。</strong>',
        '',
        'この7日間で、あなたは FX トレードの基礎と',
        'Rainbow System の考え方を体験してきました。',
        '',
        '今日のシグナルが終わると、あなたの <strong>7日間の総合成績</strong> が発表されます。',
        '',
        '最後まで全力で、正しい判断を積み重ねてください！'
      ].join('<br>'),
      tips: [
        '🏆 今日は判定スコアに全集中',
        '🏆 最後のシグナルまで気を抜かない',
        '🏆 結果発表後は次のステップへ'
      ],
      from: '— Rainbow System マスター',
      special: true  // Day 7 は特別演出あり
    }
  ];

  /**
   * 指定 Day のメッセージを返す
   * @param {number} day
   * @returns {Object|null}
   */
  function getMessageForDay(day) {
    for (var i = 0; i < MASTER_MESSAGES.length; i++) {
      if (MASTER_MESSAGES[i].day === day) return MASTER_MESSAGES[i];
    }
    return null;
  }

  global.MASTER_MESSAGES   = MASTER_MESSAGES;
  global.getMessageForDay  = getMessageForDay;

})(typeof window !== 'undefined' ? window : this);
