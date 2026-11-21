// Missions: the story of Rio Vega, a getaway driver who owes the wrong people
// money, told in six jobs across Costa Verde, plus taxi fares for quick cash and
// ten hidden packages to hunt down. Each mission is a list of steps; the manager
// watches the player's position, their car and their kills, and moves the story on.

import { makeCar, SPORT_COLORS } from './cars.js';
import { makeRival } from './people.js';
import { makeRng } from './city.js';

export const MISSIONS = [
  {
    id: 'first-fare', title: 'First Fare', giver: 'Mara',
    intro: 'Mara: "Rio, you need wheels and cash. Take my cab, pick up the tourist on Ocean Ave and drop her at the Marina. No funny business."',
    reward: 250,
    steps: [
      { type: 'enterCar', text: 'Get in the cab (press E near a car)' },
      { type: 'goto', x: 1000, y: 200, r: 60, text: 'Pick up the tourist on Ocean Ave' },
      { type: 'deliver', x: 2600, y: 2200, r: 70, text: 'Drop her at the Marina' },
    ],
  },
  {
    id: 'hot-wheels', title: 'Hot Wheels', giver: 'Ray',
    intro: 'Ray: "A yellow Comet is parked by the Docks, keys in it. Lift it and bring it to my garage on 5th. Cops see you take it, they will care."',
    reward: 600,
    steps: [
      { type: 'steal', x: 2200, y: 1400, r: 60, text: 'Steal the yellow Comet at the Docks' },
      { type: 'deliver', x: 600, y: 1000, r: 70, text: 'Deliver it to Ray\'s garage' },
    ],
  },
  {
    id: 'the-drop', title: 'The Drop', giver: 'Mara',
    intro: 'Mara: "Three packages stashed around the Marina. Grab them all on foot. The cops are already sniffing around, so stay sharp."',
    reward: 800,
    steps: [
      { type: 'collect', points: [{ x: 2700, y: 2100 }, { x: 2950, y: 1900 }, { x: 2500, y: 2250 }], text: 'Collect the packages at the Marina (0/3)' },
      { type: 'deliver', x: 1400, y: 1000, r: 70, text: 'Bring them to the safehouse in the park' },
    ],
  },
  {
    id: 'getaway', title: 'Getaway', giver: 'Ray',
    intro: 'Ray: "The crew hit the bank on the Strip. You are the wheelman. Get there, then lose the heat and bring the crew home. Do not get caught."',
    reward: 1200,
    steps: [
      { type: 'goto', x: 1800, y: 200, r: 70, text: 'Reach the bank on the Neon Strip' },
      { type: 'escape', seconds: 25, text: 'Lose the cops — survive the chase!' },
      { type: 'deliver', x: 1400, y: 1000, r: 70, text: 'Bring the crew to the safehouse' },
    ],
  },
  {
    id: 'street-sweep', title: 'Street Sweep', giver: 'Mara',
    intro: 'Mara: "The Vipers took our corner at the Docks. Four of them, armed. Clear them out and the corner is ours again."',
    reward: 1500,
    steps: [
      { type: 'kill', count: 4, x: 2200, y: 1800, text: 'Take out the Vipers at the Docks (0/4)' },
      { type: 'goto', x: 1400, y: 1000, r: 70, text: 'Report back at the safehouse' },
    ],
  },
  {
    id: 'neon-tide', title: 'Neon Tide', giver: 'Ray',
    intro: 'Ray: "Last job, Rio. The goods go to the yacht at the Marina, and every cop in Costa Verde will be on you. Drive like the tide itself."',
    reward: 3000,
    steps: [
      { type: 'enterCar', text: 'Get in a car — you will need speed' },
      { type: 'deliver', x: 2900, y: 2150, r: 80, text: 'Deliver the goods to the yacht' },
      { type: 'escape', seconds: 20, text: 'Shake the last of the heat!' },
    ],
  },
];

export function missionState() {
  return {
    index: 0, active: false, step: 0, started: false,
    timer: 0, collected: 0, killed: 0,
    targets: [], // rival refs for kill steps
    marker: null, // {x, y} current objective
    banner: '', bannerT: 0,
    completed: [],
  };
}

