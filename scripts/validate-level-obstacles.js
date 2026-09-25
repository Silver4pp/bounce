global.window = global;
require('../src/levels.js');

const lm = new LevelManager();
const TS = 32;
const NORMAL_SAFE_UP_TILES = 2;
const NORMAL_MAX_GAP_TILES = 6;
const SPRING_UP_TILES = 7;

function tile(level, x, y) {
  if (x < 0 || x >= level.width || y < 0 || y >= level.height) return { solid: true, type: 'void' };
  return level.map[y][x];
}

function isSolid(level, x, y) {
  const t = tile(level, x, y);
  return !!(t && t.solid);
}

function surfaceNodes(level) {
  const nodes = [];
  const seen = new Set();
  for (let y = 1; y < level.height; y++) {
    for (let x = 1; x < level.width - 1; x++) {
      if (isSolid(level, x, y) && !isSolid(level, x, y - 1)) {
        const id = `${x},${y}`;
        seen.add(id);
        nodes.push({ x, y, id });
      }
    }
  }

  for (const plat of level.movingPlatforms || []) {
    const minCol = Math.floor((plat.minX || plat.x) / TS);
    const maxCol = Math.ceil(((plat.maxX || plat.x) + plat.width) / TS);
    const row = Math.floor(plat.y / TS);
    for (let x = Math.max(1, minCol); x <= Math.min(level.width - 2, maxCol); x++) {
      const id = `${x},${row}`;
      if (!seen.has(id)) {
        seen.add(id);
        nodes.push({ x, y: row, id, moving: true });
      }
    }
  }

  return nodes;
}

function nearestNode(nodes, px, py) {
  const tx = Math.floor(px / TS);
  const ty = Math.floor(py / TS) + 1;
  let best = null;
  let bestScore = Infinity;
  for (const n of nodes) {
    const score = Math.abs(n.x - tx) + Math.abs(n.y - ty);
    if (score < bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return best;
}

function canTravel(a, b, level) {
  const dx = Math.abs(a.x - b.x);
  const up = a.y - b.y;
  const down = b.y - a.y;

  if (a.y === b.y && dx === 1) return true;
  if (down >= 0 && dx <= NORMAL_MAX_GAP_TILES && down <= 5) return true;
  if (up > 0 && up <= NORMAL_SAFE_UP_TILES && dx <= NORMAL_MAX_GAP_TILES) return true;

  const hasSpringNear = (level.springs || []).some(s => {
    const sx = Math.floor(s.x / TS);
    const sy = Math.floor(s.y / TS);
    return Math.abs(sx - a.x) <= 2 && Math.abs(sy - a.y) <= 2;
  });
  if (hasSpringNear && up <= SPRING_UP_TILES && dx <= 10) return true;

  const hasVentNear = (level.vents || []).some(v => {
    const vx = Math.floor(v.x / TS);
    return Math.abs(vx - a.x) <= 2;
  });
  if (hasVentNear && up <= 9 && dx <= 8) return true;

  return false;
}

function reachableNodes(level) {
  const nodes = surfaceNodes(level);
  const start = nearestNode(nodes, level.spawn.x, level.spawn.y);
  const reached = new Set();
  const queue = [];
  if (start) {
    reached.add(start.id);
    queue.push(start);
  }

  while (queue.length) {
    const a = queue.shift();
    for (const b of nodes) {
      if (reached.has(b.id)) continue;
      if (canTravel(a, b, level)) {
        reached.add(b.id);
        queue.push(b);
      }
    }

    for (const pipe of level.warpPipes || []) {
      const pipeCol = Math.floor(pipe.enterX / TS);
      const exitCol = Math.floor(pipe.exitX / TS);
      if (Math.abs(pipeCol - a.x) <= 1) {
        const exit = nearestNode(nodes, pipe.exitX, pipe.exitY);
        if (exit && !reached.has(exit.id)) {
          reached.add(exit.id);
          queue.push(exit);
        }
        for (const b of nodes) {
          if (!reached.has(b.id) && Math.abs(b.x - exitCol) <= 3 && Math.abs(b.y - Math.floor(pipe.exitY / TS)) <= 5) {
            reached.add(b.id);
            queue.push(b);
          }
        }
      }
    }
  }

  return { nodes, reached };
}

function nearReachable(reach, px, py, maxDistTiles = 3) {
  const tx = Math.floor(px / TS);
  const ty = Math.floor(py / TS) + 1;
  return reach.nodes.some(n => reach.reached.has(n.id) && Math.abs(n.x - tx) + Math.abs(n.y - ty) <= maxDistTiles);
}

function validateLevel(index) {
  const level = lm.loadLevel(index);
  const issues = [];
  const reach = reachableNodes(level);
  const reachableCount = reach.reached.size;

  if (!level.spawn || !level.portal) issues.push('missing spawn or portal');
  if (level.targetRings > (level.totalRings || level.rings.length)) issues.push('targetRings exceeds totalRings');
  if (!nearReachable(reach, level.portal.x, level.portal.y, 8)) issues.push('portal area not structurally reachable by simplified traversal');

  for (const [i, sw] of (level.switches || []).entries()) {
    if (!nearReachable(reach, sw.x, sw.y, 4)) issues.push(`switch ${i + 1} not near reachable surface`);
    if (!(level.doors || []).some(d => d.id === sw.targetDoor)) issues.push(`switch ${i + 1} has missing target door`);
  }
  for (const [i, key] of (level.keys || []).entries()) {
    if (!nearReachable(reach, key.x, key.y, 5)) issues.push(`key ${i + 1} not near reachable surface`);
    if (!(level.doors || []).some(d => d.id === key.targetsDoor)) issues.push(`key ${i + 1} has missing target gate`);
  }

  for (const [i, pump] of (level.pumps || []).entries()) {
    if (!nearReachable(reach, pump.x, pump.y, 4)) issues.push(`pump ${i + 1} not near reachable surface`);
  }

  for (const [i, spring] of (level.springs || []).entries()) {
    if (!nearReachable(reach, spring.x, spring.y, 4)) issues.push(`spring ${i + 1} not near reachable surface`);
  }

  for (const [i, hazard] of (level.patrolHazards || []).entries()) {
    const hx1 = Math.floor(hazard.minX / TS);
    const hx2 = Math.floor(hazard.maxX / TS);
    const hasBypass = reach.nodes.some(n => reach.reached.has(n.id) && n.x >= hx1 && n.x <= hx2 && n.y <= Math.floor(hazard.y / TS));
    if (!hasBypass) issues.push(`patrol hazard ${i + 1} has no reachable bypass surface`);
  }

  return { level, issues, reachableCount, surfaceCount: reach.nodes.length };
}

const results = [];
for (let i = 0; i < lm.totalLevels; i++) {
  results.push(validateLevel(i));
}

const failures = results.filter(r => r.issues.length);
console.log(JSON.stringify({
  totalLevels: lm.totalLevels,
  passed: results.length - failures.length,
  failed: failures.length,
  failures: failures.map(r => ({ level: r.level.id, title: r.level.title, issues: r.issues }))
}, null, 2));

if (failures.length) process.exitCode = 1;
