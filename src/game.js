/**
 * Main Bounce Game Controller & Rendering Pipeline
 * Handles game loop, input, physics coordination, entity updates, camera lerp, and UI
 */

class BounceGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.levelManager = new (window.LevelManager || LevelManager)();
    this.particleSystem = new (window.ParticleSystem || ParticleSystem)();
    this.player = null;
    this.currentLevel = null;

    // Game stats
    this.score = 0;
    this.levelScore = 0;
    this.lives = 3;
    this.levelTime = 0;
    this.checkpoint = { x: 0, y: 0 };
    this.levelStars = new Array(50).fill(0);
    this.activeWorldTab = 0;
    this.activeSignText = null;
    this.pipeCooldown = 0;

    // Load saved stars from localStorage
    try {
      const saved = localStorage.getItem('bounce_stars_100');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          for (let i = 0; i < Math.min(100, parsed.length); i++) {
            this.levelStars[i] = parsed[i] || 0;
          }
        }
      }
    } catch (e) {}

    // Camera
    this.camera = {
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      targetX: 0,
      targetY: 0,
      shake: 0
    };

    // Input state
    this.keys = {
      left: false,
      right: false,
      jump: false,
      jumpJustPressed: false
    };

    // Game state flags
    this.state = 'title'; // 'title' | 'playing' | 'paused' | 'victory' | 'gameover' | 'completed'
    this.lastTime = 0;

    // UI elements
    this.bindUI();
    this.bindInput();

    // Start rendering loop
    requestAnimationFrame(this.loop.bind(this));
  }

  startLevel(index = 0) {
    this.currentLevel = this.levelManager.loadLevel(index);
    if (!this.currentLevel.map && typeof this.currentLevel.buildMap === 'function') {
      this.currentLevel.map = this.currentLevel.buildMap();
    }
    this.checkpoint = { x: this.currentLevel.spawn.x, y: this.currentLevel.spawn.y };
    this.player = new (window.Player || Player)(this.checkpoint.x, this.checkpoint.y);
    this.levelTime = 0;
    this.levelScore = 0;
    this.activeSignText = null;
    this.pipeCooldown = 0;
    this.particleSystem.clear();

    // Center camera initially
    this.camera.x = this.player.x - this.camera.width / 2;
    this.camera.y = this.player.y - this.camera.height / 2;

    this.updateHUD();
    this.showTutorial(this.currentLevel.tutorialText);
    this.state = 'playing';

    // Start background music
    if (window.sound) {
      window.sound.init();
      window.sound.startBGM();
    }
  }

  respawnPlayer() {
    if (this.lives > 1) {
      this.lives--;
      this.player.reset(this.checkpoint.x, this.checkpoint.y);
      this.player.isAlive = true;
      this.camera.shake = 0.4;
      this.updateHUD();
    } else {
      // Game Over
      this.state = 'gameover';
      document.getElementById('modal-gameover').classList.add('show');
    }
  }

  showTutorial(text) {
    const banner = document.getElementById('tutorial-banner');
    const textEl = document.getElementById('tutorial-text');
    if (!banner || !textEl) return;

    textEl.innerText = text;
    banner.classList.remove('hidden');

    clearTimeout(this.tutTimer);
    this.tutTimer = setTimeout(() => {
      banner.classList.add('hidden');
    }, 6000);
  }

  updateHUD() {
    if (this.player) {
      const hEl = document.getElementById('hud-hearts');
      if (hEl) {
        hEl.innerText = '❤️'.repeat(this.player.health) + '🖤'.repeat(this.player.maxHealth - this.player.health);
      }
      const sEl = document.getElementById('hud-shield');
      if (sEl) {
        sEl.classList.toggle('hidden', !this.player.hasBubbleShield);
      }
    }
    const livesEl = document.getElementById('hud-lives');
    if (livesEl) livesEl.innerText = `x${this.lives}`;
    
    // Collected rings count
    const collectedRings = this.currentLevel ? this.currentLevel.rings.filter(r => r.collected).length : 0;
    const totalRings = this.currentLevel ? this.currentLevel.targetRings : 0;
    document.getElementById('hud-rings').innerText = `${collectedRings}/${totalRings}`;

    document.getElementById('hud-score').innerText = this.score + this.levelScore;
    document.getElementById('hud-level-title').innerText = this.currentLevel ? `${this.currentLevel.title} (${this.currentLevel.id}/${this.levelManager.totalLevels})` : 'Bounce';

    // Format time mm:ss
    const mins = Math.floor(this.levelTime / 60);
    const secs = Math.floor(this.levelTime % 60);
    document.getElementById('hud-timer').innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- INPUT HANDLING ---
  bindInput() {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key) || e.code === 'Space') {
        e.preventDefault();
      }

      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code || '';

      if (key === 'arrowleft' || key === 'a' || code === 'KeyA' || code === 'ArrowLeft') {
        this.keys.left = true;
      }
      if (key === 'arrowright' || key === 'd' || code === 'KeyD' || code === 'ArrowRight') {
        this.keys.right = true;
      }
      if (key === 'arrowdown' || key === 's' || code === 'KeyS' || code === 'ArrowDown') {
        this.keys.down = true;
      }
      if (key === 'arrowup' || key === 'w' || key === ' ' || key === 'spacebar' || code === 'KeyW' || code === 'ArrowUp' || code === 'Space') {
        if (!this.keys.jump) {
          this.keys.jumpJustPressed = true;
        }
        this.keys.jump = true;
      }

      if ((key === 'r' || code === 'KeyR') && this.state === 'playing') {
        this.respawnPlayer();
      }

      if ((key === 'escape' || key === 'p' || code === 'Escape' || code === 'KeyP') && (this.state === 'playing' || this.state === 'paused')) {
        this.togglePause();
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code || '';

      if (key === 'arrowleft' || key === 'a' || code === 'KeyA' || code === 'ArrowLeft') {
        this.keys.left = false;
      }
      if (key === 'arrowright' || key === 'd' || code === 'KeyD' || code === 'ArrowRight') {
        this.keys.right = false;
      }
      if (key === 'arrowdown' || key === 's' || code === 'KeyS' || code === 'ArrowDown') {
        this.keys.down = false;
      }
      if (key === 'arrowup' || key === 'w' || key === ' ' || key === 'spacebar' || code === 'KeyW' || code === 'ArrowUp' || code === 'Space') {
        this.keys.jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Touch Controls
    const btnLeft = document.getElementById('touch-left-btn');
    const btnRight = document.getElementById('touch-right-btn');
    const btnJump = document.getElementById('touch-jump-btn');

    const addTouchHandler = (elem, onPress, onRelease) => {
      elem.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); }, { passive: false });
      elem.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); }, { passive: false });
      elem.addEventListener('mousedown', (e) => { e.preventDefault(); onPress(); });
      elem.addEventListener('mouseup', (e) => { e.preventDefault(); onRelease(); });
      elem.addEventListener('mouseleave', (e) => { e.preventDefault(); onRelease(); });
    };

    addTouchHandler(btnLeft, () => { this.keys.left = true; }, () => { this.keys.left = false; });
    addTouchHandler(btnRight, () => { this.keys.right = true; }, () => { this.keys.right = false; });
    addTouchHandler(btnJump, 
      () => {
        this.keys.jumpJustPressed = true;
        this.keys.jump = true;
      }, 
      () => {
        this.keys.jump = false;
      }
    );
  }

  // --- UI & MODAL BINDINGS ---
  bindUI() {
    document.getElementById('btn-play-game').addEventListener('click', () => {
      document.getElementById('modal-start').classList.remove('show');
      this.startLevel(0);
    });

    document.getElementById('btn-home').addEventListener('click', () => {
      this.openLevelSelect();
    });

    document.getElementById('btn-open-levels').addEventListener('click', () => {
      this.openLevelSelect();
    });

    document.getElementById('btn-close-levels').addEventListener('click', () => {
      document.getElementById('modal-levels').classList.remove('show');
      if (this.state !== 'playing') {
        document.getElementById('modal-start').classList.add('show');
      }
    });

    document.getElementById('btn-open-instructions').addEventListener('click', () => {
      document.getElementById('modal-instructions').classList.add('show');
    });

    document.getElementById('btn-close-instructions').addEventListener('click', () => {
      document.getElementById('modal-instructions').classList.remove('show');
    });

    const btnSound = document.getElementById('btn-sound');
    const soundIcon = document.getElementById('sound-icon');
    btnSound.addEventListener('click', () => {
      if (window.sound) {
        window.sound.init();
        const unmuted = window.sound.toggleMute();
        soundIcon.innerText = unmuted ? '🔊' : '🔇';
      }
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-restart-level').addEventListener('click', () => {
      document.getElementById('modal-pause').classList.remove('show');
      this.startLevel(this.levelManager.currentLevelIndex);
    });

    document.getElementById('btn-pause-level-select').addEventListener('click', () => {
      document.getElementById('modal-pause').classList.remove('show');
      this.openLevelSelect();
    });

    document.getElementById('btn-toggle-scanlines').addEventListener('click', () => {
      document.getElementById('scanline-overlay').classList.toggle('disabled');
    });

    document.getElementById('btn-next-level').addEventListener('click', () => {
      document.getElementById('modal-victory').classList.remove('show');
      const nextIdx = this.levelManager.currentLevelIndex + 1;
      if (nextIdx < this.levelManager.totalLevels) {
        this.startLevel(nextIdx);
      } else {
        document.getElementById('modal-game-complete').classList.add('show');
        document.getElementById('final-total-score').innerText = this.score;
      }
    });

    document.getElementById('btn-replay-level').addEventListener('click', () => {
      document.getElementById('modal-victory').classList.remove('show');
      this.startLevel(this.levelManager.currentLevelIndex);
    });

    document.getElementById('btn-victory-levels').addEventListener('click', () => {
      document.getElementById('modal-victory').classList.remove('show');
      this.openLevelSelect();
    });

    document.getElementById('btn-retry-checkpoint').addEventListener('click', () => {
      document.getElementById('modal-gameover').classList.remove('show');
      this.lives = 3;
      this.startLevel(this.levelManager.currentLevelIndex);
    });

    document.getElementById('btn-gameover-levels').addEventListener('click', () => {
      document.getElementById('modal-gameover').classList.remove('show');
      this.openLevelSelect();
    });

    document.getElementById('btn-complete-replay').addEventListener('click', () => {
      document.getElementById('modal-game-complete').classList.remove('show');
      this.score = 0;
      this.lives = 3;
      this.startLevel(0);
    });

    document.getElementById('btn-complete-levels').addEventListener('click', () => {
      document.getElementById('modal-game-complete').classList.remove('show');
      this.openLevelSelect();
    });
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      document.getElementById('modal-pause').classList.add('show');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      document.getElementById('modal-pause').classList.remove('show');
    }
  }

  openLevelSelect(targetWorld = null) {
    if (targetWorld !== null) {
      this.activeWorldTab = targetWorld;
    } else {
      this.activeWorldTab = Math.floor(this.levelManager.currentLevelIndex / 10);
    }

    // Update tab active classes
    const tabs = document.querySelectorAll('#world-tabs .world-tab');
    tabs.forEach(tab => {
      const w = parseInt(tab.getAttribute('data-world'), 10);
      tab.classList.toggle('active', w === this.activeWorldTab);
      if (!tab.dataset.bound) {
        tab.dataset.bound = 'true';
        tab.addEventListener('click', (e) => {
          const newWorld = parseInt(e.currentTarget.getAttribute('data-world'), 10);
          this.openLevelSelect(newWorld);
        });
      }
    });

    const grid = document.getElementById('levels-grid');
    grid.innerHTML = '';

    const levelsPerWorld = 10;
    const startIdx = this.activeWorldTab * levelsPerWorld;
    const endIdx = Math.min(startIdx + levelsPerWorld, this.levelManager.totalLevels);

    for (let idx = startIdx; idx < endIdx; idx++) {
      const meta = this.levelManager.getLevelMeta(idx);
      const card = document.createElement('div');
      card.className = 'level-card';
      if (idx === this.levelManager.currentLevelIndex) {
        card.classList.add('active-play');
      }

      const numDisplay = (idx + 1).toString().padStart(2, '0');
      const starsCount = this.levelStars[idx] || 0;
      const stars = '★'.repeat(starsCount) + '☆'.repeat(3 - starsCount);

      card.innerHTML = `
        <div class="lvl-num">${numDisplay}</div>
        <div class="lvl-title">${meta.title.split(':')[1] || meta.title}</div>
        <div class="lvl-stars">${stars}</div>
      `;

      card.addEventListener('click', () => {
        document.getElementById('modal-levels').classList.remove('show');
        document.getElementById('modal-start').classList.remove('show');
        this.startLevel(idx);
      });

      grid.appendChild(card);
    }

    document.getElementById('modal-levels').classList.add('show');
  }

  // --- MAIN LOOP ---
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (dt > 0.08) dt = 0.08;

    if (this.state === 'playing') {
      this.update(dt);
    }

    this.render();

    this.keys.jumpJustPressed = false;
    requestAnimationFrame(this.loop.bind(this));
  }

  // --- UPDATE GAME STATE ---
  update(dt) {
    if (!this.currentLevel || !this.player) return;

    this.levelTime += dt;
    if (this.pipeCooldown > 0) this.pipeCooldown -= dt;
    this.updateHUD();

    // 1. Crumbling platform countdown
    const map = this.currentLevel.map;
    for (let y = 0; y < this.currentLevel.height; y++) {
      for (let x = 0; x < this.currentLevel.width; x++) {
        const tile = map[y][x];
        if (tile && tile.type === 'crumble' && tile.triggered) {
          tile.crumbleTimer -= dt;
          if (tile.crumbleTimer <= 0) {
            tile.solid = false;
            tile.type = 'air';
            if (window.sound) window.sound.playLand(1.2);
            this.particleSystem.emitDust(x * 32 + 16, y * 32 + 16, 12, 60);
          }
        }
      }
    }

    // 2. Moving Platforms
    for (const plat of this.currentLevel.movingPlatforms || []) {
      if (plat.isVertical) {
        plat.y += plat.dir * plat.speed * dt;
        plat.vy = plat.dir * plat.speed;
        plat.vx = 0;
        if (plat.y <= plat.minY) { plat.y = plat.minY; plat.dir = 1; }
        if (plat.y >= plat.maxY) { plat.y = plat.maxY; plat.dir = -1; }
      } else {
        plat.x += plat.dir * plat.speed * dt;
        plat.vx = plat.dir * plat.speed;
        plat.vy = 0;
        if (plat.x <= plat.minX) { plat.x = plat.minX; plat.dir = 1; }
        if (plat.x >= plat.maxX) { plat.x = plat.maxX; plat.dir = -1; }
      }

      const px = this.player.x;
      const py = this.player.y + this.player.radius;
      if (px >= plat.x && px <= plat.x + plat.width &&
          py >= plat.y && py <= plat.y + 12 && this.player.vy >= 0) {
        this.player.y = plat.y - this.player.radius;
        this.player.vy = 0;
        this.player.isGrounded = true;
        this.player.x += plat.vx * dt;
      }
    }

    // 3. Patrolling Spike Hazards
    for (const hazard of this.currentLevel.patrolHazards || []) {
      hazard.x += hazard.dir * hazard.speed * dt;
      hazard.rotation += hazard.dir * 5 * dt;
      if (hazard.x <= hazard.minX) { hazard.x = hazard.minX; hazard.dir = 1; }
      if (hazard.x >= hazard.maxX) { hazard.x = hazard.maxX; hazard.dir = -1; }

      const dist = Math.hypot(this.player.x - hazard.x, this.player.y - hazard.y);
      if (dist < this.player.radius + (hazard.radius || 14)) {
        const result = this.player.takeDamage(1, (this.player.x - hazard.x > 0 ? 190 : -190), -320);
        if (result === 'dead') {
          this.particleSystem.emitBallPop(this.player.x, this.player.y);
          if (window.sound) window.sound.playPop();
          this.respawnPlayer();
          return;
        } else if (result === 'shield_lost') {
          this.showTutorial("🛡️ Gelembung menahan benturan ranjau!");
          this.particleSystem.emitMysteryBurst(this.player.x, this.player.y);
        } else if (result === 'hurt') {
          this.particleSystem.emitSparks(this.player.x, this.player.y, '#ff4757', 10);
        }
        this.updateHUD();
      }
    }

    // 4. Steam Hazard Pipes
    for (const steam of this.currentLevel.steamPipes || []) {
      steam.timer += dt;
      const cyclePos = steam.timer % steam.cycle;
      const isSteaming = cyclePos < steam.activeDuration;
      const isWarning = !isSteaming && (steam.cycle - cyclePos < 0.6); // 0.6s warning before eruption

      if (isSteaming) {
        // Volumetric steam puffs
        this.particleSystem.emitSteamPuff(steam.x + 16, steam.y);

        // Collision check with steaming column
        const px = this.player.x;
        const py = this.player.y;
        if (px >= steam.x - 6 && px <= steam.x + 38 &&
            py >= steam.y - 56 && py <= steam.y + 12) {
          const result = this.player.takeDamage(1, 0, -340);
          if (result === 'dead') {
            this.particleSystem.emitBallPop(px, py);
            if (window.sound) window.sound.playPop();
            this.respawnPlayer();
            return;
          } else if (result === 'shield_lost') {
            this.showTutorial("🛡️ Gelembung melindungimu dari semburan uap!");
            this.particleSystem.emitMysteryBurst(px, py);
          } else if (result === 'hurt') {
            this.particleSystem.emitSparks(px, py, '#ff4757', 10);
          }
          this.updateHUD();
        }
      } else if (isWarning && Math.random() < 0.3) {
        // Warning sizzle sparks
        this.particleSystem.emitSparks(steam.x + 16, steam.y, '#ff9900', 1);
      }
    }

    // 5. Mario-style Pneumatic Warp Pipes
    if (this.pipeCooldown <= 0) {
      for (const pipe of this.currentLevel.warpPipes || []) {
        const dx = Math.abs(this.player.x - pipe.enterX);
        const dy = Math.abs(this.player.y - (pipe.enterY - this.player.radius));

        if (dx < 26 && dy < 32 && this.player.vy >= -120) {
          // Trigger Warp Pipe travel!
          this.pipeCooldown = 1.0;
          if (window.sound && window.sound.playPipe) {
            window.sound.playPipe();
          }
          this.particleSystem.emitRingSparkles(pipe.enterX, pipe.enterY);

          // Teleport to exit
          this.player.x = pipe.exitX;
          this.player.y = pipe.exitY - this.player.radius - 8;
          this.player.vy = pipe.exitVy || -460;
          this.player.isGrounded = false;
          this.player.scaleX = 0.65;
          this.player.scaleY = 1.45;

          this.particleSystem.emitSpringBurst(pipe.exitX, pipe.exitY);
          this.showTutorial("🌀 WUUZHH! Meluncur menembus pipa warp!");
          break;
        }
      }
    }

    // 6. Player Physics update (Manual Jump, Rolling, Tile Collisions)
    const levelHelper = {
      tileSize: 32,
      getTile: (tx, ty) => {
        if (tx < 0 || tx >= this.currentLevel.width) {
          return { solid: true, type: 'wall' };
        }
        if (ty < 0) {
          return { solid: true, type: 'ceiling' };
        }
        if (ty >= this.currentLevel.height) {
          return { solid: false, type: 'pit' };
        }

        // Check solid doors
        for (const door of this.currentLevel.doors || []) {
          if (!door.open) {
            const doorTx = Math.floor(door.x / 32);
            const doorTopTy = Math.floor(door.y / 32);
            const doorBottomTy = doorTopTy + Math.floor(door.height / 32);
            if (tx === doorTx && ty >= doorTopTy && ty <= doorBottomTy) {
              return { solid: true, type: 'door' };
            }
          }
        }
        return this.currentLevel.map[ty][tx];
      },
      isInWater: (x, y) => {
        const tx = Math.floor(x / 32);
        const ty = Math.floor(y / 32);
        if (ty >= 0 && ty < this.currentLevel.height && tx >= 0 && tx < this.currentLevel.width) {
          const t = this.currentLevel.map[ty][tx];
          return t && t.type === 'water';
        }
        return false;
      },
      bonkMysteryBlock: (tx, ty, player) => {
        const tile = this.currentLevel.map[ty][tx];
        tile.type = 'empty_block';
        tile.bonked = true;

        const rand = Math.random();
        if (player.health < 3 && rand < 0.45) {
          player.heal(1);
          this.showTutorial("❤️ Hati tambahan didapatkan dari Balok ?!");
          this.particleSystem.emitMysteryBurst(tx * 32 + 16, ty * 32 - 16);
        } else if (!player.hasBubbleShield && rand < 0.8) {
          player.giveBubbleShield();
          this.showTutorial("🛡️ Pelindung Gelembung didapatkan dari Balok ?!");
          this.particleSystem.emitMysteryBurst(tx * 32 + 16, ty * 32 - 16);
        } else {
          // Bonus Golden Ring!
          this.score += 250;
          this.currentLevel.rings.push({
            x: tx * 32 + 16,
            y: ty * 32 - 24,
            collected: false
          });
          this.showTutorial("✨ Cincin Emas Rahasia muncul dari Balok ?!");
          this.particleSystem.emitRingSparkles(tx * 32 + 16, ty * 32 - 24);
        }
        this.updateHUD();
      },
      breakTile: (tx, ty) => {
        if (this.currentLevel.map[ty] && this.currentLevel.map[ty][tx]) {
          this.currentLevel.map[ty][tx] = { solid: false, type: 'air' };
          this.particleSystem.emitDust(tx * 32 + 16, ty * 32 + 16, 12, 80);
        }
      }
    };

    this.player.update(dt, this.keys, levelHelper, this.particleSystem);

    // 7. PIT / BOTTOMLESS HOLE DEATH CHECK
    const floorLimitY = (this.currentLevel.height - 1.2) * 32;
    const currentTileX = Math.floor(this.player.x / 32);
    const currentTileY = Math.floor((this.player.y + this.player.radius) / 32);
    const tileAtPlayerBottom = levelHelper.getTile(currentTileX, currentTileY);

    if (this.player.y >= floorLimitY || (tileAtPlayerBottom && tileAtPlayerBottom.type === 'pit')) {
      const result = this.player.takeDamage(1, 0, 0);
      if (result === 'dead') {
        this.particleSystem.emitBallPop(this.player.x, this.player.y);
        if (window.sound) window.sound.playPop();
        this.respawnPlayer();
        return;
      } else {
        // Soft rescue to checkpoint
        this.showTutorial("💧 Terjatuh ke jurang! Kembali ke titik aman.");
        this.player.x = this.checkpoint.x;
        this.player.y = this.checkpoint.y;
        this.player.vx = 0;
        this.player.vy = -180;
        this.player.invulnerableTimer = 1.8;
      }
      this.updateHUD();
    }

    // 8. Signposts proximity check
    let nearbySign = null;
    for (const sign of this.currentLevel.signposts || []) {
      const dist = Math.hypot(this.player.x - sign.x, this.player.y - sign.y);
      if (dist < 55) {
        nearbySign = sign;
        break;
      }
    }
    if (nearbySign) {
      if (this.activeSignText !== nearbySign.text) {
        this.activeSignText = nearbySign.text;
        this.showTutorial(`📜 ${nearbySign.text}`);
      }
    } else {
      this.activeSignText = null;
    }

    // 9. Gold Rings
    const p = this.player;
    for (const ring of this.currentLevel.rings || []) {
      if (!ring.collected) {
        const dx = p.x - ring.x;
        const dy = p.y - ring.y;
        const dist = Math.hypot(dx, dy);
        if (dist < p.radius + 14) {
          ring.collected = true;
          this.levelScore += 100;
          if (window.sound) window.sound.playRing();
          this.particleSystem.emitRingSparkles(ring.x, ring.y);
          this.updateHUD();

          const collectedCount = this.currentLevel.rings.filter(r => r.collected).length;
          if (collectedCount >= this.currentLevel.targetRings) {
            this.currentLevel.portal.open = true;
            if (window.sound) window.sound.playCheckpoint();
            this.showTutorial("🌟 Semua Cincin Terkumpul! Portal Terbuka!");
          }
        }
      }
    }

    // 10. Trampolines / Springs
    for (const spr of this.currentLevel.springs || []) {
      if (spr.triggered > 0) spr.triggered -= dt;
      const bumperY = spr.y + 14;
      if (p.x >= spr.x - 8 && p.x <= spr.x + 40 &&
          p.y + p.radius >= bumperY - 6 && p.y + p.radius <= bumperY + 18 &&
          p.vy > -50) {
        p.launchUpward(spr.power || -640);
        spr.triggered = 0.25;
        if (window.sound) window.sound.playSpring();
        this.particleSystem.emitSpringBurst(spr.x + 16, bumperY);
      }
    }

    // 11. Spikes
    for (const spk of this.currentLevel.spikes || []) {
      if (p.x + p.radius * 0.7 > spk.x && p.x - p.radius * 0.7 < spk.x + spk.width &&
          p.y + p.radius * 0.7 > spk.y && p.y - p.radius * 0.7 < spk.y + spk.height) {
        const result = p.takeDamage(1, (p.vx > 0 ? -180 : 180), -320);
        if (result === 'dead') {
          this.particleSystem.emitBallPop(p.x, p.y);
          if (window.sound) window.sound.playPop();
          this.respawnPlayer();
          return;
        } else if (result === 'shield_lost') {
          this.showTutorial("🛡️ Gelembung melindungimu dari duri!");
          this.particleSystem.emitMysteryBurst(p.x, p.y);
        } else if (result === 'hurt') {
          this.particleSystem.emitSparks(p.x, p.y, '#ff4757', 10);
        }
        this.updateHUD();
      }
    }

    // 12. Switches
    for (const sw of this.currentLevel.switches || []) {
      const swDist = Math.hypot(p.x - (sw.x + 16), p.y - (sw.y + 16));
      if (swDist < p.radius + 16 && !sw.pressed) {
        sw.pressed = true;
        if (window.sound) window.sound.playSwitch();
        this.particleSystem.emitDust(sw.x + 16, sw.y + 16, 8, 40);

        const targetDoor = this.currentLevel.doors.find(d => d.id === sw.targetDoor);
        if (targetDoor) {
          targetDoor.open = true;
          if (window.sound) window.sound.playDoorUnlock();
          this.showTutorial("🔓 Saklar ditekan! Gerbang laser terbuka!");
        }
      }
    }

    // 13. Keys & Key Doors
    for (const key of this.currentLevel.keys || []) {
      if (!key.collected) {
        const kDist = Math.hypot(p.x - key.x, p.y - key.y);
        if (kDist < p.radius + 18) {
          key.collected = true;
          p.hasKey = true;
          if (window.sound) window.sound.playKey();
          this.particleSystem.emitRingSparkles(key.x, key.y);
          this.showTutorial("🔑 Kunci emas didapatkan!");

          const gate = this.currentLevel.doors.find(d => d.id === key.targetsDoor);
          if (gate) {
            gate.open = true;
            if (window.sound) window.sound.playDoorUnlock();
          }
        }
      }
    }

    // 14. Air Vents
    for (const vent of this.currentLevel.vents || []) {
      if (p.x >= vent.x - 12 && p.x <= vent.x + vent.width + 12 &&
          p.y >= vent.y - vent.height && p.y <= vent.y + 36) {
        let lift = vent.power || -480;
        if (p.sizeState === 'mini') {
          lift *= 1.35;
        } else if (p.sizeState === 'giant') {
          lift = 0;
        }
        p.vy = Math.min(p.vy, lift);
        if (Math.random() < 0.4) {
          this.particleSystem.emitDust(p.x, p.y + p.radius, 1, 30);
        }
      }
    }

    // 15. Size Pumps
    for (const pump of this.currentLevel.pumps || []) {
      const dist = Math.hypot(p.x - (pump.x + 16), p.y - (pump.y + 16));
      if (dist < p.radius + 18 && p.sizeState !== pump.toSize) {
        const isBigger = pump.toSize === 'giant' || (pump.toSize === 'normal' && p.sizeState === 'mini');
        p.setSize(pump.toSize);
        if (window.sound) window.sound.playSizeChange(isBigger);
        this.particleSystem.emitRingSparkles(pump.x + 16, pump.y + 16);

        if (pump.toSize === 'giant') {
          this.showTutorial("💥 BOLA RAKSASA: Menabrak dan hancurkan balok batu retak!");
        } else if (pump.toSize === 'mini') {
          this.showTutorial("⚡ BOLA MINI: Lincah, muat di celah sempit & melayang di kipas angin!");
        } else {
          this.showTutorial("✨ Kembali ke ukuran normal!");
        }
      }
    }

    // 16. Checkpoints
    for (const cp of this.currentLevel.checkpoints || []) {
      if (!cp.activated) {
        const cpDist = Math.hypot(p.x - cp.x, p.y - cp.y);
        if (cpDist < p.radius + 20) {
          cp.activated = true;
          this.checkpoint = { x: cp.x, y: cp.y - 10 };
          if (window.sound) window.sound.playCheckpoint();
          this.particleSystem.emitRingSparkles(cp.x, cp.y);
          this.showTutorial("🚩 Checkpoint tercatat!");
        }
      }
    }

    // 17. Exit Portal
    const portal = this.currentLevel.portal;
    this.particleSystem.emitPortalMotes(portal.x, portal.y);

    if (portal.open) {
      const portalDist = Math.hypot(p.x - portal.x, p.y - portal.y);
      if (portalDist < p.radius + 22) {
        this.completeCurrentLevel();
      }
    }

    // 18. Particle System update
    this.particleSystem.update(dt);

    // 19. Camera Lerp
    const lookaheadX = Math.sign(p.vx) * Math.min(Math.abs(p.vx) * 0.35, 90);
    this.camera.targetX = p.x - this.camera.width / 2 + lookaheadX;
    this.camera.targetY = p.y - this.camera.height / 2;

    this.camera.x += (this.camera.targetX - this.camera.x) * 8 * dt;
    this.camera.y += (this.camera.targetY - this.camera.y) * 8 * dt;

    const maxCamX = Math.max(0, this.currentLevel.width * 32 - this.camera.width);
    const maxCamY = Math.max(0, this.currentLevel.height * 32 - this.camera.height);
    this.camera.x = Math.max(0, Math.min(maxCamX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(maxCamY, this.camera.y));

    if (this.camera.shake > 0) {
      this.camera.shake -= dt * 2;
      if (this.camera.shake < 0) this.camera.shake = 0;
    }
  }

  completeCurrentLevel() {
    this.state = 'victory';
    if (window.sound) window.sound.playVictory();
    this.particleSystem.emitConfetti(this.player.x, this.player.y);

    const parTime = this.currentLevel.parTime;
    const timeBonus = Math.max(0, Math.floor((parTime - this.levelTime) * 20));
    const ringsCollected = this.currentLevel.rings.filter(r => r.collected).length;
    const ringBonus = ringsCollected * 100;
    const lifeBonus = this.lives * 150;
    const totalLevelGain = ringBonus + timeBonus + lifeBonus;

    this.score += totalLevelGain;

    let stars = 1;
    if (ringsCollected >= this.currentLevel.targetRings) stars = 2;
    if (ringsCollected >= this.currentLevel.targetRings && this.levelTime <= parTime * 1.25) stars = 3;

    this.levelStars[this.levelManager.currentLevelIndex] = Math.max(
      this.levelStars[this.levelManager.currentLevelIndex],
      stars
    );

    try {
      localStorage.setItem('bounce_stars_100', JSON.stringify(this.levelStars));
    } catch (e) {}

    const vicModal = document.getElementById('modal-victory');
    document.getElementById('victory-stars').innerHTML = '★'.repeat(stars) + '<span style="opacity:0.25">' + '★'.repeat(3 - stars) + '</span>';
    document.getElementById('vic-time').innerText = document.getElementById('hud-timer').innerText;
    document.getElementById('vic-rings').innerText = `${ringsCollected}/${this.currentLevel.targetRings}`;
    document.getElementById('vic-score').innerText = `+${totalLevelGain}`;
    document.getElementById('vic-total-score').innerText = `${this.score}`;

    vicModal.classList.add('show');
  }

  // --- RENDERING PIPELINE ---
  render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    let shakeX = 0, shakeY = 0;
    if (this.camera.shake > 0) {
      shakeX = (Math.random() - 0.5) * 16 * this.camera.shake;
      shakeY = (Math.random() - 0.5) * 16 * this.camera.shake;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    if (!this.currentLevel) {
      ctx.fillStyle = '#141722';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
      return;
    }

    this.drawBackground(ctx);

    ctx.save();
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

    this.drawTilemap(ctx);
    this.drawEntities(ctx);

    if (this.player) {
      this.player.draw(ctx, { x: 0, y: 0 });
    }

    this.particleSystem.draw(ctx, { x: 0, y: 0 });

    ctx.restore();
    ctx.restore();
  }

  drawBackground(ctx) {
    const lvl = this.currentLevel;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, ch);
    skyGrad.addColorStop(0, lvl.bgColor);
    skyGrad.addColorStop(1, '#07090f');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    const hillScroll1 = (this.camera.x * 0.15) % cw;
    const hillScroll2 = (this.camera.x * 0.3) % cw;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = -1; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 450 - hillScroll1, ch + 80, 280, Math.PI, 0);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    for (let i = -1; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 380 - hillScroll2 + 100, ch + 40, 210, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  drawTilemap(ctx) {
    const lvl = this.currentLevel;
    const ts = this.levelManager.tileSize;
    const startX = Math.max(0, Math.floor(this.camera.x / ts));
    const endX = Math.min(lvl.width, Math.ceil((this.camera.x + this.camera.width) / ts) + 1);
    const startY = Math.max(0, Math.floor(this.camera.y / ts));
    const endY = Math.min(lvl.height, Math.ceil((this.camera.y + this.camera.height) / ts) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = lvl.map[y][x];
        if (!tile) continue;

        const px = x * ts;
        const py = y * ts;

        // 1. Pit Abyss
        if (tile.type === 'pit') {
          const pitGrad = ctx.createLinearGradient(px, py, px, py + ts);
          pitGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
          pitGrad.addColorStop(1, '#000000');
          ctx.fillStyle = pitGrad;
          ctx.fillRect(px, py, ts, ts);

          ctx.fillStyle = '#e74c3c';
          ctx.fillRect(px, py, ts, 2);
          continue;
        }

        // 2. Hanging Chains (solid: false)
        if (tile.type === 'chain') {
          ctx.save();
          ctx.strokeStyle = '#7f8c8d';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(px + 16, py);
          ctx.lineTo(px + 16, py + ts);
          ctx.stroke();

          // Chain link ellipses
          ctx.fillStyle = '#95a5a6';
          for (let k = 4; k < ts; k += 10) {
            ctx.beginPath();
            ctx.ellipse(px + 16, py + k, 3, 4, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          continue;
        }

        if (!tile.solid) continue;

        // 3. Mario-style Pipe Rim (Top)
        if (tile.type === 'pipe_top') {
          ctx.save();
          const pCol = tile.pipeColor || '#2ecc71';

          // Pipe collar lip (protrudes 3px on both sides)
          const lipX = px - 3;
          const lipW = ts + 6;
          const lipH = 14;

          // Rim shading
          const lipGrad = ctx.createLinearGradient(lipX, py, lipX + lipW, py);
          lipGrad.addColorStop(0, '#196f3d');
          lipGrad.addColorStop(0.2, '#58d68d');
          lipGrad.addColorStop(0.35, '#abebc6');
          lipGrad.addColorStop(0.6, pCol);
          lipGrad.addColorStop(1, '#145a32');

          ctx.fillStyle = lipGrad;
          ctx.fillRect(lipX, py, lipW, lipH);
          ctx.strokeStyle = '#0e3e22';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(lipX + 0.5, py + 0.5, lipW - 1, lipH - 1);

          // Dark pipe mouth opening on top
          ctx.fillStyle = '#082514';
          ctx.beginPath();
          ctx.ellipse(px + 16, py + 2, lipW / 2 - 2, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Pipe shaft below lip
          const shaftW = ts;
          const shaftH = ts - lipH;
          const shaftGrad = ctx.createLinearGradient(px, py + lipH, px + shaftW, py + lipH);
          shaftGrad.addColorStop(0, '#196f3d');
          shaftGrad.addColorStop(0.2, '#58d68d');
          shaftGrad.addColorStop(0.35, '#abebc6');
          shaftGrad.addColorStop(0.6, pCol);
          shaftGrad.addColorStop(1, '#145a32');

          ctx.fillStyle = shaftGrad;
          ctx.fillRect(px, py + lipH, shaftW, shaftH);
          ctx.strokeRect(px + 0.5, py + lipH, shaftW - 1, shaftH);

          ctx.restore();
          continue;
        }

        // 4. Mario-style Pipe Body (Shaft)
        if (tile.type === 'pipe_body') {
          ctx.save();
          const pCol = tile.pipeColor || '#2ecc71';
          const shaftGrad = ctx.createLinearGradient(px, py, px + ts, py);
          shaftGrad.addColorStop(0, '#196f3d');
          shaftGrad.addColorStop(0.2, '#58d68d');
          shaftGrad.addColorStop(0.35, '#abebc6');
          shaftGrad.addColorStop(0.6, pCol);
          shaftGrad.addColorStop(1, '#145a32');

          ctx.fillStyle = shaftGrad;
          ctx.fillRect(px, py, ts, ts);

          ctx.strokeStyle = '#0e3e22';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 0.5, py, ts - 1, ts);
          ctx.restore();
          continue;
        }

        // 5. Architectural Stone Pillars
        if (tile.type === 'pillar') {
          ctx.save();
          // Fluted marble/granite column
          const colGrad = ctx.createLinearGradient(px, py, px + ts, py);
          colGrad.addColorStop(0, '#1f2937');
          colGrad.addColorStop(0.3, '#4b5563');
          colGrad.addColorStop(0.6, '#374151');
          colGrad.addColorStop(1, '#111827');

          ctx.fillStyle = colGrad;
          ctx.fillRect(px + 4, py, ts - 8, ts);

          // Vertical fluting lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + 10, py); ctx.lineTo(px + 10, py + ts);
          ctx.moveTo(px + 16, py); ctx.lineTo(px + 16, py + ts);
          ctx.moveTo(px + 22, py); ctx.lineTo(px + 22, py + ts);
          ctx.stroke();

          // Joint rings
          ctx.fillStyle = '#6b7280';
          ctx.fillRect(px + 2, py, ts - 4, 3);
          ctx.fillRect(px + 2, py + ts - 3, ts - 4, 3);

          ctx.restore();
          continue;
        }

        // 6. Wooden Trestle Stilts
        if (tile.type === 'wood_stilt') {
          ctx.save();
          ctx.fillStyle = '#6d4c41';
          ctx.fillRect(px + 6, py, 6, ts);
          ctx.fillRect(px + ts - 12, py, 6, ts);

          // Cross braces
          ctx.strokeStyle = '#4e342e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 6, py);
          ctx.lineTo(px + ts - 6, py + ts);
          ctx.moveTo(px + ts - 6, py);
          ctx.lineTo(px + 6, py + ts);
          ctx.stroke();

          // Iron bolts
          ctx.fillStyle = '#b0bec5';
          ctx.beginPath();
          ctx.arc(px + 9, py + 4, 2, 0, Math.PI * 2);
          ctx.arc(px + ts - 9, py + 4, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
          continue;
        }

        // 7. Grass & Dirt Blocks
        if (tile.type === 'grass') {
          ctx.fillStyle = lvl.dirtColor;
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = lvl.groundColor;
          ctx.fillRect(px, py, ts, 8);
          ctx.fillStyle = '#2ecc71';
          ctx.fillRect(px + 4, py + 8, 4, 3);
          ctx.fillRect(px + 16, py + 8, 5, 4);
        } else if (tile.type === 'dirt') {
          ctx.fillStyle = lvl.dirtColor;
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.fillRect(px + 4, py + 4, 6, 6);
          ctx.fillRect(px + 18, py + 16, 8, 8);
        } else if (tile.type === 'stone') {
          ctx.fillStyle = '#2c3e50';
          ctx.fillRect(px, py, ts, ts);
          ctx.strokeStyle = '#1a252f';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(px + 1, py + ts - 1);
          ctx.lineTo(px + 1, py + 1);
          ctx.lineTo(px + ts - 1, py + 1);
          ctx.stroke();
        } else if (tile.type === 'wood') {
          ctx.fillStyle = '#a0522d';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(px, py + ts - 4, ts, 4);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);
        } else if (tile.type === 'crumble') {
          let shakeOff = 0;
          if (tile.triggered) {
            shakeOff = (Math.random() - 0.5) * 4;
          }
          ctx.fillStyle = '#d35400';
          ctx.fillRect(px + shakeOff, py, ts, ts);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px + shakeOff + 4, py + 2);
          ctx.lineTo(px + shakeOff + 16, py + 18);
          ctx.lineTo(px + shakeOff + 28, py + 28);
          ctx.stroke();
        } else if (tile.type === 'crack') {
          ctx.fillStyle = '#7f8c8d';
          ctx.fillRect(px, py, ts, ts);
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 2, py + 16);
          ctx.lineTo(px + 14, py + 8);
          ctx.lineTo(px + 20, py + 24);
          ctx.lineTo(px + 30, py + 12);
          ctx.stroke();
        } else if (tile.type === 'mystery') {
          // Mario-style Golden Question Mark Block
          let bounceY = 0;
          if (tile.bounceTimer > 0) {
            bounceY = -Math.sin(tile.bounceTimer * Math.PI / 0.28) * 8;
            tile.bounceTimer -= 0.016;
          }
          const by = py + bounceY;

          // 3D block gradient
          const bGrad = ctx.createLinearGradient(px, by, px, by + ts);
          bGrad.addColorStop(0, '#f39c12');
          bGrad.addColorStop(0.5, '#f1c40f');
          bGrad.addColorStop(1, '#d68910');
          ctx.fillStyle = bGrad;
          ctx.fillRect(px, by, ts, ts);

          // 3D beveled borders
          ctx.fillStyle = '#f9e79f';
          ctx.fillRect(px, by, ts, 2);
          ctx.fillRect(px, by, 2, ts);
          ctx.fillStyle = '#b7950b';
          ctx.fillRect(px, by + ts - 2, ts, 2);
          ctx.fillRect(px + ts - 2, by, 2, ts);

          // Corner metal bolts
          ctx.fillStyle = '#7d6608';
          ctx.fillRect(px + 3, by + 3, 2, 2);
          ctx.fillRect(px + ts - 5, by + 3, 2, 2);
          ctx.fillRect(px + 3, by + ts - 5, 2, 2);
          ctx.fillRect(px + ts - 5, by + ts - 5, 2, 2);

          // Glowing "?" mark
          const glint = Math.sin(Date.now() / 200) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(255, 255, 255, ${glint})`;
          ctx.font = 'bold 18px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 3;
          ctx.fillText('?', px + ts / 2, by + ts / 2 + 1);
          ctx.shadowBlur = 0;
        } else if (tile.type === 'empty_block') {
          // Inert bonked block (bronze metal with rivets)
          ctx.fillStyle = '#784212';
          ctx.fillRect(px, py, ts, ts);
          ctx.strokeStyle = '#4a2800';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
          ctx.fillStyle = '#b9770e';
          ctx.fillRect(px + 3, py + 3, 2, 2);
          ctx.fillRect(px + ts - 5, py + 3, 2, 2);
          ctx.fillRect(px + 3, py + ts - 5, 2, 2);
          ctx.fillRect(px + ts - 5, py + ts - 5, 2, 2);
        } else if (tile.type === 'water') {
          // Translucent sparkling water body
          const waveOff = Math.sin(time * 3 + px * 0.1) * 3;
          ctx.fillStyle = 'rgba(0, 168, 255, 0.42)';
          ctx.fillRect(px, py, ts, ts);

          // Top water surface ripple if tile above is not water
          const tileAbove = lvl.map[y - 1] ? lvl.map[y - 1][x] : null;
          if (!tileAbove || tileAbove.type !== 'water') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.fillRect(px, py + waveOff, ts, 3);
            ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
            ctx.fillRect(px, py + waveOff + 3, ts, 4);
          }
        }
      }
    }
  }

  drawEntities(ctx) {
    const lvl = this.currentLevel;
    const time = Date.now() / 1000;

    // 1. Moving Platform Rails
    for (const plat of lvl.movingPlatforms || []) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      if (plat.isVertical) {
        ctx.moveTo(plat.x + plat.width / 2, plat.minY + plat.height / 2);
        ctx.lineTo(plat.x + plat.width / 2, plat.maxY + plat.height / 2);
      } else {
        ctx.moveTo(plat.minX + plat.width / 2, plat.y + plat.height / 2);
        ctx.lineTo(plat.maxX + plat.width / 2, plat.y + plat.height / 2);
      }
      ctx.stroke();

      ctx.fillStyle = '#95a5a6';
      if (plat.isVertical) {
        ctx.beginPath(); ctx.arc(plat.x + plat.width / 2, plat.minY + plat.height / 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(plat.x + plat.width / 2, plat.maxY + plat.height / 2, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(plat.minX + plat.width / 2, plat.y + plat.height / 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(plat.maxX + plat.width / 2, plat.y + plat.height / 2, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#3498db';
      ctx.strokeStyle = '#2980b9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, [6]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f39c12';
      ctx.fillRect(plat.x + 8, plat.y + 4, plat.width - 16, 4);
      ctx.restore();
    }

    // 2. Mario-style Warp Pipe Aura Indicators
    for (const pipe of lvl.warpPipes || []) {
      ctx.save();
      const pulse = Math.sin(time * 6) * 3;

      // Glowing suction halo around pipe mouth
      ctx.fillStyle = 'rgba(46, 204, 113, 0.28)';
      ctx.beginPath();
      ctx.ellipse(pipe.enterX, pipe.enterY - 6, 18 + pulse, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Swirling suction vortex
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pipe.enterX, pipe.enterY - 6, 12 + pulse * 0.5, time * 4, time * 4 + Math.PI * 1.5);
      ctx.stroke();

      // Floating Neon Chevron Arrow pointing into pipe
      const arrowY = pipe.enterY - 22 + Math.sin(time * 4) * 4;
      ctx.fillStyle = '#2ecc71';
      ctx.shadowColor = '#2ecc71';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(pipe.enterX, arrowY + 8);
      ctx.lineTo(pipe.enterX - 6, arrowY);
      ctx.lineTo(pipe.enterX + 6, arrowY);
      ctx.closePath();
      ctx.fill();

      // Pill label
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(pipe.enterX - 26, arrowY - 14, 52, 12, [6]);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pipe.label || 'WARP', pipe.enterX, arrowY - 5);
      ctx.restore();
    }

    // 3. Steam Hazard Pipe Clouds & Pressure Gauges
    for (const steam of lvl.steamPipes || []) {
      ctx.save();
      const cyclePos = steam.timer % steam.cycle;
      const isSteaming = cyclePos < steam.activeDuration;
      const isWarning = !isSteaming && (steam.cycle - cyclePos < 0.6);

      // Pressure Gauge on side of the pipe
      const gaugeX = steam.x - 2;
      const gaugeY = steam.y + 14;
      ctx.fillStyle = '#b7950b';
      ctx.beginPath(); ctx.arc(gaugeX, gaugeY, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef9e7';
      ctx.beginPath(); ctx.arc(gaugeX, gaugeY, 4.5, 0, Math.PI * 2); ctx.fill();
      const needleAngle = -Math.PI * 0.7 + (cyclePos / steam.cycle) * Math.PI * 1.4;
      ctx.strokeStyle = isWarning || isSteaming ? '#e74c3c' : '#2c3e50';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gaugeX, gaugeY);
      ctx.lineTo(gaugeX + Math.cos(needleAngle) * 4, gaugeY + Math.sin(needleAngle) * 4);
      ctx.stroke();

      // Warning Blinking LED on rim
      const ledColor = isSteaming ? '#e74c3c' : isWarning ? (Math.sin(time * 24) > 0 ? '#ff0000' : '#550000') : '#27ae60';
      ctx.fillStyle = ledColor;
      ctx.shadowColor = ledColor;
      ctx.shadowBlur = isSteaming || isWarning ? 8 : 0;
      ctx.beginPath();
      ctx.arc(steam.x + 4, steam.y + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Multilayered Steam Plume
      if (isSteaming) {
        const steamGrad = ctx.createLinearGradient(steam.x + 16, steam.y, steam.x + 16, steam.y - 54);
        steamGrad.addColorStop(0, 'rgba(255, 220, 180, 0.85)');
        steamGrad.addColorStop(0.4, 'rgba(240, 245, 255, 0.6)');
        steamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = steamGrad;
        for (let i = 0; i < 4; i++) {
          const puffX = steam.x + 16 + Math.sin(time * 16 + i * 2) * (4 + i * 2);
          const puffY = steam.y - 10 - i * 12;
          ctx.beginPath();
          ctx.arc(puffX, puffY, 9 + i * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 4. Patrolling Spike Balls (Chunky Cast-Iron Mine with Razor Teeth)
    for (const hazard of lvl.patrolHazards || []) {
      ctx.save();
      ctx.translate(hazard.x, hazard.y);

      // Rolling dust on ground
      if (Math.random() < 0.25) {
        this.particleSystem.emitDust(hazard.x, hazard.y + (hazard.radius || 14), 1, 15);
      }

      ctx.rotate(hazard.rotation);
      const hr = hazard.radius || 14;
      const numSpikes = 10;

      // 10 Razor Steel Spikes with dual-tone bevels
      for (let s = 0; s < numSpikes; s++) {
        const ang = (s * Math.PI * 2) / numSpikes;
        const tipX = Math.cos(ang) * (hr + 8);
        const tipY = Math.sin(ang) * (hr + 8);
        const b1X = Math.cos(ang - 0.22) * (hr * 0.85);
        const b1Y = Math.sin(ang - 0.22) * (hr * 0.85);
        const b2X = Math.cos(ang + 0.22) * (hr * 0.85);
        const b2Y = Math.sin(ang + 0.22) * (hr * 0.85);

        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(b1X, b1Y);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(Math.cos(ang) * (hr * 0.85), Math.sin(ang) * (hr * 0.85));
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (hr * 0.85), Math.sin(ang) * (hr * 0.85));
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(b2X, b2Y);
        ctx.closePath();
        ctx.fill();
      }

      // Cast-iron core with 3D spherical gradient
      const ironGrad = ctx.createRadialGradient(-hr * 0.35, -hr * 0.35, hr * 0.1, 0, 0, hr);
      ironGrad.addColorStop(0, '#7f8c8d');
      ironGrad.addColorStop(0.5, '#2c3e50');
      ironGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = ironGrad;
      ctx.beginPath();
      ctx.arc(0, 0, hr, 0, Math.PI * 2);
      ctx.fill();

      // Outer rim rivets
      ctx.fillStyle = '#bdc3c7';
      for (let r = 0; r < 6; r++) {
        const rAng = (r * Math.PI * 2) / 6;
        ctx.beginPath();
        ctx.arc(Math.cos(rAng) * (hr * 0.65), Math.sin(rAng) * (hr * 0.65), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pulsing Menacing Red Core Eye
      const eyePulse = Math.sin(time * 8) * 0.8;
      ctx.fillStyle = '#ff1122';
      ctx.shadowColor = '#ff0022';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5 + eyePulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 5. Signposts
    for (const sign of lvl.signposts || []) {
      ctx.save();
      ctx.translate(sign.x, sign.y);

      ctx.fillStyle = '#5d4037';
      ctx.fillRect(14, 10, 4, 22);

      const signGrad = ctx.createLinearGradient(2, 0, 2, 14);
      signGrad.addColorStop(0, '#d7ccc8');
      signGrad.addColorStop(1, '#a1887f');
      ctx.fillStyle = signGrad;
      ctx.fillRect(2, 0, 28, 14);
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(2, 0, 28, 14);

      ctx.fillStyle = '#3e2723';
      ctx.fillRect(4, 2, 2, 2);
      ctx.fillRect(26, 2, 2, 2);
      ctx.fillRect(4, 10, 2, 2);
      ctx.fillRect(26, 10, 2, 2);

      ctx.font = 'bold 9px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💡', 16, 11);
      ctx.restore();
    }

    // 6. Directional Spikes (with Warning Hazard Striped Base & Chrome Gleam)
    for (const spk of lvl.spikes || []) {
      ctx.save();
      const numTeeth = Math.floor(spk.width / 16);
      const isCeiling = spk.dir === 'down';

      // Heavy Hazard Base Plate with yellow/black danger stripes
      const baseY = isCeiling ? spk.y : spk.y + spk.height - 4;
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(spk.x, baseY, spk.width, 4);

      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2.5;
      for (let s = spk.x - 4; s < spk.x + spk.width; s += 8) {
        ctx.beginPath();
        ctx.moveTo(s, baseY + 4);
        ctx.lineTo(s + 4, baseY);
        ctx.stroke();
      }

      // 3D Metallic Razor Teeth
      for (let i = 0; i < numTeeth; i++) {
        const tx = spk.x + i * 16;
        const toothBaseY = isCeiling ? spk.y + 4 : spk.y + spk.height - 4;
        const toothTipY = isCeiling ? spk.y + spk.height : spk.y;

        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(tx, toothBaseY);
        ctx.lineTo(tx + 8, toothTipY);
        ctx.lineTo(tx + 8, toothBaseY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(tx + 8, toothBaseY);
        ctx.lineTo(tx + 8, toothTipY);
        ctx.lineTo(tx + 16, toothBaseY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#922b21';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, toothBaseY);
        ctx.lineTo(tx + 8, toothTipY);
        ctx.lineTo(tx + 16, toothBaseY);
        ctx.stroke();

        if (Math.sin(time * 3 + i * 1.5) > 0.85) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(tx + 8, toothTipY, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.restore();
    }

    // 7. Golden Rings
    for (const ring of lvl.rings || []) {
      if (!ring.collected) {
        ctx.save();
        ctx.translate(ring.x, ring.y);

        const spinScale = Math.cos(time * 3.5);
        ctx.scale(spinScale, 1);

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#fff5a6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // 8. Trampolines / Springs (Coiled Chrome Spiral & Rubber Bumper)
    for (const spr of lvl.springs || []) {
      ctx.save();
      ctx.translate(spr.x, spr.y);

      const isCompressed = spr.triggered > 0;
      const idleBob = isCompressed ? 0 : Math.sin(time * 5) * 1.5;
      const height = isCompressed ? 8 : (16 + idleBob);
      const topY = 32 - height;

      // Heavy Cast Steel Base Plate
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(1, 27, 30, 5);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 27, 30, 5);

      // Anchor bolts
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(5, 29.5, 2, 0, Math.PI * 2);
      ctx.arc(27, 29.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Coiled Metallic Spring Spiral
      const numCoils = isCompressed ? 2 : 4;
      const coilStep = (height - 6) / numCoils;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let c = 0; c < numCoils; c++) {
        const cy = topY + 4 + c * coilStep;
        ctx.moveTo(6, cy);
        ctx.lineTo(26, cy + coilStep * 0.5);
        ctx.lineTo(6, cy + coilStep);
      }
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let c = 0; c < numCoils; c++) {
        const cy = topY + 4 + c * coilStep;
        ctx.moveTo(8, cy + 1);
        ctx.lineTo(24, cy + coilStep * 0.5 + 1);
      }
      ctx.stroke();

      // Thick Rubber Bumper Cap
      const bumperGrad = ctx.createLinearGradient(0, topY - 5, 0, topY + 3);
      bumperGrad.addColorStop(0, '#ff4d5a');
      bumperGrad.addColorStop(0.6, '#e11d48');
      bumperGrad.addColorStop(1, '#9f1239');
      ctx.fillStyle = bumperGrad;
      ctx.beginPath();
      ctx.roundRect(0, topY - 5, 32, 7, [4]);
      ctx.fill();
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, topY - 5, 32, 7);

      // Stenciled White Bounce Arrows
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ ▲', 16, topY);

      ctx.restore();
    }

    // 9. Pressure Switches (with LED Status & Conduit Traces)
    for (const sw of lvl.switches || []) {
      ctx.save();
      ctx.translate(sw.x, sw.y);
      const isDown = sw.pressed;

      // Heavy steel housing bezel
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(2, 24, 28, 8);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(2, 24, 28, 8);

      // Corner hex screws
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(4, 26, 2, 2);
      ctx.fillRect(26, 26, 2, 2);

      // Switch pad with tread lines
      const padY = isDown ? 23 : 17;
      const padH = isDown ? 4 : 9;
      ctx.fillStyle = isDown ? '#15803d' : '#b91c1c';
      ctx.fillRect(6, padY, 20, padH);
      ctx.strokeStyle = isDown ? '#22c55e' : '#f87171';
      ctx.lineWidth = 1;
      ctx.strokeRect(6, padY, 20, padH);

      // Status LED circular beacon in center
      const ledColor = isDown ? '#22c55e' : '#ef4444';
      ctx.fillStyle = ledColor;
      ctx.shadowColor = ledColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(16, padY + padH / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 10. Laser Barriers & Key Portcullis Gates
    for (const door of lvl.doors || []) {
      if (!door.open) {
        ctx.save();
        if (door.type === 'laser') {
          // Chrome Emitter Pylons on Top & Bottom
          ctx.fillStyle = '#334155';
          ctx.fillRect(door.x + 8, door.y, 16, 8);
          ctx.fillRect(door.x + 8, door.y + door.height - 8, 16, 8);

          // Emitter Crystals
          ctx.fillStyle = '#00d2ff';
          ctx.beginPath();
          ctx.arc(door.x + 16, door.y + 6, 3, 0, Math.PI * 2);
          ctx.arc(door.x + 16, door.y + door.height - 6, 3, 0, Math.PI * 2);
          ctx.fill();

          // Triple-Layer Laser Beam
          const beamX = door.x + 16;
          ctx.strokeStyle = 'rgba(0, 210, 255, 0.28)';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(beamX, door.y + 8);
          ctx.lineTo(beamX, door.y + door.height - 8);
          ctx.stroke();

          ctx.strokeStyle = '#00d2ff';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#00d2ff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(beamX, door.y + 8);
          ctx.lineTo(beamX, door.y + door.height - 8);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(beamX, door.y + 8);
          for (let ly = door.y + 12; ly < door.y + door.height - 8; ly += 14) {
            const jitter = Math.sin(time * 30 + ly) * 2;
            ctx.lineTo(beamX + jitter, ly);
          }
          ctx.lineTo(beamX, door.y + door.height - 8);
          ctx.stroke();

        } else {
          // Heavy Wrought-Iron Portcullis with Padlock
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(door.x + 6, door.y, 20, door.height);

          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(door.x + 10, door.y); ctx.lineTo(door.x + 10, door.y + door.height);
          ctx.moveTo(door.x + 16, door.y); ctx.lineTo(door.x + 16, door.y + door.height);
          ctx.moveTo(door.x + 22, door.y); ctx.lineTo(door.x + 22, door.y + door.height);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.fillRect(door.x + 6, door.y + 12, 20, 4);
          ctx.fillRect(door.x + 6, door.y + door.height - 16, 20, 4);

          // Massive Golden Padlock in Center
          const lockY = door.y + door.height / 2;
          ctx.fillStyle = '#eab308';
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(door.x + 7, lockY - 8, 18, 16, [4]);
          ctx.fill();

          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(door.x + 16, lockY - 8, 6, Math.PI, 0);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = '#713f12';
          ctx.beginPath();
          ctx.arc(door.x + 16, lockY - 2, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(door.x + 15, lockY - 2, 2, 5);
        }
        ctx.restore();
      }
    }

    // 11. Golden Keys (3D Floating Key with Halo & Sparkle Flare)
    for (const key of lvl.keys || []) {
      if (!key.collected) {
        ctx.save();
        const bob = Math.sin(time * 4) * 4;
        const tilt = Math.cos(time * 3) * 0.15;
        ctx.translate(key.x, key.y + bob);
        ctx.rotate(tilt);

        const haloGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
        haloGrad.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
        haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.font = '24px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔑', 0, 0);

        if (Math.sin(time * 5) > 0.7) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(6, -6, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // 12. Air Vents (Turbine Fan with Rising Streamlines)
    for (const vent of lvl.vents || []) {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(vent.x, vent.y, vent.width, 16);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vent.x, vent.y, vent.width, 16);

      ctx.save();
      ctx.beginPath();
      ctx.rect(vent.x + 2, vent.y + 2, vent.width - 4, 12);
      ctx.clip();
      ctx.fillStyle = '#94a3b8';
      const bladeShift = (time * 160) % 18;
      for (let b = vent.x - 20 + bladeShift; b < vent.x + vent.width + 20; b += 10) {
        ctx.beginPath();
        ctx.moveTo(b, vent.y + 2);
        ctx.lineTo(b + 5, vent.y + 14);
        ctx.lineTo(b + 3, vent.y + 14);
        ctx.lineTo(b - 2, vent.y + 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vent.x, vent.y + 8); ctx.lineTo(vent.x + vent.width, vent.y + 8);
      ctx.moveTo(vent.x + 8, vent.y); ctx.lineTo(vent.x + 8, vent.y + 16);
      ctx.moveTo(vent.x + 24, vent.y); ctx.lineTo(vent.x + 24, vent.y + 16);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 210, 255, 0.4)';
      ctx.lineWidth = 2;
      for (let w = 0; w < 4; w++) {
        const flowY = vent.y - ((time * 90 + w * 42) % vent.height);
        const waveX = Math.sin(time * 6 + w) * 3;
        ctx.beginPath();
        ctx.moveTo(vent.x + 4 + w * 8, flowY);
        ctx.lineTo(vent.x + 4 + w * 8 + waveX, flowY - 14);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 13. Size Power-Up Shrines (Ornate Pedestal & Alchemical Orb)
    for (const pump of lvl.pumps || []) {
      ctx.save();
      ctx.translate(pump.x, pump.y);
      const bob = Math.sin(time * 3) * 3;

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(2, 32);
      ctx.lineTo(30, 32);
      ctx.lineTo(26, 22);
      ctx.lineTo(6, 22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.strokeStyle = pump.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, 27); ctx.lineTo(16, 25); ctx.lineTo(22, 27);
      ctx.stroke();

      ctx.save();
      ctx.translate(16, 12 + bob);
      ctx.rotate(time * 2);
      ctx.strokeStyle = pump.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const orbGrad = ctx.createRadialGradient(16 - 3, 12 + bob - 3, 2, 16, 12 + bob, 11);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.4, pump.color);
      orbGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = orbGrad;
      ctx.shadowColor = pump.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(16, 12 + bob, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = pump.toSize === 'giant' ? 'MAX' : pump.toSize === 'mini' ? 'MIN' : 'NORM';
      ctx.fillText(label, 16, 12 + bob);

      ctx.restore();
    }

    // 14. Checkpoints (Steel Pole & Animated Cloth Pennant)
    for (const cp of lvl.checkpoints || []) {
      ctx.save();
      ctx.translate(cp.x, cp.y);

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, -30, 4, 30);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, -30, 2, 30);

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(2, -32, 3.5, 0, Math.PI * 2);
      ctx.fill();

      const flutter = Math.sin(time * 8) * 3;
      ctx.fillStyle = cp.activated ? '#22c55e' : '#ef4444';
      ctx.shadowColor = cp.activated ? '#22c55e' : 'transparent';
      ctx.shadowBlur = cp.activated ? 10 : 0;
      ctx.beginPath();
      ctx.moveTo(4, -30);
      ctx.lineTo(26 + flutter, -21);
      ctx.lineTo(4, -12);
      ctx.closePath();
      ctx.fill();

      if (cp.activated) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', 12, -20);
      }

      ctx.restore();
    }

    // 15. Exit Portal (Cosmic Stargate Vortex)
    const portal = lvl.portal;
    ctx.save();
    ctx.translate(portal.x, portal.y);

    const portalGlow = portal.open ? '#00d2ff' : '#475569';
    ctx.strokeStyle = portalGlow;
    ctx.lineWidth = 4;
    ctx.shadowColor = portal.open ? '#00d2ff' : 'transparent';
    ctx.shadowBlur = portal.open ? 24 : 0;

    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 34, Math.sin(time * 2) * 0.15, 0, Math.PI * 2);
    ctx.stroke();

    const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 20);
    coreGrad.addColorStop(0, portal.open ? '#ffffff' : '#334155');
    coreGrad.addColorStop(0.5, portal.open ? 'rgba(0, 210, 255, 0.6)' : 'rgba(71, 85, 105, 0.4)');
    coreGrad.addColorStop(1, portal.open ? 'rgba(147, 51, 234, 0.2)' : 'rgba(15, 23, 42, 0.2)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(portal.open ? 'EXIT' : '🔒', 0, 0);

    if (!portal.open) {
      const remaining = lvl.targetRings - lvl.rings.filter(r => r.collected).length;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(-44, -50, 88, 18, [9]);
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 10px Fredoka, sans-serif';
      ctx.fillText(`🟡 Sisa ${remaining}`, 0, -41);
    } else {
      ctx.fillStyle = 'rgba(0, 210, 255, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-48, -50, 96, 18, [9]);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Fredoka, sans-serif';
      ctx.fillText(`✨ TERBUKA!`, 0, -41);
    }

    ctx.restore();

    // 14. Floating Navigation Compass Arrow (Pointing towards nearest uncollected ring or open portal)
    const p = this.player;
    if (p && this.currentLevel) {
      let targetEntity = null;
      const uncollectedRings = (this.currentLevel.rings || []).filter(r => !r.collected);
      if (uncollectedRings.length > 0) {
        let minDist = Infinity;
        for (const ring of uncollectedRings) {
          const d = Math.hypot(p.x - ring.x, p.y - ring.y);
          if (d < minDist) {
            minDist = d;
            targetEntity = ring;
          }
        }
      } else if (this.currentLevel.portal && this.currentLevel.portal.open) {
        targetEntity = this.currentLevel.portal;
      }

      if (targetEntity) {
        const dx = targetEntity.x - p.x;
        const dy = targetEntity.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 100) {
          const angle = Math.atan2(dy, dx);
          const orbitDist = p.radius + 24 + Math.sin(time * 6) * 3;
          const ax = p.x + Math.cos(angle) * orbitDist;
          const ay = p.y + Math.sin(angle) * orbitDist;

          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(angle);

          const arrowCol = (uncollectedRings.length > 0) ? '#ffd700' : '#2ecc71';
          ctx.fillStyle = arrowCol;
          ctx.shadowColor = arrowCol;
          ctx.shadowBlur = 8;

          ctx.beginPath();
          ctx.moveTo(9, 0);
          ctx.lineTo(-4, -6);
          ctx.lineTo(-1, 0);
          ctx.lineTo(-4, 6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
}

window.BounceGame = BounceGame;

function initBounceGame() {
  if (!window.game) {
    window.game = new BounceGame();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initBounceGame);
} else {
  initBounceGame();
}
