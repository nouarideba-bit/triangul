/* TRIANGUL — Visite virtuelle 3D/4D du T4 témoin (lot B31, Les Jardins d'Armance, exemple fictif).
   Maquette d'illustration : plan indicatif, surfaces approximatives. Aucun appel à un serveur tiers.
   Bibliothèque : three.js (licence MIT, assets/js/vendor/three-LICENSE.txt). */
import * as THREE from "./vendor/three.module.min.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const deg = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fmtH = (h) => { h = ((h % 24) + 24) % 24; const m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };

/* ---------- Site et soleil ---------- */
const SITE = { lat: 48.6, lon: 2.3, facadeAz: 225 }; // Essonne, façade principale orientée sud-ouest (à remplacer par les données réelles)
const SEASONS = {
  hiver: { label: "21 décembre", doy: 355, tz: 1 },
  printemps: { label: "20 mars", doy: 79, tz: 1 },
  ete: { label: "21 juin", doy: 172, tz: 2 },
  automne: { label: "22 septembre", doy: 265, tz: 2 },
};
function sunPos(doy, hour, tz) {
  const decl = 23.44 * Math.sin((360 / 365) * (284 + doy) * deg);
  const B = (360 / 365) * (doy - 81) * deg;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const solar = hour + (4 * SITE.lon + eot) / 60 - tz;
  const H = 15 * (solar - 12) * deg, phi = SITE.lat * deg, d = decl * deg;
  const sinE = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
  const elev = Math.asin(clamp(sinE, -1, 1));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(d) * Math.cos(phi)) + Math.PI;
  return { elev: elev / deg, az: (az / deg + 360) % 360 };
}
function dayInfo(season) {
  const s = SEASONS[season];
  let rise = null, set = null, first = null, last = null, mins = 0, noonH = 12, noonE = -90;
  for (let m = 0; m < 24 * 60; m += 2) {
    const h = m / 60, p = sunPos(s.doy, h, s.tz);
    if (p.elev > 0) { if (rise === null) rise = h; set = h; }
    if (p.elev > noonE) { noonE = p.elev; noonH = h; }
    const diff = Math.abs(((p.az - SITE.facadeAz + 540) % 360) - 180);
    if (p.elev > 2 && diff < 85) { if (first === null) first = h; last = h; mins += 2; }
  }
  return { rise, set, first, last, hours: mins / 60, noonH, noonE };
}

/* ---------- Rendu ---------- */
const canvas = $("#scene");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  document.body.insertAdjacentHTML("beforeend", '<div class="vv-err"><p>Votre appareil ne permet pas l\'affichage 3D (WebGL indisponible).<br><a style="color:#C5A059" href="programme-exemple.html">Retour au programme</a></p></div>');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 400);
const YAW = -45 * deg; // le repère du plan est tourné pour que la façade regarde le sud-ouest
const apt = new THREE.Group();
apt.rotation.y = YAW;
scene.add(apt);
apt.updateMatrixWorld(true);

