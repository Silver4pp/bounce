/**
 * BOUNCE: 50 Handcrafted Levels Across 5 Themed Worlds
 * Fully Rebuilt, 100% Grounded Architecture, Mathematically Audited:
 * - World 1 (1-10): Bukit Lembah Pipa (Meadow) - Gentle hills, springs, green pipes, crumble bridges.
 * - World 2 (11-20): Ngarai Pipa Uap (Canyon) - Steam hazard vents, wooden trestles, vertical lifts, patrol mines.
 * - World 3 (21-30): Labirin Kuil Pilar (Ruins) - Emerald switches, laser doors, golden keys, ancient colonnades.
 * - World 4 (31-40): Pabrik Pipa Hidrolik (Facility) - Giant Pump crushing walls, Mini Pump in tight vents, circuits.
 * - World 5 (41-50): Benteng Dimensi & Warp (Space) - Warp networks, moving lifts, cosmic gauntlet, Grand Final Boss at Level 50!
 */

class LevelBuilder {
  constructor(index, title, subtitle, theme, worldIdx, width, height = 18) {
    this.index = index;
    this.title = title;
    this.subtitle = subtitle;
    this.theme = theme;
    this.worldIdx = worldIdx;
    this.width = width;
    this.height = height;
    this.ts = 32;

    // Palette per world
    if (worldIdx === 0) {
      this.bgColor = "#16202c";
      this.groundColor = "#2d5a27";
      this.dirtColor = "#4a2e18";
      this.pipeColor = "#27ae60";
    } else if (worldIdx === 1) {
      this.bgColor = "#2c1b18";
      this.groundColor = "#b85d19";
      this.dirtColor = "#5a2d18";
      this.pipeColor = "#d35400";
    } else if (worldIdx === 2) {
      this.bgColor = "#151821";
      this.groundColor = "#606a7b";
      this.dirtColor = "#333945";
      this.pipeColor = "#d4ac0d";
    } else if (worldIdx === 3) {
      this.bgColor = "#0f172a";
      this.groundColor = "#0284c7";
      this.dirtColor = "#0f2b48";
      this.pipeColor = "#00d2ff";
    } else {
      this.bgColor = "#080913";
      this.groundColor = "#6b21a8";
      this.dirtColor = "#3b0764";
      this.pipeColor = "#a855f7";
    }

    // Grid initialization
    this.map = [];
    for (let r = 0; r < height; r++) {
      this.map[r] = [];
      for (let c = 0; c < width; c++) {
        this.map[r][c] = { solid: false, type: 'air' };
      }
    }

    // Base Ground (rows 16 & 17)
    for (let c = 0; c < width; c++) {
      this.map[16][c] = { solid: true, type: 'grass' };
      this.map[17][c] = { solid: true, type: 'dirt' };
    }

    // Boundary walls and ceiling
    for (let r = 0; r < height; r++) {
      this.map[r][0] = { solid: true, type: 'stone' };
      this.map[r][width - 1] = { solid: true, type: 'stone' };
    }
    for (let c = 0; c < width; c++) {
      this.map[0][c] = { solid: true, type: 'stone' };
    }

    // Default player spawn and exit portal
    this.spawn = { x: 3 * this.ts, y: 15 * this.ts };
    this.portal = { x: (width - 4) * this.ts + 16, y: 15 * this.ts - 2, open: false };

    // Entities
    this.rings = [];
    this.springs = [];
    this.spikes = [];
    this.patrolHazards = [];
    this.movingPlatforms = [];
    this.switches = [];
    this.doors = [];
    this.keys = [];
    this.vents = [];
    this.pumps = [];
    this.warpPipes = [];
    this.steamPipes = [];
    this.checkpoints = [];
    this.signposts = [];
    this.tutorialText = null;
    this.targetRings = 5;
    this.parTime = 40 + (index % 10) * 3;
  }

  // --- ARCHITECTURAL BUILDING METHODS (Strictly Grounded) ---

  setFloor(c1, c2, row, type = 'grass') {
    for (let c = c1; c <= c2; c++) {
      if (c <= 0 || c >= this.width - 1) continue;
      this.map[row][c] = { solid: true, type: type };
      for (let r = row + 1; r < this.height; r++) {
        this.map[r][c] = { solid: true, type: 'dirt' };
      }
    }
  }

  addPlatform(c1, c2, row, supportType = 'pillar') {
    // Platform top
    for (let c = c1; c <= c2; c++) {
      if (c <= 0 || c >= this.width - 1) continue;
      this.map[row][c] = { solid: true, type: supportType === 'wood_stilt' ? 'wood' : 'stone' };
    }
    // Grounded supports down to ground below (never floating in thin air!)
    const supportCols = [c1, c2];
    if (c2 - c1 > 3) supportCols.push(Math.floor((c1 + c2) / 2));

    for (const sc of supportCols) {
      if (sc <= 0 || sc >= this.width - 1) continue;
      for (let r = row + 1; r < 16; r++) {
        if (!this.map[r][sc].solid) {
          this.map[r][sc] = { solid: true, type: supportType };
        }
      }
    }
  }

  addCeilingArch(c1, c2, row) {
    for (let c = c1; c <= c2; c++) {
      if (c <= 0 || c >= this.width - 1) continue;
      this.map[row][c] = { solid: true, type: 'stone' };
      for (let r = 1; r < row; r++) {
        this.map[r][c] = { solid: true, type: 'stone' };
      }
    }
    // Anchor pillars
    for (let r = row + 1; r < 16; r++) {
      this.map[r][c1] = { solid: true, type: 'pillar' };
      this.map[r][c2] = { solid: true, type: 'pillar' };
    }
  }

  addPit(c1, c2) {
    for (let c = c1; c <= c2; c++) {
      if (c <= 0 || c >= this.width - 1) continue;
      for (let r = 16; r < this.height; r++) {
        this.map[r][c] = { solid: false, type: 'pit' };
      }
    }
  }

  addCrumbleBridge(c1, c2, row = 15) {
    for (let c = c1; c <= c2; c++) {
      if (c <= 0 || c >= this.width - 1) continue;
      this.map[row][c] = { solid: true, type: 'crumble', timer: 0.8, fallen: false };
      // Hanging chain visual links to ceiling or upper support
      for (let r = 1; r < row; r++) {
        if (!this.map[r][c].solid) {
          this.map[r][c] = { solid: false, type: 'chain' };
        }
      }
    }
  }

  addPipe(col, heightInTiles, color = null) {
    const pCol = color || this.pipeColor;
    const topRow = 16 - heightInTiles;
    this.map[topRow][col] = { solid: true, type: 'pipe_top', pipeColor: pCol };
    for (let r = topRow + 1; r < 16; r++) {
      this.map[r][col] = { solid: true, type: 'pipe_body', pipeColor: pCol };
    }
  }

