// Cars: player driving physics, parked cars, traffic that follows the road graph,
// and police interceptors. A car is a small rectangle with heading, speed and a
// colour; traffic picks a neighbouring intersection and drives to it, police drive
// straight at the player and try to ram them off the road.

import { nearestNode, randomRoadPoint, onRoad } from './city.js';

export const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#e8c33a', '#7ac74f', '#e8e8e8', '#2b2b33', '#c96fd9', '#e8912a', '#4fd2c9'];
export const SPORT_COLORS = ['#ff2e63', '#ffd319', '#08d9d6', '#f9ed69'];

export function makeCar(x, y, angle, color, kind) {
  return {
    x, y, angle, speed: 0, color,
    kind: kind || 'traffic', // 'player' | 'traffic' | 'police' | 'parked'
    len: 44, wid: 22,
    targetNode: -1, wait: 0, siren: 0,
    hp: 150, smoke: 0, driver: true,
  };
}

export function spawnParkedCars(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(city, rng);
    const vertical = rng() < 0.5;
    const angle = vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
    const offset = 30;
    const x = vertical ? p.x + (rng() < 0.5 ? -offset : offset) : p.x;
    const y = vertical ? p.y : p.y + (rng() < 0.5 ? -offset : offset);
    cars.push(makeCar(x, y, angle, CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)], 'parked'));
  }
  return cars;
}

export function spawnTraffic(city, rng, count, nearX, nearY) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(city, rng, nearX, nearY, 500);
    const car = makeCar(p.x, p.y, Math.floor(rng() * 4) * Math.PI / 2, CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)], 'traffic');
    car.targetNode = nearestNode(city, p.x, p.y);
    car.speed = 60 + rng() * 60;
    cars.push(car);
  }
  return cars;
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Arcade driving: throttle accelerates along the heading, steering scales with
// speed, the handbrake cuts grip so the tail slides.
export function drivePlayerCar(car, input, dt) {
  const maxSpeed = 460;
  const maxReverse = 160;
  // A wrecked car coasts to a stop and cannot accelerate.
  if (car.hp <= 0) {
    car.speed -= Math.sign(car.speed) * 260 * dt;
    if (Math.abs(car.speed) < 6) car.speed = 0;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    return car;
  }
  if (input.up) car.speed += 420 * dt;
  if (input.down) car.speed -= car.speed > 8 ? 520 * dt : 260 * dt;
  if (!input.up && !input.down) car.speed -= Math.sign(car.speed) * 140 * dt;
  if (input.handbrake) car.speed -= Math.sign(car.speed) * 320 * dt;
  car.speed = Math.max(-maxReverse, Math.min(maxSpeed, car.speed));
  if (Math.abs(car.speed) < 4 && !input.up && !input.down) car.speed = 0;

  const grip = input.handbrake ? 1.6 : 2.6;
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += steer * grip * dt * Math.min(1, Math.abs(car.speed) / 120) * dir;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (car.speed > 300 && Math.random() < 0.3) car.smoke = Math.max(car.smoke, 0.4);
  return car;
}

function carAhead(cars, self, dist) {
  const fx = Math.cos(self.angle), fy = Math.sin(self.angle);
  for (const other of cars) {
    if (other === self) continue;
    const dx = other.x - self.x, dy = other.y - self.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    if (along > 0 && along < dist && side < 26) return true;
  }
  return false;
}

export function updateTrafficCar(car, city, cars, dt, rng) {
  if (car.wait > 0) { car.wait -= dt; car.speed *= 0.8; return; }
  const node = city.nodes[car.targetNode];
  if (!node) { car.targetNode = nearestNode(city, car.x, car.y); return; }
  const dx = node.x - car.x, dy = node.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 26) {
    const links = node.links;
    const next = links[Math.floor(rng() * links.length)];
    car.targetNode = next;
    return;
  }
  const want = Math.atan2(dy, dx);
  car.angle = angleLerp(car.angle, want, Math.min(1, 3.2 * dt));
  const cruise = 95 + (car.cruise || 0);
  // Yield to anything right beside the car, not just straight ahead, so
  // intersections do not gridlock into a permanent pile-up.
  let crowded = false;
  for (const other of cars) {
    if (other === car) continue;
    if (Math.hypot(other.x - car.x, other.y - car.y) < 55) { crowded = true; break; }
  }
  if (crowded) {
    car.speed = Math.max(0, car.speed - 320 * dt);
  } else if (carAhead(cars, car, 70)) {
    car.speed = Math.max(0, car.speed - 260 * dt);
  } else {
    car.speed += (cruise - car.speed) * Math.min(1, 1.4 * dt);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

export function updatePoliceCar(car, target, cars, dt) {
  const targetSpeed = target.car ? target.car.speed : 0;
  if (car.side === undefined) car.side = Math.random() < 0.5 ? -1 : 1;
  const dx = target.x - car.x, dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  // Close in fast from far away; once alongside, pull up next to the player
  // and match their speed instead of ramming straight through them.
  let tx = target.x, ty = target.y;
  let chase = 430;
  if (dist < 150) {
    const px = -Math.sin(target.angle), py = Math.cos(target.angle);
    // Aim a little ahead of the player and well to one side, so a turn does
    // not put the interceptor inside the player's car.
    tx = target.x + Math.cos(target.angle) * targetSpeed * 0.3 + px * 120 * car.side;
    ty = target.y + Math.sin(target.angle) * targetSpeed * 0.3 + py * 120 * car.side;
    chase = Math.max(220, Math.abs(targetSpeed));
  } else if (dist < 320) {
    chase = 400;
  }
  const want = Math.atan2(ty - car.y, tx - car.x);
  car.angle = angleLerp(car.angle, want, Math.min(1, 4.5 * dt));
  if (carAhead(cars, car, 60)) {
    car.speed = Math.max(0, car.speed - 300 * dt);
  } else {
    car.speed += (chase - car.speed) * Math.min(1, 1.8 * dt);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.siren += dt;
  return dist;
}

export function carOverlaps(a, b) {
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  return dx < 44 && dy < 44;
}

export function pushCarsApart(a, b, now) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const overlap = 40 - d;
  if (overlap <= 0) return;
  const nx = dx / d, ny = dy / d;
  a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
  // Both cars scrub a little speed off instead of swapping it, so a bump
  // does not grind both cars to a halt.
  a.speed *= 0.85;
  b.speed *= 0.85;
  // Crunch damage, at most once per car per half second, so a long scrape
  // does not total a car in a single frame.
  const t = now === undefined ? 0 : now;
  if (t - (a.lastHitT || -9) > 1.0) { a.hp -= 2; a.lastHitT = t; }
  if (t - (b.lastHitT || -9) > 1.0) { b.hp -= 2; b.lastHitT = t; }
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null, bd = maxDist;
  for (const c of cars) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function roadAheadIsClear(city, x, y, angle) {
  const nx = x + Math.cos(angle) * 60;
  const ny = y + Math.sin(angle) * 60;
  return onRoad(city, nx, ny) || true; // cars may cut across blocks slowly; no hard block
}