/* ---------- Textures procédurales ---------- */
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return "#" + c.getHexString(); }
function canvasTex(size, draw, repeatM) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; t.repeat.set(1 / repeatM, 1 / repeatM); t.userData.url = c.toDataURL("image/jpeg", .7);
  return t;
}
function parquet(base, dark) {
  return canvasTex(512, (g, n) => {
    const r = rnd(7); const rows = 8, w = n / rows;
    for (let i = 0; i < rows; i++) {
      let y = -r() * n;
      while (y < n) {
        const len = n * (0.45 + r() * 0.5);
        g.fillStyle = shade(base, 0.86 + r() * 0.22); g.fillRect(i * w, y, w, len);
        g.globalAlpha = .12; g.strokeStyle = dark;
        for (let l = 0; l < 6; l++) { g.beginPath(); const x = i * w + r() * w; g.moveTo(x, y); g.bezierCurveTo(x + 6, y + len / 3, x - 6, y + len * .6, x + 2, y + len); g.stroke(); }
        g.globalAlpha = .45; g.fillStyle = dark; g.fillRect(i * w, y, w, 2); g.fillRect(i * w, y, 2, len); g.globalAlpha = 1;
        y += len;
      }
    }
  }, 1.6);
}
function tiles(base, joint, sizeM, texM) {
  return canvasTex(512, (g, n) => {
    const r = rnd(3); const k = Math.round(texM / sizeM), w = n / k;
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { g.fillStyle = shade(base, 0.96 + r() * 0.07); g.fillRect(i * w, j * w, w, w); }
    g.fillStyle = joint; for (let i = 0; i <= k; i++) { g.fillRect(i * w - 1, 0, 2, n); g.fillRect(0, i * w - 1, n, 2); }
  }, texM);
}
function concrete(base) {
  return canvasTex(512, (g, n) => {
    g.fillStyle = base; g.fillRect(0, 0, n, n); const r = rnd(11);
    for (let i = 0; i < 2600; i++) { g.globalAlpha = .05 + r() * .06; g.fillStyle = r() > .5 ? "#ffffff" : "#000000"; g.beginPath(); g.arc(r() * n, r() * n, 4 + r() * 40, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }, 2.5);
}
function marble(base, vein) {
  return canvasTex(512, (g, n) => {
    g.fillStyle = base; g.fillRect(0, 0, n, n); const r = rnd(5);
    g.strokeStyle = vein;
    for (let i = 0; i < 22; i++) { g.globalAlpha = .15 + r() * .3; g.lineWidth = .6 + r() * 2.2; g.beginPath(); let x = r() * n, y = 0; g.moveTo(x, y); while (y < n) { x += (r() - .5) * 40; y += 20 + r() * 30; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, 0, n, 2); g.fillRect(0, 0, 2, n);
  }, 1.2);
}
function enduit(base) {
  return canvasTex(256, (g, n) => {
    g.fillStyle = base; g.fillRect(0, 0, n, n); const r = rnd(9);
    for (let i = 0; i < 500; i++) { g.globalAlpha = .06; g.fillStyle = r() > .5 ? "#fff" : "#000"; g.beginPath(); g.ellipse(r() * n, r() * n, 10 + r() * 30, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }, 1.5);
}

/* ---------- Catalogue des finitions (statuts à aligner sur la notice descriptive) ---------- */
const FIN = {
  solsNuit: { label: "Sols chambres, suite, dégagement", items: [
    { id: "chene-clair", name: "Parquet chêne clair", tag: "inclus", tex: parquet("#C9A47A", "#7d5a36") },
    { id: "chene-fume", name: "Parquet chêne fumé", tag: "option", tex: parquet("#7A5A43", "#3b2a1e") },
  ] },
  solsJour: { label: "Sols séjour, cuisine, entrée", items: [
    { id: "gres-clair", name: "Carrelage grand format gris clair", tag: "confirmer", tex: tiles("#D9D6D0", "#bdb8b0", 0.6, 1.2) },
    { id: "beton-cire", name: "Grès effet béton ciré", tag: "option", tex: concrete("#B9B4AC") },
    { id: "chene-clair-j", name: "Parquet chêne clair", tag: "option", tex: parquet("#C9A47A", "#7d5a36") },
  ] },
  faience: { label: "Faïence salles d'eau (toute hauteur)", items: [
    { id: "faience-blanche", name: "Faïence blanche", tag: "inclus", tex: tiles("#F4F3EF", "#d8d5cf", 0.3, 0.9) },
    { id: "faience-marbre", name: "Faïence effet marbre", tag: "option", tex: marble("#EEEBE6", "#8f8a84") },
  ] },
  murs: { label: "Murs", items: [
    { id: "blanc", name: "Peinture blanche mate", tag: "inclus", color: "#F2F0EB" },
    { id: "sauge", name: "Vert sauge doux", tag: "deco", color: "#C8D1C1" },
    { id: "grege", name: "Grège", tag: "deco", color: "#D3C9BA" },
    { id: "terracotta", name: "Terracotta douce", tag: "deco", color: "#D9B7A0" },
    { id: "bleu-nuit", name: "Bleu nuit", tag: "deco", color: "#4A5868" },
    { id: "enduit", name: "Enduit décoratif", tag: "deco", tex: enduit("#DAD3C7") },
  ] },
};
const TAGS = { inclus: "Inclus", option: "Option, à chiffrer", deco: "Décoration non incluse", confirmer: "À confirmer (notice)" };
const DEFAULTS = { solsNuit: "chene-clair", solsJour: "gres-clair", faience: "faience-blanche", murs: "blanc" };
const state = { amb: "scandi", fin: { ...DEFAULTS }, livre: false, season: "printemps", hour: 13.5 };

const M = {
  floorNuit: new THREE.MeshStandardMaterial({ roughness: .55 }),
  floorJour: new THREE.MeshStandardMaterial({ roughness: .45 }),
  faience: new THREE.MeshStandardMaterial({ roughness: .25 }),
  wall: new THREE.MeshStandardMaterial({ color: "#F2F0EB", roughness: .92 }),
  facade: new THREE.MeshStandardMaterial({ color: "#E7E1D6", roughness: .9 }),
  ceiling: new THREE.MeshStandardMaterial({ color: "#F7F6F2", roughness: .95 }),
  slab: new THREE.MeshStandardMaterial({ color: "#CFC9BF", roughness: .9 }),
  deck: new THREE.MeshStandardMaterial({ color: "#9C7A58", roughness: .8 }),
  glass: new THREE.MeshStandardMaterial({ color: "#cfe3ea", transparent: true, opacity: .16, roughness: .05, metalness: .1, depthWrite: false }),
  frame: new THREE.MeshStandardMaterial({ color: "#3C423F", roughness: .5, metalness: .3 }),
  door: new THREE.MeshStandardMaterial({ color: "#EDEAE3", roughness: .6 }),
  white: new THREE.MeshStandardMaterial({ color: "#FBFBF9", roughness: .2 }),
  chrome: new THREE.MeshStandardMaterial({ color: "#d8d8d8", roughness: .15, metalness: 1 }),
  lawn: new THREE.MeshStandardMaterial({ color: "#6E8B5B", roughness: 1 }),
  path: new THREE.MeshStandardMaterial({ color: "#CDC4B4", roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: "#5D7A4C", roughness: .9 }),
  leaf2: new THREE.MeshStandardMaterial({ color: "#7E9A5E", roughness: .9 }),
  trunk: new THREE.MeshStandardMaterial({ color: "#E8E2D6", roughness: .9 }),
  neighbor: new THREE.MeshStandardMaterial({ color: "#D8D1C4", roughness: .95 }),
  screen: new THREE.MeshStandardMaterial({ color: "#111111", roughness: .3 }),
};
/* Matériaux de décoration selon l'ambiance : [couleur, rugosité, métal] */
const ROLES = ["wood", "fabric", "accent", "metal", "kitchen", "counter", "rug", "shade", "outdoor", "cushion", "linen"];
const AMB = {
  scandi: { name: "Minimaliste Scandinave",
    wood: ["#C9A77C", .7, 0], fabric: ["#DCD6CB", .95, 0], accent: ["#9DB09A", .8, 0], metal: ["#E8E4DC", .6, 0],
    kitchen: ["#F2F0EB", .5, 0], counter: ["#CFAE82", .55, 0], rug: ["#EFE9DD", 1, 0], shade: ["#F4EFE6", .9, 0],
    outdoor: ["#B98E5E", .8, 0], cushion: ["#A9B9A6", .95, 0], linen: ["#F3F1EC", .95, 0] },
  contemp: { name: "Chic Contemporain",
    wood: ["#3B2F2A", .4, 0], fabric: ["#3E4A4F", .75, 0], accent: ["#C5A059", .3, 1], metal: ["#1E1E1E", .45, .4],
    kitchen: ["#3A3D40", .35, 0], counter: ["#E9E6E1", .2, 0], rug: ["#6E6A64", 1, 0], shade: ["#C5A059", .3, 1],
    outdoor: ["#232323", .5, .3], cushion: ["#B79A6A", .7, 0], linen: ["#D9D4CC", .9, 0] },
};
const R = {}; ROLES.forEach((k) => (R[k] = new THREE.MeshStandardMaterial()));
const counterMarble = marble("#ECE9E4", "#9a948d");

/* ---------- Géométrie ---------- */
const H = 2.5; // hauteur sous plafond (hypothèse)
const colliders = [], furnitureColliders = [];
const floors = [], pickables = [];
const furniture = new THREE.Group(); apt.add(furniture);

function box(x1, z1, x2, z2, y1, y2, mat, opt = {}) {
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1), d = Math.abs(z2 - z1);
  const g = new THREE.BoxGeometry(w, h, d);
  if (opt.uv) scaleUV(g, w, h, d);
  const m = new THREE.Mesh(g, mat);
  m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  m.castShadow = opt.cast !== false; m.receiveShadow = true;
  (opt.parent || apt).add(m); if (opt.pick !== false) pickables.push(m);
  if (opt.collide) colliders.push({ x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2) });
  return m;
}
function scaleUV(g, w, h, d) {
  // faces +x,-x,+y,-y,+z,-z : UV en mètres, la répétition de la texture fixe ensuite la taille réelle
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
}
function floor(x1, z1, x2, z2, mat, name) {
  const m = box(x1, z1, x2, z2, -0.02, 0, mat, { uv: 1, cast: false });
  m.userData.room = name; floors.push(m); return m;
}

/* Murs : segments selon X ou Z, avec ouvertures {s,e,sill,head,type} */
function wall(ax, fixed, a, b, t, ops = [], mat = M.wall, outerSign = 0) {
  ops = ops.slice().sort((p, q) => p.s - q.s);
  let cur = a; const pieces = [];
  for (const o of ops) { if (o.s > cur) pieces.push([cur, o.s, 0, H]); pieces.push([o.s, o.e, 0, o.sill], [o.s, o.e, o.head, H]); cur = o.e; }
  if (cur < b) pieces.push([cur, b, 0, H]);
  const mk = (s, e, y1, y2, off, th, mt) => {
    if (y2 - y1 < 0.005 || e - s < 0.005) return;
    const col = y1 < 0.3 && y2 > 1.0;
    if (ax === "x") box(s, fixed + off - th / 2, e, fixed + off + th / 2, y1, y2, mt, { collide: col });
    else box(fixed + off - th / 2, s, fixed + off + th / 2, e, y1, y2, mt, { collide: col });
  };
  for (const [s, e, y1, y2] of pieces) {
    if (outerSign) { mk(s, e, y1, y2, -outerSign * t / 4, t / 2, mat); mk(s, e, y1, y2, outerSign * t / 4, t / 2, M.facade); }
    else mk(s, e, y1, y2, 0, t, mat);
  }
  const at = (s, e, y1, y2, th, mt, opt) => (ax === "x" ? box(s, fixed - th, e, fixed + th, y1, y2, mt, opt) : box(fixed - th, s, fixed + th, e, y1, y2, mt, opt));
  for (const o of ops) {
    if (o.type === "win" || o.type === "baie") {
      const glassB = (s, e) => at(s, e, o.sill, o.head, .01, M.glass, { cast: false, pick: false, collide: o.sill < 1 });
      const fr = (s, e, y1, y2) => at(s, e, y1, y2, .04, M.frame, { pick: false });
      if (o.walk) {
        glassB(o.s, o.walk[0]); glassB(o.walk[1], o.e);
        fr(o.walk[0] - .03, o.walk[0] + .03, o.sill, o.head); fr(o.walk[1] - .03, o.walk[1] + .03, o.sill, o.head);
      } else glassB(o.s, o.e);
      fr(o.s, o.e, o.head - .05, o.head); fr(o.s, o.e, o.sill, o.sill + .04);
      fr(o.s, o.s + .05, o.sill, o.head); fr(o.e - .05, o.e, o.sill, o.head);
      const n = o.walk ? 0 : Math.floor((o.e - o.s) / 1.4);
      for (let i = 1; i <= n; i++) { const x = o.s + (o.e - o.s) * i / (n + 1); fr(x - .025, x + .025, o.sill, o.head); }
    }
    if (o.type === "front") at(o.s, o.e, 0, o.head, .03, M.frame, { collide: true }); // porte palière fermée
  }
}
const D = (s, e) => ({ s, e, sill: 0, head: 2.1, type: "door" });
const O = (s, e) => ({ s, e, sill: 0, head: 2.3, type: "open" });
const WIN = (s, e) => ({ s, e, sill: 0.95, head: 2.25, type: "win" });
const BAIE = (s, e, walk) => ({ s, e, sill: 0, head: 2.3, type: "baie", walk });

/* Plan d'illustration (mètres). x : 0 → 11,6 ; z : 0 (palier) → 7,6 (façade sud-ouest). Terrasse : z 7,6 → 9,5. */
const ROOMS = [
  { id: "sejour", name: "Séjour-cuisine", x1: 0, z1: 2.4, x2: 6.6, z2: 7.6, zone: "jour" },
  { id: "entree", name: "Entrée", x1: 3.0, z1: 0, x2: 4.9, z2: 2.4, zone: "jour" },
  { id: "ch3", name: "Chambre 3", x1: 0, z1: 0, x2: 3.0, z2: 2.4, zone: "nuit" },
  { id: "sdb", name: "Bains", x1: 4.9, z1: 0, x2: 6.6, z2: 2.4, zone: "eau" },
  { id: "wc", name: "WC", x1: 6.6, z1: 0, x2: 7.7, z2: 1.3, zone: "eau" },
  { id: "deg", name: "Dégagement", x1: 6.6, z1: 1.3, x2: 7.7, z2: 4.6, zone: "nuit" },
  { id: "ch2", name: "Chambre 2", x1: 7.7, z1: 0, x2: 11.6, z2: 2.6, zone: "nuit" },
  { id: "dressing", name: "Dressing", x1: 7.7, z1: 2.6, x2: 9.5, z2: 4.6, zone: "nuit" },
  { id: "sde", name: "S. d'eau", x1: 9.5, z1: 2.6, x2: 11.6, z2: 4.6, zone: "eau" },
  { id: "suite", name: "Suite parentale", x1: 6.6, z1: 4.6, x2: 11.6, z2: 7.6, zone: "nuit" },
  { id: "terrasse", name: "Terrasse 22 m²", x1: 0, z1: 7.6, x2: 11.6, z2: 9.5, zone: "ext" },
];
function buildApartment() {
  for (const r of ROOMS) {
    const mat = r.zone === "jour" ? M.floorJour : r.zone === "nuit" ? M.floorNuit : r.zone === "eau" ? M.faience : M.deck;
    floor(r.x1, r.z1, r.x2, r.z2, mat, r.id);
  }
  box(-0.2, -0.2, 11.8, 9.7, -0.35, -0.02, M.slab, { pick: false });
  box(-0.1, -0.1, 11.7, 7.7, H, H + 0.25, M.ceiling, { pick: false });
  box(-0.2, 7.7, 11.8, 8.7, 2.72, 2.95, M.facade, { pick: false }); // débord au-dessus de la terrasse
  // murs extérieurs : demi-épaisseur intérieure peinte, demi-épaisseur extérieure en façade
  wall("x", 0, 0, 11.6, .3, [{ s: 3.5, e: 4.45, sill: 0, head: 2.15, type: "front" }], M.wall, -1);
  wall("z", 0, 0, 7.6, .3, [WIN(0.6, 1.9), WIN(3.0, 4.2)], M.wall, -1);
  wall("z", 11.6, 0, 7.6, .3, [WIN(0.6, 1.8), WIN(5.3, 6.6)], M.wall, 1);
  wall("x", 7.6, 0, 11.6, .3, [BAIE(0.4, 6.1, [2.2, 3.7]), BAIE(7.9, 11.0, [9.0, 10.1])], M.wall, 1);
  // cloisons
  wall("x", 2.4, 0, 3.0, .1); wall("x", 2.4, 4.9, 6.6, .1);
  wall("z", 3.0, 0, 2.4, .1, [D(1.25, 2.05)]); wall("z", 4.9, 0, 2.4, .1);
  wall("z", 6.6, 0, 7.6, .1, [D(1.45, 2.25), O(2.8, 3.7)]);
  wall("z", 7.7, 0, 4.6, .1, [D(1.7, 2.5)]);
  wall("x", 1.3, 6.6, 7.7, .1, [D(6.8, 7.5)]);
  wall("x", 2.6, 7.7, 11.6, .1); wall("z", 9.5, 2.6, 4.6, .1);
  wall("x", 4.6, 6.6, 11.6, .1, [D(6.75, 7.55), O(7.9, 9.3), D(10.0, 10.8)]);
  // faïence toute hauteur
  const fa = (x1, z1, x2, z2) => box(x1, z1, x2, z2, 0, H, M.faience, { uv: 1, cast: false });
  fa(4.96, 0.16, 6.54, 0.18); fa(4.96, 2.32, 6.54, 2.34); fa(4.96, 0.16, 4.98, 2.34); fa(6.52, 0.16, 6.54, 1.4);
  fa(9.56, 2.66, 11.44, 2.68); fa(9.56, 4.52, 9.98, 4.54); fa(10.84, 4.52, 11.44, 4.54); fa(9.56, 2.66, 9.58, 4.54); fa(11.42, 2.66, 11.44, 4.54);
  // terrasse
  box(0, 9.44, 11.6, 9.5, 0, 1.0, M.glass, { cast: false, pick: false, collide: true });
  box(0, 9.42, 11.6, 9.52, 1.0, 1.05, M.frame, { pick: false });
  box(-0.15, 7.6, 0, 9.5, 0, 1.8, M.facade, { collide: true }); box(11.6, 7.6, 11.75, 9.5, 0, 1.8, M.facade, { collide: true });
  // reste de l'immeuble (contexte ; sans ombre portée)
  const ctx = (x1, z1, x2, z2, y1, y2) => box(x1, z1, x2, z2, y1, y2, M.facade, { cast: false, pick: false });
  ctx(-14, -0.2, -0.16, 7.8, -9.6, 5.6); ctx(11.76, -0.2, 26, 7.8, -9.6, 5.6); ctx(-0.2, -0.2, 11.8, 7.8, -9.6, -0.36); ctx(-0.2, -0.2, 11.8, 7.8, 2.95, 5.6);
  // vantaux de portes ouverts
  const leaf = (x1, z1, x2, z2) => box(x1, z1, x2, z2, 0, 2.08, M.door, { pick: false });
  leaf(3.06, 1.25, 3.1, 1.98); leaf(6.65, 1.45, 7.38, 1.49); leaf(7.75, 1.7, 8.5, 1.74); leaf(6.75, 4.65, 6.79, 5.45); leaf(10.0, 4.65, 10.04, 5.45);
}

/* Mobilier : chaque élément porte un rôle de matériau, changé par l'ambiance */
function F(x1, z1, x2, z2, y1, y2, role) { return box(x1, z1, x2, z2, y1, y2, R[role] || role, { parent: furniture }); }
function FC(x1, z1, x2, z2, y1, y2, role) { furnitureColliders.push({ x1, z1, x2, z2 }); return F(x1, z1, x2, z2, y1, y2, role); }
function cyl(x, z, r1, r2, y1, y2, mat, parent = furniture, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, y2 - y1, seg), mat);
  m.position.set(x, (y1 + y2) / 2, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function pendant(x, z, y, r) { cyl(x, z, r * .35, r, y - .22, y, R.shade); cyl(x, z, .006, .006, y, H, M.frame); }
function plant(x, z, s, mat, potMat) { cyl(x, z, .22 * s, .17 * s, 0, .45 * s, potMat); const p = new THREE.Mesh(new THREE.SphereGeometry(.32 * s, 12, 10), mat); p.position.set(x, .8 * s, z); p.scale.y = 1.35; p.castShadow = true; furniture.add(p); }
function buildFurniture() {
  // séjour
  FC(3.0, 4.75, 5.4, 5.65, 0, .42, "fabric"); F(3.0, 4.75, 5.4, 4.98, .42, .85, "fabric"); F(3.0, 4.98, 3.22, 5.65, .42, .62, "fabric"); F(5.18, 4.98, 5.4, 5.65, .42, .62, "fabric");
  F(3.4, 5.0, 3.9, 5.12, .42, .78, "cushion"); F(4.6, 5.0, 5.1, 5.12, .42, .78, "cushion");
  F(2.7, 4.9, 5.7, 7.05, 0, .012, "rug");
  FC(3.65, 6.0, 4.85, 6.6, 0, .38, "wood");
  FC(5.6, 6.05, 6.3, 6.75, 0, .45, "fabric"); F(5.6, 6.55, 6.3, 6.75, .45, .82, "fabric");
  F(6.12, 4.7, 6.52, 6.5, 0, .5, "wood"); box(6.49, 5.0, 6.52, 6.2, .9, 1.6, M.screen, { parent: furniture });
  cyl(2.85, 5.0, .16, .16, 0, .03, R.metal); cyl(2.85, 5.0, .012, .012, .03, 1.5, R.metal); cyl(2.85, 5.0, .1, .2, 1.4, 1.65, R.shade);
  // salle à manger
  FC(0.8, 5.4, 2.5, 6.4, .72, .76, "wood"); [[0.9, 5.5], [2.36, 5.5], [0.9, 6.26], [2.36, 6.26]].forEach(([x, z]) => F(x, z, x + .04, z + .04, 0, .72, "wood"));
  [[1.0, 4.98, 0], [1.9, 4.98, 0], [1.0, 6.42, 1], [1.9, 6.42, 1]].forEach(([x, z, back]) => {
    F(x, z, x + .45, z + .42, .44, .48, "fabric");
    F(x + .02, z + (back ? .38 : 0), x + .43, z + (back ? .42 : .04), .48, .9, "wood");
    [[0, 0], [.41, 0], [0, .38], [.41, .38]].forEach(([a, b]) => F(x + a, z + b, x + a + .04, z + b + .04, 0, .44, "wood"));
  });
  pendant(1.65, 5.9, 1.95, .28);
  // cuisine
  FC(0.15, 2.48, 2.95, 3.08, 0, .88, "kitchen"); F(0.13, 2.46, 2.97, 3.1, .88, .92, "counter"); F(0.15, 2.48, 2.95, 2.82, 1.45, 2.2, "kitchen");
  box(1.3, 2.6, 1.9, 2.95, .92, .935, M.screen, { parent: furniture }); box(2.2, 2.6, 2.6, 2.9, .935, .95, M.chrome, { parent: furniture });
  FC(0.17, 3.08, 0.75, 3.68, 0, 2.2, "kitchen");
  FC(0.8, 3.7, 2.5, 4.4, 0, .88, "kitchen"); F(0.75, 3.65, 2.55, 4.45, .88, .92, "counter");
  [1.1, 1.65, 2.2].forEach((x) => { cyl(x, 4.62, .17, .17, .62, .66, R.fabric); cyl(x, 4.62, .02, .02, 0, .62, R.metal); });
  pendant(1.25, 4.05, 1.85, .16); pendant(2.05, 4.05, 1.85, .16);
  // entrée
  FC(4.45, 0.2, 4.85, 1.6, 0, 2.2, "wood"); F(3.1, 2.0, 3.6, 2.3, 0, .9, "wood");
  // chambre 3
  FC(0.12, 0.12, 1.05, 2.05, 0, .45, "wood"); F(0.14, 0.14, 1.03, 2.03, .45, .55, "linen"); F(0.12, 0.12, 1.05, 0.2, .45, .95, "wood");
  FC(2.0, 0.15, 2.9, 0.75, .74, .78, "wood"); F(2.05, .2, 2.1, .7, 0, .74, "metal"); F(2.8, .2, 2.85, .7, 0, .74, "metal");
  pendant(1.5, 1.2, 2.2, .18);
  // salle de bains
  FC(5.0, 0.2, 6.5, 0.95, 0, .55, M.white);
  FC(5.0, 1.6, 5.55, 2.3, 0, .85, "kitchen"); F(5.0, 1.65, 5.5, 2.25, .85, .9, M.white);
  // WC
  F(6.95, 0.15, 7.35, 0.65, 0, .42, M.white); F(6.9, 0.12, 7.4, 0.26, .42, .85, M.white);
  // chambre 2
  FC(9.95, 0.15, 11.45, 2.15, 0, .45, "wood"); F(9.97, 0.17, 11.43, 2.13, .45, .56, "linen"); F(11.35, 0.15, 11.45, 2.15, .45, 1.1, "wood");
  F(10.2, 0.25, 11.2, 0.75, .56, .62, "cushion");
  FC(7.85, 0.15, 9.2, 0.75, 0, 2.3, "wood");
  pendant(9.6, 1.3, 2.2, .2);
  // dressing
  FC(7.8, 2.7, 9.4, 3.2, 0, 2.3, "wood"); FC(7.8, 3.2, 8.2, 4.5, 0, 2.3, "wood");
  // salle d'eau
  F(10.3, 2.7, 11.4, 3.7, 0, .05, M.white); box(10.3, 3.7, 10.32, 4.4, .05, 2.0, M.glass, { parent: furniture, cast: false, pick: false });
  FC(9.6, 3.9, 10.2, 4.45, 0, .85, "kitchen"); F(9.58, 3.88, 10.22, 4.47, .85, .9, M.white);
  // suite parentale
  FC(9.6, 5.1, 11.4, 7.1, 0, .42, "wood"); F(9.62, 5.12, 11.38, 7.08, .42, .58, "linen"); F(11.32, 5.0, 11.48, 7.2, .2, 1.25, "fabric");
  F(10.5, 5.2, 11.3, 7.0, .58, .6, "cushion"); F(10.9, 5.3, 11.28, 6.9, .58, .72, "linen");
  F(11.0, 4.72, 11.45, 5.05, 0, .5, "wood"); F(11.0, 7.15, 11.45, 7.45, 0, .5, "wood");
  F(9.0, 5.4, 9.45, 6.8, 0, .45, "fabric");
  F(8.8, 5.0, 11.3, 7.2, 0, .012, "rug");
  pendant(10.3, 6.1, 2.15, .3);
  [[11.2, 4.88], [11.2, 7.3]].forEach(([x, z]) => cyl(x, z, .08, .12, .5, .75, R.shade));
  // terrasse
  FC(1.0, 8.2, 2.2, 9.0, .7, .74, "outdoor"); [[1.05, 8.25], [2.11, 8.25], [1.05, 8.91], [2.11, 8.91]].forEach(([x, z]) => F(x, z, x + .04, z + .04, 0, .7, "outdoor"));
  F(0.5, 8.4, 0.9, 8.85, .42, .46, "outdoor"); F(0.5, 8.4, 0.54, 8.85, .46, .85, "outdoor");
  F(2.3, 8.4, 2.7, 8.85, .42, .46, "outdoor"); F(2.66, 8.4, 2.7, 8.85, .46, .85, "outdoor");
  FC(4.5, 8.0, 6.3, 8.7, 0, .32, "outdoor"); F(4.5, 8.0, 6.3, 8.7, .32, .4, "cushion"); F(4.5, 8.0, 4.8, 8.7, .4, .7, "cushion");
  [[0.3, 9.15], [6.9, 9.15], [11.25, 9.15], [11.25, 7.95]].forEach(([x, z]) => plant(x, z, 1, M.leaf, R.metal));
  [[0.4, 7.2], [6.25, 4.25]].forEach(([x, z]) => plant(x, z, 1, M.leaf2, R.accent));
}

/* Extérieur : cœur d'îlot paysager (bouleaux), immeubles lointains */
const streetBulbs = [];
function buildOutside() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.lawn);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -9.6; ground.receiveShadow = true; scene.add(ground);
  const out = new THREE.Group(); out.rotation.y = YAW; scene.add(out);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 90), M.path); path.rotation.x = -Math.PI / 2; path.position.set(5.8, -9.58, 40); out.add(path);
  const r = rnd(21);
  for (let i = 0; i < 46; i++) {
    const x = -30 + r() * 72, z = 13 + r() * 45; if (Math.abs(x - 5.8) < 3) continue;
    const h = 7 + r() * 6;
    cyl(x, z, .14, .2, -9.6, -9.6 + h * .55, M.trunk, out, 8);
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.6 + r() * 1.2, 10, 8), r() > .5 ? M.leaf : M.leaf2);
    c.position.set(x, -9.6 + h * .72, z); c.scale.y = 1.5; c.castShadow = true; out.add(c);
  }
  [[-30, 70, 26, 14, 16], [12, 78, 30, 14, 13], [45, 55, 14, 26, 19]].forEach(([x, z, w, d, h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.neighbor); m.position.set(x, -9.6 + h / 2, z); out.add(m);
  });
  for (let i = 0; i < 5; i++) {
    const z = 14 + i * 9; cyl(4.0, z, .05, .05, -9.6, -6.0, M.frame, out, 6);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffcf8a", emissiveIntensity: 0 }));
    bulb.position.set(4.0, -5.9, z); out.add(bulb); streetBulbs.push(bulb);
  }
}