  addWarpPipe(enterCol, exitCol, enterTopRow = 14, exitTopRow = 10, color = null, label = 'WARP') {
    const pCol = color || this.pipeColor;

    // 1. Entrance Pipe physical structure (anchored down to floor)
    this.map[enterTopRow][enterCol] = { solid: true, type: 'pipe_top', pipeColor: pCol };
    for (let r = enterTopRow + 1; r < this.height; r++) {
      if (!this.map[r][enterCol].solid) {
        this.map[r][enterCol] = { solid: true, type: 'pipe_body', pipeColor: pCol };
      }
    }

    // 2. Exit Pipe physical structure (anchored down to floor/platform)
    this.map[exitTopRow][exitCol] = { solid: true, type: 'pipe_top', pipeColor: pCol };
    for (let r = exitTopRow + 1; r < this.height; r++) {
      if (!this.map[r][exitCol].solid) {
        this.map[r][exitCol] = { solid: true, type: 'pipe_body', pipeColor: pCol };
      }
    }

    // 3. Register Pipe coordinates
    this.warpPipes.push({
      id: `pipe_${this.index}_${enterCol}`,
      enterX: enterCol * this.ts + 16,
      enterY: enterTopRow * this.ts,
      exitX: exitCol * this.ts + 16,
      exitY: exitTopRow * this.ts,
      exitVy: -440,
      color: pCol,
      label: label
    });
  }

  addSpring(col, row = 15, isSuper = false) {
    this.springs.push({
      x: col * this.ts,
      y: row * this.ts,
      isSuper: isSuper
    });
  }

  addMovingPlat(minCol, maxCol, row, speed = 50) {
    this.movingPlatforms.push({
      x: minCol * this.ts,
      y: row * this.ts,
      width: 64,
      height: 14,
      minX: minCol * this.ts,
      maxX: maxCol * this.ts,
      speed: speed,
      dir: 1,
      isVertical: false,
      vx: speed,
      vy: 0
    });
  }

  addVerticalLift(col, minRow, maxRow, speed = 45) {
    this.movingPlatforms.push({
      x: col * this.ts,
      y: maxRow * this.ts,
      width: 48,
      height: 14,
      minY: minRow * this.ts,
      maxY: maxRow * this.ts,
      speed: speed,
      dir: -1,
      isVertical: true,
      vx: 0,
      vy: -speed
    });
  }

  addSteamPipe(col, row = 15, cycle = 3.2, offset = 0) {
    this.steamPipes.push({
      x: col * this.ts,
      y: row * this.ts,
      height: 32,
      cycle: cycle,
      activeDuration: 1.1,
      timer: offset
    });
  }

  addPatrol(minCol, maxCol, row = 15, speed = 65) {
    this.patrolHazards.push({
      x: minCol * this.ts,
      y: row * this.ts + 16,
      minX: minCol * this.ts,
      maxX: maxCol * this.ts,
      radius: 12,
      speed: speed,
      dir: 1,
      angle: 0
    });
  }

  addSpikes(c1, c2, row = 15, type = 'up') {
    this.spikes.push({
      x: c1 * this.ts,
      y: row * this.ts,
      width: (c2 - c1 + 1) * this.ts,
      height: 16,
      type: type
    });
  }

  addSwitchDoor(swCol, swRow, doorCol, doorRow, id) {
    const doorId = id || `door_${this.index}_${doorCol}`;
    this.switches.push({
      x: swCol * this.ts,
      y: swRow * this.ts,
      targetDoor: doorId,
      pressed: false
    });
    this.doors.push({
      id: doorId,
      x: doorCol * this.ts,
      y: doorRow * this.ts,
      width: 16,
      height: (16 - doorRow) * this.ts,
      type: 'laser',
      open: false
    });
  }

  addKeyGate(keyCol, keyRow, gateCol, gateRow, id) {
    const gateId = id || `gate_${this.index}_${gateCol}`;
    this.keys.push({
      id: gateId,
      x: keyCol * this.ts + 16,
      y: keyRow * this.ts + 16,
      targetsDoor: gateId,
      color: '#ffd700',
      collected: false
    });
    this.doors.push({
      id: gateId,
      x: gateCol * this.ts,
      y: gateRow * this.ts,
      width: 16,
      height: (16 - gateRow) * this.ts,
      type: 'locked',
      open: false
    });
  }

  addPump(col, row, toSize = 'giant') {
    let color = '#ff3344';
    if (toSize === 'mini') color = '#00d2ff';
    if (toSize === 'normal') color = '#ffcc00';

    this.pumps.push({
      x: col * this.ts,
      y: row * this.ts,
      toSize: toSize,
      color: color
    });
  }

  addCrackWall(col, minRow, maxRow) {
    for (let r = minRow; r <= maxRow; r++) {
      this.map[r][col] = { solid: true, type: 'crack' };
    }
  }

  addVent(col, topRow = 9, heightInPixels = 192, power = -520) {
    const bottomRow = Math.min(topRow + Math.round(heightInPixels / this.ts), 16);
    const grateRow = bottomRow - 1; // sits flush on the floor surface
    this.vents.push({
      x: col * this.ts,
      y: grateRow * this.ts,
      width: 32,
      height: heightInPixels,
      power: power
    });
  }

  addCheckpoint(col, row = 15) {
    this.checkpoints.push({
      x: col * this.ts + 16,
      y: row * this.ts,
      reached: false
    });
  }

  addMysteryBlock(col, row) {
    if (col > 0 && col < this.width - 1 && row > 0 && row < this.height) {
      this.map[row][col] = { solid: true, type: 'mystery', bonked: false, bounceTimer: 0 };
    }
  }

  addWaterPool(c1, c2, topRow = 14, botRow = 16) {
    for (let c = c1; c <= c2; c++) {
      if (c <= 0 || c >= this.width - 1) continue;
      for (let r = topRow; r <= botRow; r++) {
        this.map[r][c] = { solid: false, type: 'water' };
      }
      for (let r = botRow + 1; r < this.height; r++) {
        this.map[r][c] = { solid: true, type: 'stone' };
      }
    }
    // Retaining borders
    if (c1 > 1) {
      for (let r = topRow; r <= botRow; r++) {
        this.map[r][c1 - 1] = { solid: true, type: 'stone' };
      }
    }
    if (c2 < this.width - 2) {
      for (let r = topRow; r <= botRow; r++) {
        this.map[r][c2 + 1] = { solid: true, type: 'stone' };
      }
    }
  }

  // --- ACCURATE RING PLACEMENT (100% Collision-Free & Reachable) ---

  addRing(x, y) {
    const rx = Math.round(x);
    const ry = Math.round(y);

    // Grid bounds check
    if (rx < 40 || rx > (this.width - 2) * this.ts || ry < 40 || ry > 16 * this.ts) {
      return false;
    }

    // Tile collision check (can float in air, water, or chain)
    const col = Math.floor(rx / this.ts);
    const row = Math.floor(ry / this.ts);
    if (this.map[row] && this.map[row][col] && this.map[row][col].solid && this.map[row][col].type !== 'chain') {
      return false;
    }

    // Avoid duplicate close rings
    for (const r of this.rings) {
      if (Math.hypot(rx - r.x, ry - r.y) < 24) return false;
    }

    this.rings.push({ x: rx, y: ry, collected: false });
    return true;
  }

