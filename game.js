/* =============================================================
   game.js  —  City Dash (three.js endless runner)
   =============================================================
   Reads the CENTRAL styling from theme.js (window.THEME, window.SKINS)
   and the logged-in player from auth.js (window.getCurrentUser).
   ============================================================= */
(async function () {
  "use strict";
  const THREE = window.THREE;
  const W = window.THEME.world;
  const CH = window.THEME.character;
  const SKINS = window.SKINS;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  window.applyThemeCSS();

  // ---- who is playing? (real start.ng character) ----
  const user = await window.getCurrentUser();
  if (window.CityDashLB && window.CityDashLB.setPlayer) window.CityDashLB.setPlayer(user);

  // Show the player's start.ng character in the HUD (face + name)
  const playerPill = document.getElementById('player');
  playerPill.innerHTML = (user.face ? '<img id="pface" alt="">' : '') + 'Player&nbsp;<b id="pname"></b>';
  document.getElementById('pname').textContent = user.loggedIn ? user.name : (user.name || 'Guest') + ' (guest)';
  if (user.face) document.getElementById('pface').src = user.face;

  // start.ng "central styling": if the player's style gives a colour, make it their outfit
  const styleColor = (function (s) {
    const parse = (h) => { h = ('' + h).trim().replace('#', ''); return /^[0-9a-fA-F]{6}$/.test(h) ? parseInt(h, 16) : null; };
    if (!s) return null;
    if (typeof s === 'string') return parse(s);
    if (typeof s === 'object') for (const k of ['color', 'primary', 'shirt', 'main', 'hex', 'accent']) if (s[k] != null) { const c = parse(s[k]); if (c !== null) return c; }
    return null;
  })(user.style);
  if (styleColor !== null) {
    SKINS.unshift({ key: 'you', name: (user.name ? user.name.split(' ')[0] : 'You'),
      css: '#' + styleColor.toString(16).padStart(6, '0'), shirt: styleColor, cap: 0xffffff, shorts: (styleColor & 0x7f7f7f) });
  }
  let skin = SKINS[0];

  // Build a floating badge (their face + name) shown above the runner
  let badgeTex = null;
  await new Promise((res) => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320;
    const x = cv.getContext('2d');
    const draw = (img) => {
      x.clearRect(0, 0, 256, 320);
      if (img) {
        x.save(); x.beginPath(); x.arc(128, 108, 92, 0, Math.PI * 2); x.closePath(); x.clip();
        x.drawImage(img, 34, 14, 188, 188); x.restore();
        x.lineWidth = 8; x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(128, 108, 92, 0, Math.PI * 2); x.stroke();
      }
      x.font = 'bold 42px system-ui, sans-serif'; x.textAlign = 'center';
      x.lineWidth = 9; x.strokeStyle = 'rgba(20,30,50,.5)'; x.fillStyle = '#ffffff';
      const nm = (user.name || 'Guest');
      x.strokeText(nm, 128, 285); x.fillText(nm, 128, 285);
      badgeTex = new THREE.CanvasTexture(cv); res();
    };
    if (user.face) { const img = new Image(); img.onload = () => draw(img); img.onerror = () => draw(null); img.src = user.face; }
    else draw(null);
  });

  // ---- renderer / scene ----
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(W.sky);
  scene.fog = new THREE.Fog(W.sky, W.fogNear, W.fogFar);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  const camBase = new THREE.Vector3(0, 3.4, 9);
  camera.position.copy(camBase);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb0c8, 0.95));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.0);
  sun.position.set(6, 14, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  scene.add(sun);

  const LANES = [-2.3, 0, 2.3];
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });

  // ---- road (scrolling canvas texture) ----
  function roadTexture() {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512;
    const x = cv.getContext('2d');
    x.fillStyle = W.road; x.fillRect(0, 0, 256, 512);
    x.fillStyle = W.roadEdge; x.fillRect(14, 0, 7, 512); x.fillRect(235, 0, 7, 512);
    x.fillStyle = W.roadDash;
    for (const cx of [94, 162]) for (let y = 0; y < 512; y += 64) x.fillRect(cx - 4, y, 8, 36);
    return new THREE.CanvasTexture(cv);
  }
  const rtex = roadTexture();
  rtex.wrapS = rtex.wrapT = THREE.RepeatWrapping; rtex.repeat.set(1, 14);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 260),
    new THREE.MeshStandardMaterial({ map: rtex, roughness: 1 }));
  road.rotation.x = -Math.PI / 2; road.position.z = -110; road.receiveShadow = true;
  scene.add(road);
  for (const sx of [-6.1, 6.1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 260), mat(W.sidewalk));
    sw.position.set(sx, 0, -110); sw.receiveShadow = true; scene.add(sw);
  }

  // ---- scenery pools ----
  const scenery = [];
  function makeBuilding(side) {
    const g = new THREE.Group();
    const w = 2.2 + Math.random() * 1.6, h = 4 + Math.random() * 7, d = 2.2 + Math.random() * 1.6;
    const col = W.buildings[(Math.random() * W.buildings.length) | 0];
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col));
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.5, d + 0.2), mat(0x4a4a55));
    roof.position.y = h + 0.2; g.add(roof);
    g.userData = { side, w }; return g;
  }
  function makeTree(side) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), mat(W.treeTrunk));
    trunk.position.y = 0.4; trunk.castShadow = true; g.add(trunk);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 7), mat(W.treeLeaf));
    leaf.position.y = 1.5; leaf.castShadow = true; g.add(leaf);
    g.userData = { side }; return g;
  }
  function placeScenery(obj, z) {
    const side = obj.userData.side;
    if (obj.userData.w) obj.position.set(side * (5.2 + obj.userData.w / 2 + Math.random() * 1.5), 0, z);
    else obj.position.set(side * (4.6 + Math.random() * 0.8), 0.15, z);
  }
  for (let i = 0; i < 14; i++) { const b = makeBuilding(i % 2 ? 1 : -1); placeScenery(b, -8 - i * 8); scene.add(b); scenery.push(b); }
  for (let i = 0; i < 16; i++) { const t = makeTree(i % 2 ? 1 : -1); placeScenery(t, -5 - i * 6); scene.add(t); scenery.push(t); }

  // ---- runner (procedural low-poly person, built from the skin) ----
  let runner, parts;
  function limb(w, h, d, color) {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.y = -h / 2; m.castShadow = true; pivot.add(m); return pivot;
  }
  function buildRunner() {
    if (runner) scene.remove(runner);
    runner = new THREE.Group(); parts = {};
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), mat(skin.shirt));
    torso.position.y = 1.12; torso.castShadow = true; runner.add(torso); parts.torso = torso;
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.32), mat(skin.shorts));
    hips.position.y = 0.72; hips.castShadow = true; runner.add(hips);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(CH.skinTone));
    head.position.y = 1.74; head.castShadow = true; runner.add(head);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), mat(skin.cap));
    cap.position.set(0, 1.98, 0.02); cap.castShadow = true; runner.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.24), mat(skin.cap));
    brim.position.set(0, 1.92, 0.3); brim.castShadow = true; runner.add(brim);
    parts.armL = limb(0.17, 0.62, 0.17, CH.skinTone); parts.armL.position.set(0.42, 1.42, 0);
    parts.armR = limb(0.17, 0.62, 0.17, CH.skinTone); parts.armR.position.set(-0.42, 1.42, 0);
    runner.add(parts.armL, parts.armR);
    parts.legL = limb(0.2, 0.72, 0.22, skin.shorts); parts.legL.position.set(0.16, 0.72, 0);
    parts.legR = limb(0.2, 0.72, 0.22, skin.shorts); parts.legR.position.set(-0.16, 0.72, 0);
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.4), mat(CH.shoe));
    shoeL.position.set(0, -0.72, 0.08); shoeL.castShadow = true; parts.legL.add(shoeL);
    parts.legR.add(shoeL.clone());
    runner.add(parts.legL, parts.legR);
    if (badgeTex) {
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, transparent: true, depthTest: false }));
      badge.scale.set(1.7, 2.1, 1); badge.position.set(0, 2.95, 0); runner.add(badge);
    }
    runner.position.set(LANES[laneIndex], 0, 4.6);
    scene.add(runner);
  }

  // ---- coins & barriers ----
  const coins = [], barriers = [];
  function makeCoin() {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 18),
      new THREE.MeshStandardMaterial({ color: W.coin, metalness: 0.6, roughness: 0.3, emissive: 0x5a3c00, emissiveIntensity: 0.3 }));
    m.rotation.x = Math.PI / 2; m.castShadow = true; return m;
  }
  function spawnCoins(z) {
    const lane = LANES[(Math.random() * 3) | 0];
    const n = 4 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) { const c = makeCoin(); c.position.set(lane, 0.7, z - i * 1.4); scene.add(c); coins.push(c); }
  }
  function makeBarrier(type) {
    const g = new THREE.Group();
    if (type === 'hurdle') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.4), mat(0xff5a3c));
      bar.position.y = 0.45; bar.castShadow = true; g.add(bar);
      for (const lx of [-0.75, 0.75]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), mat(0xffffff)); leg.position.set(lx, 0.45, 0); g.add(leg); }
      g.userData.type = 'hurdle';
    } else {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.6), mat(0x44506a));
      b.position.y = 0.75; b.castShadow = true; g.add(b);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.3, 0.62), mat(0xffc83a));
      stripe.position.y = 0.75; g.add(stripe);
      g.userData.type = 'block';
    }
    return g;
  }
  function spawnBarrier(z) {
    const g = makeBarrier(Math.random() < 0.5 ? 'hurdle' : 'block');
    g.position.set(LANES[(Math.random() * 3) | 0], 0, z); scene.add(g); barriers.push(g);
  }

  // ---- state ----
  let running = false, laneIndex = 1, speed = 16, dist = 0, coinN = 0, t = 0;
  let vy = 0, grounded = true, runPhase = 0, coinT = 0, barT = 1;
  const coinEl = document.getElementById('coinN'), distEl = document.getElementById('dist');
  const overlay = document.getElementById('overlay'), startBtn = document.getElementById('start-btn');

  function reset() {
    coins.forEach(c => scene.remove(c)); coins.length = 0;
    barriers.forEach(b => scene.remove(b)); barriers.length = 0;
    laneIndex = 1; speed = 16; dist = 0; coinN = 0; vy = 0; grounded = true; coinT = 0; barT = 1;
    coinEl.textContent = '0'; distEl.innerHTML = '0<small> M</small>';
    buildRunner();
  }
  function start() { reset(); running = true; overlay.classList.add('hidden'); }
  function end() {
    if (!running) return;                       // one crash = one score (a second barrier can hit the same frame)
    running = false;
    document.getElementById('title').innerHTML = 'NICE<br>RUN';
    document.getElementById('sub').innerHTML =
      (user.loggedIn ? user.name + ', you' : 'You') + ' reached <b>' + Math.floor(dist) +
      'm</b> and grabbed <b>' + coinN + '</b> coins. New outfit?';
    startBtn.textContent = 'Run again';
    if (window.CityDashLB && window.CityDashLB.onRunOver) window.CityDashLB.onRunOver({ distance: dist, coins: coinN });
    overlay.classList.remove('hidden');
  }

  function move(d) { if (running) laneIndex = Math.max(0, Math.min(2, laneIndex + d)); }
  function jump() { if (running && grounded) { vy = 7.0; grounded = false; } }
  addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
    else if (e.key === 'ArrowRight' || e.key === 'd') move(1);
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') jump();
  });
  let sx = null, sy = null;
  addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) jump();
    else if (Math.abs(dx) > 24) move(dx > 0 ? 1 : -1);
    else move(sx < innerWidth / 2 ? -1 : 1);
    sx = sy = null;
  }, { passive: true });
  startBtn.addEventListener('click', start);

  // ---- skin dock ----
  const dock = document.getElementById('dock');
  SKINS.forEach(s => {
    const b = document.createElement('button'); b.className = 'skin'; b.style.color = s.css; b.dataset.key = s.key;
    b.innerHTML = '<span class="sw"></span>' + s.name;
    b.addEventListener('click', () => { skin = s; buildRunner(); mark(); });
    dock.appendChild(b);
  });
  function mark() { [...dock.children].forEach(b => b.dataset.on = b.dataset.key === skin.key ? '1' : '0'); }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const sp = running ? speed : 5;

    rtex.offset.y -= sp * dt / 18.6;
    for (const o of scenery) {
      o.position.z += sp * dt;
      if (o.position.z > 14) placeScenery(o, o.position.z - (o.userData.w ? 112 : 96));
    }

    if (runner) {
      runner.position.x += (LANES[laneIndex] - runner.position.x) * Math.min(1, dt * 14);
      if (!grounded) { vy -= 20 * dt; runner.position.y += vy * dt; if (runner.position.y <= 0) { runner.position.y = 0; vy = 0; grounded = true; } }
      runner.rotation.y = Math.PI;
      if (running && grounded) {
        runPhase += dt * sp * 0.9;
        const s = Math.sin(runPhase);
        parts.armL.rotation.x = s; parts.armR.rotation.x = -s;
        parts.legL.rotation.x = -s; parts.legR.rotation.x = s;
        parts.torso.position.y = 1.12 + Math.abs(Math.sin(runPhase)) * 0.05;
        runner.rotation.x = 0.08;
      } else if (!grounded) {
        parts.legL.rotation.x = -0.6; parts.legR.rotation.x = 0.5;
        parts.armL.rotation.x = -0.8; parts.armR.rotation.x = -0.8;
      } else { runner.rotation.x = 0; }
    }

    if (running) {
      dist += sp * dt * 0.35; speed += dt * 0.55;
      distEl.innerHTML = Math.floor(dist) + '<small> M</small>';
      coinT -= dt; if (coinT <= 0) { spawnCoins(-62); coinT = 1.1 + Math.random() * 0.8; }
      barT -= dt; if (barT <= 0) { spawnBarrier(-66); barT = Math.max(0.7, 1.7 - dist / 900); }

      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]; c.position.z += sp * dt; c.rotation.z += dt * 4;
        if (Math.abs(c.position.z - runner.position.z) < 0.8 &&
            Math.abs(c.position.x - runner.position.x) < 0.7 && runner.position.y < 1.1) {
          scene.remove(c); coins.splice(i, 1); coinN++; coinEl.textContent = coinN;
        } else if (c.position.z > 12) { scene.remove(c); coins.splice(i, 1); }
      }
      for (let i = barriers.length - 1; i >= 0; i--) {
        const b = barriers[i]; b.position.z += sp * dt;
        const near = Math.abs(b.position.z - runner.position.z) < 0.7;
        const sameLane = Math.abs(b.position.x - runner.position.x) < 0.95;
        if (near && sameLane) {
          if (b.userData.type === 'hurdle') { if (runner.position.y < 0.55) end(); }
          else end();
        }
        if (b.position.z > 12) { scene.remove(b); barriers.splice(i, 1); }
      }
    }

    const camTX = runner ? runner.position.x * 0.32 : 0;
    camera.position.x += (camTX - camera.position.x) * Math.min(1, dt * 6);
    camera.position.y = camBase.y; camera.position.z = camBase.z;
    camera.lookAt(camera.position.x * 0.5, 1.15, -8);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);

  resize(); buildRunner(); mark(); requestAnimationFrame(frame);
})();