/* ---------- Lumières ---------- */
const hemi = new THREE.HemisphereLight("#bcd6ee", "#8a8069", 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight("#ffffff", 3); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 90 });
scene.add(sun); scene.add(sun.target);
const interior = [], exterior = [];
function addInteriorLights() {
  [[3.6, 2.3, 5.6], [1.6, 2.3, 3.5], [4.0, 2.3, 1.2], [1.5, 2.3, 1.2], [5.7, 2.3, 1.2], [7.1, 2.3, 3.0], [9.6, 2.3, 1.3], [10.3, 2.3, 6.1], [10.5, 2.3, 3.6], [8.6, 2.3, 3.6]]
    .forEach(([x, y, z]) => { const l = new THREE.PointLight("#ffd6a3", 0, 0, 2); l.position.set(x, y, z); apt.add(l); interior.push(l); });
  [[1.5, 7.8], [6.5, 7.8], [10.2, 7.8]].forEach(([x, z]) => {
    const l = new THREE.PointLight("#ffc98a", 0, 0, 2); l.position.set(x, 2.3, z + .15); apt.add(l); exterior.push(l);
    box(x - .08, z - .02, x + .08, z + .05, 2.25, 2.4, M.frame, { pick: false });
  });
}
const skyDay = new THREE.Color("#a9cbe8"), skyDusk = new THREE.Color("#e9a57e"), skyNight = new THREE.Color("#0b1526"), white = new THREE.Color("#ffffff");
function updateLight() {
  const s = SEASONS[state.season], p = sunPos(s.doy, state.hour, s.tz);
  const e = p.elev, a = p.az * deg;
  const dir = new THREE.Vector3(Math.cos(e * deg) * Math.sin(a), Math.sin(e * deg), -Math.cos(e * deg) * Math.cos(a));
  const center = apt.localToWorld(new THREE.Vector3(5.8, 1, 5));
  sun.target.position.copy(center); sun.position.copy(center).addScaledVector(dir, 40);
  const day = smooth(-6, 12, e), low = 1 - smooth(4, 28, e);
  sun.intensity = e > 0 ? 3.2 * smooth(0, 8, e) : 0;
  sun.color.setRGB(1, lerp(.97, .62, low), lerp(.92, .38, low));
  hemi.intensity = lerp(.07, 1.5, day);
  const sky = skyNight.clone().lerp(skyDusk, smooth(-8, 2, e)).lerp(skyDay, smooth(2, 18, e));
  scene.background = sky; hemi.color.copy(sky).lerp(white, .35);
  hemi.groundColor.set(day > .5 ? "#8a8069" : "#2a2a30");
  const night = 1 - smooth(-4, 6, e);
  interior.forEach((l) => (l.intensity = night * 14));
  exterior.forEach((l) => (l.intensity = night * 6));
  R.shade.emissive.set("#ffcf99"); R.shade.emissiveIntensity = night * (state.amb === "contemp" ? .6 : 1.2);
  streetBulbs.forEach((b) => (b.material.emissiveIntensity = night * 3));
  renderer.toneMappingExposure = lerp(1.45, 1.0, day);
  return p;
}

