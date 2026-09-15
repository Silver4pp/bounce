/**
 * Smooth Particle Engine for Bounce
 * Handles dust, gold ring sparkles, explosion fragments, spring bursts,
 * steam clouds, electrical sparks, and crumbling debris.
 */

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.rotSpeed) {
        p.rotation = (p.rotation || 0) + p.rotSpeed * dt;
      }
      if (p.shrink) {
        p.size = Math.max(0.5, p.origSize * (p.life / p.maxLife));
      } else if (p.grow) {
        p.size = p.origSize + (p.maxSize - p.origSize) * (1 - p.life / p.maxLife);
      }
    }
  }

  draw(ctx, camera) {
    ctx.save();
    for (const p of this.particles) {
      const screenX = p.x - camera.x;
      const screenY = p.y - camera.y;

      if (screenX < -60 || screenX > camera.width + 60 ||
          screenY < -60 || screenY > camera.height + 60) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(screenX, screenY);
      if (p.rotation) ctx.rotate(p.rotation);

      if (p.type === 'circle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'steam') {
        // Soft volumetric cloud
        const radGrad = ctx.createRadialGradient(0, 0, p.size * 0.2, 0, 0, p.size);
        radGrad.addColorStop(0, p.color || 'rgba(255, 230, 200, 0.7)');
        radGrad.addColorStop(0.6, 'rgba(230, 240, 255, 0.4)');
        radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.lineWidth || 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const spikes = 4;
        const outer = p.size;
        const inner = p.size * 0.35;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(0, -outer);
        for (let s = 0; s < spikes; s++) {
          ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
          rot += step;
          ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
          rot += step;
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'rect') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }

      ctx.restore();
    }
    ctx.restore();
  }

  // --- Emitters ---

  emitDust(x, y, count = 6, speed = 40) {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() * Math.PI);
      const spd = (Math.random() * 0.6 + 0.4) * speed;
      this.particles.push({
        type: 'circle',
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd * 0.5,
        gravity: 30,
        size: Math.random() * 3 + 2.5,
        origSize: 4,
        shrink: true,
        color: 'rgba(230, 240, 255, 0.65)',
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.45,
        alpha: 1
      });
    }
  }

  emitSteamPuff(x, y) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        type: 'steam',
        x: x + (Math.random() - 0.5) * 14,
        y: y - Math.random() * 8,
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 90 - 50,
        gravity: -10,
        size: 8,
        origSize: 8,
        maxSize: 24,
        grow: true,
        color: 'rgba(255, 220, 190, 0.75)',
        life: 0.65 + Math.random() * 0.3,
        maxLife: 0.85,
        alpha: 0.85
      });
    }
  }

  emitSparks(x, y, color = '#ffeb3b', count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 140 + 60;
      this.particles.push({
        type: 'star',
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: 200,
        size: Math.random() * 3 + 2,
        origSize: 4,
        shrink: true,
        color,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.4,
        alpha: 1
      });
    }
  }

  emitPebbles(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'rect',
        x: x + (Math.random() - 0.5) * 24,
        y: y + Math.random() * 8,
        vx: (Math.random() - 0.5) * 40,
        vy: Math.random() * 60 + 20,
        gravity: 400,
        size: Math.random() * 3 + 2,
        origSize: 3,
        shrink: true,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 10,
        color: '#8d6e63',
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.6,
        alpha: 1
      });
    }
  }

  emitRingSparkles(x, y) {
    this.particles.push({
      type: 'ring',
      x, y,
      vx: 0, vy: 0,
      size: 4,
      origSize: 32,
      lineWidth: 3,
      shrink: false,
      color: '#ffdf00',
      life: 0.35,
      maxLife: 0.35,
      alpha: 1
    });

    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 120 + 40;
      this.particles.push({
        type: 'star',
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: 60,
        size: Math.random() * 4 + 3,
        origSize: 6,
        shrink: true,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 10,
        color: ['#fff', '#ffd700', '#ff9900'][Math.floor(Math.random() * 3)],
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.7,
        alpha: 1
      });
    }
  }

  emitSpringBurst(x, y) {
    // Expanding shockwave ring
    this.particles.push({
      type: 'ring',
      x, y,
      vx: 0, vy: -30,
      size: 6,
      origSize: 36,
      lineWidth: 3.5,
      shrink: false,
      color: '#ffeb3b',
      life: 0.3,
      maxLife: 0.3,
      alpha: 1
    });

    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const spd = Math.random() * 160 + 80;
      this.particles.push({
        type: 'circle',
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: 120,
        size: Math.random() * 3 + 2,
        origSize: 4,
        shrink: true,
        color: '#ffeb3b',
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.5,
        alpha: 1
      });
    }
  }

  emitBallPop(x, y, color = '#ff3344') {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 220 + 60;
      this.particles.push({
        type: 'rect',
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: 400,
        size: Math.random() * 5 + 3,
        origSize: 6,
        shrink: true,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 15,
        color: [color, '#ff7380', '#b30015'][Math.floor(Math.random() * 3)],
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.8,
        alpha: 1
      });
    }
  }

  emitPortalMotes(x, y) {
    if (Math.random() > 0.4) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 26 + 10;
    this.particles.push({
      type: 'circle',
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: -Math.cos(angle) * 35,
      vy: -Math.sin(angle) * 35,
      gravity: 0,
      size: Math.random() * 2.5 + 1.5,
      origSize: 3,
      shrink: true,
      color: '#00d2ff',
      life: 0.45,
      maxLife: 0.45,
      alpha: 0.8
    });
  }

  emitConfetti(x, y) {
    const colors = ['#ff3344', '#ffcc00', '#00d2ff', '#2ecc71', '#9b59b6'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 260 + 80;
      this.particles.push({
        type: 'rect',
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: 280,
        size: Math.random() * 6 + 4,
        origSize: 8,
        shrink: false,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.5 + Math.random() * 1.0,
        maxLife: 2.2,
        alpha: 1
      });
    }
  }

  emitBubbles(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'circle',
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 35,
        vy: -Math.random() * 80 - 40,
        gravity: -120, // upward buoyant float
        size: Math.random() * 4 + 3,
        origSize: 6,
        shrink: true,
        color: 'rgba(173, 216, 230, 0.75)',
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        alpha: 0.8
      });
    }
  }

  emitMysteryBurst(x, y) {
    const colors = ['#f1c40f', '#f39c12', '#ffffff', '#e67e22'];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const spd = Math.random() * 140 + 70;
      this.particles.push({
        type: 'star',
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 60,
        gravity: 340,
        size: Math.random() * 5 + 4,
        origSize: 7,
        shrink: true,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        alpha: 1
      });
    }
  }

  clear() {
    this.particles = [];
  }
}

window.ParticleSystem = ParticleSystem;
