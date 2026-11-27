// ============================================================
// Nimantro — Generative invitation music (Web Audio, no files)
// Six original, royalty-free presets improvised live in the browser.
// ============================================================

export type MusicPresetId = "shehnai" | "sitar" | "flute" | "musicbox" | "piano" | "dhol";

export const MUSIC_PRESETS: { id: MusicPresetId; en: string; bn: string }[] = [
  { id: "shehnai", en: "Shehnai Mangal", bn: "শানাই মঙ্গল" },
  { id: "sitar", en: "Sitar Evening", bn: "সন্ধ্যার সেতার" },
  { id: "flute", en: "Bansuri Dawn", bn: "ভোরের বাঁশি" },
  { id: "musicbox", en: "Music Box", bn: "মিউজিক বক্স" },
  { id: "piano", en: "Soft Piano", bn: "নরম পিয়ানো" },
  { id: "dhol", en: "Dhol Celebration", bn: "ঢোলের উৎসব" },
];

export interface InviteMusic {
  start: () => void;
  stop: () => void;
}

type Voice = "reed" | "pluck" | "flute" | "bell" | "keys";

interface Preset {
  base: number; // Sa / tonic in Hz
  scale: number[]; // semitones, ascending, ~2 octaves
  beat: number; // seconds per beat
  voice: Voice;
  lengths: number[]; // note lengths in beats
  rest: number; // rest probability
  drone?: "tanpura" | "pad";
  chords?: number[][]; // piano: arpeggiated progression (semitones from tonic)
  drums?: string; // dhol: "D" bass, "t" slap, "." rest, one char per half-beat
  gain: number;
}

const PRESETS: Record<MusicPresetId, Preset> = {
  // Bhupali over a tanpura — the wedding mangal sound
  shehnai: { base: 293.66, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], beat: 0.42, voice: "reed", lengths: [1, 1, 2, 2, 3, 4], rest: 0.15, drone: "tanpura", gain: 0.07 },
  // Yaman (Lydian) — evening sitar with meend
  sitar: { base: 277.18, scale: [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19], beat: 0.3, voice: "pluck", lengths: [1, 1, 1, 2, 2, 3], rest: 0.12, drone: "tanpura", gain: 0.09 },
  // Durga pentatonic — slow, breathy bansuri
  flute: { base: 392, scale: [0, 2, 5, 7, 9, 12, 14, 17, 19, 21], beat: 0.55, voice: "flute", lengths: [1, 2, 2, 3, 4, 6], rest: 0.2, drone: "pad", gain: 0.08 },
  // Major pentatonic, high register — lullaby for annaprashan/birthday
  musicbox: { base: 523.25, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19], beat: 0.32, voice: "bell", lengths: [1, 1, 1, 2, 2], rest: 0.1, gain: 0.06 },
  // I – vi – IV – V arpeggios with a gentle top line
  piano: { base: 261.63, scale: [0, 2, 4, 7, 9, 12, 14, 16], beat: 0.36, voice: "keys", lengths: [2, 2, 3, 4], rest: 0.35, chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], gain: 0.06 },
  // Bhangra-style dhol under a quick shehnai line
  dhol: { base: 293.66, scale: [0, 2, 4, 7, 9, 12, 14, 16], beat: 0.25, voice: "reed", lengths: [1, 1, 2, 2], rest: 0.2, drone: "tanpura", drums: "D.Dt.DtD.tD.Dt.t", gain: 0.06 },
};

const hz = (base: number, semis: number) => base * Math.pow(2, semis / 12);

