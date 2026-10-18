/* =============================================================
   leaderboard.js  —  the start.ng leaderboard (top 10)
   =============================================================
   The board is start.ng's OWN — no database of ours. Two messages,
   over the same hidden connect page auth.js uses for login:

     { type:'startng:score', stats:{ distance, coins } }
         -> { type:'startng:scoreSaved', ok:true,
              result:{ best, improved, rank, stats } }
     { type:'startng:leaderboard', limit:10 }
         -> { type:'startng:leaderboardData', ok:true,
              entries:[{ rank, player_id, name, color, score, stats }] }

   The two columns are declared in startng.json (read by start.ng on
   every publish). start.ng only answers games served from a
   *.start.ng address (*.start.localhost works too, for testing) —
   anywhere else the panel says so and the game plays on as before.

   Score values are whole metres/coins, so nothing here touches the
   game loop: runs are sent once at game over, the panel is built
   only when it opens.
   ============================================================= */
(function () {
  'use strict';

  var START_NG = 'https://start.ng';
  var LIMIT = 10;
  var BEST_PREFIX = 'citydash.best.v1.';   // this device's personal best, per player

  function $(id) { return document.getElementById(id); }

  // ---- localStorage (never let a blocked browser break the game) ----
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (_) {} }
  function bestKey(name) { return BEST_PREFIX + String(name || 'Guest').toLowerCase(); }
  function bestOf(name) { var n = parseInt(lsGet(bestKey(name)), 10); return isFinite(n) && n > 0 ? n : 0; }
  function fmt(n) { try { return Number(n).toLocaleString(); } catch (_) { return '' + n; } }

  // start.ng's connect page only replies to games on a start.ng address.
  function onStartNgHost() {
    return /^[a-z0-9-]+\.start\.ng$/i.test(location.hostname) ||
           /^[a-z0-9-]+\.start\.localhost$/i.test(location.hostname);
  }

  // ---- the hidden connect page (one frame, created once, reused) ----
  var frame = null, frameDead = false, seq = 0;
  function connectFrame() {
    if (frame) return Promise.resolve(frame);
    if (frameDead) return Promise.reject(new Error('no connect frame'));
    return new Promise(function (resolve, reject) {
      var el = document.createElement('iframe');
      el.hidden = true; el.setAttribute('aria-hidden', 'true');
      el.src = START_NG + '/connect';
      el.onload = function () { frame = el; resolve(el); };
      el.onerror = function () { frameDead = true; reject(new Error('connect frame failed')); };
      document.body.appendChild(el);
    });
  }

  // Sends one message, resolves to start.ng's reply or null (never throws).
  function askStartNg(message, replyType, timeoutMs) {
    return connectFrame().then(function (el) {
      return new Promise(function (resolve) {
        var requestId = 'lb' + (++seq) + '-' + Date.now().toString(36);
        var timer, onMsg;
        function done(value) {
          clearTimeout(timer);
          window.removeEventListener('message', onMsg);
          resolve(value);
        }
        timer = setTimeout(function () { done(null); }, timeoutMs || 6000);
        onMsg = function (e) {
          if (e.origin !== START_NG || e.source !== el.contentWindow) return;   // security: only trust start.ng
          var d = e.data || {};
          if (d.type === replyType && d.requestId === requestId) done(d);
        };
        window.addEventListener('message', onMsg);
        try {
          var payload = {};
          Object.keys(message).forEach(function (k) { payload[k] = message[k]; });
          payload.requestId = requestId;
          el.contentWindow.postMessage(payload, START_NG);
        } catch (_) { done(null); }
      });
    }).catch(function () { return null; });
  }

  // ---- who we are (handed over by game.js after auth.js answers) ----
  var player = { id: null, name: 'Guest', face: null, loggedIn: false };
  var lastRank = 0, lastScore = 0, returnFocus = null;
  var overlay = $('lb-overlay'), list = $('lb-list'), status = $('lb-status'),
      you = $('lb-you'), closeBtn = $('lb-close');

  function note(text) { var el = $('lb-note'); if (el) el.textContent = text || ''; }
  function showNewBest(on) { var el = $('newbest'); if (el) el.hidden = !on; }
  function hideResult() { showNewBest(false); note(''); }

  // Safe colour for another player's avatar dot (their start.ng colour).
  function safeColor(c) {
    c = ('' + (c || '')).trim();
    return /^#[0-9a-fA-F]{6}$/.test(c) ? c : null;
  }

  // ---- run over: send it to start.ng, say whether it's a record ----
  function onRunOver(run) {
    var distance = Math.max(0, Math.floor(Number(run && run.distance) || 0));
    var coins = Math.max(0, Math.floor(Number(run && run.coins) || 0));
    var name = player.name || 'Guest';
    var localNew = distance > bestOf(name);
    if (localNew) lsSet(bestKey(name), String(distance));
    lastScore = distance;
    showNewBest(localNew);

    if (!onStartNgHost()) {
      note('Playing locally — scores save on startng-city-dash.start.ng.');
      return;
    }
    askStartNg({ type: 'startng:score', stats: { distance: distance, coins: coins } },
      'startng:scoreSaved', 7000).then(function (r) {
        if (!r) { note("start.ng didn't answer — this run wasn't saved."); return; }
        if (!r.ok) { note(r.error || "start.ng couldn't save this run."); return; }
        var res = r.result || {};
        if (res.rank) lastRank = res.rank;
        if (res.improved) showNewBest(true);
        note('Saved to start.ng' + (res.rank ? " · you're #" + res.rank : '') +
          (res.improved ? ' — new best!' : ''));
      });
  }

  // ---- the panel ----
  function renderEmpty(text) {
    list.innerHTML = '';
    if (!text) return;
    var li = document.createElement('li');
    li.className = 'lb-empty';
    li.textContent = text;
    list.appendChild(li);
  }

  function render(entries) {
    list.innerHTML = '';
    if (!entries.length) {
      status.textContent = 'The top ' + LIMIT + ' runs on start.ng.';
      renderEmpty('No scores yet — be the first on the board!');
      return;
    }
    status.textContent = 'Best run kept per player · top ' + entries.length + ' on start.ng.';
    var meIn = false;
    entries.forEach(function (e, i) {
      var rank = e.rank != null ? e.rank : i + 1;
      var isMe = player.id != null && e.player_id === player.id;
      if (isMe) meIn = true;
      var stats = e.stats || {};

      var li = document.createElement('li');
      li.className = 'lb-row' + (isMe ? ' me' : '');
      li.dataset.rank = rank;

      var rankEl = document.createElement('span');
      rankEl.className = 'lb-rank';
      rankEl.textContent = rank;

      var face = document.createElement('span');
      face.className = 'lb-face';
      if (isMe && player.face) {
        var img = document.createElement('img');
        img.alt = ''; img.src = player.face;
        face.appendChild(img);
      } else {
        var col = safeColor(e.color);
        if (col) face.style.background = col;
        face.textContent = (String(e.name || '?').trim().charAt(0) || '?').toUpperCase();
      }

      var name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = String(e.name || 'Player');

      var val = document.createElement('span');
      val.className = 'lb-val';
      var big = document.createElement('b');
      var small = document.createElement('small');
      if (stats.distance != null) {
        big.textContent = fmt(stats.distance) + ' m';
        small.textContent = stats.coins != null ? fmt(stats.coins) + ' coins' : '';
      } else {
        big.textContent = fmt(e.score != null ? e.score : 0);
        small.textContent = 'score';
      }
      val.appendChild(big); val.appendChild(small);

      li.appendChild(rankEl); li.appendChild(face); li.appendChild(name); li.appendChild(val);
      list.appendChild(li);
    });
    if (!meIn && lastRank) {
      you.textContent = "You're #" + lastRank + (lastScore ? ' · ' + fmt(lastScore) + ' m' : '');
      you.hidden = false;
    }
  }

  function open() {
    if (!overlay) return;
    returnFocus = document.activeElement;
    overlay.hidden = false;
    list.innerHTML = '';
    you.hidden = true; you.textContent = '';
    status.textContent = 'Loading the top ' + LIMIT + ' from start.ng…';
    if (closeBtn && closeBtn.focus) closeBtn.focus();

    if (!onStartNgHost()) {
      status.textContent = 'The shared board lives on start.ng — play on ' +
        'startng-city-dash.start.ng and it fills up here.';
      renderEmpty('No scores yet while playing locally.');
      return;
    }
    askStartNg({ type: 'startng:leaderboard', limit: LIMIT }, 'startng:leaderboardData', 7000)
      .then(function (r) {
        if (!overlay || overlay.hidden) return;
        if (!r) { status.textContent = "start.ng didn't answer — close and try again."; renderEmpty(''); return; }
        if (!r.ok) { status.textContent = r.error || 'Could not load the leaderboard.'; renderEmpty(''); return; }
        render(r.entries || []);
      });
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    if (returnFocus && returnFocus.focus) { try { returnFocus.focus(); } catch (_) {} }
  }

  // ---- wiring (all of it event-driven: nothing runs during a run) ----
  var lbBtn = $('lb-btn'), startBtn = $('start-btn');
  if (lbBtn) lbBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  if (startBtn) startBtn.addEventListener('click', hideResult);   // new run: clear the banner
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  window.CityDashLB = {
    setPlayer: function (u) { if (u) player = u; },
    onRunOver: onRunOver,
    hideResult: hideResult,
    open: open,
  };
})();
