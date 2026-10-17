"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { CHARACTERS } from "../../content/characters";
import { CONV_BY_ID } from "../../content/conversations";
import { LOCATIONS } from "../../content/locations";
import { worldView } from "../../engine/scoring";
import { audio } from "../../audio/AudioManager";
import type { CharId, GameState, LocationId } from "../../engine/types";
import type { ActiveHotspot } from "../GameScene";
import { addEnvironment, disposeTree, makeRenderer, startLoop } from "./common";
import { disposeMats } from "./lowpoly";
import type { Quality } from "./support";
import { buildWorld, type World, type WorldDyn } from "./world";
import { ROOM_LIST, ROOMS } from "./world-data";

export type Modo = "mapa" | "sala";
export interface RoomPin { novo: number; objetivo: boolean }
const ICON: Record<string, string> = { novo: "🔍", visto: "✓", porta: "➜", mesa: "🖋️", pessoa: "💬", "pessoa-feita": "✓" };

interface Props {
  s: GameState; hs: ActiveHotspot[]; q: Quality; modo: Modo; foco: string | null; pins: Record<LocationId, RoomPin>;
  onPick: (a: ActiveHotspot) => void; onGoRoom: (l: LocationId) => void; onModo: (m: Modo) => void; reduzir: boolean; onFail: () => void;
}

/** Quem está em cada sala neste caso (todas as salas, para aparecerem na visão geral). */
function peopleAll(s: GameState): WorldDyn["people"] {
  const out: WorldDyn["people"] = [];
  for (const room of Object.keys(LOCATIONS) as LocationId[]) for (const h of LOCATIONS[room].hotspots) {
    if (h.kind !== "pessoa") continue;
    const e = h.entradas.find((x) => x.casos.includes(s.caso)); const c = e ? CONV_BY_ID[e.ref] : null;
    if (c) out.push({ room, hotspotId: h.id, look: CHARACTERS[c.who as CharId].look, label: CHARACTERS[c.who as CharId].nome });
  }
  return out;
}

