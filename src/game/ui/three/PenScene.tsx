"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { avatarLook } from "../../content/characters";
import { darken } from "../art/color";
import { clamp01, disposeTree, ease, lerp, makeRenderer, startLoop } from "./common";
import { buildHand } from "./hand";
import type { Quality } from "./support";

export interface PenSceneProps { gesto: "assinar" | "recusar" | "esclarecer" | "parecer"; papel: string; nome: string; avatar: string; qualidade: Quality; reduzir: boolean; onDone: () => void; onFail: () => void; onSfx: (n: "pen" | "stamp" | "paper" | "click") => void; congelar?: number }

const PW = 2.7, PH = 3.5;          // folha (unidades = comprimento da palma)
const CW = 1024, CH = Math.round(CW * (PH / PW));

/** Assinatura fictícia determinística a partir do nome: laços suaves, progressivamente desenhados em sincronia com a pena. */
export function signaturePath(nome: string, n = 320): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const letters = (nome.replace(/[^\p{L}]/gu, "") || "Assina").slice(0, 10);
  const L = letters.length;
  const seed = Array.from(letters).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), k = t * L, idx = Math.min(L - 1, Math.floor(k)), c = letters.charCodeAt(idx);
    const env = 0.28 + ((c * 7 + idx * 13) % 6) * 0.1;                         // altura varia por letra
    const w = 2 * Math.PI * (L * 0.85) * t + (seed % 7);
    const x = 0.04 + 0.8 * t + (0.03 + 0.02 * ((c % 3))) * Math.sin(w);       // avanço com laços
    const y = 0.62 - 0.5 * env * Math.abs(Math.cos(w * 0.5)) * (idx % 2 ? 0.8 : 1) + 0.04 * Math.sin(w * 0.37 + seed) - 0.12 * t;
    pts.push([x, y]);
  }
  for (let i = 1; i <= 24; i++) { const u = i / 24; pts.push([0.88 - 0.78 * u, 0.7 + 0.08 * Math.sin(u * 3.1) - 0.02 * u]); }   // rasura final
  return pts;
}

function paperCanvas(papel: string, nome: string) {
  const c = document.createElement("canvas"); c.width = CW; c.height = CH; const g = c.getContext("2d")!;
  const paint = (extra?: (g: CanvasRenderingContext2D) => void) => {
    g.fillStyle = "#fffdf6"; g.fillRect(0, 0, CW, CH);
    g.fillStyle = "#e9e1cf"; for (let i = 0; i < 40; i++) g.fillRect(0, CH * 0.12 + i * 18, 0, 0);
    g.fillStyle = "#1a46d4"; g.fillRect(70, 70, 360, 16);
    g.fillStyle = "#1b2340"; g.font = "700 40px 'Fredoka Variable', 'Nunito Variable', sans-serif"; g.textBaseline = "top";
    const title = papel.toUpperCase(); const words = title.split(" "); let line = "", y = 120;
    for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > CW - 160) { g.fillText(line, 80, y); y += 52; line = w; } else line = t; }
    g.fillText(line, 80, y); y += 90;
    g.fillStyle = "#cfc3a2"; for (let i = 0; i < 13; i++) { g.fillRect(80, y + i * 46, i % 5 === 4 ? 420 : CW - 160, 9); }
    g.fillStyle = "#e5484d"; g.font = "700 22px sans-serif"; g.fillText("DOCUMENTO FICTÍCIO — MEUS 10%", 80, CH - 70);
    g.strokeStyle = "#8f866c"; g.lineWidth = 3; g.beginPath(); g.moveTo(130, CH * 0.8); g.lineTo(CW - 130, CH * 0.8); g.stroke();
    g.fillStyle = "#6b6350"; g.font = "600 26px sans-serif"; g.fillText(nome, 140, CH * 0.8 + 12);
    extra?.(g);
  };
  paint();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { c, g, tex, paint };
}

function woodTexture() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 1024; const g = c.getContext("2d")!;
  g.fillStyle = "#a8683a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { g.strokeStyle = i % 3 ? "rgba(90,48,20,0.18)" : "rgba(220,160,100,0.14)"; g.lineWidth = 1 + Math.random() * 3; const y = Math.random() * 1024; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x / 130 + i) * 6); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

type Keyframe = { x: number; z: number; h: number };
interface Plan { dur: number; at: (t: number) => { x: number; z: number; h: number; down: boolean; ink: number; hes: number; mark?: "stamp" | "x" } }

