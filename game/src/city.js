// Costa Verde: the city itself. A seeded grid of avenues and streets, blocks full of
// buildings, a beach and ocean on the east edge, a marina in the south-east, a park
// and a plaza in the middle. Everything the other systems need lives here: the road
// graph traffic follows, the solid rectangles cars and people collide with, and the
// palette the renderer paints from.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  ['#e8b48a', '#d99a6c', '#c97f5a'], // terracotta
  ['#f2d8a7', '#e9c184', '#d9a75e'], // sand
  ['#9fc3d8', '#7fa9c4', '#5f8fae'], // sea glass
  ['#f6e7c9', '#eed9a8', '#e0c184'], // cream
  ['#c9a0b8', '#b3859d', '#9c6f88'], // dusk pink
  ['#8fb573', '#74a05e', '#5c8a4a'], // palm green
];

export function buildCity() {
  const rng = makeRng(20261121);
  const W = 3200, H = 2400;
  const ROAD_W = 96;
  const STEP = 400;
  const avenues = []; // vertical road centre x
  const streets = []; // horizontal road centre y
  for (let x = 200; x < 3000; x += STEP) avenues.push(x);
  for (let y = 200; y < 2400; y += STEP) streets.push(y);

  const buildings = [];
  const palms = [];
  const props = []; // {x, y, kind} kind: 'palm' | 'bench' | 'lamp' | 'crate' | 'hydrant'
  const parkRects = [];
  const beach = { x0: 2920, x1: 3200 }; // sand strip, ocean beyond x 3120

  // Blocks between roads get buildings, with a park and a plaza left open.
  for (let ai = 0; ai < avenues.length - 1; ai++) {
    for (let si = 0; si < streets.length - 1; si++) {
      const x0 = avenues[ai] + ROAD_W / 2 + 14;
      const x1 = avenues[ai + 1] - ROAD_W / 2 - 14;
      const y0 = streets[si] + ROAD_W / 2 + 14;
      const y1 = streets[si + 1] - ROAD_W / 2 - 14;
      if (x0 > 2900) continue; // beach blocks stay open
      // Central park: the block around (1400, 1000).
      if (ai === 3 && si === 2) {
        parkRects.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let i = 0; i < 14; i++) {
          palms.push({ x: x0 + 20 + rng() * (x1 - x0 - 40), y: y0 + 20 + rng() * (y1 - y0 - 40) });
        }
        continue;
      }
      // Plaza: block around (1000, 1400) stays open with benches.
      if (ai === 2 && si === 3) {
        parkRects.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, plaza: true });
        for (let i = 0; i < 6; i++) props.push({ x: x0 + 40 + rng() * (x1 - x0 - 80), y: y0 + 40 + rng() * (y1 - y0 - 80), kind: 'bench' });
        continue;
      }
      const palette = PALETTES[Math.floor(rng() * PALETTES.length)];
      const bw = x1 - x0, bh = y1 - y0;
      const cols = bw > 220 ? 2 : 1;
      const rows = bh > 220 ? 2 : 1;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const bx = x0 + (c * bw) / cols + 6;
          const by = y0 + (r * bh) / rows + 6;
          const bwid = bw / cols - 18;
          const bhei = bh / rows - 18;
          const tall = rng() < 0.22;
          buildings.push({
            x: bx, y: by, w: bwid, h: bhei,
            color: palette[Math.floor(rng() * palette.length)],
            roof: tall ? '#5a4a6e' : '#8a7a5a',
            height: tall ? 46 + rng() * 40 : 14 + rng() * 16,
            windows: Math.floor(2 + rng() * 4),
          });
        }
      }
      // Street props along the block edges.
      for (let i = 0; i < 3; i++) {
        palms.push({ x: x0 + 8 + rng() * (bw - 16), y: y0 - 4 });
        palms.push({ x: x0 + 8 + rng() * (bw - 16), y: y1 + 4 });
      }
      if (rng() < 0.5) props.push({ x: x0 + 10, y: y0 + 10, kind: 'hydrant' });
    }
  }

  // Marina: docks in the south-east, wooden piers over the water edge.
  const marina = { x: 2700, y: 2050, w: 420, h: 220 };
  for (let i = 0; i < 5; i++) {
    props.push({ x: marina.x + 30 + i * 78, y: marina.y + 30, kind: 'crate' });
  }

  // Road graph: nodes at every avenue/street crossing, edges along roads.
  const nodes = [];
  const nodeAt = new Map();
  for (const ax of avenues) {
    for (const sy of streets) {
      const id = nodes.length;
      nodes.push({ x: ax, y: sy, links: [] });
      nodeAt.set(ax + ',' + sy, id);
    }
  }
  function link(a, b) {
    nodes[a].links.push(b);
    nodes[b].links.push(a);
  }
  for (let ai = 0; ai < avenues.length; ai++) {
    for (let si = 0; si < streets.length; si++) {
      const id = nodeAt.get(avenues[ai] + ',' + streets[si]);
      if (ai + 1 < avenues.length) link(id, nodeAt.get(avenues[ai + 1] + ',' + streets[si]));
      if (si + 1 < streets.length) link(id, nodeAt.get(avenues[ai] + ',' + streets[si + 1]));
    }
  }

  // Named districts for the HUD and mission text.
  const districts = [
    { name: 'Old Town', x: 0, y: 0, w: 1200, h: 900 },
    { name: 'Neon Strip', x: 1200, y: 0, w: 1200, h: 900 },
    { name: 'Marina Bay', x: 2000, y: 1200, w: 1200, h: 1200 },
    { name: 'Palm Heights', x: 0, y: 1200, w: 1200, h: 1200 },
    { name: 'The Docks', x: 1200, y: 1200, w: 1600, h: 1200 },
  ];

  return { W, H, ROAD_W, avenues, streets, buildings, palms, props, parkRects, beach, marina, nodes, districts, rng };
}