export function packageSpots() {
  const rng = makeRng(777);
  const spots = [];
  const fixed = [
    { x: 420, y: 420 }, { x: 2620, y: 420 }, { x: 420, y: 1820 }, { x: 1820, y: 1820 },
    { x: 1020, y: 620 }, { x: 2220, y: 620 }, { x: 620, y: 1420 }, { x: 2620, y: 1020 },
    { x: 1420, y: 2200 }, { x: 1820, y: 1020 },
  ];
  for (const f of fixed) spots.push({ x: f.x + (rng() - 0.5) * 40, y: f.y + (rng() - 0.5) * 40, got: false });
  return spots;
}

function setMarker(S, x, y) {
  S.mission.marker = { x, y };
}

function say(S, text, seconds) {
  S.mission.banner = text;
  S.mission.bannerT = seconds || 5;
}

export function startMission(S, index) {
  const m = MISSIONS[index];
  if (!m) return false;
  const ms = S.mission;
  ms.index = index; ms.active = true; ms.step = 0; ms.started = true;
  ms.timer = 0; ms.collected = 0; ms.killed = 0; ms.targets = [];
  say(S, m.giver + ': ' + m.intro, 8);
  S.dialogue = m.intro;
  S.dialogueT = 8;
  if (m.id === 'the-drop') S.wanted = Math.max(S.wanted, 2);
  if (m.id === 'getaway') S.wanted = Math.max(S.wanted, 1);
  if (m.id === 'neon-tide') S.wanted = Math.max(S.wanted, 3);
  if (m.id === 'hot-wheels') {
    // Park the yellow Comet at the Docks if it is not there yet.
    const exists = S.cars.some((c) => c.special === 'comet');
    if (!exists) {
      const comet = makeCar(2200, 1400, Math.PI / 2, SPORT_COLORS[0], 'parked');
      comet.special = 'comet';
      S.cars.push(comet);
    }
  }
  enterStep(S);
  return true;
}

function enterStep(S) {
  const m = MISSIONS[S.mission.index];
  const step = m.steps[S.mission.step];
  if (!step) { finishMission(S); return; }
  S.mission.collected = 0; S.mission.killed = 0; S.mission.timer = 0;
  if (step.type === 'goto' || step.type === 'deliver') setMarker(S, step.x, step.y);
  else if (step.type === 'steal') setMarker(S, step.x, step.y);
  else if (step.type === 'collect') setMarker(S, step.points[0].x, step.points[0].y);
  else if (step.type === 'kill') {
    S.mission.targets = [];
    for (let i = 0; i < step.count; i++) {
      const r = makeRival(S.city, S.rng, step.x + (S.rng() - 0.5) * 160, step.y + (S.rng() - 0.5) * 160);
      S.rivals.push(r);
      S.mission.targets.push(r);
    }
    setMarker(S, step.x, step.y);
  } else if (step.type === 'escape') {
    S.mission.timer = step.seconds;
    S.wanted = Math.max(S.wanted, 3);
    setMarker(S, S.player.x, S.player.y);
  }
  say(S, step.text, 4);
}

function nextStep(S) {
  S.mission.step++;
  const m = MISSIONS[S.mission.index];
  if (S.mission.step >= m.steps.length) finishMission(S);
  else enterStep(S);
}

function finishMission(S) {
  const m = MISSIONS[S.mission.index];
  S.cash += m.reward;
  S.mission.completed.push(m.id);
  S.mission.active = false;
  S.mission.marker = null;
  S.stats.missionsDone++;
  S.stats.earned += m.reward;
  say(S, 'Job done: ' + m.title + ' — $' + m.reward, 6);
  S.dialogue = 'Job done: ' + m.title + '. You earned $' + m.reward + '.';
  S.dialogueT = 6;
  S.audio.jingle();
  S.saveGame();
}

function stepText(S, step) {
  if (step.type === 'collect') return 'Collect the packages (' + S.mission.collected + '/' + step.points.length + ')';
  if (step.type === 'kill') return 'Take out the Vipers (' + S.mission.killed + '/' + step.count + ')';
  if (step.type === 'escape') return 'Lose the cops — ' + Math.ceil(S.mission.timer) + 's left';
  return step.text;
}

export function currentObjective(S) {
  if (!S.mission.active) return null;
  const m = MISSIONS[S.mission.index];
  const step = m.steps[S.mission.step];
  if (!step) return null;
  return { mission: m.title, text: stepText(S, step) };
}

