# NEON TIDE — an open-world crime game in Costa Verde

A complete, original open-world crime game for the make.fun **gta6-01** bounty,
built from scratch in this repository. It plays offline in a desktop browser from
static files — no libraries, no network requests, no build step.

You are **Rio Vega**, a getaway driver broke in the sun-soaked coastal city of
**Costa Verde**. Six story missions take you from a first taxi fare to a final
run to the yacht at the Marina, with the whole city's police force on your tail.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Walk or drive |
| E | Enter, steal or exit a car (E near the gun shop buys ammo) |
| Mouse + click | Aim and shoot |
| F | Punch |
| Space | Handbrake |
| T | Call in a taxi fare while driving |
| J | Take the next story job |
| P | Pause · H help · M mute |

## What is in the city

- **A city on foot and by car** — a road grid of avenues and streets, Old Town,
  the Neon Strip, Palm Heights, the Docks, Marina Bay, a central park, a plaza,
  a beach and an ocean edge.
- **Traffic and pedestrians** — cars follow the road graph and stop for the car
  ahead; pedestrians stroll the sidewalks and flee gunfire and crashes.
- **Stealing cars** — lift a parked car for free, or pull a driver out of a
  moving one and take the heat that comes with it. Police interceptors can be
  stolen too.
- **Wanted system and police** — 0–5 stars. Crimes raise the heat; police cars
  chase and ram, officers on foot move in to arrest you. Lose them and the heat
  cools; get caught and you are busted, run out of health and you are wasted.
  Either way you lose cash and wake up at the safehouse.
- **Missions and a story** — six jobs from Mara and Ray: a first fare, a stolen
  Comet, a package drop at the Marina, a bank getaway, clearing the Vipers off
  the Docks, and the final Neon Tide run. Plus taxi fares for quick cash.
- **Combat** — pistol with mouse aim, punching, rival gang members who shoot
  back, car damage and smoke, explosions.
- **HUD with a minimap** — cash, health, armour, ammo, wanted stars, district
  and clock, mission objective banner, story dialogue, speedometer, and a live
  minimap with police and objective blips.
- **A start and a save** — title screen with Continue, progress autosaves to
  localStorage (cash, jobs done, packages, stats).
- **Polish** — day/night cycle with dusk and headlights, a spray shop that
  repairs your car and clears your record, a gun shop, ten hidden $ packages,
  synthesised WebAudio sound (engine, sirens, gunshots, jingles, night bass).

## Structure

```
main.ts            hand-in program: copies game/ + screenshots/ to /output,
                   writes dossier.json with vendor/makefun-game.ts
game/index.html    the page: one canvas, one module script
game/src/main.js   boot, input, game loop, state
game/src/city.js   the city: roads, blocks, buildings, road graph, collision
game/src/cars.js   driving physics, traffic AI, police interceptors
game/src/people.js pedestrians, rivals, officers on foot
game/src/missions.js  six story jobs, taxi fares, hidden packages
game/src/combat.js shooting, health, wanted level, busted / wasted
game/src/hud.js    renderer, HUD, minimap, menus
game/src/audio.js  synthesised WebAudio sound, no audio files
game/src/save.js   localStorage save / load
game/src/shots.js  ?shot= scenes for the screenshots (cover, chase, mission, night)
serve.ts           local static server for development
```

## Screenshots

The four screenshots in `screenshots/` are real renders of this game's own code,
taken in headless Chromium with `?shot=cover`, `?shot=chase`, `?shot=mission`
and `?shot=night`.

## License

MIT — see `LICENSE`. Everything here is original: the city, characters, vehicles,
names, story, art and sound are the author's own, with nothing from any
commercial game.
