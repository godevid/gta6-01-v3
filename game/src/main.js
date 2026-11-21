// NEON TIDE — main loop. Boots the city, reads the keyboard and mouse, steps the
// world (player, traffic, police, pedestrians, missions, combat) and paints it.
// The whole game is plain ES modules and a 2D canvas: no libraries, no network.

import { buildCity, collideBuildings, districtAt, makeRng, nearestNode, onRoad } from './city.js';
import { makeCar, spawnParkedCars, spawnTraffic, drivePlayerCar, updateTrafficCar, updatePoliceCar, carOverlaps, pushCarsApart, nearestCar, SPORT_COLORS, CAR_COLORS } from './cars.js';
import { makePed, makeCop, updatePed, updateCop, updateRival } from './people.js';
import { MISSIONS, missionState, packageSpots, startMission, updateMission, currentObjective, taxiState, updateTaxi } from './missions.js';
import { combatState, fireBullet, punch, updateBullets, damagePlayer, busted, updateWanted, respawnAfterIncident, addWanted } from './combat.js';
import { makeAudio } from './audio.js';
import { loadSave, writeSave, applySave, clearSave } from './save.js';
import { renderWorld, drawHUD, drawTitle, drawEndScreen, drawPaused, skyState } from './hud.js';
import { shotName, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  canvas.width = Math.floor(window.innerWidth * (window.devicePixelRatio || 1));
  canvas.height = Math.floor(window.innerHeight * (window.devicePixelRatio || 1));
  ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const S = {
  mode: 'title',
  time: 0,
  timeOfDay: 10.5,
  rng: makeRng(20261121),
  city: null,
  player: {
    x: 1400, y: 1000, angle: 0, onFoot: true, car: null,
    health: 100, armor: 0, ammo: 24, speed: 0,
  },
  cam: { x: 1400, y: 1000 },
  cars: [], policeCars: [], peds: [], rivals: [], cops: [],
  bullets: [], particles: [],
  cash: 100, wanted: 0,
  mission: missionState(),
  taxi: taxiState(),
  packages: packageSpots(),
  stats: { missionsDone: 0, earned: 0, kills: 0, fares: 0 },
  combat: combatState(),
  audio: makeAudio(),
  keys: {},
  mouse: { x: 0, y: 0, down: false },
  fireCooldown: 0,
  dialogue: '', dialogueT: 0,
  district: 'Costa Verde',
  showHelp: false,
  hasSave: false, saveCash: 0, saveMissions: 0,
  nextMissionT: 0,
  demoDrive: false,
  sprayShops: [{ x: 600, y: 1800 }, { x: 2200, y: 600 }],
  gunShop: { x: 1000, y: 1800 },
  objective: null,
};

S.city = buildCity();
S.saveGame = () => writeSave(S);

function resetWorld() {
  S.cars = spawnParkedCars(S.city, S.rng, 16);
  S.cars.push(...spawnTraffic(S.city, S.rng, 12, S.player.x, S.player.y));
  for (const c of S.cars) c.cruise = 40 + S.rng() * 50;
  S.peds = [];
  for (let i = 0; i < 22; i++) S.peds.push(makePed(S.city, S.rng));
  S.rivals = [];
  S.cops = [];
  S.policeCars = [];
  S.bullets = [];
  S.particles = [];
  // The player's own starter car waits by the safehouse.
  const starter = makeCar(1440, 1060, 0, '#e8c33a', 'parked');
  S.cars.push(starter);
}

function startGame(continueSave) {
  const saved = loadSave();
  if (continueSave && saved) applySave(S, saved);
  else if (!continueSave) { clearSave(); }
  resetWorld();
  S.mode = 'play';
  S.audio.ensure();
  S.audio.resume();
  S.dialogue = continueSave
    ? 'Welcome back, Rio. The city missed you — press J to take the next job.'
    : 'Rio Vega, getaway driver, broke in Costa Verde. Press J to take your first job from Mara.';
  S.dialogueT = 8;
  if (!continueSave) {
    S.cash = 100;
    S.mission = missionState();
    S.packages = packageSpots();
    S.stats = { missionsDone: 0, earned: 0, kills: 0, fares: 0 };
  }
  // Auto-start the next story job shortly after arriving.
  S.nextMissionT = 4;
  const shot = shotName();
  if (shot) {
    S.mode = 'play';
    applyShot(S, shot);
    // Warm the scene up so a screenshot catches the game in motion, not its
    // first frame: step the world two seconds before the first paint.
    for (let i = 0; i < 120; i++) {
      const dt = 1 / 60;
      S.time += dt;
      updatePlayer(dt);
      if (S.mode === 'play') updateWorld(dt);
    }
  }
  updateStatus();
}

function updateStatus() {
  const obj = S.objective;
  statusEl.textContent = 'NEON TIDE — $' + S.cash + ', wanted ' + S.wanted + ' stars'
    + (obj ? ', mission: ' + obj.mission + ' — ' + obj.text : ', no active mission');
}

// ---- Input ----
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'handbrake' };
window.addEventListener('keydown', (e) => {
  const mapped = KEYMAP[e.code];
  if (mapped) { S.keys[mapped] = true; e.preventDefault(); }
  if (e.repeat) return;
  if (e.code === 'Enter' && S.mode === 'title') { startGame(S.hasSave); return; }
  if (e.code === 'KeyN' && S.mode === 'title' && S.hasSave) { startGame(false); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (S.mode === 'play') S.mode = 'pause';
    else if (S.mode === 'pause') S.mode = 'play';
    return;
  }
  if (e.code === 'KeyM') { const m = S.audio.toggleMute(); S.mission.banner = m ? 'Sound muted' : 'Sound on'; S.mission.bannerT = 2; return; }
  if (e.code === 'KeyH') { S.showHelp = !S.showHelp; return; }
  if (S.mode !== 'play') return;
  if (e.code === 'KeyE') tryEnterExitCar();
  if (e.code === 'KeyF') punch(S);
  if (e.code === 'KeyJ') startNextMission();
  if (e.code === 'KeyT') S.taxi.cooldown = 0;
});
window.addEventListener('keyup', (e) => {
  const mapped = KEYMAP[e.code];
  if (mapped) S.keys[mapped] = false;
});
canvas.addEventListener('mousemove', (e) => { S.mouse.x = e.clientX; S.mouse.y = e.clientY; });
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    S.mouse.down = true;
    S.audio.ensure(); S.audio.resume();
    if (S.mode === 'title') { startGame(S.hasSave); return; }
  }
});
window.addEventListener('mouseup', () => { S.mouse.down = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function mouseWorld() {
  return {
    x: S.cam.x + (S.mouse.x - window.innerWidth / 2),
    y: S.cam.y + (S.mouse.y - window.innerHeight / 2),
  };
}

function startNextMission() {
  if (S.mission.active) return;
  const next = S.mission.completed.length;
  if (next >= MISSIONS.length) {
    S.dialogue = 'All six jobs done, Rio. Costa Verde is yours — keep the fares coming.';
    S.dialogueT = 6;
    return;
  }
  startMission(S, next);
  S.mission.index = next;
}

function tryEnterExitCar() {
  const p = S.player;
  if (!p.onFoot && p.car) {
    // Step out beside the car.
    const car = p.car;
    car.speed = 0;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    p.onFoot = true;
    p.car = null;
    return;
  }
  const car = nearestCar(S.cars, p.x, p.y, 64) || nearestCar(S.policeCars, p.x, p.y, 64);
  if (!car) {
    // Gun shop: buy ammo. Spray shop: repair is automatic while driving through.
    if (Math.hypot(p.x - S.gunShop.x, p.y - S.gunShop.y) < 70) {
      if (S.cash >= 50) { S.cash -= 50; p.ammo += 24; S.audio.pickup(); S.mission.banner = 'Bought 24 rounds — $50'; S.mission.bannerT = 3; }
      else { S.mission.banner = 'Not enough cash for ammo ($50)'; S.mission.bannerT = 3; }
    }
    return;
  }
  p.car = car;
  p.onFoot = false;
  p.x = car.x; p.y = car.y; p.angle = car.angle;
  if (car.kind === 'traffic') {
    addWanted(S, 1);
    S.mission.banner = 'Car stolen! The driver ran for it.';
    S.mission.bannerT = 3;
    // The driver bails and flees on foot.
    const driver = makePed(S.city, S.rng, car.x, car.y);
    driver.flee = 5;
    S.peds.push(driver);
    car.kind = 'player';
  } else if (car.kind === 'police') {
    addWanted(S, 2);
    S.mission.banner = 'You stole a police interceptor!';
    S.mission.bannerT = 3;
    car.kind = 'player';
  } else {
    car.kind = 'player';
  }
  S.audio.pickup();
}

// ---- Per-frame updates ----
function updatePlayer(dt) {
  const p = S.player;
  const k = S.keys;
  if (p.onFoot) {
    let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    let my = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    if (S.demoDrive && S.mission.marker) {
      // Screenshot autopilot on foot: walk toward the objective.
      const dx = S.mission.marker.x - p.x, dy = S.mission.marker.y - p.y;
      const dd = Math.hypot(dx, dy) || 1;
      mx = dx / dd; my = dy / dd;
    }
    const len = Math.hypot(mx, my) || 1;
    const speed = 205;
    p.x += (mx / len) * speed * dt * (mx || my ? 1 : 0);
    p.y += (my / len) * speed * dt * (mx || my ? 1 : 0);
    const mw = mouseWorld();
    p.angle = Math.atan2(mw.y - p.y, mw.x - p.x);
    const fixed = collideBuildings(S.city, p.x, p.y, 12);
    p.x = fixed.x; p.y = fixed.y;
    // Pick up hidden packages.
    for (const pkg of S.packages) {
      if (!pkg.got && Math.hypot(p.x - pkg.x, p.y - pkg.y) < 26) {
        pkg.got = true;
        S.cash += 150;
        S.stats.earned += 150;
        S.audio.pickup();
        S.mission.banner = 'Hidden package found: +$150';
        S.mission.bannerT = 3;
        S.saveGame();
      }
    }
    // Spray shop on foot does nothing; gun shop handled by E.
  } else if (p.car) {
    const car = p.car;
    let input = k;
    if (S.demoDrive) {
      // Autopilot for screenshots: follow the road graph toward the mission
      // marker, so the car stays on roads instead of cutting across blocks.
      const target = S.mission.marker || { x: car.x + 400, y: car.y };
      if (S.demoNode === undefined || S.demoNode < 0) S.demoNode = nearestNode(S.city, car.x, car.y);
      let node = S.city.nodes[S.demoNode];
      if (Math.hypot(node.x - car.x, node.y - car.y) < 42) {
        let best = -1, bd = Infinity;
        for (const link of node.links) {
          const n = S.city.nodes[link];
          const d = Math.abs(n.x - target.x) + Math.abs(n.y - target.y);
          if (d < bd) { bd = d; best = link; }
        }
        if (best >= 0) { S.demoNode = best; node = S.city.nodes[best]; }
      }
      const want = Math.atan2(node.y - car.y, node.x - car.x);
      let d = want - car.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      // Swerve around a car stopped right ahead.
      let blocked = false;
      for (const other of [...S.cars, ...S.policeCars]) {
        if (other === car) continue;
        const ox = other.x - car.x, oy = other.y - car.y;
        const along = ox * Math.cos(car.angle) + oy * Math.sin(car.angle);
        const side = Math.abs(-ox * Math.sin(car.angle) + oy * Math.cos(car.angle));
        if (along > 0 && along < 120 && side < 32) { blocked = true; break; }
      }
      if (blocked) d += 0.9;
      input = { up: true, down: false, left: d < -0.12, right: d > 0.12, handbrake: false };
      // Unstick: if wedged, reverse out for a moment.
      if (car.speed < 40) S.demoStuck = (S.demoStuck || 0) + dt;
      else S.demoStuck = 0;
      if (S.demoStuck > 1.0) {
        input = { up: false, down: true, left: true, right: false, handbrake: false };
        if (S.demoStuck > 2.0) S.demoStuck = 0;
      }
    }
    drivePlayerCar(car, input, dt);
    const fixed = collideBuildings(S.city, car.x, car.y, 20);
    if (fixed.x !== car.x || fixed.y !== car.y) {
      car.speed *= 0.45;
      if (S.time - (car.lastBumpT || -9) > 0.5) { car.hp -= 6; car.lastBumpT = S.time; }
      if (car.hp <= 0) car.speed = 0;
    }
    car.x = fixed.x; car.y = fixed.y;
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    // Spray shop: drive through to repair and cool off, $100.
    for (const shop of S.sprayShops) {
      if (Math.hypot(car.x - shop.x, car.y - shop.y) < 60 && car.hp < 100 && S.cash >= 100) {
        S.cash -= 100;
        car.hp = 100;
        S.wanted = 0;
        S.audio.jingle();
        S.mission.banner = 'Spray shop: fresh paint, clean record — $100';
        S.mission.bannerT = 4;
      }
    }
    // Traffic cars ramming the player damage the car.
    for (const other of [...S.cars, ...S.policeCars]) {
      if (other === car || other.hp <= 0) continue;
      if (carOverlaps(car, other)) {
        pushCarsApart(car, other, S.time);
        if (other.kind === 'police' && S.time - (car.lastRamT || -9) > 0.8) {
          car.hp -= 4;
          car.lastRamT = S.time;
          S.audio.punch();
        }
      }
    }
    if (car.hp <= 0 && car.speed === 0) {
      S.mission.banner = 'Your car is wrecked — press E to get out';
      S.mission.bannerT = 2;
    }
  }
  // Shooting (on foot or drive-by).
  S.fireCooldown -= dt;
  if (S.mouse.down && S.fireCooldown <= 0 && S.mode === 'play') {
    const mw = mouseWorld();
    const angle = Math.atan2(mw.y - p.y, mw.x - p.x);
    const ox = p.onFoot ? p.x : p.car.x;
    const oy = p.onFoot ? p.y : p.car.y;
    if (fireBullet(S, ox, oy, angle, 'player')) {
      S.fireCooldown = 0.24;
      // One star per burst of gunfire at most: the cooldown gates repeats.
      if (S.combat.wantedCooldown <= 0) addWanted(S, 1);
    }
  }
  S.combat.punchCooldown = Math.max(0, S.combat.punchCooldown - dt);
}

function updateWorld(dt) {
  // Traffic: keep a lively street near the camera.
  const allCars = [...S.cars, ...S.policeCars];
  for (const car of S.cars) {
    if (car.kind === 'traffic') updateTrafficCar(car, S.city, allCars, dt, S.rng);
  }
  // Despawn far traffic, respawn near the player.
  S.cars = S.cars.filter((car) => {
    if (car.kind !== 'traffic') return true;
    return Math.hypot(car.x - S.player.x, car.y - S.player.y) < 1400;
  });
  if (S.cars.filter((c) => c.kind === 'traffic').length < 12) {
    const fresh = spawnTraffic(S.city, S.rng, 3, S.player.x, S.player.y);
    for (const c of fresh) c.cruise = 40 + S.rng() * 50;
    S.cars.push(...fresh);
  }
  // Parked cars never move; traffic avoids buildings by staying on roads.
  for (const car of S.cars) {
    if (car.kind === 'traffic') {
      const fixed = collideBuildings(S.city, car.x, car.y, 20);
      car.x = fixed.x; car.y = fixed.y;
    }
  }
  // Police cars chase.
  for (const car of S.policeCars) {
    updatePoliceCar(car, S.player, allCars, dt);
    const fixed = collideBuildings(S.city, car.x, car.y, 20);
    if (fixed.x !== car.x || fixed.y !== car.y) { car.speed *= 0.5; }
    car.x = fixed.x; car.y = fixed.y;
  }
  // Pedestrians.
  const danger = S.bullets.length ? { x: S.bullets[0].x, y: S.bullets[0].y } : null;
  for (const ped of S.peds) {
    if (ped.hp <= 0) continue;
    updatePed(ped, S.city, S.rng, dt, danger ? danger.x : undefined, danger ? danger.y : undefined, 320);
    const fixed = collideBuildings(S.city, ped.x, ped.y, 10);
    ped.x = fixed.x; ped.y = fixed.y;
  }
  S.peds = S.peds.filter((ped) => ped.hp > 0 && Math.hypot(ped.x - S.player.x, ped.y - S.player.y) < 1500);
  while (S.peds.length < 20) S.peds.push(makePed(S.city, S.rng));
  // Rivals fight back.
  for (const r of S.rivals) {
    if (r.hp <= 0) continue;
    updateRival(r, S.player, S.bullets, dt, S.rng);
    const fixed = collideBuildings(S.city, r.x, r.y, 10);
    r.x = fixed.x; r.y = fixed.y;
  }
  S.rivals = S.rivals.filter((r) => r.hp > 0);
  // Officers on foot.
  for (const cop of S.cops) {
    const d = updateCop(cop, S.player, dt);
    if (cop.arrest > 1.6) { busted(S); return; }
    void d;
  }
  S.cops = S.cops.filter((c) => c.hp > 0);
  // A traffic car hitting the player on foot hurts.
  if (S.player.onFoot) {
    for (const car of [...S.cars, ...S.policeCars]) {
      if (car.speed > 60 && Math.hypot(car.x - S.player.x, car.y - S.player.y) < 26) {
        damagePlayer(S, 12);
        S.player.x += (S.player.x - car.x) * 0.1;
        S.player.y += (S.player.y - car.y) * 0.1;
        car.speed *= 0.6;
      }
    }
  }
  updateBullets(S, dt);
  updateWanted(S, dt);
  updateMission(S, dt);
  updateTaxi(S, dt);
  // Particles fade.
  for (const pt of S.particles) pt.t -= dt;
  S.particles = S.particles.filter((pt) => pt.t > 0);
  // Clock.
  S.timeOfDay = (S.timeOfDay + dt / 240) % 24;
  S.district = districtAt(S.city, S.player.x, S.player.y);
  S.objective = currentObjective(S);
  // Auto-start the next job.
  if (!S.mission.active && S.nextMissionT > 0) {
    S.nextMissionT -= dt;
    if (S.nextMissionT <= 0) startNextMission();
  }
  if (S.dialogueT > 0) S.dialogueT -= dt;
  // Audio: engine, siren, night music.
  const driving = !S.player.onFoot && S.player.car;
  S.audio.engine(driving ? S.player.car.speed : 0, driving);
  S.audio.siren(dt, S.policeCars.length > 0);
  S.audio.music(dt, skyState(S).night);
  // Camera follows the player.
  const tx = S.player.x, ty = S.player.y;
  S.cam.x += (tx - S.cam.x) * Math.min(1, 5 * dt);
  S.cam.y += (ty - S.cam.y) * Math.min(1, 5 * dt);
  updateStatus();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  S.time += dt;
  const view = { w: window.innerWidth, h: window.innerHeight };
  if (S.mode === 'play') {
    updatePlayer(dt);
    if (S.mode === 'play') updateWorld(dt); // busted()/wasted() may flip the mode
  } else if (S.mode === 'busted' || S.mode === 'wasted') {
    S.combat.bustedT -= dt;
    S.combat.wastedT -= dt;
    if (S.combat.bustedT <= 0 || S.combat.wastedT <= 0) respawnAfterIncident(S);
  }
  // Paint.
  if (S.mode === 'title') {
    drawTitle(ctx, S, view);
  } else {
    renderWorld(ctx, S, view);
    drawHUD(ctx, S, view);
    if (S.mode === 'pause') drawPaused(ctx, S, view);
    if (S.mode === 'busted') drawEndScreen(ctx, S, view, 'busted');
    if (S.mode === 'wasted') drawEndScreen(ctx, S, view, 'wasted');
  }
  requestAnimationFrame(frame);
}

// Title screen save state, then go.
const existing = loadSave();
if (existing) {
  S.hasSave = true;
  S.saveCash = existing.cash || 0;
  S.saveMissions = (existing.completed || []).length;
}
// A screenshot scene starts straight into play with no title.
if (shotName()) {
  startGame(true);
} else {
  resetWorld();
}
requestAnimationFrame(frame);
