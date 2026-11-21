// People: pedestrians who stroll the sidewalks and flee from trouble, rival crew
// members who fight back, and police officers on foot who chase the player down
// and try to arrest them when the heat is on.

import { sidewalkPoint } from './city.js';

const SHIRTS = ['#e84a5f', '#2ec4b6', '#ffbf69', '#8ac926', '#6a4c93', '#f4f1de', '#457b9d', '#ff7b00'];
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

export function makePed(city, rng, x, y) {
  const p = (x !== undefined) ? { x, y } : sidewalkPoint(city, rng);
  return {
    x: p.x, y: p.y, angle: rng() * Math.PI * 2,
    speed: 26 + rng() * 22, shirt: SHIRTS[Math.floor(rng() * SHIRTS.length)],
    skin: SKINS[Math.floor(rng() * SKINS.length)],
    tx: p.x, ty: p.y, wait: rng() * 3,
    flee: 0, hp: 30, kind: 'ped',
  };
}

export function makeRival(city, rng, x, y) {
  const r = makePed(city, rng, x, y);
  r.kind = 'rival';
  r.hp = 60;
  r.shirt = '#1d1d24';
  r.speed = 40;
  r.shootCooldown = 1 + rng();
  return r;
}

export function makeCop(x, y) {
  return {
    x, y, angle: 0, speed: 132, shirt: '#1c3a5e', skin: '#e0ac69',
    tx: x, ty: y, wait: 0, flee: 0, hp: 100, kind: 'cop',
    arrest: 0,
  };
}

export function updatePed(ped, city, rng, dt, dangerX, dangerY, dangerR) {
  if (ped.flee > 0) {
    ped.flee -= dt;
    const dx = ped.x - dangerX, dy = ped.y - dangerY;
    const d = Math.hypot(dx, dy) || 1;
    ped.angle = Math.atan2(dy, dx);
    ped.x += (dx / d) * ped.speed * 2.4 * dt;
    ped.y += (dy / d) * ped.speed * 2.4 * dt;
    return;
  }
  if (dangerX !== undefined && Math.hypot(ped.x - dangerX, ped.y - dangerY) < dangerR) {
    ped.flee = 2.5 + rng() * 2;
    return;
  }
  if (ped.wait > 0) { ped.wait -= dt; return; }
  const dx = ped.tx - ped.x, dy = ped.ty - ped.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 12) {
    const next = sidewalkPoint(city, rng);
    ped.tx = next.x; ped.ty = next.y;
    ped.wait = rng() * 4;
    return;
  }
  ped.angle = Math.atan2(dy, dx);
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
}

export function updateCop(cop, player, dt) {
  const dx = player.x - cop.x, dy = player.y - cop.y;
  const dist = Math.hypot(dx, dy);
  cop.angle = Math.atan2(dy, dx);
  if (dist > 26) {
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
  }
  if (dist < 34) cop.arrest += dt;
  else cop.arrest = Math.max(0, cop.arrest - dt * 2);
  return dist;
}

export function updateRival(rival, player, bullets, dt, rng) {
  const dx = player.x - rival.x, dy = player.y - rival.y;
  const dist = Math.hypot(dx, dy);
  rival.angle = Math.atan2(dy, dx);
  rival.shootCooldown -= dt;
  if (dist > 240) {
    rival.x += Math.cos(rival.angle) * rival.speed * dt;
    rival.y += Math.sin(rival.angle) * rival.speed * dt;
  } else if (dist < 120) {
    rival.x -= Math.cos(rival.angle) * rival.speed * 0.6 * dt;
    rival.y -= Math.sin(rival.angle) * rival.speed * 0.6 * dt;
  }
  if (rival.shootCooldown <= 0 && dist < 420 && rng() < 0.75) {
    rival.shootCooldown = 1.1 + rng() * 0.9;
    const spread = (rng() - 0.5) * 0.24;
    bullets.push({
      x: rival.x + Math.cos(rival.angle) * 18, y: rival.y + Math.sin(rival.angle) * 18,
      vx: Math.cos(rival.angle + spread) * 520, vy: Math.sin(rival.angle + spread) * 520,
      from: 'rival', life: 1.4, damage: 7,
    });
  }
  return dist;
}
