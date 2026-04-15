/* ==========================================================================
 * Rainbow Trial — js/members-feed.js
 * 他メンバーの疑似アクティビティフィード表示
 *
 * 依存: window.MEMBERS_FEED_DATA (data/members-feed.js)
 *       window.TrialStore        (js/storage.js)
 *
 * 公開グローバル: window.MembersFeed
 * ========================================================================== */

(function (global) {
  'use strict';

  var RARITY_COLORS = {
    normal:    '',
    good:      'feed-item--good',
    rare:      'feed-item--rare',
    epic:      'feed-item--epic',
    legendary: 'feed-item--legendary'
  };

  /* --------------------------------------------------------------------------
   * 1. フィードカード HTML 生成
   * -------------------------------------------------------------------------- */
  function renderFeedCard(container) {
    if (!container) return;
    if (!global.MEMBERS_FEED_DATA) return;

    var data  = global.MEMBERS_FEED_DATA.generateFeed(5);
    var html  = '';

    html += '<div class="feed-card card">';
    html += '<div class="feed-card__header">';
    html += '<span class="feed-card__icon">👥</span>';
    html += '<span class="feed-card__title">メンバーの動き</span>';
    html += '<span class="feed-card__live">● LIVE</span>';
    html += '</div>';
    html += '<div class="feed-card__list" id="feed-list">';
    data.forEach(function (item) {
      html += buildFeedItem(item);
    });
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
  }

  function buildFeedItem(item) {
    var cls = 'feed-item ' + (RARITY_COLORS[item.rarity] || '');
    return (
      '<div class="' + cls + '">' +
        '<div class="feed-item__avatar">' + item.avatar + '</div>' +
        '<div class="feed-item__body">' +
          '<div class="feed-item__msg">' + escapeHtml(item.msg) + '</div>' +
        '</div>' +
        '<div class="feed-item__time">' + item.timeAgo + '</div>' +
      '</div>'
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* --------------------------------------------------------------------------
   * 2. 定期リフレッシュ(30秒毎に1件アニメーション付きで追加)
   * -------------------------------------------------------------------------- */
  var _refreshTimer = null;

  function startRefresh() {
    if (_refreshTimer) return;
    _refreshTimer = setInterval(function () {
      var list = document.getElementById('feed-list');
      if (!list) { stopRefresh(); return; }

      if (!global.MEMBERS_FEED_DATA) return;
      var newItem = global.MEMBERS_FEED_DATA.generateFeed(1, Date.now())[0];
      if (!newItem) return;

      var el = document.createElement('div');
      el.innerHTML = buildFeedItem(newItem);
      var node = el.firstChild;
      if (!node) return;

      node.classList.add('feed-item--new');
      list.insertBefore(node, list.firstChild);

      // 先頭5件のみ保持
      var children = list.querySelectorAll('.feed-item');
      for (var i = 5; i < children.length; i++) {
        children[i].parentNode.removeChild(children[i]);
      }

      // 入場アニメーション
      requestAnimationFrame(function () {
        node.classList.add('feed-item--enter');
      });
    }, 30000);
  }

  function stopRefresh() {
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
  }

  /* --------------------------------------------------------------------------
   * 3. 公開 API
   * -------------------------------------------------------------------------- */
  var MembersFeed = {
    renderFeedCard:  renderFeedCard,
    startRefresh:    startRefresh,
    stopRefresh:     stopRefresh,
    buildFeedItem:   buildFeedItem
  };

  global.MembersFeed = MembersFeed;

})(typeof window !== 'undefined' ? window : this);
