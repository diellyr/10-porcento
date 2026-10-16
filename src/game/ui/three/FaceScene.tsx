"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import type { Look } from "../../content/types";
import type { Emotion } from "../../engine/types";
import { disposeTree, makeRenderer, startLoop } from "./common";
import { buildBust, type Bust } from "./head";
import type { Quality } from "./support";

export interface FaceSceneProps { look: Look; emocao: Emotion; falando: boolean; qualidade: Quality; reduzir: boolean; nivel: () => number; onFail: () => void; nome: string }

/** Busto 3D animado (WebGL). Em caso de falha de contexto, avisa o chamador para voltar ao retrato 2D equivalente. */
export default function FaceScene(p: FaceSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(p); live.current = p;
  const fpsEl = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = host.current!; let renderer: THREE.WebGLRenderer;
    const canvas = document.createElement("canvas"); canvas.style.cssText = "width:100%;height:100%;display:block;touch-action:none"; canvas.setAttribute("aria-hidden", "true"); el.appendChild(canvas);
    try { renderer = makeRenderer(canvas, p.qualidade); } catch { p.onFail(); return; }
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50); cam.position.set(0, -0.2, 8.2); cam.lookAt(0, -0.5, 0);
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x9fb0d8, 0.85));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(-3.5, 3.5, 5); key.castShadow = p.qualidade !== "baixa"; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 14; key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -3; key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd0ff, 0.9); fill.position.set(4, 0.5, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe6c0, 1.6); rim.position.set(2, 3, -4); scene.add(rim);
    let bust: Bust = buildBust(p.look, p.qualidade); scene.add(bust.root);
    const look0 = JSON.stringify(p.look);
    const resize = () => { const w = el.clientWidth || 300, h = el.clientHeight || 300; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.8 ? 30 : 24; cam.updateProjectionMatrix(); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(el);
    const ptr = { x: 0, y: 0 }; const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); ptr.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)); ptr.y = Math.max(-1, Math.min(1, -((e.clientY - r.top) / r.height - 0.5) * 2)); };
    window.addEventListener("pointermove", move);
    const lost = (e: Event) => { e.preventDefault(); live.current.onFail(); }; canvas.addEventListener("webglcontextlost", lost);
    const stop = startLoop(p.qualidade, (dt, t) => {
      const c = live.current;
      if (JSON.stringify(c.look) !== look0) return; // identidade mudou: o componente é recriado pela chave do chamador
      bust.update({ emocao: c.emocao, falando: c.falando, nivel: c.falando ? c.nivel() : 0, olhar: ptr, reduzir: c.reduzir }, dt, t);
      renderer.render(scene, cam);
    }, (fps) => { if (fpsEl.current) fpsEl.current.textContent = String(fps); el.dataset.fps = String(fps); });
    el.dataset.pronto = "1";
    return () => { stop(); ro.disconnect(); window.removeEventListener("pointermove", move); canvas.removeEventListener("webglcontextlost", lost); bust.dispose(); disposeTree(scene); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.look.pele, p.look.cabeloEstilo, p.look.roupa, p.qualidade]);
  return (
    <div ref={host} className="h-full w-full" role="img" aria-label={`${p.nome}: busto 3D animado, expressão ${p.emocao}`}>
      <span ref={fpsEl} className="sr-only" />
    </div>
  );
}