/* ---------- Finitions et ambiances ---------- */
function applyFinishes() {
  const pick = (k) => FIN[k].items.find((i) => i.id === (state.livre ? DEFAULTS[k] : state.fin[k]));
  const setTex = (mat, it) => { mat.map = it.tex || null; mat.color.set(it.tex ? "#ffffff" : it.color); mat.needsUpdate = true; };
  setTex(M.floorNuit, pick("solsNuit")); setTex(M.floorJour, pick("solsJour")); setTex(M.faience, pick("faience")); setTex(M.wall, pick("murs"));
}
function applyAmbiance() {
  const a = AMB[state.amb];
  ROLES.forEach((k) => { const [c, r, m] = a[k]; R[k].color.set(c); R[k].roughness = r; R[k].metalness = m; R[k].map = null; R[k].needsUpdate = true; });
  if (state.amb === "contemp") { R.counter.map = counterMarble; R.counter.color.set("#ffffff"); }
  furniture.visible = !state.livre;
  $$("[data-amb]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.amb === state.amb)));
  updateLight();
}

/* ---------- Visiteur (repère du plan) ---------- */
const player = { x: 4.0, z: 0.7, yaw: 0, pitch: 0, eye: 1.65 };
const RADIUS = 0.25;
function blocked(x, z) {
  for (const c of colliders) if (x > c.x1 - RADIUS && x < c.x2 + RADIUS && z > c.z1 - RADIUS && z < c.z2 + RADIUS) return true;
  if (furniture.visible) for (const c of furnitureColliders) if (x > c.x1 - .12 && x < c.x2 + .12 && z > c.z1 - .12 && z < c.z2 + .12) return true;
  return x < -0.5 || x > 12 || z < -0.5 || z > 9.8;
}
function moveBy(dx, dz) {
  if (!blocked(player.x + dx, player.z)) player.x += dx;
  if (!blocked(player.x, player.z + dz)) player.z += dz;
}
function syncCamera() {
  camera.position.copy(apt.localToWorld(new THREE.Vector3(player.x, player.eye, player.z)));
  camera.rotation.set(player.pitch, player.yaw + YAW, 0, "YXZ");
}
function lookAngles(px, pz, eye, t) {
  const dx = t[0] - px, dy = t[1] - eye, dz = t[2] - pz;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
const calm = () => $("#optCalm").checked;
let tween = null;
function goTo(pos, target, dur = 2.2) {
  const end = { x: pos[0], z: pos[2], ...lookAngles(pos[0], pos[2], player.eye, target) };
  if (tween && tween.res) tween.res();
  if (calm() || dur === 0) { Object.assign(player, end); tween = null; return Promise.resolve(); }
  const start = { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch };
  const dy = Math.atan2(Math.sin(end.yaw - start.yaw), Math.cos(end.yaw - start.yaw));
  return new Promise((res) => { tween = { start, end: { ...end, yaw: start.yaw + dy }, t: 0, dur, res }; });
}

/* ---------- Points d'intérêt ---------- */
const POIS = [
  { id: "entree", name: "Entrée", pos: [4.0, 0, 0.75], look: [3.4, 1.4, 5.5], mark: [3.9, 1.5, 1.9],
    meta: "≈ 4,6 m² · accès palier", text: "L'entrée s'ouvre directement sur le séjour, avec un placard de rangement intégré.", list: ["Rangements intégrés", "Accès direct au séjour et à la chambre 3"] },
  { id: "salon", name: "Salon", pos: [6.1, 0, 3.0], look: [2.4, 1.2, 7.3], mark: [4.2, 1.3, 6.3],
    meta: "Séjour-cuisine ≈ 34 m² · baie sud-ouest", text: "Un séjour lumineux, ouvert sur 22 m² de terrasse. La baie coulissante fait entrer la lumière de l'après-midi et du soir.", list: ["Baie vitrée sur toute la largeur", "Accès direct à la terrasse", "Cuisine ouverte"] },
  { id: "cuisine", name: "Cuisine", pos: [2.6, 0, 5.1], look: [1.3, 1.0, 2.6], mark: [1.6, 1.4, 3.4],
    meta: "Cuisine ouverte sur le séjour", text: "Cuisine en L avec îlot, ouverte sur la salle à manger. Essayez les sols et les murs avec le bouton « Sols et murs ».", list: ["Aménagement de cuisine présenté à titre décoratif : à vérifier dans la notice", "Emplacements électroménager", "Ouverture sur la salle à manger"] },
  { id: "terrasse", name: "Terrasse", pos: [3.0, 0, 8.55], look: [3.0, .2, 22], mark: [5.4, 1.2, 8.9],
    meta: "22 m² · plein sud-ouest", text: "La terrasse prolonge le séjour et la suite. Faites glisser le curseur de l'heure pour suivre le soleil jusqu'au coucher.", list: ["Garde-corps vitré", "Débord protecteur au-dessus", "Vue sur le cœur d'îlot paysager"] },
  { id: "suite", name: "Suite parentale", pos: [7.15, 0, 5.05], look: [10.6, 1.0, 6.9], mark: [9.2, 1.4, 6.2],
    meta: "Chambre ≈ 15 m² · dressing ≈ 3,6 m² · salle d'eau ≈ 4,2 m²", text: "Une suite à part, avec dressing et salle d'eau privative, ouverte elle aussi sur la terrasse.", list: ["Parquet", "Faïence toute hauteur dans la salle d'eau", "Baie sur la terrasse"] },
  { id: "chambres", name: "Chambres 2 et 3", pos: [7.15, 0, 2.1], look: [10.5, 1.1, 1.0], mark: [9.6, 1.4, 1.4],
    meta: "Chambre 2 ≈ 10 m² · chambre 3 ≈ 7 m²", text: "Deux chambres pour les enfants, les invités ou un bureau.", list: ["Parquet", "Placard dans la chambre 2"] },
];
const panel = $("#panel");
function openPanel(html) {
  panel.innerHTML = '<button class="vv-close" type="button" aria-label="Fermer">×</button>' + html; panel.hidden = false;
  panel.querySelector(".vv-close").onclick = () => { panel.hidden = true; $("#btnMats").setAttribute("aria-pressed", "false"); };
  $("#btnMats").setAttribute("aria-pressed", "false");
  return panel;
}
function showPoi(poi) {
  openPanel(`<h2>${poi.name}</h2><p class="meta">${poi.meta} · surfaces indicatives</p><p>${poi.text}</p><ul>${poi.list.map((l) => `<li>${l}</li>`).join("")}</ul><button type="button" class="vv-btn" id="persoBtn">Personnaliser cette pièce</button>`);
  $("#persoBtn").onclick = showMats;
  $$("#poiList button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.poi === poi.id)));
}
function visitPoi(poi) { stopGuide(); goTo(poi.pos, poi.look); showPoi(poi); }
const labels = POIS.map((poi) => {
  const b = document.createElement("button"); b.type = "button"; b.className = "vv-poi-label"; b.textContent = poi.name; b.hidden = true;
  b.onclick = () => visitPoi(poi); document.body.appendChild(b);
  const l = document.createElement("button"); l.type = "button"; l.textContent = poi.name; l.dataset.poi = poi.id; l.onclick = () => visitPoi(poi); $("#poiList").appendChild(l);
  return b;
});

/* ---------- Panneau matériaux ---------- */
function showMats() {
  const blocks = Object.entries(FIN).map(([k, f]) => `<div class="vv-mats"><h3>${f.label}</h3><div class="vv-swatches">${f.items.map((i) =>
    `<button type="button" class="vv-sw" data-k="${k}" data-id="${i.id}" aria-pressed="${state.fin[k] === i.id}"><i style="${i.tex ? `background-image:url(${i.tex.userData.url})` : `background:${i.color}`}"></i>${i.name}<br><span class="tag ${i.tag}">${TAGS[i.tag]}</span></button>`).join("")}</div></div>`).join("");
  openPanel(`<h2>Sols et murs</h2><p class="meta">Le statut de chaque finition est indiqué. Seules les finitions « Inclus » font partie de la livraison, sous réserve de la notice descriptive.</p>${blocks}<p style="margin-top:12px"><button type="button" class="vv-btn" id="resetFin">Revenir aux finitions incluses</button></p>`);
  $("#btnMats").setAttribute("aria-pressed", "true");
  panel.querySelectorAll(".vv-sw").forEach((b) => (b.onclick = () => { state.fin[b.dataset.k] = b.dataset.id; if (state.livre) setLivre(false); applyFinishes(); updateRdvLink(); showMats(); }));
  $("#resetFin").onclick = () => { state.fin = { ...DEFAULTS }; applyFinishes(); updateRdvLink(); showMats(); };
}
function setLivre(v) { state.livre = v; $("#btnLivre").setAttribute("aria-pressed", String(v)); applyFinishes(); applyAmbiance(); }

/* ---------- Temps et saisons ---------- */
let info = dayInfo(state.season);
function presetHour(k) {
  if (k === "matin") return 8.5;
  if (k === "midi") return 13.5;
  if (k === "coucher") return clamp(info.set - 0.3, 6, 22.5);
  return clamp(Math.max(21.5, info.set + 0.8), 6, 23);
}
function refreshTime() {
  $("#hourOut").textContent = fmtH(state.hour);
  const p = updateLight(), s = SEASONS[state.season];
  const sunTxt = p.elev > 0 ? `Soleil à ${Math.round(p.elev)}° au-dessus de l'horizon, azimut ${Math.round(p.az)}°` : "Soleil couché";
  const dir = info.first !== null ? `soleil direct sur la façade de la terrasse de <strong>${fmtH(info.first)}</strong> à <strong>${fmtH(info.last)}</strong> (≈ ${info.hours.toFixed(1).replace(".", ",")} h)` : "pas de soleil direct sur la façade ce jour-là";
  $("#sunInfo").innerHTML = `<strong>${s.label}</strong> · lever ${fmtH(info.rise)}, coucher ${fmtH(info.set)} · ${dir}<br>${sunTxt} · midi solaire ${fmtH(info.noonH)} (hauteur max. ${Math.round(info.noonE)}°)`;
  $$("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", String(Math.abs(presetHour(b.dataset.preset) - state.hour) < 0.13)));
}
function setHour(h) { state.hour = clamp(h, 6, 23); $("#hour").value = state.hour; refreshTime(); }
function setSeason(k) { state.season = k; info = dayInfo(k); $$("[data-season]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.season === k))); refreshTime(); }
let hourAnim = null;
function animateHour(to, dur) {
  if (hourAnim && hourAnim.res) hourAnim.res();
  if (calm()) { setHour(to); hourAnim = null; return Promise.resolve(); }
  return new Promise((res) => (hourAnim = { from: state.hour, to, t: 0, dur, res }));
}

/* ---------- Visite guidée ---------- */
let guide = null;
const caption = $("#caption");
function say(text, buttons = true) {
  caption.hidden = false;
  caption.innerHTML = `<div>${text}</div>` + (buttons ? '<div style="margin-top:8px;display:flex;gap:8px;justify-content:center"><button type="button" class="vv-btn" id="gNext">Suivant</button><button type="button" class="vv-btn" id="gStop">Explorer librement</button></div>' : "");
  if (buttons) { $("#gNext").onclick = () => guide && guide.skip && guide.skip(); $("#gStop").onclick = stopGuide; }
  if ($("#optVoice").checked && "speechSynthesis" in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, "")); u.lang = "fr-FR"; speechSynthesis.speak(u); }
}
function stopGuide() {
  if (!guide) return; const g = guide; guide = null; g.stopped = true; g.skip && g.skip();
  caption.hidden = true; if ("speechSynthesis" in window) speechSynthesis.cancel();
}
async function runGuide() {
  stopGuide(); panel.hidden = true; setMeasure(false);
  const g = (guide = { stopped: false });
  const step = (ms) => new Promise((res) => { const t = setTimeout(res, calm() ? Math.min(ms, 3500) : ms); g.skip = () => { clearTimeout(t); res(); }; });
  const P = (id) => POIS.find((p) => p.id === id);
  state.amb = "scandi"; state.livre = false; $("#btnLivre").setAttribute("aria-pressed", "false"); applyFinishes(); applyAmbiance(); setSeason("printemps"); setHour(13.5);
  const steps = [
    async () => { Object.assign(player, { x: 4.0, z: 0.45 }, lookAngles(4.0, 0.45, 1.65, [3.6, 1.4, 6])); say("Bienvenue aux Jardins d'Armance. Entrez dans votre futur T4."); await step(5000); },
    async () => { goTo(P("salon").pos, P("salon").look, 3); showPoi(P("salon")); say("82 m² pensés pour la vie de famille, avec un séjour ouvert sur 22 m² de terrasse."); await step(9000); },
    async () => { await goTo(P("cuisine").pos, P("cuisine").look, 2.5); if (g.stopped) return; say("La cuisine s'ouvre sur le séjour. Changez les finitions d'un clic : le statut de chaque option est indiqué."); showMats(); await step(4000); if (g.stopped) return; state.fin.solsJour = "beton-cire"; applyFinishes(); showMats(); await step(5000); state.fin.solsJour = DEFAULTS.solsJour; applyFinishes(); panel.hidden = true; },
    async () => { await goTo(P("terrasse").pos, P("terrasse").look, 3); if (g.stopped) return; showPoi(P("terrasse")); say("Plein sud-ouest : le soleil vous accompagne jusqu'au soir."); await animateHour(clamp(info.set - .3, 13.5, 22), 7); await step(2500); },
    async () => { await goTo([3.0, 0, 8.4], [3.4, 1.0, 3.5], 2); if (g.stopped) return; panel.hidden = true; setSeason("ete"); setHour(13.5); say("En été, le soleil est haut : le débord protège le séjour de la chaleur."); await step(5500); if (g.stopped) return; setSeason("hiver"); setHour(13.5); say("En hiver, le soleil bas entre jusqu'au fond du séjour."); await step(6500); setSeason("printemps"); },
    async () => { setHour(presetHour("nuit")); await goTo(P("suite").pos, P("suite").look, 3); if (g.stopped) return; showPoi(P("suite")); say("Une suite à part, avec dressing et salle d'eau. Le soir, l'éclairage devient chaleureux."); await step(4500); if (g.stopped) return; state.amb = "contemp"; applyAmbiance(); say("Et voici la même pièce dans l'ambiance Chic Contemporain."); await step(5000); },
    async () => { setHour(13.5); await goTo(P("chambres").pos, P("chambres").look, 2.5); if (g.stopped) return; showPoi(P("chambres")); say("Deux chambres, pour les enfants ou un bureau."); await step(5500); },
    async () => {
      setHour(presetHour("nuit")); await goTo([6.2, 0, 7.0], [1.2, 1.0, 3.0], 3); if (g.stopped) return; summary();
      say("Ce lot vous plaît ? Un conseiller vous présente le plan et sa disponibilité.", false);
      caption.insertAdjacentHTML("beforeend", '<div style="margin-top:8px;display:flex;gap:8px;justify-content:center"><a class="vv-btn brass" href="' + $("#btnRdv").getAttribute("href") + '">Prendre rendez-vous</a><button type="button" class="vv-btn" id="gEnd">Explorer librement</button></div>');
      $("#gEnd").onclick = () => { guide = null; caption.hidden = true; };
    },
  ];
  for (const s of steps) { if (g.stopped) return; await s(); }
}
function choicesText() {
  const n = (k) => FIN[k].items.find((i) => i.id === state.fin[k]).name;
  return `${AMB[state.amb].name} ; sols séjour : ${n("solsJour")} ; sols chambres : ${n("solsNuit")} ; faïence : ${n("faience")} ; murs : ${n("murs")}`;
}
function summary() {
  updateRdvLink();
  openPanel(`<h2>Vos choix</h2><p class="meta">Lot B31 · T4 · 82,4 m² · 419 000 € TTC hors stationnement (exemple fictif)</p><ul>${choicesText().split(" ; ").map((t) => `<li>${t}</li>`).join("")}</ul><p style="font-size:.78rem;color:var(--muted)">Les finitions « option » sont à chiffrer ; la décoration n'est pas incluse. Seule la notice descriptive fait foi.</p>`);
}
function updateRdvLink() {
  const lot = "B31 (visite 3D : " + choicesText() + ")";
  $("#btnRdv").href = "programme-exemple.html?lot=" + encodeURIComponent(lot) + "&typo=T4#rdv";
}

/* ---------- Mètre ---------- */
let measuring = false, mPts = [], mPreview = null;
const mGroup = new THREE.Group(); mGroup.renderOrder = 999; scene.add(mGroup);
const M_GOLD = "#C5A059";
const mMat = () => new THREE.MeshBasicMaterial({ color: M_GOLD, depthTest: false, transparent: true, opacity: .95 });
const fmtM = (d) => d.toFixed(2).replace(".", ",") + " m";
function placeMeasureLabel() {
  const o = $("#measureOut"), bar = document.querySelector(".vv-top");
  o.style.top = Math.round((bar ? bar.getBoundingClientRect().bottom : 60) + 10) + "px";
}
function setMeasure(v) {
  measuring = v; mPts = []; mPreview = null; mGroup.clear(); $("#btnMeasure").setAttribute("aria-pressed", String(v)); canvas.classList.toggle("measuring", v);
  const o = $("#measureOut"); o.hidden = !v; placeMeasureLabel(); o.textContent = "Mètre : cliquez sur un premier point (Échap pour quitter)";
}
function mDot(p) {
  const g = new THREE.Group(); g.position.copy(p);
  const s = new THREE.Mesh(new THREE.SphereGeometry(.06, 20, 14), mMat()); s.renderOrder = 999; g.add(s);
  mGroup.add(g); return g;
}
function mSegment(a, b) {
  const len = a.distanceTo(b); if (len < 1e-4) return null;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, len, 10), mMat()); c.renderOrder = 999;
  c.position.copy(a).add(b).multiplyScalar(.5);
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  mGroup.add(c); return c;
}
function addMeasurePoint(p) {
  if (mPts.length === 2) { mPts = []; mGroup.clear(); }
  if (mPreview) { mGroup.remove(mPreview); mPreview = null; }
  mPts.push(p.clone()); mDot(p);
  if (mPts.length === 2) {
    mSegment(mPts[0], mPts[1]);
    $("#measureOut").textContent = "Distance : " + fmtM(mPts[0].distanceTo(mPts[1])) + " — cliquez pour une nouvelle mesure";
  } else $("#measureOut").textContent = "Mètre : cliquez sur le second point";
}
function previewMeasure(e) {
  if (!measuring || mPts.length !== 1) return;
  const rect = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables.filter((m) => m.parent !== furniture || furniture.visible), false)[0];
  if (mPreview) { mGroup.remove(mPreview); mPreview = null; }
  if (!hit) return;
  mPreview = mSegment(mPts[0], hit.point); if (mPreview) mPreview.material.opacity = .55;
  $("#measureOut").textContent = "≈ " + fmtM(mPts[0].distanceTo(hit.point)) + " — cliquez pour valider";
}
addEventListener("resize", () => { if (measuring) placeMeasureLabel(); });