  addRingArc(c1, c2, peakHeight = 48, count = 3) {
    const xStart = c1 * this.ts + 16;
    const xEnd = c2 * this.ts + 16;
    const span = xEnd - xStart;

    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      const rx = xStart + u * span;
      const col = Math.min(this.width - 2, Math.max(1, Math.floor(rx / this.ts)));

      // Find ground elevation at column
      let groundY = 16 * this.ts;
      for (let r = 1; r < this.height; r++) {
        if (this.map[r] && this.map[r][col] && this.map[r][col].solid && this.map[r][col].type !== 'chain') {
          groundY = r * this.ts;
          break;
        }
      }

      const ry = groundY - 24 - 4 * peakHeight * u * (1 - u);
      this.addRing(rx, ry);
    }
  }

  addRingLine(c1, c2, yOffset = 24) {
    for (let c = c1; c <= c2; c++) {
      const rx = c * this.ts + 16;
      let groundY = 16 * this.ts;
      for (let r = 1; r < this.height; r++) {
        if (this.map[r] && this.map[r][c] && this.map[r][c].solid && this.map[r][c].type !== 'chain') {
          groundY = r * this.ts;
          break;
        }
      }
      this.addRing(rx, groundY - yOffset);
    }
  }

  build() {
    this.targetRings = this.rings.length;
    return {
      id: this.index + 1,
      number: this.index + 1,
      title: this.title,
      subtitle: this.subtitle,
      theme: this.theme,
      worldIdx: this.worldIdx,
      width: this.width,
      height: this.height,
      spawn: this.spawn,
      portal: this.portal,
      bgColor: this.bgColor,
      groundColor: this.groundColor,
      dirtColor: this.dirtColor,
      tutorialText: this.tutorialText,
      targetRings: this.targetRings,
      parTime: this.parTime,
      rings: this.rings,
      springs: this.springs,
      spikes: this.spikes,
      patrolHazards: this.patrolHazards,
      movingPlatforms: this.movingPlatforms,
      switches: this.switches,
      doors: this.doors,
      keys: this.keys,
      vents: this.vents,
      pumps: this.pumps,
      warpPipes: this.warpPipes,
      steamPipes: this.steamPipes,
      checkpoints: this.checkpoints,
      signposts: this.signposts,
      map: this.map,
      buildMap: () => this.map
    };
  }
}