export function updateMission(S, dt) {
  const ms = S.mission;
  if (ms.bannerT > 0) ms.bannerT -= dt;
  if (!ms.active) return;
  const m = MISSIONS[ms.index];
  const step = m.steps[ms.step];
  if (!step) return;
  const p = S.player;
  const dist = (x, y) => Math.hypot(p.x - x, p.y - y);

  if (step.type === 'enterCar') {
    if (!p.onFoot) nextStep(S);
  } else if (step.type === 'goto' || step.type === 'deliver') {
    if (dist(step.x, step.y) < step.r) {
      if (step.type === 'deliver' && m.id === 'first-fare' && ms.step === 2) S.audio.jingle();
      nextStep(S);
    }
  } else if (step.type === 'steal') {
    if (!p.onFoot && p.car && p.car.special === 'comet') {
      S.wanted = Math.max(S.wanted, 1);
      nextStep(S);
    } else if (dist(step.x, step.y) < step.r && p.onFoot) {
      say(S, 'That yellow Comet — press E to take it', 2);
    }
  } else if (step.type === 'collect') {
    const pt = step.points[ms.collected];
    if (pt) {
      setMarker(S, pt.x, pt.y);
      if (dist(pt.x, pt.y) < 46) {
        ms.collected++;
        S.audio.pickup();
        S.particles.push({ x: pt.x, y: pt.y, t: 0.6, color: '#ffd319', kind: 'ring' });
        say(S, 'Collect the packages (' + ms.collected + '/' + step.points.length + ')', 3);
        if (ms.collected >= step.points.length) nextStep(S);
      }
    }
  } else if (step.type === 'kill') {
    ms.killed = step.count - ms.targets.filter((r) => r.hp > 0).length;
    if (ms.killed >= step.count) nextStep(S);
  } else if (step.type === 'escape') {
    ms.timer -= dt;
    setMarker(S, p.x, p.y);
    if (S.wanted <= 0) { nextStep(S); return; }
    if (ms.timer <= 0) {
      S.wanted = 0;
      say(S, 'You lost them. Clean getaway.', 4);
      nextStep(S);
    }
  }
}

// ---- Taxi fares: quick cash while driving. ----
export function maybeOfferFare(S) {
  if (S.taxi.active || S.taxi.cooldown > 0) return;
  if (!S.player.car || S.player.onFoot) return;
  S.taxi.cooldown = 14 + S.rng() * 10;
  const p = S.player;
  const px = p.x + (S.rng() - 0.5) * 500;
  const py = p.y + (S.rng() - 0.5) * 500;
  S.taxi.offer = { x: Math.max(80, Math.min(3120, px)), y: Math.max(80, Math.min(2320, py)) };
}

export function updateTaxi(S, dt) {
  const t = S.taxi;
  if (t.cooldown > 0) t.cooldown -= dt;
  if (!t.active && !t.offer) { maybeOfferFare(S); return; }
  const p = S.player;
  if (t.offer && !t.active) {
    if (Math.hypot(p.x - t.offer.x, p.y - t.offer.y) < 70 && !p.onFoot) {
      t.active = true;
      t.phase = 'ride';
      const dest = { x: 200 + S.rng() * 2800, y: 200 + S.rng() * 2000 };
      t.dest = dest;
      t.fare = 120 + Math.floor(S.rng() * 180);
      t.offer = null;
      say(S, 'Passenger: "Take me to the marker — $' + t.fare + ' if you hurry."', 5);
    }
    return;
  }
  if (t.active) {
    t.timer -= dt;
    if (t.timer <= 0) {
      say(S, 'Too slow — the passenger got out.', 4);
      t.active = false;
      return;
    }
    if (Math.hypot(p.x - t.dest.x, p.y - t.dest.y) < 70) {
      S.cash += t.fare;
      S.stats.earned += t.fare;
      say(S, 'Fare complete: +$' + t.fare, 4);
      S.audio.jingle();
      t.active = false;
      t.cooldown = 10;
      S.saveGame();
    }
  }
}

export function taxiState() {
  return { active: false, offer: null, dest: null, fare: 0, timer: 60, cooldown: 8, phase: '' };
}
