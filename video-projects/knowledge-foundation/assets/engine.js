// Knowledge Is The Foundation — cinematic canvas renderers.
// Every draw is a pure function of time t (seconds) so renders stay deterministic.
window.KF = (function () {
  const W = 1080, H = 1920;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const eio = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const eout = (t) => 1 - Math.pow(1 - t, 3);
  const rng = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const GC = ["#4285f4", "#ea4335", "#fbbc05", "#34a853"];

  // ── Glow sprites (pre-rendered radial dots, tinted) ──
  const sprites = {};
  function sprite(name, r, g, b) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.25, `rgba(${r},${g},${b},.55)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    sprites[name] = c;
  }
  sprite("white", 255, 255, 255); sprite("warm", 255, 214, 160); sprite("cool", 170, 205, 255);
  sprite("blue", 66, 133, 244); sprite("red", 234, 67, 53); sprite("yellow", 251, 188, 5); sprite("green", 52, 168, 83);
  const GS = ["blue", "red", "yellow", "green"];
  const glow = (ctx, name, x, y, r, a = 1) => {
    if (a <= 0.003 || r < 0.3) return;
    ctx.globalAlpha = a; ctx.drawImage(sprites[name], x - r, y - r, 2 * r, 2 * r);
  };
  const streak = (ctx, name, x, y, w, h, a) => {
    if (a <= 0.003) return;
    ctx.globalAlpha = a; ctx.drawImage(sprites[name], x - w / 2, y - h / 2, w, h);
  };

  // ── 3D soccer ball (truncated icosahedron, per-pixel shading) ──
  const PHI = (1 + Math.sqrt(5)) / 2;
  const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const PENT = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    PENT.push(nrm([0, a, b * PHI]), nrm([a, b * PHI, 0]), nrm([b * PHI, 0, a]));
  }
  const HEX = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) HEX.push(nrm([a, b, c]));
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    HEX.push(nrm([0, a * PHI, b / PHI]), nrm([a / PHI, 0, b * PHI]), nrm([a * PHI, b / PHI, 0]));
  }
  const PF = new Float32Array(PENT.flat()), HF = new Float32Array(HEX.flat());
  const ballCan = document.createElement("canvas");
  let ballKey = "";
  const L = nrm([-0.45, 0.6, 0.66]);
  const HV = nrm([L[0], L[1], L[2] + 1]);
  function renderBall(size, rx, ry, rz) {
    size = Math.max(24, Math.min(480, Math.round(size / 4) * 4));
    const key = size + "|" + rx.toFixed(3) + "|" + ry.toFixed(3) + "|" + rz.toFixed(3);
    if (key === ballKey) return ballCan;
    ballKey = key;
    if (ballCan.width !== size) { ballCan.width = size; ballCan.height = size; }
    const ctx = ballCan.getContext("2d");
    const img = ctx.createImageData(size, size), d = img.data;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // R = Rz * Ry * Rx
    const r00 = cz * cy, r01 = cz * sy * sx - sz * cx, r02 = cz * sy * cx + sz * sx;
    const r10 = sz * cy, r11 = sz * sy * sx + cz * cx, r12 = sz * sy * cx - cz * sx;
    const r20 = -sy, r21 = cy * sx, r22 = cy * cx;
    const SW = 0.03 + 3 / size;
    for (let py = 0; py < size; py++) {
      const v = 1 - ((py + 0.5) / size) * 2;
      for (let px = 0; px < size; px++) {
        const u = ((px + 0.5) / size) * 2 - 1;
        const rr = u * u + v * v;
        const o = (py * size + px) * 4;
        if (rr >= 1) { d[o + 3] = 0; continue; }
        const nz = Math.sqrt(1 - rr);
        const bx = r00 * u + r01 * v + r02 * nz, by = r10 * u + r11 * v + r12 * nz, bz = r20 * u + r21 * v + r22 * nz;
        let dp = -2;
        for (let i = 0; i < 36; i += 3) { const q = PF[i] * bx + PF[i + 1] * by + PF[i + 2] * bz; if (q > dp) dp = q; }
        let h1 = -2, h2 = -2;
        for (let i = 0; i < 60; i += 3) {
          const q = HF[i] * bx + HF[i + 1] * by + HF[i + 2] * bz;
          if (q > h1) { h2 = h1; h1 = q; } else if (q > h2) h2 = q;
        }
        const sp = Math.acos(Math.min(1, dp)) + 0.0773, s1 = Math.acos(Math.min(1, h1)), s2 = Math.acos(Math.min(1, h2));
        let best, second, pent;
        if (sp < s1) { best = sp; second = s1; pent = true; } else { best = s1; second = Math.min(sp, s2); pent = false; }
        const st = clamp((second - best) / SW, 0, 1);
        let base = pent ? 0.06 : 0.92;
        base = lerp(0.3, base, st * st * (3 - 2 * st));
        const diff = Math.max(0, u * L[0] + v * L[1] + nz * L[2]);
        const spec = Math.pow(Math.max(0, u * HV[0] + v * HV[1] + nz * HV[2]), 46);
        const fr = Math.pow(1 - nz, 2.6);
        const sh = 0.13 + 0.95 * diff;
        d[o] = clamp((base * sh + spec * 0.6 + fr * 0.18) * 255, 0, 255);
        d[o + 1] = clamp((base * sh + spec * 0.6 + fr * 0.42) * 255, 0, 255);
        d[o + 2] = clamp((base * sh * 1.04 + spec * 0.65 + fr * 0.95) * 255, 0, 255);
        d[o + 3] = clamp((1 - Math.sqrt(rr)) * size * 0.5, 0, 1) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return ballCan;
  }
  function drawBall(ctx, x, y, r, t, spin = 1, sx = 1, sy = 1) {
    const spr = renderBall(r * 2, t * 2.1 * spin, t * 3.3 * spin, t * 0.7 * spin);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(x, y); ctx.scale(sx, sy);
    ctx.drawImage(spr, -r, -r, 2 * r, 2 * r);
    ctx.restore();
  }

  // ── Perspective camera ──
  function camera(px, py, pz, pitch, f) {
    const c = Math.cos(pitch), s = Math.sin(pitch);
    return {
      f, pz,
      p(x, y, z) {
        const dx = x - px, dy = y - py, dz = z - pz;
        const yc = dy * c + dz * s, zc = -dy * s + dz * c;
        if (zc < 0.08) return null;
        return [W / 2 + (f * dx) / zc, H / 2 - (f * yc) / zc, zc];
      },
    };
  }
  function quad(ctx, C, pts, fill, alpha = 1) {
    const q = [];
    for (const p of pts) { const v = C.p(p[0], p[1], p[2]); if (!v) return null; q.push(v); }
    ctx.globalAlpha = alpha; ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath(); ctx.fill();
    return q;
  }
  function line3(ctx, C, a, b, minZ) {
    if (a[2] < minZ && b[2] < minZ) return;
    if (a[2] < minZ) { const k = (minZ - a[2]) / (b[2] - a[2]); a = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), minZ]; }
    if (b[2] < minZ) { const k = (minZ - b[2]) / (a[2] - b[2]); b = [lerp(b[0], a[0], k), lerp(b[1], a[1], k), minZ]; }
    const p = C.p(...a), q = C.p(...b);
    if (!p || !q) return;
    ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
  }

  // ═════════ SCENE 1 · STADIUM ═════════
  const R1 = rng(7);
  const crowd = [];
  for (let i = 0; i < 1500; i++) {
    const side = R1();
    let x, y, z;
    if (side < 0.55) { x = (R1() * 2 - 1) * 60; y = 1 + R1() * 24; z = 46 + y * 0.6; }
    else { const sgn = side < 0.775 ? -1 : 1; z = R1() * 46; y = 1 + R1() * 20; x = sgn * (42 + y * 0.6); }
    const c = R1();
    crowd.push({ x, y, z, col: c < 0.5 ? "warm" : c < 0.8 ? "cool" : c < 0.9 ? "white" : GS[(i * 7) % 4], a: 0.25 + R1() * 0.55,
      ph: R1() * 6.28, fl: R1() < 0.22 ? 2.95 + R1() * 1.4 : R1() < 0.15 ? 0.6 + R1() * 2.2 : -9 });
  }
  const LIGHTS = [[-19, 27, 56], [19, 27, 56], [-7, 29, 58], [7, 29, 58]];
  const LON = [0.55, 0.7, 0.85, 0.95];
  const G = 25; // goal line z
  const BALL0 = [0, 0.11, 14];
  const BALLE = [2.55, 2.02, 26.3];
  function ballU(t) {
    const s = seg(t, 1.62, 2.9);
    if (s < 0.22) return 0.05 * (s / 0.22); // slow-motion ramp off the boot
    return 0.05 + 0.95 * Math.pow((s - 0.22) / 0.78, 1.35);
  }
  function ballPos(u) {
    return [2.55 * Math.pow(u, 1.7), 0.11 + 1.91 * u + 0.9 * Math.sin(Math.PI * u), 14 + 12.3 * u];
  }
  function netOffset(x, y, t) {
    if (t < 2.9) return 0;
    const k = t - 2.9;
    const amp = 1.25 * Math.min(1, k / 0.1) * Math.exp(-k * 2.4) * Math.cos(Math.max(0, k - 0.1) * 11) ;
    return amp * Math.exp(-((x - BALLE[0]) ** 2 + (y - BALLE[1]) ** 2) / 0.9);
  }

  function lampLevel(i, t) { return t < LON[i] ? 0 : Math.min(1, 0.55 + (t - LON[i]) * 6) + Math.exp(-(t - LON[i]) * 14) * 0.9; }

  function drawStadium(ctx, C, t, opt = {}) {
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#01030a"); sky.addColorStop(0.45, "#071330"); sky.addColorStop(0.62, "#0a1a2e"); sky.addColorStop(1, "#04070c");
    ctx.globalAlpha = 1; ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const lit = Math.max(lampLevel(0, t), lampLevel(1, t)) * 0.8 + 0.2;
    // stands
    quad(ctx, C, [[-70, 0, 46], [70, 0, 46], [70, 26, 62], [-70, 26, 62]], "#060a16", 1);
    quad(ctx, C, [[-42, 0, -10], [-42, 0, 46], [-56, 22, 46], [-56, 22, -10]], "#070c1a", 1);
    quad(ctx, C, [[42, 0, -10], [42, 0, 46], [56, 22, 46], [56, 22, -10]], "#070c1a", 1);
    // roof glow line
    ctx.globalCompositeOperation = "lighter";
    for (const cr of crowd) {
      const p = C.p(cr.x, cr.y, cr.z);
      if (!p) continue;
      let a = cr.a * (0.6 + 0.4 * Math.sin(t * 3 + cr.ph)) * lit;
      let r = Math.max(1.6, (C.f * 0.32) / p[2]) * (opt.bokeh || 1);
      if (cr.fl > 0 && t > cr.fl && t < cr.fl + 0.12) { a = 1; r *= 3.2; glow(ctx, "white", p[0], p[1], r * 2.2, 0.5); }
      glow(ctx, cr.col, p[0], p[1], r, a);
    }
    // pitch
    ctx.globalCompositeOperation = "source-over";
    const z0 = Math.max(-5, C.pz + 0.25);
    for (let z = Math.floor(z0 / 3) * 3; z < 60; z += 3) {
      const za = Math.max(z, z0), zb = z + 3;
      if (zb <= za) continue;
      const fog = clamp(1 - (za - C.pz) / 70, 0.25, 1);
      const odd = Math.floor(z / 3) % 2 === 0;
      const base = odd ? [26, 96, 44] : [14, 58, 26];
      const k = (0.35 + 0.65 * lit) * fog;
      quad(ctx, C, [[-44, 0, za], [44, 0, za], [44, 0, zb], [-44, 0, zb]], `rgb(${base[0] * k + 8 * (1 - fog)},${base[1] * k + 18 * (1 - fog)},${base[2] * k + 26 * (1 - fog)})`, 1);
    }
    // floodlit pools
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const lv = lampLevel(i, t);
      if (!lv) continue;
      const pp = C.p(LIGHTS[i][0] * 0.25, 0, 20 + (i < 2 ? 6 : -4));
      if (pp) streak(ctx, "warm", pp[0], pp[1], (C.f * 26) / pp[2], (C.f * 8) / pp[2], 0.07 * lv);
    }
    // pitch lines
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(235,245,255,${0.35 + 0.45 * lit})`;
    ctx.lineWidth = 3; ctx.beginPath();
    const mz = C.pz + 0.4;
    line3(ctx, C, [-34, 0, G], [34, 0, G], mz);
    line3(ctx, C, [-20.16, 0, 8.5], [-20.16, 0, G], mz); line3(ctx, C, [20.16, 0, 8.5], [20.16, 0, G], mz);
    line3(ctx, C, [-20.16, 0, 8.5], [20.16, 0, 8.5], mz);
    line3(ctx, C, [-9.16, 0, 19.5], [-9.16, 0, G], mz); line3(ctx, C, [9.16, 0, 19.5], [9.16, 0, G], mz);
    line3(ctx, C, [-9.16, 0, 19.5], [9.16, 0, 19.5], mz);
    for (let i = 0; i < 16; i++) {
      const a0 = -0.93 + (i / 16) * 1.86, a1 = -0.93 + ((i + 1) / 16) * 1.86;
      line3(ctx, C, [9.15 * Math.sin(a0), 0, 14 - 9.15 * Math.cos(a0)], [9.15 * Math.sin(a1), 0, 14 - 9.15 * Math.cos(a1)], mz);
    }
    ctx.stroke();
    const spot = C.p(0, 0, 14);
    if (spot && spot[2] > 0.3) { ctx.fillStyle = "rgba(240,250,255,.8)"; ctx.beginPath(); ctx.ellipse(spot[0], spot[1], (C.f * 0.11) / spot[2], (C.f * 0.04) / spot[2], 0, 0, 6.283); ctx.fill(); }
    // goal: net then posts
    ctx.strokeStyle = "rgba(225,235,255,.55)"; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let xi = 0; xi <= 30; xi++) {
      const x = -3.66 + (xi / 30) * 7.32;
      let prev = null;
      for (let yi = 0; yi <= 12; yi++) {
        const y = (yi / 12) * 2.44;
        const p = C.p(x, y, G + 2 + netOffset(x, y, t));
        if (p && prev) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); }
        prev = p;
      }
    }
    for (let yi = 0; yi <= 12; yi++) {
      const y = (yi / 12) * 2.44;
      let prev = null;
      for (let xi = 0; xi <= 30; xi++) {
        const x = -3.66 + (xi / 30) * 7.32;
        const p = C.p(x, y, G + 2 + netOffset(x, y, t));
        if (p && prev) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); }
        prev = p;
      }
    }
    for (let k = 0; k <= 8; k++) {
      const z = G + (k / 8) * 2;
      line3(ctx, C, [-3.66, 2.44, z], [3.66, 2.44, z], mz);
      line3(ctx, C, [-3.66, 0, z], [-3.66, 2.44, z], mz); line3(ctx, C, [3.66, 0, z], [3.66, 2.44, z], mz);
    }
    ctx.stroke();
    const gp = [C.p(-3.66, 0, G), C.p(-3.66, 2.44, G), C.p(3.66, 2.44, G), C.p(3.66, 0, G)];
    if (gp.every(Boolean)) {
      ctx.strokeStyle = "#f4f8ff"; ctx.lineWidth = Math.max(5, (C.f * 0.12) / gp[0][2]); ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(200,225,255,.9)"; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(gp[0][0], gp[0][1]); ctx.lineTo(gp[1][0], gp[1][1]); ctx.lineTo(gp[2][0], gp[2][1]); ctx.lineTo(gp[3][0], gp[3][1]); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // floodlights: rays, glare, anamorphic streaks
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const lv = lampLevel(i, t);
      const p = C.p(...LIGHTS[i]);
      if (!p) continue;
      const s = (C.f * 1.0) / p[2];
      // lamp bank
      ctx.globalAlpha = 0.25 + 0.75 * Math.min(1, lv);
      ctx.fillStyle = lv ? "#ffffff" : "#2a3350";
      for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) ctx.fillRect(p[0] + (a - 2) * s * 1.6, p[1] + (b - 1.5) * s * 1.4, s * 1.2, s * 1.0);
      if (!lv) continue;
      const g = ctx.createLinearGradient(p[0], p[1], W / 2, H * 0.8);
      g.addColorStop(0, `rgba(210,228,255,${0.07 * Math.min(1, lv)})`); g.addColorStop(1, "rgba(210,228,255,0)");
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(p[0], p[1]); ctx.lineTo(W / 2 - 420 + i * 180, H * 0.95); ctx.lineTo(W / 2 - 120 + i * 180, H * 0.95); ctx.closePath(); ctx.fill();
      glow(ctx, "white", p[0], p[1], s * 5 * lv, 0.95);
      glow(ctx, "cool", p[0], p[1], s * 14, 0.22 * Math.min(1.3, lv));
      streak(ctx, "cool", p[0], p[1], 1900, 22, 0.32 * Math.min(1.4, lv));
      streak(ctx, "white", p[0], p[1], 800, 5, 0.55 * Math.min(1.2, lv));
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  // sparks / confetti (closed-form ballistic → seekable)
  const SPARKS = [];
  { const r = rng(11); for (let i = 0; i < 70; i++) SPARKS.push({ a: r() * 6.283, v: 500 + r() * 1700, c: i % 5 === 0 ? "white" : GS[i % 4], l: 0.25 + r() * 0.45 }); }
  function drawSparks(ctx, x, y, t0, t) {
    const k = t - t0;
    if (k < 0 || k > 0.8) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const s of SPARKS) {
      if (k > s.l) continue;
      const d = s.v * k * (1 - k * 0.6), px = x + Math.cos(s.a) * d, py = y + Math.sin(s.a) * d + 600 * k * k;
      const tail = s.v * 0.03;
      ctx.globalAlpha = 1 - k / s.l;
      ctx.strokeStyle = s.c === "white" ? "#ffffff" : GC[GS.indexOf(s.c)];
      ctx.lineWidth = 5 * (1 - k / s.l) + 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(s.a) * tail, py - Math.sin(s.a) * tail); ctx.stroke();
      glow(ctx, s.c, px, py, 14, 0.7 * (1 - k / s.l));
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }
  const CONF = [];
  { const r = rng(23); for (let i = 0; i < 220; i++) CONF.push({ x: r() < 0.5 ? -40 : W + 40, vx: 300 + r() * 900, vy: -1500 - r() * 1300, c: GC[i % 4], w: 14 + r() * 18, h: 8 + r() * 10, sp: (r() - 0.5) * 24, ph: r() * 6, d: r() * 0.25 }); }
  function drawConfetti(ctx, t0, t) {
    const k0 = t - t0;
    if (k0 < 0) return;
    for (const c of CONF) {
      const k = k0 - c.d;
      if (k < 0) continue;
      const dir = c.x < 0 ? 1 : -1;
      const drag = 1 - Math.exp(-k * 1.6);
      const x = c.x + dir * (c.vx / 1.6) * drag + Math.sin(k * 3 + c.ph) * 40;
      const y = 1500 + (c.vy / 1.6) * drag + 520 * k * k * 0.9;
      if (y > H + 60) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(c.sp * k + c.ph); ctx.scale(1, Math.cos(k * 9 + c.ph));
      ctx.globalAlpha = clamp(2.2 - k, 0, 1); ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function trail(ctx, C, t) {
    const u1 = ballU(t), u0 = Math.max(0, ballU(t - 0.32));
    if (u1 - u0 < 0.002) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const N = 26;
    for (let lane = 0; lane < 4; lane++) {
      ctx.strokeStyle = GC[lane];
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const u = lerp(u0, u1, i / N);
        const b = ballPos(u);
        const off = (lane - 1.5) * 0.045;
        const p = C.p(b[0] + off, b[1] + off * 0.6, b[2]);
        if (p && prev) {
          ctx.globalAlpha = (i / N) * 0.85;
          ctx.lineWidth = Math.max(2, ((C.f * 0.05) / p[2]) * (i / N) * 2.2);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        }
        prev = p;
      }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function bokehField(ctx, t, n, seed, alpha, drift = 1) {
    const r = rng(seed);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, rad = 40 + r() * 170, c = r() < 0.6 ? (r() < 0.5 ? "cool" : "warm") : GS[i % 4], ph = r() * 6;
      glow(ctx, c, x + Math.sin(t * 0.7 + ph) * 60 * drift, y + Math.cos(t * 0.5 + ph) * 40 * drift, rad, alpha * (0.5 + 0.5 * Math.sin(t * 2 + ph)));
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  const off = document.createElement("canvas");
  off.width = W; off.height = H;
  const octx = off.getContext("2d");
  function blurred(ctx, px, fn) {
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalAlpha = 1; octx.globalCompositeOperation = "source-over";
    octx.clearRect(0, 0, W, H); fn(octx);
    ctx.save(); ctx.filter = `blur(${px}px)`; ctx.globalAlpha = 1; ctx.drawImage(off, 0, 0); ctx.restore();
  }
  // grass texture + haze, shared finishing passes
  const grass = document.createElement("canvas");
  grass.width = 512; grass.height = 512;
  { const x = grass.getContext("2d"), r = rng(77); for (let i = 0; i < 9000; i++) { x.fillStyle = r() < 0.5 ? "rgba(0,0,0,.35)" : "rgba(120,200,120,.18)"; x.fillRect(r() * 512, r() * 512, 1 + r() * 2, 3 + r() * 7); } }
  let grassPat = null;
  function finishPitch(ctx, C, t) {
    const hz = C.p(0, 0, 70);
    const hy = hz ? hz[1] : H * 0.5;
    if (!grassPat) grassPat = ctx.createPattern(grass, "repeat");
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = grassPat; ctx.fillRect(0, hy, W, H - hy); ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    streak(ctx, "cool", W / 2, hy - 20, 2600, 260, 0.1);
    streak(ctx, "white", W / 2, hy, 2200, 40, 0.07);
    ctx.globalCompositeOperation = "source-over";
    const v = ctx.createRadialGradient(W / 2, H * 0.55, 300, W / 2, H * 0.55, 1250);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.75)");
    ctx.globalAlpha = 1; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function scene1(ctx, t) {
    ctx.globalAlpha = 1; ctx.filter = "none";
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (t < 0.55) {
      // SHOT A — macro on the ball, rotating light rays behind it
      const s = t / 0.55;
      bokehField(ctx, t, 28, 3, 0.35);
      ctx.globalCompositeOperation = "lighter";
      ctx.save(); ctx.translate(540, 1120); ctx.rotate(t * 0.9);
      for (let i = 0; i < 14; i++) {
        ctx.rotate((Math.PI * 2) / 14);
        const g = ctx.createLinearGradient(0, 0, 0, -1300);
        g.addColorStop(0, "rgba(120,170,255,.22)"); g.addColorStop(1, "rgba(120,170,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-120, -1300); ctx.lineTo(120, -1300); ctx.lineTo(30, 0); ctx.fill();
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      const r = 330 + 60 * eout(s);
      drawBall(ctx, 540, 1120, r, t + 1, 0.6);
      ctx.globalCompositeOperation = "lighter";
      streak(ctx, "cool", 540 - r * 0.35, 1120 - r * 0.45, 1800, 30, 0.6);
      streak(ctx, "white", 540 - r * 0.35, 1120 - r * 0.45, 700, 8, 0.8);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      return;
    }
    if (t < 1.25) {
      // SHOT B — low wide behind the ball, floodlights bang on
      const s = seg(t, 0.55, 1.25);
      const C = camera(0.22 - 0.06 * s, 0.36, 12.6 + 0.35 * eio(s), -0.05, 1100);
      drawStadium(ctx, C, t); finishPitch(ctx, C, t);
      const b = C.p(...BALL0);
      shadow(ctx, C, BALL0, 0.6);
      drawBall(ctx, b[0], b[1], (C.f * 0.11) / b[2], 0, 0);
      return;
    }
    if (t < 1.62) {
      // SHOT C — close-up strike (cleat is an SVG overlay above this canvas)
      const C = camera(-0.35, 0.16, 13.1, -0.05, 1250);
      blurred(ctx, 10, (o) => drawStadium(o, C, t, { bokeh: 2.2 }));
      const g = ctx.createLinearGradient(0, 1100, 0, H);
      g.addColorStop(0, "rgba(10,40,18,0)"); g.addColorStop(1, "rgba(6,22,10,.9)");
      ctx.fillStyle = g; ctx.fillRect(0, 1100, W, H);
      const hit = t >= 1.55;
      const x = hit ? 640 + (t - 1.55) * 2400 : 620, y = hit ? 1270 - (t - 1.55) * 1200 : 1270;
      ctx.globalAlpha = 0.55; ctx.fillStyle = "#020603"; ctx.beginPath(); ctx.ellipse(620, 1530, 250, 34, 0, 0, 6.283); ctx.fill();
      drawBall(ctx, x, y, 260, hit ? t * 5 : 1.3, hit ? 1 : 0, hit ? 0.8 : 1, hit ? 1.16 : 1);
      drawSparks(ctx, 420, 1300, 1.55, t);
      return;
    }
    if (t < 2.9) {
      // SHOT D — chase cam behind the flight, speed ramp
      const s = eio(seg(t, 1.62, 2.9));
      const fb = ballPos(ballU(t));
      const cz = lerp(11.6, 19.6, s), cyy = 0.5 + (fb[1] - 0.11) * 0.55;
      const C = camera(0.25 + fb[0] * 0.75, cyy, cz, Math.atan2(cyy - fb[1], fb[2] - cz) * 0.6, lerp(1100, 1450, s));
      drawStadium(ctx, C, t); finishPitch(ctx, C, t);
      trail(ctx, C, t);
      const bp = ballPos(ballU(t));
      shadow(ctx, C, bp, 0.5);
      const b = C.p(...bp);
      if (b) drawBall(ctx, b[0], b[1], (C.f * 0.11) / b[2], t * 4, 1.4);
      drawSparks(ctx, 300, 1500, 1.55, t);
      return;
    }
    // SHOT E/F — goal! then the ball rebounds into the lens
    const k = t - 2.9;
    const shake = Math.exp(-k * 4) * 0.06;
    const C = camera(2.16 + Math.sin(t * 90) * shake, 1.55 + Math.cos(t * 77) * shake, 19.6 + Math.min(k, 0.6) * 0.5, Math.atan2(1.55 - 2.02, 26.3 - 19.6) * 0.6, 1650 + Math.max(0, t - 3.5) * 700);
    if (t > 3.5) blurred(ctx, Math.min(9, (t - 3.5) * 14), (o) => { drawStadium(o, C, t); finishPitch(o, C, t); });
    else { drawStadium(ctx, C, t); finishPitch(ctx, C, t); }
    if (t < 3.5) {
      const bp = [BALLE[0], Math.max(0.12, BALLE[1] - k * k * 6), BALLE[2] + netOffset(BALLE[0], BALLE[1], t) * 0.4];
      const b = C.p(...bp);
      if (b) drawBall(ctx, b[0], b[1], (C.f * 0.11) / b[2], t * 2, 1);
    } else {
      const s = seg(t, 3.5, 4.4);
      const p0 = C.p(BALLE[0], 0.4, BALLE[2]) || [700, 900];
      const r = 26 * Math.exp(s * 4.3);
      const x = lerp(p0[0], 540, eout(s)), y = lerp(p0[1], 1000, eout(s));
      ctx.globalCompositeOperation = "lighter";
      for (let i = 1; i <= 3; i++) glow(ctx, GS[i], x + i * 18, y - i * 14, r * 1.6, 0.08);
      ctx.globalCompositeOperation = "source-over";
      drawBall(ctx, x, y, r, t * 3, 1.2);
    }
    drawConfetti(ctx, 2.92, t);
  }
  function shadow(ctx, C, bp, a) {
    const g = C.p(bp[0], 0, bp[2]);
    if (!g) return;
    const r = (C.f * 0.13) / g[2];
    ctx.globalAlpha = a * clamp(1.2 - bp[1] / 2, 0.1, 1); ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(g[0], g[1], r * (1 + bp[1]), r * 0.3, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
  }

  // ═════════ SCENE 2 · OFFICE FLY-THROUGH ═════════
  const sky = document.createElement("canvas");
  sky.width = 1400; sky.height = 420;
  {
    const x = sky.getContext("2d"), r = rng(5);
    const g = x.createLinearGradient(0, 0, 0, 420); g.addColorStop(0, "#050c22"); g.addColorStop(1, "#16254a");
    x.fillStyle = g; x.fillRect(0, 0, 1400, 420);
    for (let i = 0; i < 46; i++) {
      const bw = 40 + r() * 90, bh = 90 + r() * 300, bx = r() * 1400, by = 420 - bh;
      x.fillStyle = `rgb(${8 + r() * 10},${14 + r() * 12},${30 + r() * 20})`; x.fillRect(bx, by, bw, bh);
      for (let wy = by + 8; wy < 410; wy += 14) for (let wx = bx + 6; wx < bx + bw - 6; wx += 12)
        if (r() < 0.35) { x.fillStyle = r() < 0.8 ? "rgba(255,214,150,.75)" : "rgba(150,190,255,.8)"; x.fillRect(wx, wy, 5, 7); }
    }
  }
  const DESK = [];
  { const r = rng(9); for (let k = 0; k < 20; k++) for (const s of [-1, 1]) DESK.push({ k, s, c: GC[(k * 2 + (s > 0 ? 1 : 0)) % 4], occ: r() < 0.85, hx: (r() - 0.5) * 0.3, ui: Math.floor(r() * 3) }); }
  function scene2(ctx, t) {
    const s = Math.max(0, t - 4.4);
    const cz = -8 + 36 * (1 - Math.exp(-0.75 * s));
    const C = camera(0.14 * Math.sin(s * 0.8), 1.22 + 0.03 * Math.sin(s * 1.7), cz, 0.0, 1000);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#03050c"); bg.addColorStop(0.5, "#0a1226"); bg.addColorStop(1, "#04060c");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // far window wall + skyline
    const wq = [C.p(-14, 0, 82), C.p(14, 8, 82)];
    if (wq[0] && wq[1]) { ctx.drawImage(sky, wq[0][0], wq[1][1], wq[1][0] - wq[0][0], wq[0][1] - wq[1][1]); }
    ctx.globalCompositeOperation = "lighter";
    if (wq[0]) glow(ctx, "cool", W / 2, wq[0][1] - 80, 700, 0.25);
    ctx.globalCompositeOperation = "source-over";
    // floor sheen
    const fl = C.p(0, 0, 80);
    if (fl) { const g = ctx.createLinearGradient(0, fl[1], 0, H); g.addColorStop(0, "#0b1430"); g.addColorStop(1, "#020308"); ctx.fillStyle = g; ctx.fillRect(0, fl[1], W, H - fl[1]); }
    for (let k = 19; k >= 0; k--) {
      const zr = 4 * k;
      if (zr + 3.7 < cz + 0.4) continue;
      const fog = clamp(1 - (zr - cz) / 75, 0.12, 1);
      // ceiling lights + floor reflections
      const near = clamp((zr - cz - 4) / 8, 0, 1);
      const lq = quad(ctx, C, [[-0.8, 3.0, zr], [0.8, 3.0, zr], [0.8, 3.0, zr + 1.6], [-0.8, 3.0, zr + 1.6]], "rgba(214,228,255,.85)", fog * near);
      if (lq) {
        ctx.globalCompositeOperation = "lighter";
        const m = C.p(0, 3.0, zr + 0.8), fr = C.p(0, 0, zr + 0.8);
        if (m) glow(ctx, "cool", m[0], m[1], (C.f * 1.6) / m[2], 0.35 * fog);
        if (fr) streak(ctx, "cool", fr[0], fr[1], (C.f * 2.4) / fr[2], (C.f * 0.5) / fr[2], 0.22 * fog);
        ctx.globalCompositeOperation = "source-over";
      }
      for (const sd of [-1, 1]) {
        const d = DESK[k * 2 + (sd > 0 ? 1 : 0)];
        const x0 = sd * 1.3, x1 = sd * 4.8;
        // back partition (faces camera)
        quad(ctx, C, [[x0, 0, zr + 3.7], [x1, 0, zr + 3.7], [x1, 1.45, zr + 3.7], [x0, 1.45, zr + 3.7]], "rgba(110,140,205,.16)", fog);
        // desk
        quad(ctx, C, [[sd * 1.6, 0.75, zr + 2.9], [sd * 4.5, 0.75, zr + 2.9], [sd * 4.5, 0.75, zr + 3.65], [sd * 1.6, 0.75, zr + 3.65]], "#7f8aa6", fog * 0.8);
        // monitor
        const mx = sd * 2.8;
        const mq = quad(ctx, C, [[mx - 0.34, 0.92, zr + 3.35], [mx + 0.34, 0.92, zr + 3.35], [mx + 0.34, 1.34, zr + 3.35], [mx - 0.34, 1.34, zr + 3.35]], d.c, fog);
        if (mq) {
          ctx.globalAlpha = fog * 0.7; ctx.fillStyle = "rgba(255,255,255,.55)";
          const w = mq[1][0] - mq[0][0], h = mq[0][1] - mq[2][1];
          for (let i = 0; i < 4; i++) ctx.fillRect(mq[3][0] + w * 0.1, mq[3][1] + h * (0.15 + i * 0.2), w * (0.3 + ((i * 37 + k * 13) % 50) / 100), h * 0.08);
          ctx.globalCompositeOperation = "lighter";
          const m = C.p(mx, 1.13, zr + 3.35);
          if (m) glow(ctx, GS[GC.indexOf(d.c)], m[0], m[1], (C.f * 1.1) / m[2], 0.5 * fog);
          ctx.globalCompositeOperation = "source-over";
        }
        // worker silhouette, rim-lit by their screen
        if (d.occ) {
          const hp = C.p(mx + d.hx, 1.3 + 0.015 * Math.sin(t * 6 + k), zr + 2.55), bp = C.p(mx + d.hx, 0.95, zr + 2.55);
          if (hp && bp) {
            const hr = (C.f * 0.115) / hp[2];
            ctx.globalAlpha = fog; ctx.fillStyle = "#03050a"; ctx.strokeStyle = d.c; ctx.lineWidth = Math.max(1, hr * 0.12);
            ctx.beginPath(); ctx.ellipse(bp[0], bp[1], hr * 2.1, hr * 2.6, 0, 0, 6.283); ctx.fill();
            ctx.globalAlpha = fog * 0.7; ctx.stroke();
            ctx.globalAlpha = fog; ctx.beginPath(); ctx.arc(hp[0], hp[1], hr, 0, 6.283); ctx.fill();
            ctx.globalAlpha = fog * 0.8; ctx.stroke();
          }
        }
        // aisle-side partition (glass) + glowing top trim
        const aq = quad(ctx, C, [[x0, 0, zr + 0.5], [x0, 0, zr + 3.7], [x0, 1.15, zr + 3.7], [x0, 1.15, zr + 0.5]], "rgba(120,155,225,.20)", fog);
        if (aq) {
          ctx.globalAlpha = fog; ctx.strokeStyle = d.c; ctx.lineWidth = 3; ctx.shadowColor = d.c; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(aq[3][0], aq[3][1]); ctx.lineTo(aq[2][0], aq[2][1]); ctx.stroke(); ctx.shadowBlur = 0;
        }
      }
    }
    // speed lines on the fast entry
    const sp = clamp(1 - s / 0.9, 0, 1);
    if (sp > 0) {
      const r = rng(4);
      ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#cfe0ff"; ctx.lineWidth = 3;
      for (let i = 0; i < 60; i++) {
        const a = r() * 6.283, r0 = 200 + r() * 500, len = 200 + r() * 600;
        ctx.globalAlpha = sp * 0.5;
        ctx.beginPath(); ctx.moveTo(540 + Math.cos(a) * r0, 900 + Math.sin(a) * r0); ctx.lineTo(540 + Math.cos(a) * (r0 + len), 900 + Math.sin(a) * (r0 + len)); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    bokehField(ctx, t, 10, 41, 0.18);
    ctx.globalAlpha = 1;
  }

  // ═════════ SCENE 3 · OPERATING ROOM (bg + fx) ═════════
  const DUST = [];
  { const r = rng(31); for (let i = 0; i < 170; i++) DUST.push({ x: r() * W, y: r() * H, s: 1 + r() * 3.2, ph: r() * 6, v: 10 + r() * 30 }); }
  const LAMPS = [{ x: 330, y: 150, r: 175, t0: 9.55 }, { x: 770, y: 110, r: 150, t0: 9.75 }];
  const beat = (t) => { if (t < 9.6) return 0; const k = (t - 9.6) % 0.8333; return Math.exp(-k * 7); };
  function scene3bg(ctx, t) {
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#03060d"); g.addColorStop(1, "#071020");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const on = Math.min(1, LAMPS.filter((l) => t > l.t0).length / 2 + (t > 9.95 ? 0.3 : 0));
    // equipment silhouettes with rim light
    ctx.fillStyle = "#050a14"; ctx.strokeStyle = `rgba(150,195,255,${0.25 + 0.4 * on})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(860, 760, 170, 120); ctx.rect(935, 880, 18, 700); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(70, 620, 12, 1100); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(76, 640, 46, 70, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    // monitor screen glow (pulses with the heartbeat)
    const b = beat(t);
    ctx.fillStyle = `rgba(234,67,53,${0.25 + 0.5 * b})`; ctx.fillRect(872, 772, 146, 96);
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, "red", 945, 820, 260, 0.25 + 0.35 * b);
    // back glow
    glow(ctx, "cool", 540, 900, 900, 0.18 + 0.2 * on);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  function scene3fx(ctx, t) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const L of LAMPS) {
      const k = t - L.t0, on = k > 0 ? Math.min(1, 0.6 + k * 3) + Math.exp(-k * 12) * 0.8 : 0;
      // volumetric cone
      if (on) {
        const g = ctx.createLinearGradient(L.x, L.y, L.x, H);
        g.addColorStop(0, `rgba(215,232,255,${0.2 * Math.min(1, on)})`); g.addColorStop(1, "rgba(215,232,255,0)");
        ctx.globalAlpha = 1; ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(L.x - L.r * 0.8, L.y); ctx.lineTo(L.x + L.r * 0.8, L.y); ctx.lineTo(L.x + 520, H); ctx.lineTo(L.x - 520, H); ctx.closePath(); ctx.fill();
      }
      // lamp head: housing + LED rings lighting up in sequence
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1; ctx.fillStyle = "#1a2236"; ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(170,200,255,.5)"; ctx.lineWidth = 4; ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      let n = 0;
      for (let ring = 0; ring < 3; ring++) {
        const rr = L.r * (0.25 + ring * 0.25), cnt = 6 + ring * 6;
        for (let i = 0; i < cnt; i++, n++) {
          const a = (i / cnt) * 6.283 + ring * 0.3;
          const lit = k > n * 0.006;
          const x = L.x + Math.cos(a) * rr, y = L.y + Math.sin(a) * rr * 0.92;
          if (lit) { glow(ctx, "white", x, y, L.r * 0.16, 1); }
          else { ctx.globalAlpha = 1; ctx.fillStyle = "#3a4560"; ctx.beginPath(); ctx.arc(x, y, L.r * 0.05, 0, 6.283); ctx.fill(); }
        }
      }
      if (on) { glow(ctx, "white", L.x, L.y, L.r * 1.6, 0.7 * Math.min(1.3, on)); streak(ctx, "cool", L.x, L.y, 2000, 28, 0.5 * Math.min(1.3, on)); }
    }
    // dust in the light
    const on = t > 9.75 ? 1 : t > 9.55 ? 0.5 : 0;
    for (const d of DUST) {
      const y = ((d.y - d.v * t) % H + H) % H, x = d.x + Math.sin(t * 0.6 + d.ph) * 30;
      glow(ctx, "white", x, y, d.s * 3, 0.35 * on * (0.5 + 0.5 * Math.sin(t * 2 + d.ph)));
    }
    // heartbeat red vignette pulse
    const b = beat(t);
    if (b > 0.01) {
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1200);
      g.addColorStop(0, "rgba(234,67,53,0)"); g.addColorStop(1, `rgba(234,67,53,${0.32 * b})`);
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  // ═════════ SCENE 4 · FOUNDATION ═════════
  const STREAM = [];
  { const r = rng(51); for (let i = 0; i < 240; i++) STREAM.push({ src: i % 3, d: r() * 0.7, sp: r(), ox: (r() - 0.5) * 300, oy: (r() - 0.5) * 300, s: 2 + r() * 5, ph: r() * 6 }); }
  const SRC = [[-100, 200, "green"], [540, -150, "yellow"], [1180, 200, "red"]];
  function scene4(ctx, t) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const tx = 540, ty = 1340;
    for (const p of STREAM) {
      const k = (t - 14.45 - p.d) / 0.9;
      const [sx, sy, col] = SRC[p.src];
      if (k < 0) continue;
      if (k < 1) {
        const e = k * k * (3 - 2 * k);
        const cx = lerp(sx + p.ox, tx, e) + Math.sin(e * 3.14) * (p.src - 1) * -180, cy = lerp(sy + p.oy, ty, e);
        glow(ctx, col, cx, cy, p.s * 4, 0.9);
        glow(ctx, "white", cx, cy, p.s * 1.4, 0.8);
      } else {
        // orbit / rise as embers afterwards
        const k2 = t - 14.45 - p.d - 0.9;
        const x = tx + p.ox * 1.6 + Math.sin(k2 * 0.8 + p.ph) * 40, y = ty - 40 - k2 * (40 + p.sp * 90) + p.oy * 0.3;
        glow(ctx, col, x, y, p.s * 2.4, clamp(0.6 - k2 * 0.09, 0, 0.6));
      }
    }
    // impact flare on the slab when particles land
    const f = Math.exp(-Math.max(0, t - 15.3) * 3) * (t > 15.2 ? 1 : 0);
    if (f > 0.01) { glow(ctx, "white", tx, ty, 700 * f, 0.6 * f); streak(ctx, "cool", tx, ty, 2200, 40, 0.7 * f); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    // soccer ball callback drops onto the foundation
    const k = t - 15.75;
    if (k > -0.3) {
      const kk = Math.max(0, k);
      let y;
      if (k < 0) y = 1185 - 1400 * (k * k) / 0.09; // falling in
      else y = 1185 - Math.abs(Math.sin(kk * 7)) * 120 * Math.exp(-kk * 4);
      drawBall(ctx, 230, Math.min(1185, y), 82, t, 0.8);
    }
  }

  return { W, H, scene1, scene2, scene3bg, scene3fx, scene4, drawBall };
})();