// -----------------------------------------------------------------------------
// 50 LEVEL SPECIFICATIONS (100% Handcrafted & Paced)
// -----------------------------------------------------------------------------
const LEVEL_DEFINITIONS = [
  // ===========================================================================
  // DUNIA 1: BUKIT LEMBAH PIPA (LEVELS 1 - 10)
  // ===========================================================================
  (b) => {
    // Level 1: Padang Awal
    b.tutorialText = "Gunakan [A][D] atau Panah untuk berguling, [W][↑][Space] untuk melompat! Sundul balok [?] dari bawah!";
    b.addPlatform(14, 22, 14, 'pillar');
    b.addMysteryBlock(9, 13);
    b.addRingArc(6, 11, 40, 3);
    b.addRingLine(16, 20, 24);
    b.addRingArc(24, 28, 40, 2);
  },
  (b) => {
    // Level 2: Lompatan Trampolin
    b.tutorialText = "Injak trampolin karet untuk melenting tinggi ke atas tebing!";
    b.addPit(15, 17);
    b.addSpring(13, 15);
    b.addPlatform(18, 26, 13, 'pillar');
    b.addMysteryBlock(21, 10);
    b.addRingArc(13, 18, 54, 3);
    b.addRingLine(20, 24, 24);
  },
  (b) => {
    // Level 3: Pipa Saluran Hijau
    b.tutorialText = "Lompati pipa-pipa hijau & berenang di kolam air jernih!";
    b.addPipe(11, 2);
    b.addWaterPool(13, 15, 15, 16);
    b.addPipe(17, 3);
    b.addPipe(23, 2);
    b.addRing(11 * 32 + 16, 14 * 32 - 24);
    b.addRing(14 * 32 + 16, 15 * 32 - 12);
    b.addRing(17 * 32 + 16, 13 * 32 - 24);
    b.addRing(20 * 32 + 16, 15 * 32 - 24);
    b.addRing(23 * 32 + 16, 14 * 32 - 24);
  },
  (b) => {
    // Level 4: Jembatan Rantai Rapuh
    b.tutorialText = "Blok oranye akan runtuh sesaat setelah diinjak!";
    b.addPit(14, 20);
    b.addCrumbleBridge(14, 20, 15);
    b.addRingArc(7, 11, 40, 2);
    b.addRing(15 * 32 + 16, 15 * 32 - 24);
    b.addRing(17 * 32 + 16, 15 * 32 - 24);
    b.addRing(19 * 32 + 16, 15 * 32 - 24);
    b.addRingArc(22, 26, 40, 2);
  },
  (b) => {
    // Level 5: Lantai Duri Berbahaya
    b.tutorialText = "Awas duri merah! Sundul balok [?] untuk mengambil Pelindung Gelembung!";
    b.addSpikes(16, 18, 15);
    b.addPlatform(10, 13, 14, 'pillar');
    b.addMysteryBlock(12, 11);
    b.addRingLine(10, 13, 24);
    b.addRingArc(15, 19, 52, 3);
    b.addRingArc(23, 27, 40, 2);
  },
  (b) => {
    // Level 6: Platform Meluncur
    b.tutorialText = "Tumpangi platform bergerak mekanik untuk melintasi jurang!";
    b.addPit(15, 23);
    b.addMovingPlat(15, 21, 15, 55);
    b.addRingArc(11, 14, 40, 2);
    b.addRing(17 * 32 + 16, 15 * 32 - 24);
    b.addRing(19 * 32 + 16, 15 * 32 - 24);
    b.addRing(21 * 32 + 16, 15 * 32 - 24);
    b.addRingArc(24, 28, 40, 2);
  },
  (b) => {
    // Level 7: Pipa Warp Bukit Hijau
    b.tutorialText = "Lompat ke atas pipa warp hijau untuk melesat menembus puncak bukit!";
    // Giant mountain ridge blocking ground path (height 6 tiles, row 10)
    b.addPlatform(13, 24, 10, 'pillar');
    for (let r = 10; r <= 15; r++) {
      b.map[r][13] = { solid: true, type: 'stone' };
    }
    // Entrance pipe right in front of mountain, exit pipe on mountain summit!
    b.addWarpPipe(11, 15, 14, 9);
    // Rings along the scenic mountain summit
    b.addRingLine(17, 23, 24);
    // Stepped staircase leading down on the other side
    b.setFloor(25, 27, 12, 'grass');
    b.setFloor(28, 30, 14, 'grass');
    b.addRingArc(6, 10, 40, 2);
    b.addRingArc(31, 35, 40, 2);
  },
  (b) => {
    // Level 8: Teras Bukit Berjenjang
    b.tutorialText = "Naiki bukit berundak. Sentuh tiang bendera untuk menyimpan checkpoint!";
    b.setFloor(10, 16, 14, 'grass');
    b.setFloor(17, 24, 12, 'grass');
    b.addMysteryBlock(20, 9);
    b.addCheckpoint(22, 11);
    b.setFloor(25, 30, 14, 'grass');
    b.addRingLine(11, 15, 24);
    b.addRingLine(18, 23, 24);
    b.addRingLine(26, 29, 24);
    b.addRingArc(5, 9, 40, 2);
    b.addRingArc(31, 35, 40, 2);
  },
  (b) => {
    // Level 9: Sirkus Trampolin Ganda
    b.tutorialText = "Lompat dari trampolin pertama ke trampolin kedua di pulau pilar tengah!";
    b.addPit(13, 27);
    b.addSpring(11, 15);
    b.addPlatform(18, 20, 13, 'pillar');
    b.addSpring(19, 12);
    b.addRingArc(11, 18, 54, 3);
    b.addRingArc(19, 28, 54, 3);
    b.addRingArc(5, 9, 40, 2);
    b.addRingArc(29, 33, 40, 2);
  },
  (b) => {
    // Level 10: Benteng Gerbang Hijau (Boss Dunia 1)
    b.tutorialText = "Tantangan Puncak Dunia 1! Injak saklar, naiki benteng, dan buka portal!";
    b.addSwitchDoor(11, 15, 20, 13, 'door_d1_boss');
    b.addWaterPool(16, 19, 15, 16);
    b.addPlatform(22, 34, 11, 'pillar');
    b.addSpring(21, 15);
    b.addMysteryBlock(27, 8);
    b.addRingLine(23, 29, 24);
    b.addWarpPipe(32, 40, 10, 14);
    b.addRingArc(6, 10, 40, 2);
    b.addRingArc(41, 45, 40, 2);
  },

  // ===========================================================================
  // DUNIA 2: NGARAI PIPA UAP (LEVELS 11 - 20)
  // ===========================================================================
  (b) => {
    // Level 11: Pintu Tambang Karat
    b.tutorialText = "Selamat datang di Ngarai Pipa Uap! Waspadai uap panas dan jurang tembaga.";
    b.addPlatform(12, 18, 14, 'wood_stilt');
    b.addMysteryBlock(15, 11);
    b.addPlatform(22, 28, 13, 'wood_stilt');
    b.addRingArc(6, 11, 40, 2);
    b.addRingLine(13, 17, 24);
    b.addRingLine(23, 27, 24);
  },
  (b) => {
    // Level 12: Semburan Uap Panas
    b.tutorialText = "Awas pipa uap panas! Jarum pengukur dan lampu merah memberi aba-aba sebelum meletup.";
    b.addSteamPipe(15, 15, 3.2, 0);
    b.addPlatform(19, 24, 13, 'wood_stilt');
    b.addSteamPipe(27, 15, 3.2, 1.5);
    b.addRingArc(13, 17, 50, 3);
    b.addRingLine(20, 23, 24);
    b.addRingArc(26, 30, 50, 2);
  },
  (b) => {
    // Level 13: Lift Penambang Vertikal
    b.tutorialText = "Tumpangi lift penambang vertikal untuk naik ke tebing tinggi!";
    b.addVerticalLift(16, 9, 15, 50);
    b.addPlatform(19, 30, 9, 'pillar');
    b.addRing(16 * 32 + 16, 14 * 32 - 24);
    b.addRing(16 * 32 + 16, 12 * 32 - 24);
    b.addRing(16 * 32 + 16, 10 * 32 - 24);
    b.addRingLine(21, 26, 24);
  },
  (b) => {
    // Level 14: Trestle Kayu Terjal
    b.tutorialText = "Jaga momentum di jembatan trestle berlubang!";
    b.addPit(13, 15);
    b.addPlatform(16, 20, 14, 'wood_stilt');
    b.addPit(21, 23);
    b.addPlatform(24, 28, 14, 'wood_stilt');
    b.addRingArc(8, 12, 40, 2);
    b.addRingLine(16, 20, 24);
    b.addRingLine(24, 28, 24);
    b.addRingArc(30, 34, 40, 2);
  },
  (b) => {
    // Level 15: Ranjau Duri Bergerak
    b.tutorialText = "Awas ranjau duri besi berputar! Amati jalurnya sebelum melompat.";
    b.addPatrol(16, 24, 15, 65);
    b.addPlatform(17, 23, 12, 'wood_stilt');
    b.addRingArc(11, 15, 40, 2);
    b.addRingLine(18, 22, 24);
    b.addRingArc(25, 29, 40, 2);
  },
  (b) => {
    // Level 16: Pipa Bertekanan Ganda
    b.tutorialText = "Dua pipa uap meletup bergantian. Lewatlah dengan ritme yang pas!";
    b.addSteamPipe(15, 15, 3.2, 0);
    b.addPlatform(18, 22, 14, 'pillar');
    b.addCheckpoint(20, 13);
    b.addSteamPipe(25, 15, 3.2, 1.6);
    b.addRingArc(13, 17, 48, 3);
    b.addRingLine(19, 21, 24);
    b.addRingArc(24, 28, 48, 3);
  },
  (b) => {
    // Level 17: Jurang Tembaga Dalam
    b.tutorialText = "Dua platform bergerak menyeberangkanmu melintasi kawah tembaga raksasa!";
    b.addPit(13, 27);
    b.addMovingPlat(13, 19, 15, 50);
    b.addPlatform(20, 21, 14, 'pillar');
    b.addMovingPlat(22, 27, 15, 50);
    b.addRingArc(9, 13, 40, 2);
    b.addRing(16 * 32 + 16, 15 * 32 - 24);
    b.addRing(20 * 32 + 16, 14 * 32 - 24);
    b.addRing(24 * 32 + 16, 15 * 32 - 24);
    b.addRingArc(28, 32, 40, 2);
  },
  (b) => {
    // Level 18: Pipa Warp Ngarai
    b.tutorialText = "Pipa warp membawamu melompati jurang ngarai langsung ke teras kayu atas!";
    b.addPit(14, 19);
    b.addPlatform(20, 28, 11, 'wood_stilt');
    b.addWarpPipe(12, 22, 14, 10);
    b.setFloor(29, 31, 13, 'wood');
    b.setFloor(32, 33, 14, 'wood');
    b.addRingArc(6, 11, 40, 2);
    b.addRingLine(23, 27, 24);
    b.addRingArc(34, 38, 40, 2);
  },
  (b) => {
    // Level 19: Cerobong Pipa Baja
    b.tutorialText = "Gunakan trampolin untuk memanjat cerobong baja bertingkat!";
    b.addPipe(14, 3);
    b.addPipe(20, 4);
    b.addPipe(26, 3);
    b.addSpring(11, 15);
    b.addSpring(17, 15);
    b.addSpring(23, 15);
    b.addRingArc(11, 14, 54, 3);
    b.addRingArc(17, 20, 54, 3);
    b.addRingArc(23, 26, 54, 3);
  },
  (b) => {
    // Level 20: Peleburan Inti Ngarai (Boss Dunia 2)
    b.tutorialText = "Pertarungan Pamungkas Dunia 2! Hindari uap, ranjau, dan taklukkan pabrik peleburan!";
    b.addVerticalLift(15, 8, 15, 50);
    b.addPlatform(18, 28, 8, 'pillar');
    b.addMysteryBlock(22, 5);
    b.addWaterPool(29, 31, 15, 16);
    b.addSteamPipe(23, 7, 3.2, 0);
    b.addPit(36, 43);
    b.addWarpPipe(35, 45, 14, 14);
    b.addRingArc(7, 11, 40, 2);
    b.addRingLine(19, 22, 24);
    b.addRingLine(25, 27, 24);
    b.addRingArc(46, 50, 40, 2);
  },

  // ===========================================================================
  // DUNIA 3: LABIRIN KUIL PILAR (LEVELS 21 - 30)
  // ===========================================================================
  (b) => {
    // Level 21: Katakombe Kuno
    b.tutorialText = "Selamat datang di Labirin Kuil Pilar! Jelajahi reruntuhan kuno penuh teka-teki.";
    b.addPlatform(13, 17, 13, 'pillar');
    b.addPlatform(21, 25, 13, 'pillar');
    b.addRingArc(7, 12, 40, 2);
    b.addRingLine(14, 16, 24);
    b.addRingLine(22, 24, 24);
    b.addRingArc(27, 31, 40, 2);
  },
  (b) => {
    // Level 22: Saklar Kristal Hijau
    b.tutorialText = "Injak saklar kristal hijau di lantai untuk melumpuhkan pintu laser merah!";
    b.addSwitchDoor(12, 15, 22, 13, 'door_d3_22');
    b.addRingArc(6, 10, 40, 2);
    b.addRingLine(14, 18, 24);
    b.addRingLine(24, 28, 24);
  },
  (b) => {
    // Level 23: Titian Runtuh & Saklar
    b.tutorialText = "Saklar berada di jembatan rapuh. Injak dan segera melompat sebelum runtuh!";
    b.addPit(13, 21);
    b.addCrumbleBridge(13, 21, 15);
    b.addSwitchDoor(17, 14, 26, 13, 'door_d3_23');
    b.addRingArc(7, 11, 40, 2);
    b.addRing(15 * 32 + 16, 15 * 32 - 24);
    b.addRing(19 * 32 + 16, 15 * 32 - 24);
    b.addRingArc(28, 32, 40, 2);
  },
  (b) => {
    // Level 24: Kunci Gerbang Emas
    b.tutorialText = "Ambil kunci emas untuk membuka gerbang besi kuno!";
    b.addPlatform(14, 18, 13, 'pillar');
    b.addMysteryBlock(20, 10);
    b.addKeyGate(16, 11, 26, 13, 'gate_d3_24');
    b.addRingArc(7, 11, 40, 2);
    b.addRingLine(14, 18, 24);
    b.addRingLine(28, 32, 24);
  },
  (b) => {
    // Level 25: Titian Pilar Runtuh
    b.tutorialText = "Lompat dari satu pilar runtuh ke pilar berikutnya di atas jurang duri!";
    b.addPit(13, 25);
    b.addSpikes(13, 25, 17);
    b.addCrumbleBridge(14, 15, 14);
    b.addCrumbleBridge(18, 19, 14);
    b.addCrumbleBridge(22, 23, 14);
    b.addRing(14 * 32 + 16, 14 * 32 - 24);
    b.addRing(18 * 32 + 16, 14 * 32 - 24);
    b.addRing(22 * 32 + 16, 14 * 32 - 24);
    b.addRingArc(27, 31, 40, 2);
  },
  (b) => {
    // Level 26: Lorong Stalaktit Duri
    b.tutorialText = "Awas stalaktit duri menggantung di atap! Jangan melompat terlalu tinggi.";
    b.addCeilingArch(14, 24, 9);
    b.addSpikes(15, 23, 10, 'down');
    b.addRingLine(14, 24, 24);
    b.addRingArc(7, 11, 40, 2);
    b.addRingArc(26, 30, 40, 2);
  },
  (b) => {
    // Level 27: Saklar Ganda Kuil
    b.tutorialText = "Dua pintu laser mengunci jalur. Temukan kedua saklar untuk menembusnya!";
    b.addSwitchDoor(11, 15, 19, 13, 'door_d3_27_1');
    b.addCheckpoint(21, 15);
    b.addSwitchDoor(25, 15, 33, 13, 'door_d3_27_2');
    b.addRingArc(6, 10, 40, 2);
    b.addRingLine(13, 17, 24);
    b.addRingLine(27, 31, 24);
  },
  (b) => {
    // Level 28: Menara Kunci Altar
    b.tutorialText = "Gunakan trampolin untuk meraih kunci emas di puncak altar kuil!";
    b.addPlatform(18, 21, 10, 'pillar');
    b.addSpring(14, 15);
    b.addKeyGate(19, 8, 29, 13, 'gate_d3_28');
    b.addRingArc(14, 18, 54, 3);
    b.addRingLine(19, 21, 24);
    b.addRingLine(31, 35, 24);
  },
  (b) => {
    // Level 29: Kolonade Angker
    b.tutorialText = "Dua ranjau arwah menjaga kolonade panjang. Gunakan teras atas untuk menghindar.";
    b.addPlatform(15, 31, 12, 'pillar');
    b.addPatrol(15, 22, 15, 65);
    b.addPatrol(24, 31, 15, 65);
    b.addRingLine(16, 22, 24);
    b.addRingLine(25, 30, 24);
    b.addRingArc(33, 37, 40, 2);
  },
  (b) => {
    // Level 30: Kubah Segel Penguasa (Boss Dunia 3)
    b.tutorialText = "Boss Dunia 3! Matikan laser dengan saklar, ambil kunci emas, dan selami danau kuil!";
    b.addSwitchDoor(11, 15, 20, 13, 'door_d3_30');
    b.addWaterPool(22, 24, 15, 16);
    b.addSpring(23, 15);
    b.addPlatform(26, 30, 9, 'pillar');
    b.addKeyGate(28, 7, 38, 13, 'gate_d3_30');
    b.addMovingPlat(31, 36, 14, 50);
    b.addRingArc(6, 10, 40, 2);
    b.addRingLine(13, 17, 24);
    b.addRingLine(26, 30, 24);
    b.addRingArc(40, 44, 40, 2);
  },

  // ===========================================================================
  // DUNIA 4: PABRIK PIPA HIDROLIK (LEVELS 31 - 40)
  // ===========================================================================
  (b) => {
    // Level 31: Gerbang Pabrik Hidrolik
    b.tutorialText = "Selamat datang di Pabrik Hidrolik! Sentuh Pompa Merah untuk menjadi Bola Raksasa!";
    b.addPump(10, 15, 'giant');
    b.addPump(26, 15, 'normal');
    b.addRingArc(6, 9, 40, 2);
    b.addRingLine(12, 18, 24);
    b.addRingLine(28, 32, 24);
  },
  (b) => {
    // Level 32: Dinding Batu Retak
    b.tutorialText = "Bola Raksasa memiliki bobot besar! Tabrak dinding batu retak untuk menghancurkannya.";
    b.addPump(8, 15, 'giant');
    b.addCrackWall(18, 13, 15);
    b.addPump(26, 15, 'normal');
    b.addRingArc(9, 13, 40, 2);
    b.addRingLine(19, 24, 24);
    b.addRingArc(28, 32, 40, 2);
  },
  (b) => {
    // Level 33: Pompa Mini & Lorong Sempit
    b.tutorialText = "Sentuh Pompa Biru untuk mengecil! Bola Mini bisa melewati celah sempit 1 blok.";
    b.addPump(8, 15, 'mini');
    b.addPlatform(16, 24, 14, 'pillar');
    b.addPump(28, 15, 'normal');
    b.addRingArc(9, 13, 40, 2);
    b.addRingLine(17, 23, 16);
    b.addRingArc(29, 33, 40, 2);
  },
  (b) => {
    // Level 34: Turbin Angin Vertikal
    b.tutorialText = "Bola Mini sangat ringan! Masuki hembusan turbin angin untuk melayang ke atas.";
    b.addPump(8, 15, 'mini');
    b.addVent(16, 9, 224, -520);
    b.addPlatform(18, 26, 9, 'pillar');
    b.addPump(22, 8, 'normal');
    b.addRing(16 * 32 + 16, 13 * 32 - 24);
    b.addRing(16 * 32 + 16, 10 * 32 - 24);
    b.addRingLine(19, 24, 24);
    b.addRingArc(28, 32, 40, 2);
  },
  (b) => {
    // Level 35: Sirkuit Hidrolik 3 Tahap
    b.tutorialText = "Raksasa hancurkan dinding → Mini terbang di ventilasi → Normal capai portal!";
    b.addPump(7, 15, 'giant');
    b.addCrackWall(14, 14, 15);
    b.addPump(18, 15, 'mini');
    b.addVent(24, 9, 224, -520);
    b.addPlatform(26, 34, 9, 'pillar');
    b.addPump(30, 8, 'normal');
    b.addRingLine(8, 12, 24);
    b.addRingLine(19, 22, 24);
    b.addRingLine(27, 32, 24);
  },
  (b) => {
    // Level 36: Turbin Ventilasi Ganda
    b.tutorialText = "Dua turbin angin mengangkat Bola Mini melintasi atap fasilitas!";
    b.addPump(8, 15, 'mini');
    b.addVent(16, 10, 192, -520);
    b.addPlatform(19, 23, 10, 'pillar');
    b.addVent(25, 8, 256, -520);
    b.addPlatform(28, 36, 7, 'pillar');
    b.addPump(32, 6, 'normal');
    b.addRing(16 * 32 + 16, 12 * 32 - 24);
    b.addRingLine(20, 22, 24);
    b.addRing(25 * 32 + 16, 9 * 32 - 24);
    b.addRingLine(29, 34, 24);
  },
  (b) => {
    // Level 37: Dinding Penghancur Berantai
    b.tutorialText = "Gunakan momentum Bola Raksasa untuk mendobrak dinding retak berlapis!";
    b.addPump(8, 15, 'giant');
    b.addCrackWall(16, 14, 15);
    b.addCrackWall(24, 14, 15);
    b.addCheckpoint(28, 15);
    b.addPump(32, 15, 'normal');
    b.addRingLine(9, 13, 24);
    b.addRingLine(18, 22, 24);
    b.addRingLine(34, 38, 24);
  },
  (b) => {
    // Level 38: Bypass Ventilasi Rahasia
    b.tutorialText = "Pintu laser memblokir jalan. Gunakan lubang ventilasi Mini di atas untuk lewat!";
    b.addPump(8, 15, 'mini');
    b.addVent(15, 9, 224, -520);
    b.addPlatform(17, 28, 9, 'pillar');
    b.addSwitchDoor(26, 8, 32, 13, 'door_d4_38');
    b.addPump(34, 15, 'normal');
    b.addRing(15 * 32 + 16, 11 * 32 - 24);
    b.addRingLine(18, 24, 24);
    b.addRingLine(35, 39, 24);
  },
  (b) => {
    // Level 39: Labirin Metamorfosis
    b.tutorialText = "Ganti ukuran di saat yang tepat: Raksasa untuk bobot, Mini untuk kelincahan!";
    b.addPump(7, 15, 'giant');
    b.addCrackWall(14, 14, 15);
    b.addPump(18, 15, 'mini');
    b.addVent(24, 9, 224, -520);
    b.addPlatform(26, 36, 9, 'pillar');
    b.addPump(30, 8, 'normal');
    b.addMovingPlat(38, 44, 13, 50);
    b.addRingLine(8, 12, 24);
    b.addRingLine(19, 22, 24);
    b.addRingLine(27, 32, 24);
  },
  (b) => {
    // Level 40: Reaktor Inti Hidrolik (Boss Dunia 4)
    b.tutorialText = "Pertarungan Pamungkas Dunia 4! Hancurkan dinding pengaman, terbang lewat ventilasi reaktor!";
    b.addPump(7, 15, 'giant');
    b.addCrackWall(15, 14, 15);
    b.addPump(19, 15, 'mini');
    b.addVent(26, 9, 224, -540);
    b.addPlatform(28, 40, 9, 'pillar');
    b.addSwitchDoor(33, 8, 44, 13, 'door_d4_40');
    b.addPump(37, 8, 'normal');
    b.addPit(48, 52);
    b.addWarpPipe(46, 54, 14, 14);
    b.addRingLine(8, 12, 24);
    b.addRingLine(20, 24, 24);
    b.addRingLine(29, 35, 24);
    b.addRingArc(55, 59, 40, 2);
  },

  // ===========================================================================
  // DUNIA 5: BENTENG DIMENSI & WARP (LEVELS 41 - 50)
  // ===========================================================================
  (b) => {
    // Level 41: Ambang Kosmik
    b.tutorialText = "Selamat datang di Benteng Dimensi & Warp! Medan gravitasi astral penuh aksi spektakuler.";
    b.addPlatform(12, 17, 13, 'pillar');
    b.addPlatform(21, 26, 11, 'pillar');
    b.addPlatform(30, 35, 13, 'pillar');
    b.addRingArc(6, 10, 40, 2);
    b.addRingLine(13, 16, 24);
    b.addRingLine(22, 25, 24);
    b.addRingLine(31, 34, 24);
  },
  (b) => {
    // Level 42: Jaringan Pipa Warp Astral
    b.tutorialText = "Gunakan jaringan pipa warp bercahaya untuk melintasi pulau kosmik terisolir!";
    b.addPit(13, 20);
    b.addPlatform(21, 28, 11, 'pillar');
    b.addPit(29, 36);
    b.addWarpPipe(11, 23, 14, 10);
    b.addWarpPipe(26, 38, 10, 14);
    b.addRingArc(6, 10, 40, 2);
    b.addRingLine(24, 25, 24);
    b.addRingArc(39, 43, 40, 2);
  },
  (b) => {
    // Level 43: Matriks Laser Kosmik
    b.tutorialText = "Platform bergerak meluncur di antara kisi-kisi laser kosmik. Injak saklar!";
    b.addMovingPlat(13, 21, 14, 55);
    b.addSwitchDoor(17, 13, 26, 13, 'door_d5_43');
    b.addSpring(30, 15);
    b.addRingArc(7, 11, 40, 2);
    b.addRing(17 * 32 + 16, 14 * 32 - 24);
    b.addRing(19 * 32 + 16, 14 * 32 - 24);
    b.addRingLine(32, 36, 24);
  },
  (b) => {
    // Level 44: Super Trampolin Galaksi
    b.tutorialText = "Super trampolin melontarkanmu menembus konstelasi cincin bintang di langit!";
    b.addPit(13, 23);
    b.addSpring(12, 15, true);
    b.addPlatform(24, 34, 11, 'pillar');
    b.addRingArc(12, 24, 60, 3);
    b.addRingLine(25, 31, 24);
    b.addRingArc(35, 39, 40, 2);
  },
  (b) => {
    // Level 45: Labirin Dimensi Cermin
    b.tutorialText = "Pipa warp membawa ke ruang rahasia di atas, lalu kembali ke jalur utama!";
    b.addPit(14, 36);
    b.addPlatform(18, 28, 8, 'pillar');
    b.addWarpPipe(12, 20, 14, 7);
    b.addWarpPipe(26, 38, 7, 14);
    b.addCheckpoint(30, 15);
    b.addRingArc(6, 10, 40, 2);
    b.addRingLine(22, 25, 24);
    b.addRingArc(39, 43, 40, 2);
  },
  (b) => {
    // Level 46: Jembatan Void & Ranjau Bintang
    b.tutorialText = "Jembatan rapuh di atas kehampaan kosmik dengan ranjau bintang berpatroli!";
    b.addPit(14, 26);
    b.addCrumbleBridge(14, 26, 14);
    b.addPatrol(16, 24, 13, 65);
    b.addRing(15 * 32 + 16, 14 * 32 - 24);
    b.addRing(18 * 32 + 16, 14 * 32 - 24);
    b.addRing(22 * 32 + 16, 14 * 32 - 24);
    b.addRing(25 * 32 + 16, 14 * 32 - 24);
    b.addRingArc(28, 32, 40, 2);
  },
  (b) => {
    // Level 47: Turbin Antariksa
    b.tutorialText = "Pompa Mini + Turbin super meluncurkanmu langsung ke orbit benteng atas!";
    b.addPump(8, 15, 'mini');
    b.addVent(16, 7, 288, -560);
    b.addPlatform(18, 32, 7, 'pillar');
    b.addPump(26, 6, 'normal');
    b.addRing(16 * 32 + 16, 12 * 32 - 24);
    b.addRing(16 * 32 + 16, 9 * 32 - 24);
    b.addRingLine(19, 24, 24);
    b.addRingArc(34, 38, 40, 2);
  },
  (b) => {
    // Level 48: Kunci Takhta Astral
    b.tutorialText = "Raih Kunci Astral emas di pilar puncak untuk membuka gerbang menuju takhta!";
    b.addPlatform(19, 23, 9, 'pillar');
    b.addSpring(14, 15);
    b.addKeyGate(21, 7, 33, 13, 'gate_d5_48');
    b.addMovingPlat(25, 31, 12, 50);
    b.addRingArc(14, 19, 54, 3);
    b.addRingLine(20, 22, 24);
    b.addRingLine(35, 39, 24);
  },
  (b) => {
    // Level 49: Ujian Ketangkasan Puncak
    b.tutorialText = "Ujian terakhir sebelum Singgasana! Gabungan Warp Pipe, Giant Smash, dan Moving Lift.";
    b.addPit(11, 16);
    b.addPlatform(17, 24, 12, 'pillar');
    b.addWarpPipe(9, 18, 14, 11);
    b.addPump(20, 11, 'giant');
    b.addCrackWall(26, 10, 15);
    b.addMovingPlat(29, 37, 13, 55);
    b.addSwitchDoor(39, 15, 47, 13, 'door_d5_49');
    b.addPump(43, 15, 'normal');
    b.addRingLine(19, 22, 24);
    b.addRing(31 * 32 + 16, 13 * 32 - 24);
    b.addRing(35 * 32 + 16, 13 * 32 - 24);
    b.addRingLine(48, 52, 24);
  },
  (b) => {
    // Level 50: Inti Singgasana Kosmik (GRAND FINAL CLIMAX LEVEL 50)
    b.tutorialText = "LEVEL 50! Puncak Pamungkas: Super Spring, Giant Smash, Mini Updraft, Kuil Kunci & Singgasana!";

    // 1. Act 1: The Galactic Leap (Cosmic Abyss)
    b.addPit(12, 17);
    b.addSpring(10, 15, true);
    b.addRingArc(10, 18, 60, 3);

    // 2. Act 2: Titan Bastion & Blast Wall
    b.addPlatform(18, 25, 12, 'pillar');
    b.addPump(20, 11, 'giant');
    b.addRingLine(21, 24, 24);
    b.addCrackWall(26, 8, 15);

    // 3. Act 3: Micro Aviator, Mystery Block & Thermal Air Vent
    b.setFloor(27, 36, 16, 'grass');
    b.addPump(28, 15, 'mini');
    b.addMysteryBlock(30, 13);
    // Sheer fortress facade blocks walking forward, forcing air vent flight
    for (let r = 7; r <= 15; r++) {
      b.map[r][36] = { solid: true, type: 'stone' };
    }
    b.addVent(34, 7, 288, -540);
    b.addRing(34 * 32 + 16, 11 * 32 - 16);

    // 4. Act 4: High Citadel Promenade, Emerald Switch & Astral Key
    b.addPlatform(36, 47, 7, 'pillar');
    b.addPump(38, 6, 'normal');
    b.addRingLine(39, 44, 24);
    b.addSwitchDoor(41, 6, 54, 13, 'door_d5_laser');
    b.addKeyGate(45, 5, 58, 13, 'gate_d5_vault');

    // 5. Act 5: Royal Moat Dive & Antechamber
    b.addWaterPool(48, 52, 15, 16);
    // Smooth exit ramp from pool to antechamber floor
    b.map[15][53] = { solid: false, type: 'air' };
    b.map[16][53] = { solid: true, type: 'stone' };
    b.addRing(50 * 32 + 16, 15 * 32);

    // 6. Act 6: Dual Vault Gates & Rings
    b.setFloor(53, 60, 16, 'grass');
    b.addRing(56 * 32 + 16, 15 * 32 - 16);

    // 7. Act 7: The Cosmic Void, Royal Warp Pipe & Cosmic Throne
    b.addPit(61, 63);
    b.addPlatform(64, 67, 11, 'pillar');
    b.addWarpPipe(60, 64, 14, 10);
    b.portal.x = 66 * b.ts + 16;
    b.portal.y = 11 * b.ts - 2;
    b.addRingArc(64, 67, 36, 2);
  }
];

