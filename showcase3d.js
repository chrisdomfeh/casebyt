/* ==========================================================================
   Case'd by T — 3D phone + case showcase (Three.js r128)
   Builds a phone in a printed case (playing-card / dice print, raised
   camera ring) inside #phone-showcase. Drag to rotate.

   To use your OWN print: save a flat portrait image (about 1024 x 2164 px,
   no hand, no phone) as  assets/case-print.jpg  — it replaces the painted one.
   ========================================================================== */
(function () {
  'use strict';

  var stage = document.getElementById('phone-showcase');
  if (!stage) return;

  function fallback() {
    stage.insertAdjacentHTML('beforeend', '<p class="showcase__fallback">3D preview is not supported on this device.</p>');
  }
  if (typeof THREE === 'undefined') { fallback(); return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { fallback(); return; }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = THREE.MathUtils.clamp;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.insertBefore(renderer.domElement, stage.firstChild);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 5, 150);

  /* ---------- Sizes (1 unit = 10 mm) ---------- */
  var W = 8.1, H = 16.45, R = 1.3;              // case outside
  var PW = 7.67, PH = 15.99, PD = 0.825;        // phone
  var Z_FRONT = -PD / 2, Z_BACK = PD / 2;       // phone faces  (screen = -z, back = +z)
  var PLATE_T = 0.14;                           // case back thickness
  var PLATE_TOP = Z_BACK + PLATE_T;             // top of case back
  var CX = -1.7, CY = 5.85;                     // camera hole centre
  var HOLE = 3.8, RING = 4.3;                   // camera hole / ring size
  var PRW = 7.5, PRH = 15.85;                   // printed area

  /* ---------- Helpers ---------- */
  function rrShape(w, h, r, cx, cy) {
    cx = cx || 0; cy = cy || 0;
    var x = cx - w / 2, y = cy - h / 2, s = new THREE.Shape();
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r);
    s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h);
    s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r);
    s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  function extrude(shape, depth, bevel, zShift) {
    var g = new THREE.ExtrudeGeometry(shape, {
      depth: depth, curveSegments: 28,
      bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 3
    });
    g.translate(0, 0, zShift || 0);
    return g;
  }
  function remapUV(geo, w, h) {
    var pos = geo.attributes.position, uv = geo.attributes.uv;
    for (var i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
    uv.needsUpdate = true;
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  /* ---------- Painted print (playing cards, dice, chips) ---------- */
  function diamond(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.68, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.68, y); g.closePath(); g.fill();
  }
  function faceCard(g, x, y, w, h, rot, rank) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 45; g.shadowOffsetY = 22;
    var gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gr.addColorStop(0, '#f6f7fa'); gr.addColorStop(1, '#a4a8b2');
    g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, 30); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#50535c'; g.font = '700 ' + (w * 0.19) + 'px Georgia, serif'; g.textAlign = 'center';
    g.fillText(rank, -w / 2 + w * 0.14, -h / 2 + w * 0.24);
    g.fillStyle = '#d3222d'; diamond(g, -w / 2 + w * 0.14, -h / 2 + w * 0.34, w * 0.055);
    diamond(g, 0, 0, w * 0.22);
    g.restore();
  }
  function backCard(g, x, y, w, h, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 45; g.shadowOffsetY = 22;
    var gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gr.addColorStop(0, '#eceef2'); gr.addColorStop(1, '#8f939e');
    g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, 32); g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = '#5d616b'; g.lineWidth = 5; rr(g, -w / 2 + 34, -h / 2 + 34, w - 68, h - 68, 18); g.stroke();
    g.save(); rr(g, -w / 2 + 42, -h / 2 + 42, w - 84, h - 84, 14); g.clip();
    g.fillStyle = 'rgba(60,64,74,.18)'; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(50,54,64,.55)'; g.lineWidth = 2.5;
    for (var i = -30; i < 30; i++) {
      g.beginPath(); g.moveTo(-w + i * 36, -h); g.lineTo(w + i * 36, h); g.stroke();
      g.beginPath(); g.moveTo(w + i * 36, -h); g.lineTo(-w + i * 36, h); g.stroke();
    }
    g.fillStyle = '#d9dce2'; g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#4a4e58';
    [150, 118, 86].forEach(function (r) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); });
    g.fillStyle = '#4a4e58'; diamond(g, 0, 0, 52);
    g.restore(); g.restore();
  }
  var PIPS = {
    1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
  };
  function die(g, x, y, s, rot, c, n) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 35; g.shadowOffsetY = 20;
    g.fillStyle = c.shade; rr(g, -s / 2 + s * 0.08, -s / 2 + s * 0.1, s, s, s * 0.18); g.fill();
    g.shadowColor = 'transparent';
    var gr = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    gr.addColorStop(0, c.light); gr.addColorStop(1, c.body);
    g.fillStyle = gr; rr(g, -s / 2, -s / 2, s, s, s * 0.18); g.fill();
    g.fillStyle = c.pip;
    PIPS[n].forEach(function (p) { g.beginPath(); g.arc(p[0] * s * 0.25, p[1] * s * 0.25, s * 0.085, 0, Math.PI * 2); g.fill(); });
    g.restore();
  }
  function chips(g, x, y, w, h, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.shadowOffsetY = 20;
    var gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, '#e2313c'); gr.addColorStop(.5, '#9d101a'); gr.addColorStop(1, '#4b070d');
    g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, h * 0.3); g.fill();
    g.shadowColor = 'transparent';
    g.save(); rr(g, -w / 2, -h / 2, w, h, h * 0.3); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 6;
    for (var i = -w / 2; i < w / 2; i += 26) { g.beginPath(); g.moveTo(i, -h / 2); g.lineTo(i + 30, h / 2); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-w / 2, -h / 2 + h * 0.12, w, h * 0.06);
    g.restore();
    g.strokeStyle = '#d5d8de'; g.lineWidth = 8; rr(g, -w / 2, -h / 2, w, h, h * 0.3); g.stroke();
    g.restore();
  }

  function paintPrint() {
    var cw = 1024, ch = Math.round(1024 * PRH / PRW);
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var g = c.getContext('2d');
    var bg = g.createLinearGradient(0, 0, cw, ch);
    bg.addColorStop(0, '#3b3b42'); bg.addColorStop(.45, '#15151a'); bg.addColorStop(1, '#0a0a0d');
    g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
    var sp = g.createRadialGradient(cw * .6, ch * .55, 20, cw * .6, ch * .55, cw * .95);
    sp.addColorStop(0, 'rgba(215,218,225,.55)'); sp.addColorStop(1, 'rgba(215,218,225,0)');
    g.fillStyle = sp; g.fillRect(0, 0, cw, ch);
    var rg = g.createRadialGradient(150, ch - 260, 10, 150, ch - 260, 520);
    rg.addColorStop(0, 'rgba(200,20,35,.55)'); rg.addColorStop(1, 'rgba(200,20,35,0)');
    g.fillStyle = rg; g.fillRect(0, 0, cw, ch);

    chips(g, 830, 360, 470, 250, -0.55);
    backCard(g, 720, 1200, 520, 740, 0.42);
    faceCard(g, 320, 1120, 400, 580, -0.62, 'A');
    faceCard(g, 400, 1090, 400, 580, -0.42, 'A');
    faceCard(g, 480, 1060, 400, 580, -0.2, '2');
    die(g, 260, 1690, 250, 0.28, { body: '#b3121d', shade: '#5a0910', light: '#e4535b', pip: '#f4f4f7' }, 4);
    die(g, 620, 1760, 130, -0.3, { body: '#c9ccd4', shade: '#5d616b', light: '#f6f7fa', pip: '#c8202a' }, 1);
    die(g, 900, 1010, 170, 0.3, { body: '#b3121d', shade: '#5a0910', light: '#e4535b', pip: '#f4f4f7' }, 3);
    die(g, 950, 1860, 210, -0.4, { body: '#b3121d', shade: '#5a0910', light: '#e4535b', pip: '#f4f4f7' }, 5);

    var vg = g.createRadialGradient(cw / 2, ch / 2, cw * .35, cw / 2, ch / 2, ch * .62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = vg; g.fillRect(0, 0, cw, ch);
    return c;
  }

  function paintScreen() {
    var w = 512, h = 1040, c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d');
    var bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#221c12'); bg.addColorStop(1, '#0a0a0c');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    var gl = g.createRadialGradient(w / 2, h * .68, 10, w / 2, h * .68, 380);
    gl.addColorStop(0, 'rgba(201,164,94,.6)'); gl.addColorStop(1, 'rgba(201,164,94,0)');
    g.fillStyle = gl; g.fillRect(0, 0, w, h);
    var d = new Date(), hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.93)';
    g.font = '700 150px Manrope, Arial, sans-serif'; g.fillText(hh + ':' + mm, w / 2, 300);
    g.font = '500 28px Manrope, Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,.65)';
    g.fillText(d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), w / 2, 350);
    g.font = '700 30px Manrope, Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText("CASE'D BY T", w / 2, h - 90);
    g.fillStyle = '#000'; rr(g, w / 2 - 75, 30, 150, 44, 22); g.fill();
    return c;
  }

  /* ---------- Fake studio environment for reflections ---------- */
  function makeEnv() {
    var pm = new THREE.PMREMGenerator(renderer);
    var s = new THREE.Scene();
    var c = document.createElement('canvas'); c.width = 2; c.height = 256;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#cfd3da'); gr.addColorStop(.5, '#3a3c42'); gr.addColorStop(1, '#0c0c0e');
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.BackSide })));
    function box(w, h, pos, v) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
      m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); s.add(m);
    }
    box(30, 14, [-25, 20, 25], 4); box(10, 30, [30, 5, 20], 3); box(40, 6, [0, 35, -10], 5);
    var rt = pm.fromScene(s, 0.03); pm.dispose();
    return rt.texture;
  }
  scene.environment = makeEnv();

  var key = new THREE.DirectionalLight(0xffffff, 0.7); key.position.set(6, 10, 14); scene.add(key);
  var rim = new THREE.PointLight(0xC9A45E, 0.6, 0, 2); rim.position.set(-14, 6, -10); scene.add(rim);

  /* ---------- Materials ---------- */
  var printTex = new THREE.CanvasTexture(paintPrint());
  printTex.encoding = THREE.sRGBEncoding;
  printTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var screenTex = new THREE.CanvasTexture(paintScreen());
  screenTex.encoding = THREE.sRGBEncoding;
  screenTex.anisotropy = 4;

  var mats = {
    print: new THREE.MeshPhysicalMaterial({ map: printTex, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 }),
    case: new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.42, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    ring: new THREE.MeshStandardMaterial({ color: 0x2b2c30, metalness: 0.95, roughness: 0.28 }),
    titanium: new THREE.MeshStandardMaterial({ color: 0x8b8781, metalness: 1, roughness: 0.32 }),
    plateau: new THREE.MeshPhysicalMaterial({ color: 0x6d6d73, roughness: 0.55, metalness: 0.3, clearcoat: 0.4 }),
    lensRing: new THREE.MeshStandardMaterial({ color: 0xb9bbc2, metalness: 1, roughness: 0.22 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x050508, roughness: 0.05, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02 }),
    screen: new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0 })
  };

  /* Optional: your own print image */
  new THREE.TextureLoader().load('assets/case-print.jpg', function (t) {
    t.encoding = THREE.sRGBEncoding; t.anisotropy = printTex.anisotropy;
    mats.print.map = t; mats.print.needsUpdate = true;
  }, undefined, function () { /* no custom image — keep painted print */ });

  /* ---------- Build the phone ---------- */
  var pivot = new THREE.Group();   // spins
  var model = new THREE.Group();   // floats / leans
  pivot.add(model); scene.add(pivot);

  // phone body
  model.add(new THREE.Mesh(extrude(rrShape(PW, PH, 1.05), PD, 0, -PD / 2), mats.titanium));

  // screen (faces -z)
  var sGeo = new THREE.ShapeGeometry(rrShape(7.5, 15.85, 0.95), 28);
  remapUV(sGeo, 7.5, 15.85);
  var screen = new THREE.Mesh(sGeo, mats.screen);
  screen.rotation.y = Math.PI; screen.position.z = Z_FRONT - 0.002;
  model.add(screen);

  // camera plateau + lenses (on the phone's back, seen through the case hole)
  var plateau = new THREE.Mesh(extrude(rrShape(3.6, 3.6, 0.85, CX, CY), 0.08, 0, Z_BACK), mats.plateau);
  model.add(plateau);
  var LZ = Z_BACK + 0.08 + 0.05;
  function lens(x, y) {
    var grp = new THREE.Group(); grp.position.set(CX + x, CY + y, LZ);
    var a = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 40), mats.lensRing); a.rotation.x = Math.PI / 2;
    var b = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.12, 40), mats.glass); b.rotation.x = Math.PI / 2; b.position.z = 0.02;
    var i = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshBasicMaterial({ color: 0x2b1f4a })); i.position.z = 0.085;
    grp.add(a, b, i); model.add(grp);
  }
  lens(-0.85, 0.85); lens(-0.85, -0.85); lens(0.85, 0);
  var flash = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshBasicMaterial({ color: 0xfff1cf }));
  flash.position.set(CX + 1.1, CY + 1.15, Z_BACK + 0.085); model.add(flash);
  var lidar = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.2 }));
  lidar.position.set(CX + 1.1, CY - 1.1, Z_BACK + 0.085); model.add(lidar);

  // CASE: rim (side walls, raised bezel at the back)
  var rimShape = rrShape(W, H, R);
  rimShape.holes.push(rrShape(7.73, 16.05, 1.08));
  var RIM_Z0 = Z_FRONT, RIM_Z1 = PLATE_TOP + 0.06;
  model.add(new THREE.Mesh(extrude(rimShape, RIM_Z1 - RIM_Z0, 0, RIM_Z0), mats.case));

  // CASE: front lip
  var lipShape = rrShape(W, H, R);
  lipShape.holes.push(rrShape(7.4, 15.75, 0.9));
  model.add(new THREE.Mesh(extrude(lipShape, 0.1, 0, Z_FRONT - 0.1), mats.case));

  // CASE: back plate with camera hole
  var plateShape = rrShape(7.73, 16.05, 1.08);
  plateShape.holes.push(rrShape(HOLE, HOLE, 0.9, CX, CY));
  model.add(new THREE.Mesh(extrude(plateShape, PLATE_T, 0, Z_BACK), mats.case));

  // CASE: printed layer on the back
  var printShape = rrShape(PRW, PRH, 0.95);
  printShape.holes.push(rrShape(HOLE, HOLE, 0.9, CX, CY));
  var pGeo = new THREE.ShapeGeometry(printShape, 28);
  remapUV(pGeo, PRW, PRH);
  var print = new THREE.Mesh(pGeo, mats.print);
  print.position.z = PLATE_TOP + 0.003;
  model.add(print);

  // CASE: metal camera ring
  var ringShape = rrShape(RING, RING, 1.1, CX, CY);
  ringShape.holes.push(rrShape(HOLE, HOLE, 0.9, CX, CY));
  model.add(new THREE.Mesh(extrude(ringShape, 0.17, 0.03, PLATE_TOP), mats.ring));

  // side buttons
  function button(x, y, h) {
    var b = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.3), mats.case);
    b.position.set(x, y, 0.05); model.add(b);
  }
  button(-W / 2, 3.0, 2.0);                       // power
  button(W / 2, 5.6, 0.7);                        // action
  button(W / 2, 4.2, 1.2); button(W / 2, 2.6, 1.2); // volume

  /* ---------- Sizing ---------- */
  function resize() {
    var w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var vf = THREE.MathUtils.degToRad(camera.fov);
    var dH = (H * 1.2 / 2) / Math.tan(vf / 2);
    var dW = (W * 1.75 / 2) / (Math.tan(vf / 2) * camera.aspect);
    camera.position.set(0, 0, Math.max(dH, dW));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);

  /* ---------- Interaction ---------- */
  var base = 0, vel = 0, tiltDrag = 0, dragging = false, lastX = 0, lastY = 0, lastTouch = 0;
  var mouseX = 0, mouseY = 0, smX = 0, smY = 0;

  stage.addEventListener('pointerdown', function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY; vel = 0;
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    base += dx * 0.009; vel = dx * 0.009;
    tiltDrag = clamp(tiltDrag + dy * 0.004, -0.5, 0.5);
    lastTouch = performance.now();
    var hint = stage.querySelector('.showcase__hint'); if (hint) hint.classList.add('is-gone');
  });
  function endDrag() { dragging = false; lastTouch = performance.now(); }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('mouseenter', function () { document.body.classList.add('cursor-grow'); });
  stage.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-grow'); });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ---------- Theme reaction (light / dark) ---------- */
  function applyThemeLight() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    rim.intensity = dark ? 1.4 : 0.6;
    key.intensity = dark ? 0.55 : 0.7;
    renderer.toneMappingExposure = dark ? 1.15 : 1.05;
  }
  applyThemeLight();
  new MutationObserver(applyThemeLight).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- Animation loop (only runs while visible) ---------- */
  var running = false, raf = 0, startT = 0;
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var t = now / 1000;
    var intro = reduceMotion ? 1 : easeOut(clamp((now - startT) / 1800, 0, 1));

    if (!dragging) {
      base += vel; vel *= 0.94;
      if (Math.abs(vel) < 0.002 && now - lastTouch > 1200) {
        var target = Math.round(base / (Math.PI * 2)) * Math.PI * 2;
        base += (target - base) * 0.03;
      }
      tiltDrag *= 0.96;
    }
    smX += (mouseX - smX) * 0.06; smY += (mouseY - smY) * 0.06;

    var rect = stage.getBoundingClientRect();
    var p = 1 - (rect.top + rect.height / 2) / window.innerHeight;   // ~0.5 when centred
    var idle = reduceMotion ? 0 : Math.sin(t * 0.6) * 0.5;

    pivot.rotation.y = base + idle + smX * 0.25 + (p - 0.5) * 0.9 - (1 - intro) * 1.6;
    pivot.rotation.x = tiltDrag + smY * 0.1 + (p - 0.5) * 0.3;
    model.rotation.z = -0.1 + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.02);
    model.position.y = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.25;
    var s = 0.85 + 0.15 * intro;
    pivot.scale.set(s, s, s);

    renderer.render(scene, camera);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var on = entries[0].isIntersecting;
      if (on && !running) { running = true; if (!startT) startT = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!on && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.05 }).observe(stage);
  } else {
    startT = performance.now(); requestAnimationFrame(frame);
  }
})();
