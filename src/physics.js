/**
 * Physics and Player Entity Engine for Bounce
 * Smooth 60FPS platforming physics with manual jump input, coyote time, squash & stretch,
 * and robust AABB collision resolution.
 */

class Player {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.reset(x, y);

    // Visual attributes
    this.baseRadius = 16;
    this.radius = 16;
    this.sizeState = 'normal'; // 'normal' | 'giant' | 'mini'

    // Rotation & deformation (Squash & Stretch)
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.targetScaleX = 1;
    this.targetScaleY = 1;
  }

  reset(x = this.startX, y = this.startY) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = false;
    this.wasGrounded = false;
    this.isAlive = true;
    this.hasKey = false;
    this.sizeState = 'normal';
    this.radius = 16;

    // Health & Protection (Cozy 3-Hearts & Bubble Shield)
    this.health = 3;
    this.maxHealth = 3;
    this.hasBubbleShield = false;
    this.invulnerableTimer = 0;

    // Water & Buoyancy
    this.inWater = false;
    this.wasInWater = false;
    this.isGliding = false;

    // Jump mechanics (strictly manual jump)
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isJumping = false;
    this.wasJumpPressed = false;

    // Squash & Stretch
    this.scaleX = 1;
    this.scaleY = 1;
  }

  takeDamage(damage = 1, reboundVx = 0, reboundVy = -320) {
    if (this.invulnerableTimer > 0 || !this.isAlive) return false;

    if (this.hasBubbleShield) {
      this.hasBubbleShield = false;
      this.invulnerableTimer = 1.2;
      this.vy = reboundVy;
      this.vx = reboundVx || -Math.sign(this.vx || 1) * 160;
      if (window.sound && window.sound.playHurt) window.sound.playHurt();
      return 'shield_lost';
    }

    this.health = Math.max(0, this.health - damage);
    this.invulnerableTimer = 1.6;
    this.vy = reboundVy;
    this.vx = reboundVx || -Math.sign(this.vx || 1) * 180;
    if (window.sound && window.sound.playHurt) window.sound.playHurt();

    if (this.health <= 0) {
      this.isAlive = false;
      return 'dead';
    }
    return 'hurt';
  }

  heal(amount = 1) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  giveBubbleShield() {
    this.hasBubbleShield = true;
    if (window.sound && window.sound.playShield) window.sound.playShield();
  }

  setSize(sizeState) {
    this.sizeState = sizeState;
    if (sizeState === 'giant') {
      this.radius = 24;
      this.scaleX = 1.35;
      this.scaleY = 1.35;
    } else if (sizeState === 'mini') {
      this.radius = 10;
      this.scaleX = 0.7;
      this.scaleY = 0.7;
    } else {
      this.radius = 16;
      this.scaleX = 1.0;
      this.scaleY = 1.0;
    }
  }

  update(dt, input, level, particles) {
    if (!this.isAlive) return;

    // 0. Invulnerability cooldown
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }

    // 0.5. Water Detection & Archimedes Hydrodynamics
    this.wasInWater = this.inWater;
    this.inWater = level.isInWater ? level.isInWater(this.x, this.y) : false;

    if (this.inWater && !this.wasInWater) {
      // Just plunged into water
      if (window.sound && window.sound.playSplash) window.sound.playSplash();
      if (particles) particles.emitBubbles(this.x, this.y, 8);
    } else if (!this.inWater && this.wasInWater) {
      // Just emerged from water
      if (particles) particles.emitBubbles(this.x, this.y, 6);
      if (this.vy < -200) {
        // Dolphin leap out of water!
        if (window.sound && window.sound.playJump) window.sound.playJump();
        this.scaleX = 0.75;
        this.scaleY = 1.35;
      }
    }

    // Movement constants
    let maxSpeed = 240;
    let accel = 1400;
    let friction = 950;
    let gravity = 980;
    let jumpForce = -430;

    // Alter characteristics based on size
    if (this.sizeState === 'giant') {
      maxSpeed = 190;
      accel = 1000;
      friction = 1100;
      gravity = 1250;
      jumpForce = -400;
    } else if (this.sizeState === 'mini') {
      maxSpeed = 270;
      accel = 1600;
      friction = 800;
      gravity = 820;
      jumpForce = -460;
    }

    // 1. HORIZONTAL ROLLING INPUT
    if (input.left && !input.right) {
      if (this.vx > 0) this.vx -= friction * 2.2 * dt; // quick responsive skid
      this.vx = Math.max(-maxSpeed, this.vx - accel * dt);
    } else if (input.right && !input.left) {
      if (this.vx < 0) this.vx += friction * 2.2 * dt; // quick responsive skid
      this.vx = Math.min(maxSpeed, this.vx + accel * dt);
    } else {
      // Natural ground/air deceleration
      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - friction * dt);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + friction * dt);
      }
    }

    // 2. GRAVITY & WATER BUOYANCY
    if (this.inWater) {
      // Water hydrodynamics & drag
      this.vx *= Math.pow(0.92, dt * 60);
      this.vy *= Math.pow(0.90, dt * 60);

      if (this.sizeState === 'mini') {
        // Super light cork: buoyant upward Archimedes force
        this.vy += -540 * dt;
        if (this.vy < -260) this.vy = -260;
      } else if (this.sizeState === 'giant') {
        // Heavy iron: sinks down to pool floor
        this.vy += 420 * dt;
        if (this.vy > 320) this.vy = 320;
      } else {
        // Normal ball: semi-buoyant swimming
        if (input.down) {
          this.vy += 580 * dt;
          if (this.vy > 240) this.vy = 240;
        } else if (input.jump) {
          this.vy = Math.max(-300, this.vy - 780 * dt);
        } else {
          // Neutral equilibrium
          this.vy += -75 * dt;
        }
      }

      if (Math.random() < 0.2 && particles) {
        particles.emitBubbles(this.x, this.y, 1);
      }
    } else {
      // Normal air gravity
      this.vy += gravity * dt;
      if (this.vy > 750) this.vy = 750;

      // Cozy Glide / Parachute descent when holding jump key in air
      if (!this.isGrounded && this.vy > 60 && input.jump) {
        this.isGliding = true;
        if (this.vy > 140) this.vy = 140; // Soft glide speed
        this.scaleX = 1.06;
        this.scaleY = 0.94;
        if (Math.random() < 0.15 && particles) {
          particles.emitDust(this.x, this.y + this.radius, 1, 14);
        }
      } else {
        this.isGliding = false;
      }
    }

    // 3. JUMP BUFFER & COYOTE TIME
    // Detect jump key press edge or buffer
    const jumpPressedEdge = (input.jumpJustPressed || (input.jump && !this.wasJumpPressed));
    this.wasJumpPressed = input.jump;

    if (jumpPressedEdge) {
      this.jumpBufferTimer = 0.18; // 180ms buffer window
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
    }

    if (this.isGrounded) {
      this.coyoteTimer = 0.14; // 140ms coyote time
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= dt;
    }

    // 4. MANUAL JUMP EXECUTION (HANYA melompat saat ada input tombol lompat!)
    if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0)) {
      this.vy = jumpForce;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.isGrounded = false;
      this.isJumping = true;

      // Squash & Stretch: Stretch vertically on launch
      this.scaleX = 0.75;
      this.scaleY = 1.32;

      if (window.sound) window.sound.playJump();
      if (particles) particles.emitDust(this.x, this.y + this.radius, 8, 55);
    }

    // Variable jump height: releasing jump key early dampens upward climb
    if (!input.jump && this.vy < -120 && this.isJumping) {
      this.vy *= 0.6;
      this.isJumping = false;
    }

    // 5. PHYSICS INTEGRATION & TILE COLLISION
    this.wasGrounded = this.isGrounded;
    this.moveAndCollide(dt, level, particles);

    // 6. ROTATION (Ball visual rolling effect corresponding to actual movement)
    this.rotation += (this.vx * dt) / this.radius;

    // Dust trail when rolling fast on the ground
    if (this.isGrounded && Math.abs(this.vx) > 130 && Math.random() < 0.3) {
      if (particles) {
        particles.emitDust(this.x - Math.sign(this.vx) * this.radius * 0.8, this.y + this.radius, 2, 22);
      }
    }

    // 7. SQUASH & STRETCH SPRING DAMPING (smoothly spring back to 1.0)
    const springSpeed = 15;
    this.scaleX += (1 - this.scaleX) * springSpeed * dt;
    this.scaleY += (1 - this.scaleY) * springSpeed * dt;
  }

  // Trampoline / Spring Pad Launch
  launchUpward(strength = -650) {
    this.vy = strength;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isJumping = true;
    this.scaleX = 0.65;
    this.scaleY = 1.45;
  }

  moveAndCollide(dt, level, particles) {
    const steps = 3;
    const subDt = dt / steps;

    for (let s = 0; s < steps; s++) {
      // 1. Move X first
      this.x += this.vx * subDt;
      this.resolveTileCollisionX(level);

      // 2. Move Y second
      this.y += this.vy * subDt;
      this.resolveTileCollisionY(level, particles);
    }
  }

  resolveTileCollisionX(level) {
    const r = this.radius;
    const ts = level.tileSize || 32;

    // Vertical span of the player (slightly contracted vertically to avoid catching ceilings/floors)
    const topTile = Math.floor((this.y - r + 3) / ts);
    const bottomTile = Math.floor((this.y + r - 3) / ts);

    if (this.vx > 0) {
      // Moving right -> check right boundary tile
      const rightTile = Math.floor((this.x + r) / ts);
      for (let ty = topTile; ty <= bottomTile; ty++) {
        const tile = level.getTile(rightTile, ty);
        if (tile && tile.solid) {
          // Smash cracked stone blocks if giant
          if (tile.type === 'crack' && this.sizeState === 'giant' && Math.abs(this.vx) > 110) {
            level.breakTile(rightTile, ty);
            if (window.sound) window.sound.playSwitch();
            continue;
          }
          this.x = rightTile * ts - r;
          this.vx = 0;
          this.scaleX = 0.88;
          this.scaleY = 1.12;
          break;
        }
      }
    } else if (this.vx < 0) {
      // Moving left -> check left boundary tile
      const leftTile = Math.floor((this.x - r) / ts);
      for (let ty = topTile; ty <= bottomTile; ty++) {
        const tile = level.getTile(leftTile, ty);
        if (tile && tile.solid) {
          // Smash cracked stone blocks if giant
          if (tile.type === 'crack' && this.sizeState === 'giant' && Math.abs(this.vx) > 110) {
            level.breakTile(leftTile, ty);
            if (window.sound) window.sound.playSwitch();
            continue;
          }
          this.x = (leftTile + 1) * ts + r;
          this.vx = 0;
          this.scaleX = 0.88;
          this.scaleY = 1.12;
          break;
        }
      }
    }
  }

  resolveTileCollisionY(level, particles) {
    const r = this.radius;
    const ts = level.tileSize || 32;

    // Horizontal span of the player (slightly contracted horizontally to avoid catching walls)
    const leftTile = Math.floor((this.x - r + 4) / ts);
    const rightTile = Math.floor((this.x + r - 4) / ts);

    if (this.vy >= 0) {
      // Moving DOWN -> ONLY check tiles beneath the player!
      const bottomTile = Math.floor((this.y + r) / ts);
      let landed = false;

      for (let tx = leftTile; tx <= rightTile; tx++) {
        const tile = level.getTile(tx, bottomTile);
        if (tile && tile.solid) {
          // Breakable cracked blocks if giant and falling fast
          if (tile.type === 'crack' && this.sizeState === 'giant' && this.vy > 280) {
            level.breakTile(tx, bottomTile);
            if (window.sound) window.sound.playSwitch();
            continue;
          }

          // Land on top of the tile
          this.y = bottomTile * ts - r;

          // Squash animation on landing impact
          if (!this.wasGrounded && this.vy > 160) {
            const impact = Math.min(this.vy / 450, 1.4);
            this.scaleX = 1 + impact * 0.35;
            this.scaleY = Math.max(0.65, 1 - impact * 0.35);

            if (window.sound) window.sound.playLand(impact);
            if (particles) particles.emitDust(this.x, this.y + r, Math.floor(4 * impact) + 3, 38 * impact);
          }

          this.vy = 0;
          this.isGrounded = true;
          this.isJumping = false;
          landed = true;

          // Trigger crumbly platforms
          if (tile.type === 'crumble' && !tile.triggered) {
            tile.triggered = true;
            tile.crumbleTimer = 0.75;
          }
          break;
        }
      }

      if (!landed) {
        this.isGrounded = false;
      }

    } else {
      // Moving UP -> ONLY check tiles above the player (ceiling)!
      const topTile = Math.floor((this.y - r) / ts);

      for (let tx = leftTile; tx <= rightTile; tx++) {
        const tile = level.getTile(tx, topTile);
        if (tile && tile.solid) {
          // Mario-style Mystery "?" Block bonk!
          if (tile.type === 'mystery' && !tile.bonked) {
            tile.bonked = true;
            tile.bounceTimer = 0.28;
            if (window.sound && window.sound.playBonk) window.sound.playBonk();
            if (particles && particles.emitMysteryBurst) particles.emitMysteryBurst(tx * ts + 16, topTile * ts + 16);
            if (level.bonkMysteryBlock) {
              level.bonkMysteryBlock(tx, topTile, this);
            }
          }

          // Hit ceiling
          this.y = (topTile + 1) * ts + r;
          this.vy = 0;
          this.scaleY = 0.85;
          this.scaleX = 1.15;
          break;
        }
      }
      this.isGrounded = false;
    }
  }

  draw(ctx, camera) {
    if (!this.isAlive) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();
    ctx.translate(screenX, screenY);

    // 0. Invulnerability Blinking
    if (this.invulnerableTimer > 0) {
      if (Math.floor(Date.now() / 90) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }
    }

    // 1. Dynamic Shadow beneath the ball
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    const shadowDist = Math.max(0, this.vy * 0.02);
    const shadowWidth = this.radius * (this.isGrounded ? 1.05 : 0.85);
    ctx.beginPath();
    ctx.ellipse(0, this.radius + 2 + shadowDist, shadowWidth, this.radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Squash and Stretch scaling
    ctx.scale(this.scaleX, this.scaleY);

    // 3. Ball rotation around its center
    ctx.rotate(this.rotation);

    // 4. Base Ball Sphere (Classic Red Rubber Ball with 3D gradient)
    let colInner = '#ff7080';
    let colMid = '#e6142a';
    let colDark = '#8c0b17';

    if (this.sizeState === 'giant') {
      colInner = '#ff9955';
      colMid = '#d35400';
      colDark = '#782800';
    } else if (this.sizeState === 'mini') {
      colInner = '#5ce1e6';
      colMid = '#00a8cc';
      colDark = '#005b73';
    }

    const radGrad = ctx.createRadialGradient(
      -this.radius * 0.35, -this.radius * 0.35, this.radius * 0.1,
      0, 0, this.radius
    );
    radGrad.addColorStop(0, colInner);
    radGrad.addColorStop(0.55, colMid);
    radGrad.addColorStop(1, colDark);

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // 5. Nostalgic Seam Lines & Details (rotates with ball)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.82, -0.4, 2.2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(this.radius * 0.3, this.radius * 0.3, this.radius * 0.12, 0, Math.PI * 2);
    ctx.arc(-this.radius * 0.4, -this.radius * 0.2, this.radius * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 6. Shiny Specular Glint (Top-left highlight)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-this.radius * 0.36, -this.radius * 0.36, this.radius * 0.28, this.radius * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 7. Outer subtle border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // 8. Iridescent Translucent Bubble Shield
    if (this.hasBubbleShield) {
      ctx.save();
      const pulse = Math.sin(Date.now() / 150) * 2;
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(0, 210, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius + 6 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(screenX - this.radius * 0.45, screenY - this.radius * 0.45, this.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 9. Key indicator if carrying golden key
    if (this.hasKey) {
      ctx.save();
      const keyBob = Math.sin(Date.now() / 200) * 3;
      ctx.fillStyle = '#ffcc00';
      ctx.font = '16px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔑', screenX, screenY - this.radius - 12 + keyBob);
      ctx.restore();
    }
  }
}

window.Player = Player;
