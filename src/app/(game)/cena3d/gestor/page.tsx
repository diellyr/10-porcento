"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { personagemPiloto, type PersonagemPiloto } from "@/game/ui/three/blender";
import { ambienteHDRI } from "@/game/ui/three/realismo";

const ANIMS = ["Parado", "Falando", "Comemorar", "Derrota", "Andar", "Coletar", "Sentado", "Susto", "Interagir"];
const EXPR: Record<string, Record<string, number>> = {
  Satisfação: { sorriso: 0.6 }, Ganância: { sorriso: 1, iris_grande: 1, sobrancelha_surpresa: 0.3 }, Alegria: { sorriso: 1, boca_aberta: 0.6 },
  Raiva: { sobrancelha_raiva: 1, boca_triste: 0.6 }, Surpresa: { sobrancelha_surpresa: 1, boca_aberta: 1 }, Medo: { sobrancelha_medo: 1, boca_triste: 0.8, boca_aberta: 0.4 },
  Piscar: { piscar: 1, sorriso: 0.6 },
};

/** Galeria (só desenvolvimento): o personagem piloto no three.js do jogo, com cada animação e expressão. */
function G() {
  const sp = useSearchParams();
  const host = useRef<HTMLDivElement>(null);
  const pers = useRef<PersonagemPiloto | null>(null);
  const [anim, setAnim] = useState(sp.get("a") ?? "Parado");
  const [expr, setExpr] = useState(sp.get("e") ?? "Satisfação");
  useEffect(() => {
    const el = host.current!; let vivo = true;
    const r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; el.appendChild(r.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a2333);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    const vista = sp.get("v") ?? "frente";
    const P: Record<string, [number, number, number, number]> = { frente: [0, 1.05, 4.6, 0.95], lado: [4.6, 1.05, 0, 0.95], costas: [0, 1.05, -4.6, 0.95], rosto: [0.25, 1.78, 1.25, 1.72], tres: [2.2, 1.4, 3.8, 0.95] };
    const [x, y, z, ty] = P[vista] ?? P.frente!; cam.position.set(x, y, z); cam.lookAt(0, ty, 0);
    void ambienteHDRI(r, scene, 0.6);
    const sol = new THREE.DirectionalLight(0xffe2c0, 2.4); sol.position.set(-2, 4, 3); sol.castShadow = true; sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.03; sol.shadow.mapSize.set(2048, 2048); scene.add(sol);
    scene.add(new THREE.HemisphereLight(0xdde4ff, 0x40303a, 0.5));
    const chao = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: 0x3a3142, roughness: 0.6 })); chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; scene.add(chao);
    const p = personagemPiloto(); pers.current = p; scene.add(p.grupo);
    const tam = () => { r.setSize(el.clientWidth, el.clientHeight, false); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); };
    tam(); const ro = new ResizeObserver(tam); ro.observe(el);
    let ant = performance.now(), quadros = 0, t0 = ant;
    const loop = (t: number) => { if (!vivo) return; p.atualizar(Math.min(0.05, (t - ant) / 1000)); ant = t; r.render(scene, cam); quadros++; if (t - t0 > 1000) { el.dataset.fps = String(quadros); quadros = 0; t0 = t; el.dataset.anims = p.animacoes().join(","); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop); el.dataset.pronto = "1";
    return () => { vivo = false; ro.disconnect(); r.dispose(); r.domElement.remove(); };
  }, [sp]);
  useEffect(() => { pers.current?.animar(anim); }, [anim]);
  useEffect(() => { pers.current?.expressao(EXPR[expr] ?? {}); }, [expr]);
  return (
    <div className="game grid min-h-dvh grid-rows-[1fr_auto] bg-[#1b1622]">
      <div ref={host} className="min-h-[60dvh] w-full" />
      <div className="flex flex-wrap gap-1.5 p-2">
        {ANIMS.map((a) => <button key={a} className={`g-btn sm ${anim === a ? "" : "ghost"}`} onClick={() => setAnim(a)}>{a}</button>)}
        <span className="mx-2 border-l border-white/30" />
        {Object.keys(EXPR).map((e) => <button key={e} className={`g-btn sm ${expr === e ? "orange" : "ghost"}`} onClick={() => setExpr(e)}>{e}</button>)}
      </div>
    </div>
  );
}
export default function Page() { return <Suspense><G /></Suspense>; }
