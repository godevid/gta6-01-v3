// Combat and the law: shooting, punching, health and armour, and the wanted
// system. Crimes raise the heat; the heat brings police cars and officers; time
// without crime lets it cool. Get caught on foot and you are busted; run out of
// health and you are wasted. Either way you lose some cash and wake up across town.

export function combatState() {
  return { wantedCooldown: 0, bustedT: 0, wastedT: 0, punchCooldown: 0 };
}

export function addWanted(S, stars) {
  S.wanted = Math.min(5, S.wanted + stars);
  S.combat.wantedCooldown = 20;
}

export function fireBullet(S, fromX, fromY, angle, from) {
  const p = S.player;
  if (from === 'player') {
    if (p.ammo <= 0) { S.audio.emptyClick(); return false; }
    p.ammo--;
  }
  const spread = (S.rng() - 0.5) * 0.08;
  S.bullets.push({
    x: fromX + Math.cos(angle) * 22, y: fromY + Math.sin(angle) * 22,
    vx: Math.cos(angle + spread) * 640, vy: Math.sin(angle + spread) * 640,
    from, life: 1.1, damage: from === 'player' ? 20 : 7,
  });
  S.audio.shot();
  S.particles.push({ x: fromX + Math.cos(angle) * 26, y: fromY + Math.sin(angle) * 26, t: 0.12, color: '#ffe066', kind: 'flash' });
  return true;
}

export function punch(S) {
  const c = S.combat;
  if (c.punchCooldown > 0) return;
  c.punchCooldown = 0.45;
  const p = S.player;
  const reach = 34;
  const px = p.x + Math.cos(p.angle) * reach;
  const py = p.y + Math.sin(p.angle) * reach;
  S.audio.punch();
  let hit = false;
  for (const ped of [...S.peds, ...S.rivals]) {
    if (ped.hp <= 0) continue;
    if (Math.hypot(ped.x - px, ped.y - py) < 30) {
      ped.hp -= 15;
      ped.flee = 3;
      hit = true;
      if (ped.hp <= 0) killPed(S, ped);
    }
  }
  if (hit) addWanted(S, 1);
}

export function killPed(S, ped) {
  ped.hp = 0;
  S.particles.push({ x: ped.x, y: ped.y, t: 0.8, color: '#c0392b', kind: 'burst' });
  S.stats.kills++;
  if (ped.kind === 'ped') addWanted(S, 1);
  if (ped.kind === 'rival') addWanted(S, 1);
}

export function updateBullets(S, dt) {
  for (const b of S.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  S.bullets = S.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < S.city.W && b.y > 0 && b.y < S.city.H);
  for (const b of S.bullets) {
    if (b.from === 'player') {
      for (const ped of [...S.peds, ...S.rivals, ...S.cops]) {
        if (ped.hp <= 0) continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
          ped.hp -= b.damage;
          b.life = 0;
          S.particles.push({ x: b.x, y: b.y, t: 0.3, color: '#ff6b6b', kind: 'burst' });
          if (ped.hp <= 0) {
            if (ped.kind === 'cop') { S.stats.kills++; addWanted(S, 2); }
            else killPed(S, ped);
          } else if (ped.kind === 'ped') { ped.flee = 4; addWanted(S, 1); }
          break;
        }
      }
      for (const car of S.cars) {
        if (car === S.player.car) continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < 26) {
          car.hp -= b.damage;
          b.life = 0;
          if (car.hp <= 0) { car.smoke = 2; S.audio.explosion(); }
          break;
        }
      }
    } else {
      const p = S.player;
      if (!p.onFoot && p.car) {
        if (Math.hypot(p.car.x - b.x, p.car.y - b.y) < 26) { p.car.hp -= b.damage; b.life = 0; }
      } else if (Math.hypot(p.x - b.x, p.y - b.y) < 14) {
        damagePlayer(S, b.damage);
        b.life = 0;
      }
    }
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
}

export function damagePlayer(S, amount) {
  const p = S.player;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, amount);
    p.armor -= absorbed;
    amount -= absorbed;
  }
  p.health -= amount;
  S.audio.hurt();
  if (p.health <= 0) {
    p.health = 0;
    wasted(S);
  }
}

export function wasted(S) {
  const loss = Math.min(S.cash, 150 + Math.floor(S.rng() * 150));
  S.cash -= loss;
  S.wanted = 0;
  S.mode = 'wasted';
  S.combat.wastedT = 3;
  S.player.health = 100;
  S.player.armor = 0;
  S.audio.wasted();
}

export function busted(S) {
  const loss = Math.min(S.cash, 100 + Math.floor(S.rng() * 100));
  S.cash -= loss;
  S.wanted = 0;
  S.mode = 'busted';
  S.combat.bustedT = 3;
  S.audio.busted();
  // Impound the car, drop the player at the police station.
  if (S.player.car) { S.player.car = null; S.player.onFoot = true; }
  S.player.x = 600; S.player.y = 600;
}

export function respawnAfterIncident(S) {
  S.player.health = 100;
  S.player.x = 1400; S.player.y = 1000; // the safehouse
  S.player.angle = 0;
  S.cops.length = 0;
  S.mode = 'play';
  S.saveGame();
}

// Wanted decay and police numbers. Called every frame while playing.
export function updateWanted(S, dt) {
  const c = S.combat;
  if (S.wanted > 0) {
    if (c.wantedCooldown > 0) c.wantedCooldown -= dt;
    else {
      // Cool off slowly when no cop can see the player.
      const seen = S.cops.some((cop) => Math.hypot(cop.x - S.player.x, cop.y - S.player.y) < 500) ||
        S.policeCars.some((car) => Math.hypot(car.x - S.player.x, car.y - S.player.y) < 500);
      if (!seen) {
        c.wantedCooldown = 14;
        S.wanted = Math.max(0, S.wanted - 1);
        if (S.wanted === 0) sayCool(S);
      }
    }
  }
  // Police presence scales with the wanted level.
  const wantCars = S.wanted === 0 ? 0 : Math.min(2 + S.wanted, 6);
  while (S.policeCars.length < wantCars) {
    const a = S.rng() * Math.PI * 2;
    const d = 500 + S.rng() * 300;
    const car = {
      x: S.player.x + Math.cos(a) * d, y: S.player.y + Math.sin(a) * d,
      angle: 0, speed: 200, color: '#1c3a5e', kind: 'police',
      len: 44, wid: 22, targetNode: -1, wait: 0, siren: 0, hp: 120, smoke: 0, driver: true,
    };
    car.x = Math.max(60, Math.min(S.city.W - 60, car.x));
    car.y = Math.max(60, Math.min(S.city.H - 60, car.y));
    S.policeCars.push(car);
  }
  while (S.policeCars.length > wantCars) S.policeCars.pop();
  // Officers on foot only chase when the player is on foot and wanted.
  if (S.wanted > 0 && !S.player.onFoot) {
    // Cops stay in their cars while the player drives.
  }
  if (S.wanted > 0 && S.player.onFoot && S.cops.length < Math.min(S.wanted, 3)) {
    const a = S.rng() * Math.PI * 2;
    S.cops.push({
      x: S.player.x + Math.cos(a) * 380, y: S.player.y + Math.sin(a) * 380,
      angle: 0, speed: 132, shirt: '#1c3a5e', skin: '#e0ac69',
      tx: 0, ty: 0, wait: 0, flee: 0, hp: 100, kind: 'cop', arrest: 0,
    });
  }
  if (S.wanted === 0) S.cops.length = 0;
}

function sayCool(S) {
  S.mission.banner = 'You lost the heat.';
  S.mission.bannerT = 3;
}