/* ---------- Plan 2D ---------- */
const mm = $("#minimap"), mg = mm.getContext("2d");
const MAP = { x0: -0.45, z0: -0.4, s: 32 };
function drawMap() {
  mg.clearRect(0, 0, mm.width, mm.height);
  const X = (x) => (x - MAP.x0) * MAP.s, Z = (z) => (z - MAP.z0) * MAP.s;
  ROOMS.forEach((r) => {
    mg.fillStyle = r.zone === "ext" ? "#E3E9DF" : r.zone === "eau" ? "#E6ECEF" : r.zone === "jour" ? "#F3EEE4" : "#EFE7DA";
    mg.fillRect(X(r.x1), Z(r.z1), (r.x2 - r.x1) * MAP.s, (r.z2 - r.z1) * MAP.s);
    mg.strokeStyle = "#2C3E35"; mg.lineWidth = r.zone === "ext" ? 1 : 2; mg.strokeRect(X(r.x1), Z(r.z1), (r.x2 - r.x1) * MAP.s, (r.z2 - r.z1) * MAP.s);
    mg.fillStyle = "#2C3E35"; mg.font = "600 13px Inter, sans-serif"; mg.textAlign = "center";
    if (r.x2 - r.x1 > 1.6) mg.fillText(r.name, X((r.x1 + r.x2) / 2), Z((r.z1 + r.z2) / 2) + 5);
  });
  const nx = 376, nz = 22; mg.save(); mg.translate(nx, nz); mg.rotate(-45 * deg); mg.fillStyle = "#8A6A2B"; mg.beginPath(); mg.moveTo(0, -14); mg.lineTo(6, 7); mg.lineTo(-6, 7); mg.fill(); mg.restore();
  mg.fillStyle = "#8A6A2B"; mg.font = "600 12px Inter, sans-serif"; mg.fillText("N", nx - 16, nz - 6);
  const px = X(player.x), pz = Z(player.z), ang = -player.yaw - Math.PI / 2;
  mg.fillStyle = "rgba(197,160,89,.35)"; mg.beginPath(); mg.moveTo(px, pz); mg.arc(px, pz, 34, ang - .6, ang + .6); mg.fill();
  mg.fillStyle = "#C5A059"; mg.strokeStyle = "#fff"; mg.lineWidth = 2; mg.beginPath(); mg.arc(px, pz, 7, 0, 7); mg.fill(); mg.stroke();
}
mm.addEventListener("click", (e) => {
  const r = mm.getBoundingClientRect();
  const x = (e.clientX - r.left) * (mm.width / r.width) / MAP.s + MAP.x0, z = (e.clientY - r.top) * (mm.height / r.height) / MAP.s + MAP.z0;
  const room = ROOMS.find((q) => x >= q.x1 && x <= q.x2 && z >= q.z1 && z <= q.z2); if (!room) return;
  let cx = x, cz = z;
  if (blocked(cx, cz)) { cx = (room.x1 + room.x2) / 2; cz = (room.z1 + room.z2) / 2; }
  const rr = rnd(3);
  for (let k = 0; k < 60 && blocked(cx, cz); k++) { cx = lerp(room.x1 + .35, room.x2 - .35, rr()); cz = lerp(room.z1 + .35, room.z2 - .35, rr()); }
  stopGuide(); goTo([cx, 0, cz], [cx - Math.sin(player.yaw), player.eye, cz - Math.cos(player.yaw)], 1.2);
});