/** Casa de bonecas da UPA em 3D: arraste para girar, role/pinça para aproximar; toque numa sala para entrar nela. */
export function World3D(p: Props) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(p); live.current = p;
  const marks = useRef<Record<string, HTMLElement | null>>({});
  const badges = useRef<Record<string, HTMLElement | null>>({});
  const api = useRef<{ world: World; rot: (d: number) => void; zoom: (f: number) => void } | null>(null);
  const goal = useRef({ tx: 0, ty: 0, tz: 0, dist: 32, pol: 0.95, user: 1 });

  const wv = useMemo(() => worldView(p.s), [p.s]);
  const people = useMemo(() => peopleAll(p.s), [p.s]);
  const dyn: WorldDyn = useMemo(() => ({ filaNivel: wv.filaNivel, estoqueNivel: wv.estoqueNivel, melhoria: wv.melhoria, luxo: wv.luxoNivel, degradacao: wv.degradacao, filaMin: p.s.pub.filaMin, people }), [wv.filaNivel, wv.estoqueNivel, wv.melhoria, wv.luxoNivel, wv.degradacao, p.s.pub.filaMin, people]);
  const dynKey = JSON.stringify([dyn.filaNivel, dyn.estoqueNivel, dyn.melhoria, dyn.luxo, dyn.degradacao, Math.round(dyn.filaMin), dyn.people.map((x) => x.hotspotId + x.label)]);

  useEffect(() => {
    const el = host.current!;
    const canvas = document.createElement("canvas"); canvas.style.cssText = "width:100%;height:100%;display:block;touch-action:none;cursor:grab"; canvas.setAttribute("aria-hidden", "true"); el.prepend(canvas);
    let renderer: THREE.WebGLRenderer;
    try { renderer = makeRenderer(canvas, p.q); } catch { p.onFail(); return; }
    renderer.setClearColor(0xcfe6ff, 1);
    const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xcfe6ff, 60, 120);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.5, 200);
    const envOff = addEnvironment(renderer, scene, 0.25);
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0xa7b9d8, 0.95); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0d8, 2.1); key.position.set(-14, 26, 16); key.castShadow = p.q !== "baixa";
    const sh = key.shadow; sh.mapSize.set(p.q === "alta" ? 2048 : 1024, p.q === "alta" ? 2048 : 1024); sh.camera.near = 5; sh.camera.far = 80; sh.camera.left = -24; sh.camera.right = 24; sh.camera.top = 18; sh.camera.bottom = -18; sh.bias = -0.0006; sh.normalBias = 0.04; sh.radius = 3;
    scene.add(key); scene.add(key.target);
    const world = buildWorld(p.q); scene.add(world.root);
    world.setDynamic(dyn);

    // estado da câmera orbital
    const cur = { tx: 0, ty: 0, tz: 0, dist: 32, pol: 0.95, az: 0.62 };
    const g = goal.current;
    const place = () => { const sp = Math.sin(cur.pol); cam.position.set(cur.tx + cur.dist * sp * Math.sin(cur.az), cur.ty + cur.dist * Math.cos(cur.pol), cur.tz + cur.dist * sp * Math.cos(cur.az)); cam.lookAt(cur.tx, cur.ty, cur.tz); };
    const resize = () => { const w = el.clientWidth || 800, h = el.clientHeight || 450; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(el);

    // entrada: arrastar gira; roda/pinça aproxima
    const ptrs = new Map<number, { x: number; y: number }>(); let pinch = 0; let moved = 0;
    const down = (e: PointerEvent) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; canvas.style.cursor = "grabbing"; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); } };
    const move = (e: PointerEvent) => {
      const prev = ptrs.get(e.pointerId); if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size === 1) { cur.az -= dx * 0.0065; cur.pol = Math.max(0.5, Math.min(1.3, cur.pol - dy * 0.004)); g.pol = cur.pol; }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a!.x - b!.x, a!.y - b!.y); if (pinch) g.user = Math.max(0.45, Math.min(1.7, g.user * (pinch / d))); pinch = d; }
    };
    const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); pinch = 0; canvas.style.cursor = "grab"; void moved; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); g.user = Math.max(0.45, Math.min(1.7, g.user * (e.deltaY > 0 ? 1.1 : 0.91))); };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up); canvas.addEventListener("wheel", wheel, { passive: false });
    api.current = { world, rot: (d) => { cur.az += d; }, zoom: (f) => { g.user = Math.max(0.45, Math.min(1.7, g.user * f)); } };
    const lost = (e: Event) => { e.preventDefault(); live.current.onFail(); }; canvas.addEventListener("webglcontextlost", lost);

    const v = new THREE.Vector3();
    const project = (el2: HTMLElement | null | undefined, wp: THREE.Vector3, show: boolean, w: number, h: number) => {
      if (!el2) return; v.copy(wp).project(cam);
      if (!show || v.z > 1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15) { el2.style.visibility = "hidden"; return; }
      el2.style.visibility = "visible"; el2.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -50%)`;
    };
    const keyWarm = new THREE.Color(0xfff0d8), keyCold = new THREE.Color(0xdfe6f2), tmp = new THREE.Color();
    let vy = 0, clock = 0;
    const stop = startLoop(p.q, (dt, t) => {
      const c = live.current; clock = t; const k = c.reduzir ? 1 : 1 - Math.exp(-dt * 3.6);
      cur.tx += (g.tx - cur.tx) * k; cur.ty += (g.ty - cur.ty) * k; cur.tz += (g.tz - cur.tz) * k;
      const asp = cam.aspect; const fit = asp < 1.6 ? Math.pow(1.6 / Math.max(0.5, asp), 0.85) : 1;
      cur.dist += (g.dist * fit * g.user - cur.dist) * k; if (!ptrs.size) cur.pol += (g.pol - cur.pol) * k * 0.6;
      // clima: gestão degradada deixa a luz fria e baixa; melhoria deixa quente e viva
      const mood = Math.max(0, Math.min(1, (live.current.s.pub.qualidade - 25) / 60)); tmp.copy(keyCold).lerp(keyWarm, mood); key.color.copy(tmp); key.intensity = 1.7 + mood * 0.6; hemi.intensity = 0.8 + mood * 0.25;
      // a câmera da conversa sobe a cena para o rosto ficar acima do cartão de diálogo
      const wantVy = c.foco ? el.clientHeight * 0.16 : 0; vy += (wantVy - vy) * k; if (Math.abs(vy) > 0.5 || wantVy) { cam.setViewOffset(el.clientWidth, el.clientHeight, 0, vy, el.clientWidth, el.clientHeight); } else cam.clearViewOffset();
      place(); world.updateWalls(cam.position, c.reduzir ? 1 : dt);
      if (!c.reduzir) world.animate(clock, c.foco, audio.level());
      key.target.position.set(cur.tx, 0, cur.tz); key.position.set(cur.tx - 14, 26, cur.tz + 16);
      renderer.render(scene, cam);
      const w = el.clientWidth, h = el.clientHeight;
      for (const a of c.hs) { const wp = world.anchor(c.s.location, a.h.id); if (a.h.kind === "pessoa") wp.y = 2.3; project(marks.current[a.h.id], wp, c.modo === "sala", w, h); }
      for (const r of ROOM_LIST) project(badges.current[r.id], world.center(r.id).setY(3.4), c.modo === "mapa", w, h);
    }, (fps) => { el.dataset.fps = String(fps); el.dataset.calls = String(renderer.info.render.calls); });
    el.dataset.pronto = "1";
    return () => { stop(); ro.disconnect(); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); canvas.removeEventListener("wheel", wheel); canvas.removeEventListener("webglcontextlost", lost); api.current = null; world.dispose(); disposeTree(scene); disposeMats(); envOff(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.q]);

  useEffect(() => { api.current?.world.setDynamic(dyn); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dynKey]);

  // objetivos da câmera: visão geral, sala atual ou rosto de quem está falando
  useEffect(() => {
    const g = goal.current; const w = api.current?.world; if (!w) return;
    g.user = 1;
    if (p.modo === "mapa") { Object.assign(g, { tx: 0, ty: 0, tz: 0, dist: 33, pol: 0.92 }); return; }
    const c = w.center(p.s.location);
    if (p.foco) { const a = w.anchor(p.s.location, p.foco); Object.assign(g, { tx: a.x, ty: 1.2, tz: a.z, dist: 6.4, pol: 1.08 }); }
    else Object.assign(g, { tx: c.x, ty: 0.7, tz: c.z, dist: 15.5, pol: 0.95 });
  }, [p.modo, p.s.location, p.foco]);

  const rot = (d: number) => api.current?.rot(d);
  const zoom = (f: number) => api.current?.zoom(f);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { rot(-0.25); e.preventDefault(); } else if (e.key === "ArrowRight") { rot(0.25); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") zoom(0.88); else if (e.key === "-") zoom(1.14);
  };

  return (
    <div ref={host} className="relative aspect-[16/10] max-h-[72dvh] min-h-[320px] w-full select-none overflow-hidden rounded-[14px] outline-offset-2" tabIndex={0} role="group" aria-label={`Mapa 3D da UPA. Setas giram, mais e menos aproximam. Local atual: ${LOCATIONS[p.s.location].nome}.`} onKeyDown={onKey}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {ROOM_LIST.map((r) => { const pin = p.pins[r.id]; return (
          <button key={r.id} ref={(n) => { badges.current[r.id] = n; }} type="button" onClick={() => p.onGoRoom(r.id)} style={{ visibility: "hidden" }} aria-label={`Ir para ${LOCATIONS[r.id].nome}${pin.novo ? `, ${pin.novo} novidades` : ""}`}
            className={`pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border-[3px] bg-white px-3 py-1.5 text-sm font-extrabold shadow-lg ${p.s.location === r.id ? "border-[color:var(--g-blue)]" : "border-white"}`}>
            <span aria-hidden>{pin.objetivo ? "⭐" : "🏥"}</span>{LOCATIONS[r.id].curto}{pin.novo > 0 && <span className="grid size-6 place-items-center rounded-full bg-[color:var(--g-orange)] text-xs text-white">{pin.novo}</span>}
          </button>
        ); })}
        {p.hs.map((a) => {
          const done = a.estado === "visto" || a.estado === "pessoa-feita";
          return (
            <button key={a.h.id} ref={(n) => { marks.current[a.h.id] = n; }} type="button" onClick={() => p.onPick(a)} data-hotspot={a.h.id} data-estado={a.estado} style={{ visibility: "hidden" }} aria-label={`${a.rotulo}${done ? " (já visto)" : ""}`} title={a.rotulo}
              className={`pointer-events-auto absolute left-0 top-0 ${a.estado === "porta" ? "flex h-9 items-center gap-1 whitespace-nowrap px-3 text-sm" : "grid size-11 place-items-center text-xl"} rounded-full border-[3px] border-white font-extrabold shadow-lg ${done ? "bg-[color:var(--g-green)] text-white" : a.estado === "porta" ? "bg-[color:var(--g-blue)] text-white" : a.estado === "mesa" ? "bg-[color:var(--g-yellow)]" : "bg-[color:var(--g-orange)] text-white"}`}>
              <span aria-hidden>{ICON[a.estado] === "🔍" ? a.h.icone : ICON[a.estado]}</span>{a.estado === "porta" && <span aria-hidden>{a.rotulo.replace(/^Ir (à|ao|para o|para a|para) /i, "").replace(/^Entrar na /i, "")}</span>}
            </button>
          );
        })}
      </div>
      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <button type="button" className="g-btn sm ghost" onClick={() => p.onModo(p.modo === "mapa" ? "sala" : "mapa")} aria-pressed={p.modo === "mapa"}>{p.modo === "mapa" ? "🔍 Entrar na sala" : "🗺️ Ver a UPA toda"}</button>
        <div className="flex gap-1.5"><button type="button" className="g-btn sm ghost" onClick={() => rot(-0.4)} aria-label="Girar para a esquerda">↺</button><button type="button" className="g-btn sm ghost" onClick={() => rot(0.4)} aria-label="Girar para a direita">↻</button><button type="button" className="g-btn sm ghost" onClick={() => zoom(0.85)} aria-label="Aproximar">＋</button><button type="button" className="g-btn sm ghost" onClick={() => zoom(1.18)} aria-label="Afastar">－</button></div>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-white/85 px-3 py-1 text-xs font-bold" aria-hidden>{p.modo === "mapa" ? "Arraste para girar · role ou pince para aproximar · toque numa sala" : LOCATIONS[p.s.location].nome}</p>
    </div>
  );
}
void ROOMS;
