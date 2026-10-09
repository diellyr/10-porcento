"use client";
import type { VoiceProfile } from "../content/types";
import { speechText } from "./speech";

export interface AudioSettings { mudo: boolean; voz: number; musica: number; efeitos: number }
export const AUDIO_DEFAULTS: AudioSettings = { mudo: false, voz: 0.9, musica: 0.35, efeitos: 0.7 };

export type VoiceSource = "arquivo" | "neural" | "navegador" | "nenhuma";
export interface VoiceLine { id: string; texto: string; voz: VoiceProfile; personagem: string }
export interface VoiceHandle { fonte: VoiceSource; provisoria: boolean; done: Promise<void>; stop: () => void }

type Sfx = "click" | "pick" | "confirm" | "error" | "stamp" | "paper" | "coin" | "alert" | "success" | "pen" | "whoosh" | "level";
type Mood = "calmo" | "tenso" | "alegre" | "final";

const MOODS: Record<Mood, { bpm: number; chords: number[][]; wave: OscillatorType }> = {
  calmo: { bpm: 78, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], wave: "triangle" },
  tenso: { bpm: 66, chords: [[57, 60, 64], [50, 53, 57], [52, 56, 59, 62], [57, 60, 64]], wave: "sine" },
  alegre: { bpm: 104, chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]], wave: "triangle" },
  final: { bpm: 70, chords: [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]], wave: "sine" },
};
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode; private musicG!: GainNode; private sfxG!: GainNode; private voiceG!: GainNode;
  private analyser: AnalyserNode | null = null;
  private settings: AudioSettings = { ...AUDIO_DEFAULTS };
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private mood: Mood | null = null; private nextBeat = 0; private beatIdx = 0;
  private current: { stop: () => void } | null = null;
  private envelope = 0; private speaking = false;
  private available: Set<string> | null = null;
  private neuralEnabled: boolean | null = null;
  private cache = new Map<string, string>();

  /** Precisa ser chamado dentro de um gesto do usuário (toque/clique): respeita a política de autoplay dos navegadores. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.musicG = this.ctx.createGain(); this.sfxG = this.ctx.createGain(); this.voiceG = this.ctx.createGain();
      this.musicG.connect(this.master); this.sfxG.connect(this.master); this.voiceG.connect(this.master); this.master.connect(this.ctx.destination);
      this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 256; this.voiceG.connect(this.analyser);
      this.apply();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  set(s: AudioSettings) { this.settings = s; this.apply(); if (s.mudo) { this.stopVoice(); } }
  private apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, s = this.settings;
    this.master.gain.setTargetAtTime(s.mudo ? 0 : 1, t, 0.03);
    this.musicG.gain.setTargetAtTime(s.musica * 0.5, t, 0.05);
    this.sfxG.gain.setTargetAtTime(s.efeitos, t, 0.02);
    this.voiceG.gain.setTargetAtTime(s.voz, t, 0.02);
  }
  get ativo() { return !!this.ctx && !this.settings.mudo; }

  /* ───── efeitos sonoros procedurais (originais; nenhum arquivo de terceiros) ───── */
  sfx(n: Sfx) {
    if (!this.ctx || this.settings.mudo) return;
    const c = this.ctx, t = c.currentTime;
    const tone = (f: number, d: number, type: OscillatorType = "sine", at = 0, vol = 0.3, slide = 0) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t + at); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + at + d);
      g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(vol, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + d);
      o.connect(g); g.connect(this.sfxG); o.start(t + at); o.stop(t + at + d + 0.02);
    };
    const noise = (d: number, hp: number, vol = 0.25, at = 0) => {
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate); const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
      const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = hp; f.Q.value = 0.8;
      const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(this.sfxG); s.start(t + at);
    };
    switch (n) {
      case "click": tone(520, 0.06, "triangle", 0, 0.2); break;
      case "pick": tone(660, 0.08, "triangle", 0, 0.22); tone(880, 0.08, "triangle", 0.05, 0.18); break;
      case "confirm": tone(523, 0.12, "triangle", 0, 0.25); tone(784, 0.2, "triangle", 0.09, 0.25); break;
      case "error": tone(220, 0.2, "sawtooth", 0, 0.14, -80); break;
      case "stamp": tone(90, 0.18, "sine", 0, 0.5, -40); noise(0.12, 900, 0.3); break;
      case "paper": noise(0.22, 3200, 0.16); break;
      case "coin": tone(988, 0.08, "square", 0, 0.1); tone(1319, 0.22, "square", 0.07, 0.1); break;
      case "alert": [0, 0.16, 0.32].forEach((a) => tone(740, 0.1, "square", a, 0.09)); break;
      case "success": [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", i * 0.09, 0.22)); break;
      case "pen": noise(0.35, 5200, 0.1); noise(0.3, 4300, 0.08, 0.2); break;
      case "whoosh": noise(0.4, 700, 0.14); break;
      case "level": [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", i * 0.08, 0.2)); break;
    }
  }

  /* ───── trilha original gerada por síntese (sem samples de terceiros) ───── */
  music(mood: Mood | null) {
    if (!this.ctx) { this.mood = mood; return; }
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    this.mood = mood;
    if (!mood) return;
    this.nextBeat = this.ctx.currentTime + 0.1; this.beatIdx = 0;
    this.musicTimer = setInterval(() => this.schedule(), 250);
  }
  private schedule() {
    const c = this.ctx; if (!c || !this.mood || this.settings.mudo) return;
    const m = MOODS[this.mood]; const beat = 60 / m.bpm;
    while (this.nextBeat < c.currentTime + 0.8) {
      const bar = Math.floor(this.beatIdx / 4) % m.chords.length, chord = m.chords[bar]!;
      if (this.beatIdx % 4 === 0) chord.forEach((n) => this.note(mtof(n - 12), this.nextBeat, beat * 4.2, m.wave, 0.05));
      const arp = chord[this.beatIdx % chord.length]!;
      if (this.beatIdx % 2 === 0 || this.mood === "alegre") this.note(mtof(arp + 12), this.nextBeat, beat * 0.9, "sine", 0.035);
      this.nextBeat += beat; this.beatIdx++;
    }
  }
  private note(f: number, at: number, d: number, type: OscillatorType, vol: number) {
    const c = this.ctx!; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    o.connect(g); g.connect(this.musicG); o.start(at); o.stop(at + d + 0.05);
  }

  /* ───── voz ───── */
  private async manifest(): Promise<Set<string>> {
    if (this.available) return this.available;
    try { const r = await fetch("/audio/vozes/manifest.json", { cache: "force-cache" }); this.available = new Set(r.ok ? ((await r.json()) as { arquivos: string[] }).arquivos : []); }
    catch { this.available = new Set(); }
    return this.available;
  }
  private async neural(): Promise<boolean> {
    if (this.neuralEnabled !== null) return this.neuralEnabled;
    try { const r = await fetch("/api/game/tts", { cache: "no-store" }); this.neuralEnabled = r.ok && ((await r.json()) as { enabled: boolean }).enabled; }
    catch { this.neuralEnabled = false; }
    return this.neuralEnabled;
  }
  /** Nível atual da voz (0–1), para a sincronização labial dos rostos 2D/3D. */
  level(): number {
    if (!this.speaking) return 0;
    if (this.analyser && this.current && (this.current as { audio?: boolean }).audio) {
      const d = new Uint8Array(this.analyser.fftSize); this.analyser.getByteTimeDomainData(d);
      let sum = 0; for (const v of d) { const x = (v - 128) / 128; sum += x * x; }
      return Math.min(1, Math.sqrt(sum / d.length) * 5);
    }
    this.envelope *= 0.9;
    return Math.min(1, this.envelope + 0.12 + Math.abs(Math.sin(performance.now() / 85)) * 0.18);
  }
  get falando() { return this.speaking; }

  stopVoice() { this.current?.stop(); this.current = null; this.speaking = false; if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); }

  async speak(line: VoiceLine): Promise<VoiceHandle> {
    this.stopVoice();
    const none: VoiceHandle = { fonte: "nenhuma", provisoria: false, done: Promise.resolve(), stop: () => undefined };
    if (this.settings.mudo || this.settings.voz <= 0 || typeof window === "undefined") return none;
    const texto = speechText(line.texto);
    const files = await this.manifest();
    let url: string | null = files.has(`${line.id}.mp3`) ? `/audio/vozes/${line.id}.mp3` : null;
    let fonte: VoiceSource = "arquivo";
    if (!url) {
      const key = `${line.personagem}|${texto}`;
      if (this.cache.has(key)) { url = this.cache.get(key)!; fonte = "neural"; }
      else if (await this.neural()) {
        try {
          const r = await fetch("/api/game/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personagem: line.personagem, texto, id: line.id }) });
          if (r.ok && r.headers.get("content-type")?.includes("audio")) { url = URL.createObjectURL(await r.blob()); this.cache.set(key, url); fonte = "neural"; }
        } catch { /* cai para a voz do navegador */ }
      }
    }
    if (url && this.ctx) return this.playFile(url, fonte);
    return this.playBrowser(texto, line.voz);
  }

  private playFile(url: string, fonte: VoiceSource): VoiceHandle {
    const a = new Audio(url); a.crossOrigin = "anonymous";
    const src = this.ctx!.createMediaElementSource(a); src.connect(this.voiceG);
    this.speaking = true;
    const done = new Promise<void>((res) => { const end = () => { this.speaking = false; res(); }; a.onended = end; a.onerror = end; });
    void a.play().catch(() => { this.speaking = false; });
    const h = { audio: true, stop: () => { a.pause(); this.speaking = false; } };
    this.current = h;
    return { fonte, provisoria: false, done, stop: h.stop };
  }

  private playBrowser(texto: string, voz: VoiceProfile): VoiceHandle {
    const none: VoiceHandle = { fonte: "nenhuma", provisoria: false, done: Promise.resolve(), stop: () => undefined };
    if (typeof speechSynthesis === "undefined") return none;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR"; u.rate = voz.rate; u.pitch = voz.pitch; u.volume = Math.min(1, this.settings.voz);
    const vs = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("pt"));
    const fem = /(luciana|francisca|maria|vit[óo]ria|google portugu[êe]s|camila|thalita|female)/i, masc = /(daniel|felipe|ricardo|antonio|male|jo[ãa]o)/i;
    const pick = vs.find((v) => (voz.genero === "f" ? fem : masc).test(v.name)) ?? vs.find((v) => v.lang === "pt-BR") ?? vs[0];
    if (pick) u.voice = pick;
    this.speaking = true;
    const done = new Promise<void>((res) => {
      u.onend = () => { this.speaking = false; res(); }; u.onerror = () => { this.speaking = false; res(); };
      u.onboundary = () => { this.envelope = 1; };
    });
    speechSynthesis.speak(u);
    const h = { stop: () => { speechSynthesis.cancel(); this.speaking = false; } };
    this.current = h;
    return { fonte: "navegador", provisoria: true, done, stop: h.stop };
  }
}

export const audio = new AudioManager();
