// Rendering and the HUD: the camera, the city painted from above, cars and people,
// day and night light, and every screen the player sees — title, pause, busted,
// wasted, the wanted stars, cash, health, the minimap and the mission banner.

export function skyState(S) {
  const t = S.timeOfDay; // 0..24
  const day = t > 6.5 && t < 18.5;
  const dusk = (t >= 17 && t <= 19.5) || (t >= 5.5 && t <= 7);
  const darkness = day ? 0 : dusk ? 0.25 : 0.5;
  return { day, dusk, darkness, night: !day && !dusk };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, -car.len / 2 + 3, -car.wid / 2 + 4, car.len, car.wid, 7);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  rr(ctx, -car.len / 2, -car.wid / 2, car.len, car.wid, 7);
  ctx.fill();
  // Cabin and windshield.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  rr(ctx, -8, -car.wid / 2 + 4, 16, car.wid - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.fillRect(car.len / 2 - 10, -car.wid / 2 + 5, 4, car.wid - 10);
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(car.len / 2 - 2, -car.wid / 2 + 2, 3, 5);
  ctx.fillRect(car.len / 2 - 2, car.wid / 2 - 7, 3, 5);
  // Brake lights.
  ctx.fillStyle = '#ff2e2e';
  ctx.fillRect(-car.len / 2, -car.wid / 2 + 2, 3, 5);
  ctx.fillRect(-car.len / 2, car.wid / 2 - 7, 3, 5);
  if (car.kind === 'police') {
    const flash = Math.floor(car.siren * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#2e7bff';
    ctx.fillRect(-6, -car.wid / 2 + 2, 12, 5);
    ctx.fillStyle = flash ? '#2e7bff' : '#ff2e2e';
    ctx.fillRect(-6, car.wid / 2 - 7, 12, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  if (car.special === 'comet') {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMET', 0, 3);
  }
  ctx.restore();
  if (car.hp < 55 && car.hp > 0) {
    ctx.fillStyle = 'rgba(80,80,80,0.5)';
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * 14, car.y - Math.sin(car.angle) * 14, 7 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPerson(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 3, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.shirt;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(5, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  if (p.kind === 'cop') {
    ctx.fillStyle = '#dfe8ff';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 2);
  }
  if (p.kind === 'rival') {
    ctx.strokeStyle = '#ff2e2e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(16, -8); ctx.moveTo(6, 5); ctx.lineTo(16, 8); ctx.stroke();
  }
  ctx.restore();
}

export function renderWorld(ctx, S, view) {
  const city = S.city;
  const sky = skyState(S);
  const cam = S.cam;
  ctx.save();
  ctx.clearRect(0, 0, view.w, view.h);
  // Warm sunset-sand base.
  ctx.fillStyle = sky.night ? '#1d2b1f' : sky.dusk ? '#7a6a4a' : '#6f9e5a';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.translate(view.w / 2 - cam.x, view.h / 2 - cam.y);

  // Ocean and beach on the east edge.
  ctx.fillStyle = sky.night ? '#0b2436' : '#2a7fa8';
  ctx.fillRect(3120, 0, 80, city.H);
  ctx.fillStyle = sky.night ? '#8a7a5a' : '#ecd9a0';
  ctx.fillRect(2920, 0, 200, city.H);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = 0; y < city.H; y += 90) {
    ctx.fillRect(3110, y + ((S.time * 20) % 90), 10, 26);
  }

  // Grass blocks are the base; draw roads over them.
  ctx.fillStyle = sky.night ? '#2c2c34' : '#3a3a40';
  const rw = city.ROAD_W;
  for (const ax of city.avenues) ctx.fillRect(ax - rw / 2, 0, rw, city.H);
  for (const sy of city.streets) ctx.fillRect(0, sy - rw / 2, city.W, rw);
  // Sidewalk edges.
  ctx.strokeStyle = sky.night ? '#4a4a52' : '#9a9a92';
  ctx.lineWidth = 4;
  for (const ax of city.avenues) {
    ctx.beginPath(); ctx.moveTo(ax - rw / 2, 0); ctx.lineTo(ax - rw / 2, city.H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax + rw / 2, 0); ctx.lineTo(ax + rw / 2, city.H); ctx.stroke();
  }
  for (const sy of city.streets) {
    ctx.beginPath(); ctx.moveTo(0, sy - rw / 2); ctx.lineTo(city.W, sy - rw / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, sy + rw / 2); ctx.lineTo(city.W, sy + rw / 2); ctx.stroke();
  }
  // Centre dashes.
  ctx.fillStyle = sky.night ? '#8a8a72' : '#f5d76e';
  for (const ax of city.avenues) {
    for (let y = 0; y < city.H; y += 64) ctx.fillRect(ax - 2, y, 4, 30);
  }
  for (const sy of city.streets) {
    for (let x = 0; x < city.W; x += 64) ctx.fillRect(x, sy - 2, 30, 4);
  }

  // Parks and plaza.
  for (const park of city.parkRects) {
    ctx.fillStyle = park.plaza ? '#b8a88a' : '#4d8a4d';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    if (park.plaza) {
      ctx.strokeStyle = '#8a7a5a';
      ctx.lineWidth = 3;
      ctx.strokeRect(park.x + 8, park.y + 8, park.w - 16, park.h - 16);
    }
  }

  // Buildings with a fake-height shadow offset.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x + b.height * 0.35, b.y + b.height * 0.35, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(255,255,180,0.85)';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 3 + b.windows) % 3 !== 0) continue;
        ctx.fillRect(b.x + 10 + i * 26, b.y + 10 + j * 26, 10, 12);
      }
    }
  }

  // Palms.
  for (const palm of city.palms) {
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(palm.x, palm.y); ctx.lineTo(palm.x + 3, palm.y - 12); ctx.stroke();
    ctx.fillStyle = sky.night ? '#2f6b2f' : '#3f9e4d';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(palm.x + 3 + Math.cos(a) * 8, palm.y - 12 + Math.sin(a) * 5, 9, 3.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Crates, benches, hydrants.
  for (const prop of city.props) {
    if (prop.kind === 'crate') {
      ctx.fillStyle = '#a87c4f';
      ctx.fillRect(prop.x, prop.y, 20, 20);
      ctx.strokeStyle = '#7a5a35';
      ctx.strokeRect(prop.x, prop.y, 20, 20);
    } else if (prop.kind === 'bench') {
      ctx.fillStyle = '#7a5a35';
      ctx.fillRect(prop.x, prop.y, 26, 8);
    } else if (prop.kind === 'hydrant') {
      ctx.fillStyle = '#d94f3d';
      ctx.beginPath(); ctx.arc(prop.x, prop.y, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Marina piers.
  ctx.fillStyle = '#8a6a45';
  const m = city.marina;
  ctx.fillRect(m.x, m.y, m.w, 12);
  for (let i = 0; i < 4; i++) ctx.fillRect(m.x + 40 + i * 90, m.y, 12, 90);
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath(); ctx.ellipse(2920, 2100, 46, 16, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('YACHT', 2920, 2103);

  // Spray shops (repair + clean record, $100) and the gun shop (ammo, $50).
  for (const shop of S.sprayShops) {
    ctx.fillStyle = 'rgba(46,196,182,0.35)';
    ctx.beginPath(); ctx.arc(shop.x, shop.y, 58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2ec4b6';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(shop.x, shop.y, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#eafffb';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPRAY $100', shop.x, shop.y + 4);
  }
  ctx.fillStyle = 'rgba(255,211,25,0.3)';
  ctx.beginPath(); ctx.arc(S.gunShop.x, S.gunShop.y, 46, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd319';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(S.gunShop.x, S.gunShop.y, 46, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff3c4';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AMMO $50', S.gunShop.x, S.gunShop.y + 4);

  // Hidden packages.
  for (const pkg of S.packages) {
    if (pkg.got) continue;
    const pulse = 0.6 + 0.4 * Math.sin(S.time * 4);
    ctx.fillStyle = 'rgba(255,211,25,' + pulse + ')';
    ctx.beginPath(); ctx.arc(pkg.x, pkg.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', pkg.x, pkg.y + 3);
  }

  // Mission marker: a bouncing beacon.
  if (S.mission.marker) {
    const bob = Math.sin(S.time * 5) * 6;
    const mk = S.mission.marker;
    ctx.fillStyle = 'rgba(255,211,25,0.25)';
    ctx.beginPath(); ctx.arc(mk.x, mk.y, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd319';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mk.x, mk.y, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd319';
    ctx.beginPath();
    ctx.moveTo(mk.x, mk.y - 44 + bob);
    ctx.lineTo(mk.x - 12, mk.y - 66 + bob);
    ctx.lineTo(mk.x + 12, mk.y - 66 + bob);
    ctx.closePath(); ctx.fill();
  }
  // Taxi offer / destination.
  if (S.taxi.offer) {
    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath(); ctx.arc(S.taxi.offer.x, S.taxi.offer.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', S.taxi.offer.x, S.taxi.offer.y - 18);
  }
  if (S.taxi.active && S.taxi.dest) {
    ctx.strokeStyle = '#2ec4b6';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(S.taxi.dest.x, S.taxi.dest.y, 26, 0, Math.PI * 2); ctx.stroke();
  }

  // Cars, people, bullets, particles.
  for (const car of S.cars) drawCarShape(ctx, car);
  for (const car of S.policeCars) drawCarShape(ctx, car);
  for (const ped of S.peds) if (ped.hp > 0) drawPerson(ctx, ped);
  for (const r of S.rivals) if (r.hp > 0) drawPerson(ctx, r);
  for (const cop of S.cops) if (cop.hp > 0) drawPerson(ctx, cop);
  const p = S.player;
  if (p.onFoot) drawPerson(ctx, { x: p.x, y: p.y, angle: p.angle, shirt: '#ff5d8f', skin: '#e0ac69', kind: 'player' });
  for (const b of S.bullets) {
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const pt of S.particles) {
    if (pt.kind === 'ring') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, (0.6 - pt.t) * 60 + 8, 0, Math.PI * 2); ctx.stroke();
    } else if (pt.kind === 'burst') {
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.t * 18, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Night darkness + headlights.
  if (sky.darkness > 0) {
    ctx.fillStyle = 'rgba(8,10,38,' + sky.darkness + ')';
    ctx.fillRect(cam.x - view.w / 2 - 40, cam.y - view.h / 2 - 40, view.w + 80, view.h + 80);
    const px = p.onFoot ? p.x : p.car ? p.car.x : p.x;
    const py = p.onFoot ? p.y : p.car ? p.car.y : p.y;
    const glow = ctx.createRadialGradient(px, py, 40, px, py, 260);
    glow.addColorStop(0, 'rgba(255,240,180,0.20)');
    glow.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(px, py, 260, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawStars(ctx, x, y, wanted) {
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < wanted ? '#ffd319' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * 28, y);
  }
}

export function drawMinimap(ctx, S, x, y, w, h) {
  const city = S.city;
  const sx = w / city.W, sy = h / city.H;
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,28,0.82)';
  rr(ctx, x - 6, y - 6, w + 12, h + 12, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  rr(ctx, x - 6, y - 6, w + 12, h + 12, 8); ctx.stroke();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#274d2e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2a7fa8';
  ctx.fillRect(x + 3120 * sx, y, w - 3120 * sx, h);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  for (const ax of city.avenues) {
    ctx.beginPath(); ctx.moveTo(x + ax * sx, y); ctx.lineTo(x + ax * sx, y + h); ctx.stroke();
  }
  for (const sy2 of city.streets) {
    ctx.beginPath(); ctx.moveTo(x, y + sy2 * sy); ctx.lineTo(x + w, y + sy2 * sy); ctx.stroke();
  }
  if (S.mission.marker) {
    ctx.fillStyle = '#ffd319';
    ctx.beginPath(); ctx.arc(x + S.mission.marker.x * sx, y + S.mission.marker.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const car of S.policeCars) {
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath(); ctx.arc(x + car.x * sx, y + car.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  const p = S.player;
  ctx.save();
  ctx.translate(x + p.x * sx, y + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawHUD(ctx, S, view) {
  const p = S.player;
  ctx.save();
  // Top-left: cash, health, armour, ammo.
  ctx.fillStyle = 'rgba(10,16,28,0.75)';
  rr(ctx, 12, 12, 250, 96, 10); ctx.fill();
  ctx.fillStyle = '#2ec4b6';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('$' + S.cash.toLocaleString('en-US'), 24, 42);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText('RIO VEGA  ·  COSTA VERDE', 24, 62);
  // Health bar.
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(24, 72, 150, 10);
  ctx.fillStyle = p.health > 30 ? '#7ac74f' : '#e84a5f';
  ctx.fillRect(24, 72, 150 * Math.max(0, p.health) / 100, 10);
  ctx.fillStyle = '#fff';
  ctx.font = '11px sans-serif';
  ctx.fillText('HP ' + Math.ceil(p.health), 180, 81);
  if (p.armor > 0) ctx.fillText('ARMOR ' + Math.ceil(p.armor), 24, 100);
  else ctx.fillText('AMMO ' + p.ammo + '  ·  PKG ' + S.packages.filter((k) => k.got).length + '/10', 24, 100);

  // Top-right: wanted stars + district + clock.
  drawStars(ctx, view.w - 168, 44, S.wanted);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  const hh = Math.floor(S.timeOfDay);
  const mm = Math.floor((S.timeOfDay - hh) * 60);
  ctx.fillText(S.district + '  ·  ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), view.w - 24, 66);
  if (S.wanted > 0) {
    ctx.fillStyle = '#ff5d5d';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(S.wanted >= 4 ? 'ARMED RESPONSE' : S.wanted >= 2 ? 'POLICE PURSUIT' : 'WANTED', view.w - 24, 86);
  }

  // Objective banner, top centre.
  const obj = S.objective;
  if (obj) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,16,28,0.8)';
    const tw = Math.min(view.w - 40, 560);
    rr(ctx, view.w / 2 - tw / 2, 12, tw, 44, 10); ctx.fill();
    ctx.fillStyle = '#ffd319';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(obj.mission.toUpperCase(), view.w / 2, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText(obj.text, view.w / 2, 48);
  }
  // Banner line (pickups, fares, escapes).
  if (S.mission.bannerT > 0 && S.mission.banner) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,211,25,0.92)';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(S.mission.banner, view.w / 2, 76);
  }
  // Dialogue box, to the right of the minimap so nothing overlaps.
  if (S.dialogueT > 0 && S.dialogue) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(10,16,28,0.85)';
    const dBoxX = 216;
    const dBoxW = Math.min(view.w - dBoxX - 24, 620);
    rr(ctx, dBoxX, view.h - 118, dBoxW, 62, 10); ctx.fill();
    ctx.fillStyle = '#ffd319';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('◆ STORY', dBoxX + 14, view.h - 92);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    wrapText(ctx, S.dialogue, dBoxX + 14, view.h - 74, dBoxW - 28, 17);
  }
  // Speedometer while driving.
  if (!p.onFoot && p.car) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.24) + ' km/h', view.w - 24, view.h - 176);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(p.car.hp < 55 ? 'ENGINE SMOKING — FIND A SPRAY SHOP' : 'E exit car   ·   SPACE handbrake', view.w - 24, view.h - 158);
  } else {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('E enter car   ·   Click shoot   ·   F punch', view.w - 24, view.h - 176);
  }
  // Minimap bottom-left.
  drawMinimap(ctx, S, 22, view.h - 172, 176, 132);
  // Controls reminder, under the status box at top-left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px sans-serif';
  ctx.fillText('M mute   ·   P pause   ·   H help', 24, 126);
  if (S.showHelp) {
    ctx.fillStyle = 'rgba(10,16,28,0.92)';
    rr(ctx, view.w / 2 - 260, view.h / 2 - 170, 520, 340, 12); ctx.fill();
    ctx.fillStyle = '#ffd319';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', view.w / 2, view.h / 2 - 136);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    const lines = [
      'WASD / arrows — walk or drive',
      'E — enter, steal or exit a car',
      'Mouse + click — aim and shoot (pistol)',
      'F — punch   ·   SPACE — handbrake',
      'T — start a taxi fare while driving',
      'Stealing cars and shooting raise your wanted level.',
      'Lose the cops to cool off. Get busted or wasted',
      'and you lose cash and wake up at the safehouse.',
      'Finish all 6 story missions. Find 10 hidden $ packages.',
      'Your progress saves automatically.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, view.w / 2, view.h / 2 - 104 + i * 24));
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, cy);
}

export function drawTitle(ctx, S, view) {
  ctx.save();
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, view.w, view.h);
  // Neon skyline silhouette.
  const grad = ctx.createLinearGradient(0, 0, 0, view.h);
  grad.addColorStop(0, '#ff7e5f');
  grad.addColorStop(0.55, '#c94b7c');
  grad.addColorStop(1, '#1a1a40');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, view.w, view.h * 0.62);
  ctx.fillStyle = '#14142e';
  let bx = 0;
  const rngHeights = [120, 200, 150, 260, 180, 300, 140, 220, 170, 240];
  for (let i = 0; bx < view.w; i++) {
    const bw = 70 + (i % 3) * 30;
    const bh = rngHeights[i % rngHeights.length];
    ctx.fillRect(bx, view.h * 0.62 - bh, bw, bh);
    ctx.fillStyle = 'rgba(255,211,25,0.8)';
    for (let wy = 0; wy < bh - 20; wy += 26) {
      for (let wx = 8; wx < bw - 12; wx += 20) {
        if ((wx + wy + i) % 3 === 0) ctx.fillRect(bx + wx, view.h * 0.62 - bh + 12 + wy, 6, 8);
      }
    }
    ctx.fillStyle = '#14142e';
    bx += bw + 8;
  }
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, view.h * 0.62, view.w, view.h * 0.38);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd319';
  ctx.font = 'bold ' + Math.min(84, view.w / 9) + 'px sans-serif';
  ctx.fillText('NEON TIDE', view.w / 2, view.h * 0.34);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText('An open-world crime story in Costa Verde', view.w / 2, view.h * 0.34 + 40);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Drive. Steal. Outrun the law. Six story missions, taxi fares, ten hidden packages.', view.w / 2, view.h * 0.34 + 68);
  const cy = view.h * 0.72;
  ctx.fillStyle = '#2ec4b6';
  rr(ctx, view.w / 2 - 150, cy - 26, 300, 52, 10); ctx.fill();
  ctx.fillStyle = '#062a28';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(S.hasSave ? 'CONTINUE  (Enter)' : 'NEW GAME  (Enter)', view.w / 2, cy + 7);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD move / drive  ·  E enter car  ·  Mouse aim, click shoot  ·  F punch', view.w / 2, cy + 56);
  if (S.hasSave) {
    ctx.fillText('Save found: $' + S.saveCash + '  ·  ' + S.saveMissions + ' missions done  ·  N for a fresh start', view.w / 2, cy + 82);
  }
  ctx.restore();
}

export function drawEndScreen(ctx, S, view, kind) {
  ctx.save();
  ctx.fillStyle = kind === 'wasted' ? 'rgba(60,8,8,0.82)' : 'rgba(8,16,60,0.82)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = kind === 'wasted' ? '#ff6b6b' : '#7ab8ff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(kind === 'wasted' ? 'WASTED' : 'BUSTED', view.w / 2, view.h / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText(kind === 'wasted'
    ? 'The crew scraped you off the asphalt. You lost some cash.'
    : 'The Costa Verde PD hauled you in. You lost some cash.',
    view.w / 2, view.h / 2 + 20);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '15px sans-serif';
  ctx.fillText('Waking up at the safehouse…', view.w / 2, view.h / 2 + 52);
  ctx.restore();
}

export function drawPaused(ctx, S, view) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,18,0.75)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd319';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('PAUSED', view.w / 2, view.h / 2 - 10);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('P resume  ·  H help  ·  progress is saved automatically', view.w / 2, view.h / 2 + 26);
  ctx.restore();
}
