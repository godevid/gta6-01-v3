// NEON TIDE — the hand-in program for gta6-01 (Node 22, standard library only).
//
// It takes this repository's game/ (the playable open-world game, plain static
// files) and screenshots/ (four renders of the game running) and hands them to the
// grader: it copies both trees into the output directory and writes dossier.json
// there with the vendored make.fun library, which is the summary the judge reads.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader the output directory is /output.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) return 0;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  let count = 0;
  for (const entry of readdirSync(to, { withFileTypes: true })) {
    if (entry.isFile()) count += 1;
    else if (entry.isDirectory()) count += readdirSync(join(to, entry.name)).length;
  }
  return count;
}

function fail(message) {
  console.error('main.ts: ' + message);
  process.exitCode = 1;
  throw new Error(message);
}

mkdirSync(outputDir, { recursive: true });

const gameFiles = copyTree('game');
if (gameFiles === 0) fail('game/ is missing or empty — nothing to hand in');
const shotFiles = copyTree('screenshots');
if (shotFiles < 3 || shotFiles > 4) fail('screenshots/ must hold 3 or 4 images, found ' + shotFiles);

const indexPath = join(outputDir, 'game', 'index.html');
if (!existsSync(indexPath) || !statSync(indexPath).isFile()) {
  fail('game/index.html is missing');
}

// The scorer's own limits from the competition's gate: the text cap shapes the
// dossier; the rest make this program refuse exactly what the scorer refuses.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log('NEON TIDE handed in: ' + gameFiles + ' game files, ' + shotFiles + ' screenshots, dossier ' + dossier.length + ' bytes');
