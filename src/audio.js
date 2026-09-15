/**
 * Nostalgic Web Audio API Synthesizer
 * Provides soothing retro BGM and nostalgic sound effects (SFX)
 * No external audio files needed - 100% reliable, zero latency!
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.isMuted = false;
    this.initialized = false;

    // BGM sequencer state
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmTempo = 118; // BPM
    this.isPlayingBGM = false;
  }

  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.initialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx ? this.ctx.currentTime : 0);
    }
    return !this.isMuted;
  }

  // --- SOUND EFFECTS (SFX) ---

  // 1. Jump Sound: Smooth, warm retro hop
  playJump() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    // Slide pitch up smoothly: from 210Hz to 440Hz
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(460, t + 0.14);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // 2. Landing Thud: Soft low body thud with low-pass filtered noise
  playLand(intensity = 1.0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const vol = Math.min(0.35, 0.15 * intensity);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // 3. Ring Collect: Sparkling dual-chime with warm harmonics
  playRing() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const notes = [659.25, 987.77, 1318.51]; // E5, B5, E6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      const startTime = t + idx * 0.055;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  }

  // 4. Spring / Trampoline: Juicy high-flying boing with vibrato
  playSpring() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.28);

    // Add playful wobble
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(24, t);
    lfoGain.gain.setValueAtTime(45, t);
    lfoGain.gain.linearRampToValueAtTime(0, t + 0.28);

    lfo.connect(osc.frequency);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    lfo.start(t);
    osc.start(t);
    lfo.stop(t + 0.32);
    osc.stop(t + 0.32);
  }

  // 5. Switch / Button Pressed
  playSwitch() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(420, t);
    osc.frequency.setValueAtTime(840, t + 0.04);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // 6. Key Picked Up: Shiny bell
  playKey() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    [880, 1108.73, 1318.51, 1760].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const st = t + idx * 0.045;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.18, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(st);
      osc.stop(st + 0.3);
    });
  }

  // 7. Door Unlocked: Stone slide hum
  playDoorUnlock() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.linearRampToValueAtTime(900, t + 0.3);

    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(280, t + 0.3);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // 8. Ball Pop / Deflate (Spikes/Hazard hit)
  playPop() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Pop noise
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);

    // Deflate pitch slide
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);

    oscGain.gain.setValueAtTime(0.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // 9. Checkpoint Banner Reached
  playCheckpoint() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const st = t + idx * 0.08;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.22, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(st);
      osc.stop(st + 0.4);
    });
  }

  // 10. Size Change (Inflate / Deflate)
  playSizeChange(isBigger) {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    if (isBigger) {
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(540, t + 0.25);
    } else {
      osc.frequency.setValueAtTime(640, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.25);
    }

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  // 10b. Warp / Pneumatic Pipe Travel Sound
  playPipe() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Classic retro pipe slide whoosh: descending steps
    const steps = [320, 240, 180, 130];
    steps.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const st = t + idx * 0.04;
      osc.frequency.setValueAtTime(freq, st);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, st + 0.05);

      gain.gain.setValueAtTime(0.25, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(st);
      osc.stop(st + 0.06);
    });
  }

  // 11. Mario-style Mystery "?" Block Bonk
  playBonk() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Upward metallic ding: 587Hz -> 880Hz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, t);
    osc.frequency.exponentialRampToValueAtTime(1174.66, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  // 12. Water Splash
  playSplash() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Low bubble pitch bend
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // 13. Rebound Hurt
  playHurt() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.2);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // 14. Bubble Shield Pickup
  playShield() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Ethereal chime
    [440, 659, 880, 1318].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const st = t + idx * 0.05;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.18, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.26);
    });
  }

  // 15. Level Complete Fanfare
  playVictory() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Nostalgic triumphal 8-bit melody: C4, G4, C5, E5, G5, C6
    const fanfare = [
      { note: 523.25, dur: 0.12, delay: 0.0 },   // C5
      { note: 659.25, dur: 0.12, delay: 0.12 },  // E5
      { note: 783.99, dur: 0.12, delay: 0.24 },  // G5
      { note: 1046.50, dur: 0.35, delay: 0.38 }, // C6
      { note: 880.00, dur: 0.14, delay: 0.76 },  // A5
      { note: 987.77, dur: 0.14, delay: 0.92 },  // B5
      { note: 1046.50, dur: 0.60, delay: 1.08 }  // C6 hold
    ];

    fanfare.forEach(item => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const st = t + item.delay;
      osc.frequency.setValueAtTime(item.note, st);
      gain.gain.setValueAtTime(0.25, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + item.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(st);
      osc.stop(st + item.dur);
    });
  }

  // --- NOSTALGIC PROCEDURAL BGM ENGINE ---
  // Gentle, soothing retro chiptune / FM harmony that creates a cozy retro vibe
  startBGM() {
    if (!this.initialized || this.isPlayingBGM) return;
    this.isPlayingBGM = true;
    this.bgmStep = 0;
    this.scheduleBGM();
  }

  stopBGM() {
    this.isPlayingBGM = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  scheduleBGM() {
    if (!this.isPlayingBGM || !this.ctx) return;
    this.resume();

    // 16-step soothing chord loop (Key of C Major / A Minor: C -> G/B -> Am -> F)
    // Notes in Hz:
    // C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88
    // C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880.00
    const melodyPattern = [
      523.25, 659.25, 783.99, 659.25,  // Bar 1 (C chord arpeggio)
      493.88, 587.33, 783.99, 587.33,  // Bar 2 (G chord arpeggio)
      440.00, 523.25, 659.25, 523.25,  // Bar 3 (Am chord arpeggio)
      349.23, 440.00, 523.25, 659.25,  // Bar 4 (F chord arpeggio)
      523.25, 783.99, 880.00, 783.99,  // Bar 5
      659.25, 587.33, 523.25, 493.88,  // Bar 6
      440.00, 659.25, 523.25, 440.00,  // Bar 7
      392.00, 523.25, 587.33, 523.25   // Bar 8
    ];

    const bassPattern = [
      130.81, null, 130.81, null,  // C3
      98.00,  null, 98.00,  null,  // G2
      110.00, null, 110.00, null,  // A2
      87.31,  null, 87.31,  null,  // F2
      130.81, null, 130.81, null,  // C3
      98.00,  null, 98.00,  null,  // G2
      110.00, null, 110.00, null,  // A2
      87.31,  null, 130.81, null   // F2 / C3
    ];

    const stepIndex = this.bgmStep % melodyPattern.length;
    const note = melodyPattern[stepIndex];
    const bassNote = bassPattern[stepIndex];
    const t = this.ctx.currentTime;
    const stepDuration = 60 / this.bgmTempo / 2; // eighth notes

    if (note && !this.isMuted) {
      // Gentle sine/triangle synth lead
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, t);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.95);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(t);
      osc.stop(t + stepDuration);
    }

    if (bassNote && !this.isMuted) {
      // Warm round bass
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassNote, t);

      bassGain.gain.setValueAtTime(0.14, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.8);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGain);

      bassOsc.start(t);
      bassOsc.stop(t + stepDuration * 1.8);
    }

    this.bgmStep++;
    this.bgmTimer = setTimeout(() => {
      this.scheduleBGM();
    }, stepDuration * 1000);
  }
}

// Global singleton
window.sound = new SoundManager();