export function createInviteMusic(id: MusicPresetId = "shehnai"): InviteMusic {
  const Ctx =
    typeof window !== "undefined"
      ? window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!Ctx) return { start: () => {}, stop: () => {} };

  const p = PRESETS[id] ?? PRESETS.shehnai;
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let wet: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let timer: number | null = null;
  let tDrone = 0;
  let tNote = 0;
  let tChord = 0;
  let tDrum = 0;
  let droneStep = 0;
  let chordStep = 0;
  let drumStep = 0;
  let degree = 2;

  function out(node: AudioNode, reverb = true) {
    node.connect(master!);
    if (reverb) node.connect(wet!);
  }

  function env(at: number, peak: number, attack: number, decay: number, sustain: number, dur: number) {
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(peak * sustain, 0.0002), at + attack + decay);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.4);
    return g;
  }

  function osc(type: OscillatorType, freq: number, at: number, stopAt: number) {
    const o = ctx!.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    o.start(at);
    o.stop(stopAt);
    return o;
  }

  function vibrato(target: AudioParam, freq: number, at: number, stopAt: number, depth: number) {
    const lfo = osc("sine", 5.2, at, stopAt);
    const d = ctx!.createGain();
    d.gain.value = freq * depth;
    lfo.connect(d).connect(target);
  }

  function lowpass(freq: number) {
    const f = ctx!.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    return f;
  }

  function note(voice: Voice, freq: number, at: number, dur: number, gain: number) {
    const end = at + dur + 0.6;
    if (voice === "reed") {
      const o = osc("sawtooth", freq * 0.985, at, end);
      o.frequency.linearRampToValueAtTime(freq, at + 0.1);
      vibrato(o.frequency, freq, at, end, 0.006);
      out(o.connect(lowpass(2400)).connect(env(at, gain, 0.08, dur * 0.6, 0.6, dur)));
    } else if (voice === "pluck") {
      const o = osc("sawtooth", freq, at, end);
      if (Math.random() < 0.25) {
        // meend: slide in from the note below
        o.frequency.setValueAtTime(freq * 0.89, at);
        o.frequency.exponentialRampToValueAtTime(freq, at + 0.18);
      }
      const f = lowpass(4000);
      f.frequency.setValueAtTime(4000, at);
      f.frequency.exponentialRampToValueAtTime(600, at + 0.8);
      out(o.connect(f).connect(env(at, gain, 0.005, 1.1, 0.05, dur)));
    } else if (voice === "flute") {
      const o = osc("sine", freq, at, end);
      vibrato(o.frequency, freq, at + 0.25, end, 0.008);
      const o2 = osc("triangle", freq * 2, at, end);
      const g2 = ctx!.createGain();
      g2.gain.value = 0.15;
      const e = env(at, gain, 0.15, dur * 0.7, 0.7, dur);
      o.connect(e);
      o2.connect(g2).connect(e);
      out(e);
      // breath
      if (noise) {
        const n = ctx!.createBufferSource();
        n.buffer = noise;
        const bp = ctx!.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = freq * 2;
        bp.Q.value = 3;
        out(n.connect(bp).connect(env(at, gain * 0.25, 0.05, 0.2, 0.1, 0.25)), false);
        n.start(at);
        n.stop(at + 0.5);
      }
    } else if (voice === "bell") {
      const e = env(at, gain, 0.004, 0.9, 0.02, dur);
      osc("sine", freq, at, end).connect(e);
      const partial = ctx!.createGain();
      partial.gain.value = 0.35;
      osc("sine", freq * 2.76, at, end).connect(partial).connect(e);
      out(e);
    } else {
      // keys: soft electric-piano-ish
      const e = env(at, gain, 0.01, 1.6, 0.15, dur);
      osc("triangle", freq, at, end).connect(lowpass(2200)).connect(e);
      const g = ctx!.createGain();
      g.gain.value = 0.2;
      osc("sine", freq * 2, at, end).connect(g).connect(e);
      out(e);
    }
  }

  function drum(kind: string, at: number) {
    if (kind === "D") {
      const o = osc("sine", 110, at, at + 0.5);
      o.frequency.exponentialRampToValueAtTime(48, at + 0.25);
      out(o.connect(env(at, 0.5, 0.004, 0.25, 0.01, 0.2)), false);
    } else if (kind === "t" && noise) {
      const n = ctx!.createBufferSource();
      n.buffer = noise;
      const bp = ctx!.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      bp.Q.value = 1.2;
      out(n.connect(bp).connect(env(at, 0.25, 0.002, 0.08, 0.01, 0.06)));
      n.start(at);
      n.stop(at + 0.2);
    }
  }

  function schedule() {
    if (!ctx) return;
    const horizon = ctx.currentTime + 1.2;

    if (p.drone === "tanpura") {
      const pattern = [1.5, 2, 2, 1].map((m) => (p.base / 2) * m);
      while (tDrone < horizon) {
        const at = tDrone;
        const o = osc("sawtooth", pattern[droneStep % 4], at, at + 3.2);
        out(o.connect(lowpass(1100)).connect(env(at, 0.045, 0.02, 1.6, 0.3, 2.6)));
        droneStep++;
        tDrone += 0.84;
      }
    } else if (p.drone === "pad") {
      while (tDrone < horizon) {
        const at = tDrone;
        for (const m of [0.5, 0.75, 1]) {
          const o = osc("sine", p.base * m, at, at + 9);
          out(o.connect(env(at, 0.025, 2.5, 3, 0.8, 7)));
        }
        tDrone += 7;
      }
    }

    if (p.chords) {
      while (tChord < horizon) {
        const chord = p.chords[chordStep % p.chords.length];
        const seq = [chord[0] - 12, chord[0], chord[1], chord[2], chord[1], chord[2] + 12, chord[1], chord[2]];
        seq.forEach((s, i) => note("keys", hz(p.base, s), tChord + i * p.beat, p.beat * 3, 0.05));
        chordStep++;
        tChord += seq.length * p.beat;
      }
    }

    if (p.drums) {
      while (tDrum < horizon) {
        drum(p.drums[drumStep % p.drums.length], tDrum);
        drumStep++;
        tDrum += p.beat / 2;
      }
    }

    while (tNote < horizon) {
      const restBias = degree === 0 || degree === 5 ? p.rest + 0.3 : p.rest;
      const len = p.lengths[Math.floor(Math.random() * p.lengths.length)] * p.beat;
      if (Math.random() > restBias) {
        note(p.voice, hz(p.base, p.scale[degree]), tNote, len, p.gain);
      }
      const step = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
      degree = Math.max(0, Math.min(p.scale.length - 1, degree + step));
      tNote += len;
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
      master.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 2);

      // white-noise buffer for breath and drum slaps
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      // simple hall: two filtered feedback delays
      wet = ctx.createGain();
      wet.gain.value = 0.45;
      for (const t of [0.29, 0.47]) {
        const d = ctx.createDelay(1);
        const fb = ctx.createGain();
        const lp = lowpass(1800);
        d.delayTime.value = t;
        fb.gain.value = 0.36;
        wet.connect(d);
        d.connect(lp).connect(fb).connect(d);
        lp.connect(master);
      }
      master.connect(ctx.destination);

      tDrone = tNote = tChord = tDrum = ctx.currentTime + 0.1;
      schedule();
      timer = window.setInterval(schedule, 250);
    },
    stop() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      const c = ctx;
      if (c && master) {
        master.gain.setTargetAtTime(0.0001, c.currentTime, 0.25);
        window.setTimeout(() => void c.close(), 1000);
      }
      ctx = master = wet = null;
      noise = null;
    },
  };
}
