/* =============================================================
   auth.js  —  start.ng login (real)
   =============================================================
   Gets the signed-in player's start.ng character using the
   official "connect" page: we add a hidden iframe to
   https://start.ng/connect and ask it who's playing.

   Returns { id, name, face, style, loggedIn }:
     - name  : the player's start.ng name
     - face  : a PNG data-URL of their start.ng character (or null)
     - style : their central start.ng style (used to colour the runner)
   Falls back to a Guest after a few seconds if nobody's signed in.
   ============================================================= */

window.getCurrentUser = function () {
  return new Promise((resolve) => {
    let done = false;
    const guest = () => ({ id: null, name: 'Guest', face: null, style: null, loggedIn: false });
    const finish = (u) => { if (done) return; done = true; cleanup(); resolve(u); };
    let iframe, timer, retry;

    function onMsg(e) {
      if (e.origin !== 'https://start.ng') return;          // security: only trust start.ng
      const d = e.data || {};
      if (d.type === 'startng:user') {
        const who = d.user || d.guest || null;
        if (who) finish({
          id: who.id || null,
          name: who.name || 'Guest',
          face: who.face || null,
          style: who.style || null,
          loggedIn: !!d.user,
        });
        else finish(guest());
      }
    }
    function ask() {
      try { iframe.contentWindow.postMessage({ type: 'startng:whoami', requestId: 'rq1' }, 'https://start.ng'); }
      catch (_) {}
    }
    function cleanup() {
      window.removeEventListener('message', onMsg);
      clearTimeout(timer); clearTimeout(retry);
      if (iframe) { try { iframe.remove(); } catch (_) {} }
    }

    window.addEventListener('message', onMsg);
    iframe = document.createElement('iframe');
    iframe.style.display = 'none'; iframe.setAttribute('aria-hidden', 'true');
    iframe.src = 'https://start.ng/connect';
    iframe.onload = ask;
    document.body.appendChild(iframe);
    retry = setTimeout(ask, 600);
    timer = setTimeout(() => finish(guest()), 3500);  // nobody signed in -> Guest
  });
};
