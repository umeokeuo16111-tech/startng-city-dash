/* =============================================================
   auth.js  —  START.NG LOGIN SLOT  (⚠️ needs your docs to finish)
   =============================================================
   The task: the game must "use the logged-in users of start.ng".

   Right now getCurrentUser() returns a PLACEHOLDER so the game
   runs while we wait for the real integration from start.ng/docs.
   The game only reads .name and .id, so wiring the real login
   means changing the inside of this one function — nothing else.

   Likely shapes (we'll pick the right one from the docs):
     1. fetch a "current user" endpoint with the session cookie:
          const r = await fetch('https://start.ng/api/me', { credentials: 'include' });
          const u = await r.json();
          return { id: u.id, name: u.username, loggedIn: true };
     2. an OAuth (Open Authorization) token, then a /me call with it.
     3. a start.ng JS SDK, e.g. window.startng.getUser().
   ============================================================= */

window.getCurrentUser = async function () {
  // ---- PLACEHOLDER (replace once start.ng is wired) ----
  return { id: 'guest-0001', name: 'Guest', loggedIn: false };
  // ------------------------------------------------------
};
