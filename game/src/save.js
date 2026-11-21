// Save: progress lives in localStorage under one key — cash, which story jobs
// are done, packages found, and lifetime stats. A fresh install starts clean;
// the title screen offers Continue when a save exists.

const KEY = 'neontide-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(S) {
  try {
    const data = {
      cash: S.cash,
      missionIndex: S.mission.index,
      completed: S.mission.completed.slice(),
      packages: S.packages.filter((p) => p.got).length,
      stats: S.stats,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* no storage */ }
}

export function applySave(S, data) {
  if (!data) return;
  S.cash = typeof data.cash === 'number' ? data.cash : S.cash;
  if (Array.isArray(data.completed)) S.mission.completed = data.completed.slice();
  S.mission.index = typeof data.missionIndex === 'number' ? data.missionIndex : S.mission.index;
  if (data.stats && typeof data.stats === 'object') {
    S.stats = { ...S.stats, ...data.stats };
  }
  const gotCount = typeof data.packages === 'number' ? data.packages : 0;
  for (let i = 0; i < Math.min(gotCount, S.packages.length); i++) S.packages[i].got = true;
}