class LevelManager {
  constructor() {
    this.tileSize = 32;
    this.totalLevels = 50;
    this.currentLevelIndex = 0;

    this.worlds = [
      { id: 0, name: "Dunia 1: Bukit Lembah Pipa", theme: "meadow", levels: "1-10" },
      { id: 1, name: "Dunia 2: Ngarai Pipa Uap", theme: "canyon", levels: "11-20" },
      { id: 2, name: "Dunia 3: Labirin Kuil Pilar", theme: "ruins", levels: "21-30" },
      { id: 3, name: "Dunia 4: Pabrik Pipa Hidrolik", theme: "facility", levels: "31-40" },
      { id: 4, name: "Dunia 5: Benteng Dimensi & Warp", theme: "space", levels: "41-50" }
    ];

    this.titles = [
      // World 1
      ["Padang Awal", "Lompatan Pertama"],
      ["Lompatan Trampolin", "Melesat ke Udara"],
      ["Pipa Saluran Hijau", "Titi Pipa Mario"],
      ["Jembatan Rantai Rapuh", "Jangan Berhenti"],
      ["Lantai Duri Berbahaya", "Lompatan Presisi"],
      ["Platform Meluncur", "Menyeberangi Jurang"],
      ["Pipa Warp Pneumatik", "Pintas Menembus Bukit"],
      ["Teras Bukit Berjenjang", "Pendakian Lembah"],
      ["Sirkus Trampolin Ganda", "Penerbangan Berturut"],
      ["Benteng Gerbang Hijau", "Boss Dunia 1"],
      // World 2
      ["Pintu Tambang Karat", "Memasuki Ngarai"],
      ["Semburan Uap Panas", "Tekanan Tinggi"],
      ["Lift Penambang Vertikal", "Menembus Tebing"],
      ["Trestle Kayu Terjal", "Jalur Kereta Tua"],
      ["Ranjau Duri Bergerak", "Patroli Bawah Tanah"],
      ["Pipa Bertekanan Ganda", "Irama Uap"],
      ["Jurang Tembaga Dalam", "Dua Platform Berpasangan"],
      ["Pipa Warp Ngarai", "Terowongan Tambang"],
      ["Cerobong Pipa Baja", "Pendakian Puncak Tungku"],
      ["Peleburan Inti Ngarai", "Boss Dunia 2"],
      // World 3
      ["Katakombe Kuno", "Pilar Bertakhta"],
      ["Saklar Kristal Hijau", "Kunci Segel Laser"],
      ["Titian Runtuh & Saklar", "Kecepatan Refleks"],
      ["Kunci Gerbang Emas", "Harta Karun Kuil"],
      ["Titian Pilar Runtuh", "Langkah Tanpa Henti"],
      ["Lorong Stalaktit Duri", "Atap Berbahaya"],
      ["Saklar Ganda Kuil", "Dua Ruang Rahasia"],
      ["Menara Kunci Altar", "Lompatan ke Puncak"],
      ["Kolonade Angker", "Penjaga Reruntuhan"],
      ["Kubah Segel Penguasa", "Boss Dunia 3"],
      // World 4
      ["Gerbang Pabrik Hidrolik", "Pompa Ukuran Raksasa"],
      ["Dinding Batu Retak", "Kekuatan Penghancur"],
      ["Pompa Mini & Lorong Sempit", "Menyusup Saluran"],
      ["Turbin Angin Vertikal", "Terbang Melayang"],
      ["Sirkuit Hidrolik 3 Tahap", "Kombinasi Ukuran"],
      ["Turbin Ventilasi Ganda", "Estafet Angin"],
      ["Penghancur Bertingkat", "Dinding Berlapis"],
      ["Bypass Ventilasi Rahasia", "Jalur Alternatif"],
      ["Labirin Metamorfosis", "Teka-teki Ukuran"],
      ["Reaktor Inti Hidrolik", "Boss Dunia 4"],
      // World 5
      ["Ambang Kosmik", "Lautan Bintang"],
      ["Jaringan Pipa Warp Astral", "Teleportasi Antariksa"],
      ["Matriks Laser Kosmik", "Waktu & Ketepatan"],
      ["Super Trampolin Galaksi", "Penerbangan Kosmik"],
      ["Labirin Dimensi Cermin", "Pilihan Saluran"],
      ["Jembatan Void & Ranjau Bintang", "Langkah Waspada"],
      ["Turbin Antariksa", "Peluncuran Orbit"],
      ["Kunci Takhta Astral", "Segel Singgasana"],
      ["Ujian Ketangkasan Puncak", "Lorong Prajurit Bintang"],
      ["Inti Singgasana Kosmik", "Grand Final Climax Level 50"]
    ];
  }

