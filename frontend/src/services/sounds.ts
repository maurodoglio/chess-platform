class SoundService {
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = true;

  private getCtx(): AudioContext {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    return this.audioCtx;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playMove() { this.playTone(600, 0.05, 'sine', 0.2); }
  playCapture() { this.playTone(300, 0.08, 'triangle', 0.3); }
  playCheck() { this.playTone(880, 0.12, 'square', 0.2); }
  playCastle() { this.playTone(500, 0.04, 'sine', 0.2); setTimeout(() => this.playTone(600, 0.04, 'sine', 0.2), 60); }
  playGameStart() { this.playTone(523, 0.1, 'sine', 0.2); setTimeout(() => this.playTone(659, 0.15, 'sine', 0.2), 120); }
  playGameEnd() { this.playTone(440, 0.2, 'sine', 0.25); }
  playIllegal() { this.playTone(200, 0.15, 'sawtooth', 0.1); }

  playMoveSound(info: { isCapture: boolean; isCheck: boolean; isCastle: boolean }) {
    if (info.isCheck) this.playCheck();
    else if (info.isCastle) this.playCastle();
    else if (info.isCapture) this.playCapture();
    else this.playMove();
  }

  toggle() { this.enabled = !this.enabled; this.savePreference(); }
  get isEnabled() { return this.enabled; }

  private savePreference() { localStorage.setItem('soundEnabled', String(this.enabled)); }
  loadPreference() { const val = localStorage.getItem('soundEnabled'); if (val !== null) this.enabled = val === 'true'; }
}

export const soundService = new SoundService();
soundService.loadPreference();