/* ---------- Commandes ---------- */
const keys = new Set();
const keyOf = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
const MOVE_KEYS = ["z", "w", "q", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Shift"];
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  const k = keyOf(e);
  if (MOVE_KEYS.includes(k)) { keys.add(k); if (k.startsWith("Arrow")) e.preventDefault(); if (k !== "Shift") { stopGuide(); tween = null; } }
  if (k === "Escape") { stopGuide(); setMeasure(false); panel.hidden = true; }
});
addEventListener("keyup", (e) => keys.delete(keyOf(e)));
addEventListener("blur", () => keys.clear());
let drag = null;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, moved: 0, yaw: player.yaw, pitch: player.pitch }; });
canvas.addEventListener("pointermove", (e) => {
  if (!drag) { previewMeasure(e); return; } const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
  if (drag.moved > 4) { tween = null; player.yaw = drag.yaw + dx * 0.0042; player.pitch = clamp(drag.pitch + dy * 0.0035, -1.2, 1.2); }
});
canvas.addEventListener("pointerup", (e) => {
  const d = drag; drag = null;
  if (!d || d.moved > (measuring ? 10 : 4)) return;
  const rect = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const targets = pickables.filter((m) => m.parent !== furniture || furniture.visible);
  const hit = ray.intersectObjects(targets, false)[0];
  if (measuring) { if (hit) addMeasurePoint(hit.point); return; }
  if (hit && floors.includes(hit.object)) {
    const l = apt.worldToLocal(hit.point.clone());
    if (!blocked(l.x, l.z)) { stopGuide(); goTo([l.x, 0, l.z], [l.x - Math.sin(player.yaw), player.eye + Math.tan(player.pitch), l.z - Math.cos(player.yaw)], Math.min(2, .4 + Math.hypot(l.x - player.x, l.z - player.z) / 3)); }
  }
});
$$(".vv-pad [data-move]").forEach((b) => {
  const k = { f: "ArrowUp", b: "ArrowDown", l: "ArrowLeft", r: "ArrowRight" }[b.dataset.move];
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); keys.add(k); stopGuide(); tween = null; });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => keys.delete(k)));
});
if (matchMedia("(pointer:coarse)").matches) document.body.classList.add("touch");