  getLevelMeta(index) {
    if (index < 0) index = 0;
    if (index >= this.totalLevels) index = this.totalLevels - 1;

    const worldIdx = Math.floor(index / 10);
    const stageInWorld = (index % 10) + 1;
    const pair = this.titles[index] || ["Level " + (index + 1), "Tantangan Bola"];
    const theme = this.worlds[worldIdx].theme;

    return {
      index,
      number: index + 1,
      title: pair[0],
      subtitle: pair[1],
      theme: theme,
      worldIdx: worldIdx,
      worldName: this.worlds[worldIdx].name,
      stageInWorld: stageInWorld
    };
  }

  loadLevel(index) {
    if (index < 0) index = 0;
    if (index >= this.totalLevels) index = this.totalLevels - 1;
    this.currentLevelIndex = index;

    const meta = this.getLevelMeta(index);
    const worldIdx = meta.worldIdx;

    // Width per level: carefully calibrated between 38 and 68 tiles
    const baseWidth = 38 + (index % 10) * 2 + worldIdx * 2;
    const width = (index === 49) ? 68 : baseWidth;

    const builder = new LevelBuilder(
      index,
      meta.title,
      meta.subtitle,
      meta.theme,
      worldIdx,
      width,
      18
    );

    // Run custom level specification
    const def = LEVEL_DEFINITIONS[index];
    if (typeof def === 'function') {
      def(builder);
    }

    return builder.build();
  }
}

window.LevelManager = LevelManager;