export function districtAt(city, x, y) {
  for (const d of city.districts) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Costa Verde';
}

export function onRoad(city, x, y) {
  const r = city.ROAD_W / 2;
  for (const ax of city.avenues) if (Math.abs(x - ax) < r) return true;
  for (const sy of city.streets) if (Math.abs(y - sy) < r) return true;
  return false;
}

export function nearestNode(city, x, y) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < city.nodes.length; i++) {
    const n = city.nodes[i];
    const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

// Circle vs building rectangles. Returns a pushed-out position.
export function collideBuildings(city, x, y, radius) {
  let px = x, py = y;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(px, b.x + b.w));
    const cy = Math.max(b.y, Math.min(py, b.y + b.h));
    const dx = px - cx, dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        px = cx + (dx / d) * radius;
        py = cy + (dy / d) * radius;
      } else {
        py = b.y - radius; // pushed out the top when dead centre
      }
    }
  }
  px = Math.max(24, Math.min(city.W - 24, px));
  py = Math.max(24, Math.min(city.H - 24, py));
  return { x: px, y: py };
}

export function randomRoadPoint(city, rng, nearX, nearY, minDist) {
  for (let tries = 0; tries < 40; tries++) {
    const ax = city.avenues[Math.floor(rng() * city.avenues.length)];
    const sy = city.streets[Math.floor(rng() * city.streets.length)];
    const x = ax + (rng() - 0.5) * 60;
    const y = sy + (rng() - 0.5) * 60;
    if (nearX !== undefined) {
      const d = Math.hypot(x - nearX, y - nearY);
      if (d < minDist) continue;
    }
    return { x, y };
  }
  return { x: city.avenues[2], y: city.streets[2] };
}

// Pick a point on a sidewalk (just off a road) for a pedestrian.
export function sidewalkPoint(city, rng) {
  const ax = city.avenues[Math.floor(rng() * city.avenues.length)];
  const sy = city.streets[Math.floor(rng() * city.streets.length)];
  if (rng() < 0.5) return { x: ax + (rng() < 0.5 ? -62 : 62), y: sy + (rng() - 0.5) * 300 };
  return { x: ax + (rng() - 0.5) * 300, y: sy + (rng() < 0.5 ? -62 : 62) };
}