$("#hour").addEventListener("input", (e) => { if (hourAnim && hourAnim.res) hourAnim.res(); hourAnim = null; setHour(parseFloat(e.target.value)); });
$$("[data-preset]").forEach((b) => (b.onclick = () => animateHour(presetHour(b.dataset.preset), 2.5)));
$$("[data-season]").forEach((b) => (b.onclick = () => setSeason(b.dataset.season)));
$$("[data-amb]").forEach((b) => (b.onclick = () => { state.amb = b.dataset.amb; if (state.livre) setLivre(false); applyAmbiance(); updateRdvLink(); }));
$("#btnMats").onclick = () => { if ($("#btnMats").getAttribute("aria-pressed") === "true") { panel.hidden = true; $("#btnMats").setAttribute("aria-pressed", "false"); } else showMats(); };
$("#btnLivre").onclick = () => setLivre(!state.livre);
const cmp = $("#btnCompare"); let cmpPrev = null;
const cmpOn = (e) => { e.preventDefault(); if (cmpPrev !== null) return; cmpPrev = state.livre; setLivre(true); cmp.setAttribute("aria-pressed", "true"); };
const cmpOff = () => { if (cmpPrev === null) return; setLivre(cmpPrev); cmpPrev = null; cmp.setAttribute("aria-pressed", "false"); };
cmp.addEventListener("pointerdown", cmpOn); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => cmp.addEventListener(ev, cmpOff));
cmp.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") cmpOn(e); }); cmp.addEventListener("keyup", cmpOff);
$("#btnMeasure").onclick = () => setMeasure(!measuring);
$("#btnGuide").onclick = runGuide;
$("#btnMap").onclick = () => { const on = !$("#mapCard").classList.contains("open"); $("#mapCard").classList.toggle("open", on); $("#poiList").classList.toggle("open", on); $("#btnMap").setAttribute("aria-pressed", String(on)); };
$("#btnFull").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); };
$("#btnSave").onclick = () => {
  try { localStorage.setItem("vv-choix", JSON.stringify({ ambiance: state.amb, finitions: state.fin, date: new Date().toISOString().slice(0, 10) })); } catch (e) { /* stockage indisponible */ }
  summary();
  panel.insertAdjacentHTML("beforeend", '<p style="font-size:.82rem">Vos choix sont gardés sur cet appareil. Ils seront joints à votre demande si vous prenez rendez-vous.</p><a class="vv-btn brass" href="' + $("#btnRdv").getAttribute("href") + '">Prendre rendez-vous</a>');
};
try {
  const saved = JSON.parse(localStorage.getItem("vv-choix") || "null");
  if (saved && AMB[saved.ambiance]) { state.amb = saved.ambiance; Object.keys(DEFAULTS).forEach((k) => { if (saved.finitions && FIN[k].items.some((i) => i.id === saved.finitions[k])) state.fin[k] = saved.finitions[k]; }); }
} catch (e) { /* rien */ }

