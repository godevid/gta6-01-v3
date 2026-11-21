// Screenshot scenes: `?shot=<name>` starts the game already playing in a staged
// moment, so each screenshot shows several systems at once — the city, a car, the
// police, the HUD with its minimap and a mission objective. The presets only move
// the player, set the clock and the wanted level and start a mission; everything
// on screen is still the live game, rendered by the same code the player plays.

import { makeCar, SPORT_COLORS } from './cars.js';
import { startMission } from './missions.js';

export function shotName() {
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('shot') || '';
  } catch {
    return '';
  }
}

function giveCar(S, x, y, angle, color) {
  const car = makeCar(x, y, angle, color, 'player');
  car.hp = 160;
  S.cars.push(car);
  S.player.car = car;
  S.player.onFoot = false;
  S.player.x = x; S.player.y = y; S.player.angle = angle;
  car.speed = 240;
  return car;
}

function addChasers(S, count) {
  // Interceptors start behind the player's heading, closing in.
  for (let i = 0; i < count; i++) {
    const behind = S.player.angle + Math.PI + (i - (count - 1) / 2) * 0.5;
    const d = 280 + i * 110;
    const car = makeCar(
      S.player.x + Math.cos(behind) * d,
      S.player.y + Math.sin(behind) * d,
      S.player.angle, '#1c3a5e', 'police',
    );
    car.speed = 320;
    S.policeCars.push(car);
  }
}

export function applyShot(S, name) {
  if (!name) return false;
  S.demoDrive = true; // autopilot keeps the scene moving for the shot
  if (name === 'cover') {
    // Sunset chase down the Neon Strip: sports car, two stars, cops behind.
    S.timeOfDay = 18.2;
    giveCar(S, 1400, 620, -Math.PI / 2, SPORT_COLORS[1]);
    S.wanted = 2;
    addChasers(S, 2);
    startMission(S, 3); // Getaway — objective banner + marker on screen
    S.dialogue = 'Ray: "The crew hit the bank on the Strip. You are the wheelman. Lose the heat!"';
    S.dialogueT = 30;
    return true;
  }
  if (name === 'chase') {
    // Full heat: four stars, night neon, three interceptors closing in.
    S.timeOfDay = 21.5;
    giveCar(S, 1000, 1000, Math.PI / 2, SPORT_COLORS[0]);
    S.wanted = 4;
    addChasers(S, 3);
    startMission(S, 5); // Neon Tide finale
    S.dialogue = 'Ray: "Last job, Rio. Every cop in Costa Verde will be on you."';
    S.dialogueT = 30;
    return true;
  }
  if (name === 'mission') {
    // On foot at the Marina collecting packages, two stars, morning light.
    S.timeOfDay = 9.5;
    S.player.x = 2700; S.player.y = 2050; S.player.onFoot = true; S.player.car = null;
    S.player.ammo = 48;
    S.wanted = 2;
    startMission(S, 2); // The Drop
    S.dialogue = 'Mara: "Three packages stashed around the Marina. Grab them all on foot."';
    S.dialogueT = 30;
    return true;
  }
  if (name === 'night') {
    // Night cruise past the park with a taxi fare on the map.
    S.timeOfDay = 22.8;
    giveCar(S, 1400, 1300, 0, SPORT_COLORS[2]);
    S.wanted = 0;
    S.taxi.offer = { x: 1750, y: 1400 };
    S.cash = 2450;
    S.player.ammo = 36;
    startMission(S, 0); // First Fare
    S.dialogue = 'Mara: "Rio, you need wheels and cash. Take my cab and pick up the tourist."';
    S.dialogueT = 30;
    return true;
  }
  return false;
}