/** Plano de movimento por gesto: ponta da pena em coordenadas do papel (u,v ∈ [0,1]) e altura sobre a mesa. */
function planFor(gesto: PenSceneProps["gesto"], sig: Array<[number, number]>): Plan {
  const toW = (u: number, v: number) => ({ x: (u - 0.5) * PW, z: (v - 0.5) * PH });
  const home: Keyframe = { x: 1.1, z: 1.3, h: 1.0 };
  const sx = 0.2, sy = 0.8, sw = 0.6, sh = 0.1; // caixa da assinatura em uv
  const sigAt = (p: number) => { const i = Math.min(sig.length - 1, Math.floor(p * (sig.length - 1))); const a = sig[i]!; return toW(sx + a[0] * sw, sy + a[1] * sh - 0.015); };
  const pause = (gesto === "recusar" ? 0.9 : 0.45);
  const T = { rest: 0.45, appr: 0.95, hes: pause, act: gesto === "assinar" ? 1.9 : gesto === "recusar" ? 1.2 : gesto === "esclarecer" ? 2.0 : 2.6, lift: 0.7 };
  const t1 = T.rest, t2 = t1 + T.appr, t3 = t2 + T.hes, t4 = t3 + T.act, t5 = t4 + T.lift;
  const startP = sigAt(0);
  const hover = (x: number, z: number, h: number, wob = 0, t = 0) => ({ x: x + Math.sin(t * 9) * wob, z: z + Math.cos(t * 7) * wob, h });
  return {
    dur: t5,
    at: (t) => {
      if (t < t1) return { ...home, down: false, ink: 0, hes: 0 };
      if (t < t2) { const k = ease((t - t1) / T.appr); const arc = Math.sin(k * Math.PI) * 0.25; return { x: lerp(home.x, startP.x, k), z: lerp(home.z, startP.z, k), h: lerp(home.h, 0.22, k) + arc, down: false, ink: 0, hes: 0 }; }
      if (t < t3) { const k = (t - t2) / T.hes; const h = hover(startP.x, startP.z, 0.2 + (gesto === "recusar" ? 0.12 * Math.sin(k * Math.PI) : 0.05 * Math.sin(k * Math.PI)), gesto === "recusar" ? 0.035 : 0.018, t); return { ...h, down: false, ink: 0, hes: 1 }; }
      if (t < t4) {
        const p = (t - t3) / T.act;
        if (gesto === "assinar" || gesto === "parecer") {
          const pp = ease(clamp01(p / (gesto === "parecer" ? 0.75 : 1)));
          const q = sigAt(pp); const lift = pp > 0.985 ? 0.0 : 0;
          const stamp = gesto === "parecer" && p > 0.85;
          return { x: q.x, z: q.z, h: 0 + lift, down: pp < 0.995, ink: pp, hes: 0, mark: stamp ? "stamp" : undefined };
        }
        if (gesto === "recusar") { // traço diagonal firme (X de cancelamento)
          const a = toW(0.18, 0.2), b = toW(0.82, 0.74), c = toW(0.82, 0.2), d = toW(0.18, 0.74);
          const k = p < 0.5 ? ease(p / 0.5) : ease((p - 0.5) / 0.5); const s = p < 0.5 ? [a, b] : [c, d];
          const lift = p > 0.46 && p < 0.54 ? 0.15 : 0;
          return { x: lerp(s[0]!.x, s[1]!.x, k), z: lerp(s[0]!.z, s[1]!.z, k), h: lift, down: lift === 0, ink: p, hes: 0, mark: "x" };
        }
        // esclarecer: sublinha o texto e escreve "?" na margem
        const a = toW(0.14, 0.43), b = toW(0.7, 0.43);
        if (p < 0.45) { const k = ease(p / 0.45); return { x: lerp(a.x, b.x, k), z: a.z, h: 0, down: true, ink: p, hes: 0 }; }
        if (p < 0.55) { const k = (p - 0.45) / 0.1; const m = toW(0.82, 0.3); return { x: lerp(b.x, m.x, k), z: lerp(b.z, m.z, k), h: 0.18 * Math.sin(k * Math.PI), down: false, ink: p, hes: 0 }; }
        const k = (p - 0.55) / 0.45; const m = toW(0.82, 0.3); const a2 = k * Math.PI * 1.6 - Math.PI * 0.9;
        return { x: m.x + Math.cos(a2) * 0.22 * (k < 0.8 ? 1 : 0.2), z: m.z + Math.sin(a2) * 0.2 * (k < 0.8 ? 1 : 1) + (k >= 0.8 ? (k - 0.8) * 1.0 : 0), h: 0, down: true, ink: p, hes: 0 };
      }
      const k = ease(clamp01((t - t4) / T.lift)); const last = (() => { const e = plan0(); return e; })();
      return { x: lerp(last.x, home.x, k), z: lerp(last.z, home.z, k), h: lerp(0, home.h, k), down: false, ink: 1, hes: 0 };
      function plan0() { const q = (gesto === "assinar" || gesto === "parecer") ? sigAt(1) : toW(0.5, 0.5); return q; }
    },
  };
}