/* ---------- Boucle ---------- */
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener("resize", resize);
const clock = new THREE.Clock(); let frame = 0;
const v3 = new THREE.Vector3();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05); frame++;
  if (tween) {
    tween.t += dt / tween.dur; const k = smooth(0, 1, tween.t);
    player.x = lerp(tween.start.x, tween.end.x, k); player.z = lerp(tween.start.z, tween.end.z, k);
    player.yaw = lerp(tween.start.yaw, tween.end.yaw, k); player.pitch = lerp(tween.start.pitch, tween.end.pitch, k);
    if (tween.t >= 1) { const r = tween.res; tween = null; r(); }
  }
  if (hourAnim) { hourAnim.t += dt / hourAnim.dur; setHour(lerp(hourAnim.from, hourAnim.to, smooth(0, 1, hourAnim.t))); if (hourAnim && hourAnim.t >= 1) { const r = hourAnim.res; hourAnim = null; r(); } }
  let f = 0, s = 0;
  if (keys.has("z") || keys.has("w") || keys.has("ArrowUp")) f += 1;
  if (keys.has("s") || keys.has("ArrowDown")) f -= 1;
  if (keys.has("q") || keys.has("a")) s -= 1;
  if (keys.has("d")) s += 1;
  if (keys.has("ArrowLeft")) player.yaw += 1.8 * dt;
  if (keys.has("ArrowRight")) player.yaw -= 1.8 * dt;
  if (f || s) {
    const sp = (keys.has("Shift") ? 2.4 : 1.2) * dt, sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    moveBy((-sy * f + cy * s) * sp, (-cy * f - sy * s) * sp);
  }
  syncCamera();
  if (frame % 3 === 0) drawMap();
  if (frame % 2 === 0) POIS.forEach((poi, i) => {
    const w = apt.localToWorld(v3.set(...poi.mark)); const d = w.distanceTo(camera.position);
    const pr = w.clone().project(camera); const lbl = labels[i];
    let vis = pr.z < 1 && Math.abs(pr.x) < 1.05 && Math.abs(pr.y) < 1.05 && d > 1.2 && d < 9 && !guide;
    if (vis && frame % 10 === 0) { ray.set(camera.position, w.clone().sub(camera.position).normalize()); const h = ray.intersectObjects(pickables, false)[0]; lbl.dataset.occ = h && h.distance < d - .4 ? "1" : ""; }
    if (lbl.dataset.occ) vis = false;
    lbl.hidden = !vis; if (vis) { lbl.style.left = ((pr.x + 1) / 2) * innerWidth + "px"; lbl.style.top = ((1 - pr.y) / 2) * innerHeight + "px"; }
  });
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

/* ---------- Démarrage ---------- */
buildApartment(); buildFurniture(); buildOutside(); addInteriorLights();
applyFinishes(); applyAmbiance(); setSeason(state.season); setHour(state.hour); updateRdvLink();
Object.assign(player, lookAngles(player.x, player.z, player.eye, [3.6, 1.4, 6]));
resize(); loop();
$("#loading").textContent = "Maquette prête.";
["startGuide", "startFree"].forEach((id) => ($("#" + id).disabled = false));
$("#startGuide").onclick = () => { $("#start").hidden = true; runGuide(); };
$("#startFree").onclick = () => { $("#start").hidden = true; canvas.focus(); };
if (location.hash === "#libre") $("#start").hidden = true;
window.__vv = { state, player, setHour, setSeason, applyAmbiance, setLivre, runGuide, stopGuide, goTo, POIS, dayInfo, sunPos, showMats, visitPoi };
