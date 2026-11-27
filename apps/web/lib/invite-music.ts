// ============================================================
// Nimantro — Generative invitation music (Web Audio, no files)
// A tanpura drone + shehnai-like melody improvised on the Bhupali
// pentatonic scale (Sa Re Ga Pa Dha). Original, royalty-free.
// ============================================================

export interface InviteMusic {
  start: () => void;
  stop: () => void;
}

const SA = 146.83; // D3
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // Bhupali over ~2 octaves
const BEAT = 0.42; // seconds

const hz = (semis: number, base = SA * 2) => base * Math.pow(2, semis / 12);

export function createInviteMusic(): InviteMusic {
  const Ctx =
    typeof window !== "undefined"
      ? window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!Ctx) return { start: () => {}, stop: () => {} };

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let wet: GainNode | null = null;
  let timer: number | null = null;
  let nextDrone = 0;
  let nextNote = 0;
  let droneStep = 0;
  let degree = 2;

  function voice(
    freq: number,
    at: number,
    dur: number,
    opts: { type: OscillatorType; gain: number; cutoff: number; attack: number; vibrato?: boolean }
  ) {
    if (!ctx || !master || !wet) return;
    const osc = ctx.createOscillator();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(freq, at);
    // slight glide up into the note, like a reed instrument
    if (opts.vibrato) {
      osc.frequency.setValueAtTime(freq * 0.985, at);
      osc.frequency.linearRampToValueAtTime(freq, at + 0.12);
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.2;
      depth.gain.value = freq * 0.006;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(at);
      lfo.stop(at + dur + 0.6);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = opts.cutoff;
    filter.Q.value = 2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(opts.gain, at + opts.attack);
    env.gain.exponentialRampToValueAtTime(opts.gain * 0.6, at + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.5);

    osc.connect(filter).connect(env);
    env.connect(master);
    env.connect(wet);
    osc.start(at);
    osc.stop(at + dur + 0.6);
  }

  function schedule() {
    if (!ctx) return;
    const horizon = ctx.currentTime + 1.2;

    // Tanpura: Pa – Sa' – Sa' – Sa, looping
    const drone = [SA * 1.5, SA * 2, SA * 2, SA];
    while (nextDrone < horizon) {
      voice(drone[droneStep % 4], nextDrone, 2.6, {
        type: "sawtooth",
        gain: 0.05,
        cutoff: 1100,
        attack: 0.02,
      });
      droneStep++;
      nextDrone += BEAT * 2;
    }

    // Melody: gentle random walk on the scale, phrases resolve to Sa
    while (nextNote < horizon) {
      const restChance = degree === 0 || degree === 5 ? 0.45 : 0.12;
      const lengths = [1, 1, 2, 2, 3, 4];
      const len = lengths[Math.floor(Math.random() * lengths.length)] * BEAT;
      if (Math.random() > restChance) {
        voice(hz(SCALE[degree]), nextNote, len, {
          type: "sawtooth",
          gain: 0.07,
          cutoff: 2400,
          attack: 0.08,
          vibrato: true,
        });
      }
      const step = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
      degree = Math.max(0, Math.min(SCALE.length - 1, degree + step));
      nextNote += len;
    }
  }

  return {
    start() {
      if (ctx) {
        void ctx.resume();
        return;
      }
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 2.5);

      // Simple hall: two filtered feedback delays
      wet = ctx.createGain();
      wet.gain.value = 0.5;
      for (const t of [0.29, 0.47]) {
        const d = ctx.createDelay(1);
        const fb = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        d.delayTime.value = t;
        fb.gain.value = 0.38;
        lp.type = "lowpass";
        lp.frequency.value = 1800;
        wet.connect(d);
        d.connect(lp).connect(fb).connect(d);
        lp.connect(master);
      }
      master.connect(ctx.destination);

      nextDrone = nextNote = ctx.currentTime + 0.1;
      schedule();
      timer = window.setInterval(schedule, 250);
    },
    stop() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      const c = ctx;
      if (c && master) {
        master.gain.setTargetAtTime(0.0001, c.currentTime, 0.3);
        window.setTimeout(() => void c.close(), 1200);
      }
      ctx = master = wet = null;
    },
  };
}