export default function PenScene(p: PenSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(p); live.current = p;
  useEffect(() => {
    const el = host.current!;
    const canvas = document.createElement("canvas"); canvas.style.cssText = "width:100%;height:100%;display:block"; canvas.setAttribute("aria-hidden", "true"); el.appendChild(canvas);
    let renderer: THREE.WebGLRenderer;
    try { renderer = makeRenderer(canvas, p.qualidade); } catch { p.onFail(); return; }
    renderer.setClearColor(0x1b2340, 1);
    const look = avatarLook(p.avatar);
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#2a3558"); scene.fog = new THREE.Fog("#2a3558", 9, 22);
    const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 60); cam.position.set(0.6, 4.3, 4.3); cam.lookAt(0.3, 0, 0.7);

    const dbg = new URLSearchParams(location.search).get("cam");
    if (dbg === "lado") { cam.position.set(-3.2, 1.3, 1.2); cam.lookAt(0.3, 0.4, 1.0); } else if (dbg === "perto") { cam.position.set(0.9, 1.6, 2.6); cam.lookAt(0.3, 0.2, 1.0); } else if (dbg === "topo") { cam.position.set(0.5, 5.5, 1.5); cam.lookAt(0.3, 0, 1.0); }
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x4a5a8a, 0.9));
    const lamp = new THREE.SpotLight(0xffe6bd, 90, 18, 0.62, 0.55, 1.6); lamp.position.set(-2.8, 6.2, 2.6); lamp.target.position.set(0.3, 0, 0.6); lamp.castShadow = p.qualidade !== "baixa"; lamp.shadow.mapSize.set(p.qualidade === "alta" ? 2048 : 1024, p.qualidade === "alta" ? 2048 : 1024); lamp.shadow.bias = -0.0004; lamp.shadow.radius = 4; scene.add(lamp, lamp.target);
    const fillL = new THREE.DirectionalLight(0x9fb8ff, 0.7); fillL.position.set(4, 3, 2); scene.add(fillL);

    // mesa de madeira + objetos
    const wood = woodTexture(); wood.repeat.set(3, 3);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.72 })); table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
    const pp = paperCanvas(p.papel, p.nome);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: pp.tex, roughness: 0.92 })); paper.rotation.x = -Math.PI / 2; paper.position.set(0, 0.012, 0); paper.receiveShadow = true; scene.add(paper);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.3, 0.02, PH + 0.3), new THREE.MeshStandardMaterial({ color: "#2e7a58", roughness: 0.85 })); pad.position.set(0, 0.001, 0); pad.receiveShadow = true; scene.add(pad);
    const name = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.34), new THREE.MeshStandardMaterial({ color: "#d9a62a", metalness: 0.9, roughness: 0.3 })); name.position.set(-2.9, 0.12, -1.0); name.rotation.y = 0.35; name.castShadow = true; scene.add(name);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.55, 24), new THREE.MeshStandardMaterial({ color: "#f4f6fb", roughness: 0.35 })); cup.position.set(-2.8, 0.28, 1.4); cup.castShadow = true; scene.add(cup);
    const stampObj = new THREE.Group(); const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.2, 20), new THREE.MeshStandardMaterial({ color: "#1b2340" })); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 14), new THREE.MeshStandardMaterial({ color: "#8a5528" })); sh.position.y = 0.3; stampObj.add(sb, sh); stampObj.position.set(2.6, 0.1, -1.2); stampObj.traverse((o) => { o.castShadow = true; }); scene.add(stampObj);

    // mão, antebraço, manga e caneta
    // orientação nominal da mão (a mesma de poseAt) → direção da caneta em coordenadas da mão a partir da inclinação desejada no mundo
    const nominal = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.55, Math.PI + 0.38, 0.85, "YXZ"));
    const penWorld = new THREE.Vector3(0.62, 0.64, 0.5).normalize();   // da ponta para o fim: sobe e volta em direção ao ombro
    const penLocal = penWorld.clone().applyQuaternion(nominal.clone().invert());
    const rig = buildHand({ pele: look.pele, sombra: look.peleSombra, manga: darken(look.roupa, 0.05), punho: "#f4f6fb", penDirLocal: penLocal, tipLocal: new THREE.Vector3(0.5, -0.1, 1.5) });
    scene.add(rig.root, rig.forearm);
    const elbow = new THREE.Vector3(2.4, 0.5, 4.6);

    const sig = signaturePath(p.nome);
    const plan = planFor(p.gesto, sig);
    let sfxPen = false, sfxStamp = false, done = false; let drawn = 0; let lastInk: { x: number; y: number } | null = null; let stampT = -1;
    const R = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
    const tip = new THREE.Vector3();
    const toCanvas = (x: number, z: number) => ({ x: (x / PW + 0.5) * CW, y: (z / PH + 0.5) * CH });
    pp.g.lineCap = "round"; pp.g.lineJoin = "round";
    const ink = (x: number, z: number, down: boolean) => {
      const c = toCanvas(x, z);
      if (down) { if (lastInk) { pp.g.strokeStyle = "#143bb8"; pp.g.lineWidth = 4.5; pp.g.beginPath(); pp.g.moveTo(lastInk.x, lastInk.y); pp.g.lineTo(c.x, c.y); pp.g.stroke(); pp.tex.needsUpdate = true; } lastInk = c; } else lastInk = null;
    };

    const poseAt = (t: number) => {
      const s = plan.at(Math.min(t, plan.dur));
      // orientação da mão: dedos para frente (-Z), ligeiramente giradas; dorso inclinado
      const yaw = Math.PI + 0.38 + (s.hes ? Math.sin(t * 8) * 0.02 : 0);
      const pitch = 0.55 - s.h * 0.05;    // inclinação do dorso (pena ~50° do papel)
      E.set(pitch, yaw, 0.85, "YXZ"); Q.setFromEuler(E); rig.root.quaternion.copy(Q);
      // posiciona a mão para que a ponta da pena (tipLocal) caia em (x, h, z)
      const tipWorld = new THREE.Vector3(s.x, 0.014 + s.h, s.z);
      const off = rig.tipLocal.clone().applyQuaternion(Q);
      rig.root.position.copy(tipWorld).sub(off);
      rig.root.updateMatrixWorld(true);
      const wrist = rig.root.localToWorld(new THREE.Vector3(0, -0.02, 0.0));
      rig.forearm.position.copy(wrist); rig.forearm.lookAt(elbow); rig.forearm.updateMatrixWorld(true);
      return s;
    };

    let t0 = performance.now() / 1000; let elapsed = 0;
    if (p.reduzir) { // sem movimento: mostra o resultado final e conclui
      elapsed = plan.dur;
    }
    const resize = () => { const w = el.clientWidth || 600, h = el.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.9 ? 50 : 36; cam.updateProjectionMatrix(); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(el);

    const advanceInk = (tn: number) => {
      const s = plan.at(tn);
      // desenha tudo o que foi percorrido desde a última chamada, em passos curtos
      const steps = Math.max(1, Math.ceil((tn - drawn) / 0.012));
      for (let i = 1; i <= steps; i++) { const tt = drawn + ((tn - drawn) * i) / steps; const q = plan.at(tt); ink(q.x, q.z, q.down && q.h < 0.02); }
      drawn = tn; return s;
    };
    const finish = () => { if (!done) { done = true; live.current.onDone(); } };
    if (p.congelar !== undefined) { elapsed = p.congelar; advanceInk(Math.min(elapsed, plan.dur)); }

    const stop = startLoop(p.qualidade, (dt) => {
      if (p.congelar === undefined) elapsed += dt;
      const t = Math.min(elapsed, plan.dur + 0.4);
      if (p.congelar === undefined) { const s0 = advanceInk(Math.min(t, plan.dur)); if (s0.down && !sfxPen) { sfxPen = true; live.current.onSfx("pen"); } }
      const s = poseAt(Math.min(t, plan.dur));
      if (s.mark === "stamp" && !sfxStamp) { sfxStamp = true; stampT = t; live.current.onSfx("stamp"); pp.g.save(); pp.g.translate(CW * 0.66, CH * 0.62); pp.g.rotate(-0.16); pp.g.strokeStyle = "#1a46d4"; pp.g.lineWidth = 8; pp.g.strokeRect(-150, -48, 300, 96); pp.g.fillStyle = "#1a46d4"; pp.g.font = "800 54px 'Fredoka Variable', sans-serif"; pp.g.textAlign = "center"; pp.g.textBaseline = "middle"; pp.g.fillText("PARECER", 0, 4); pp.g.restore(); pp.tex.needsUpdate = true; }
      if (stampT >= 0) cam.position.y = 4.3 - Math.max(0, 0.12 - (t - stampT) * 0.3) * Math.exp(-(t - stampT) * 8);
      rig.tipLocal && tip.copy(rig.tipLocal);
      renderer.render(scene, cam);
      if (elapsed >= plan.dur + 0.3) finish();
    }, (fps) => { el.dataset.fps = String(fps); });
    el.dataset.pronto = "1";
    const lost = (e: Event) => { e.preventDefault(); live.current.onFail(); }; canvas.addEventListener("webglcontextlost", lost);
    void t0; void R; void lastInk; void paper;
    return () => { stop(); ro.disconnect(); canvas.removeEventListener("webglcontextlost", lost); rig.dispose(); disposeTree(scene); pp.tex.dispose(); wood.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={host} className="h-full w-full" role="img" aria-label="Cena 3D: braço, mão e caneta sobre a mesa de trabalho" />;
}
