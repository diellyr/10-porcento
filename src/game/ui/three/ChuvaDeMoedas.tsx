"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { carregarAsset } from "./blender";
import { pixelRatioFor, type Quality } from "./support";

/**
 * Chuva de moedas "10%" (modelo do Blender) sobre a tela, quando o patrimônio fictício cresce.
 * Só ilustra o que o motor já registrou: não calcula nada. Camada transparente que não bloqueia cliques.
 * `intensidade` 1–3 controla a quantidade (faixas de valor decididas por quem chama).
 */
/** `instante` (só galeria/QA): congela a chuva nesse tempo, em segundos. */
export default function ChuvaDeMoedas({ qualidade, intensidade = 1, onFim, instante }: { qualidade: Quality; intensidade?: number; onFim?: () => void; instante?: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    let vivo = true, raf = 0;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: qualidade !== "baixa", powerPreference: "default" });
    renderer.setPixelRatio(pixelRatioFor(qualidade)); renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const tam = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
    el.appendChild(renderer.domElement); Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
    const scene = new THREE.Scene();
    // ambiente para o ouro metálico refletir (sem ele as faces ficam pretas)
    const pm = new THREE.PMREMGenerator(renderer); const amb = pm.fromScene(new RoomEnvironment(), 0.04); scene.environment = amb.texture; scene.environmentIntensity = 0.9;
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 50); cam.position.set(0, 0, 9);
    scene.add(new THREE.HemisphereLight(0xfff2d8, 0x403020, 1.6));
    const sol = new THREE.DirectionalLight(0xffe0a0, 3.2); sol.position.set(-3, 5, 6); scene.add(sol);
    const contra = new THREE.DirectionalLight(0xa0b8ff, 1.2); contra.position.set(4, -2, 3); scene.add(contra);
    tam(); const ro = new ResizeObserver(tam); ro.observe(el);

    const N = Math.round([0, 60, 110, 170][Math.max(1, Math.min(3, intensidade))]! * (qualidade === "alta" ? 1 : 0.6));
    const DUR = 2.8;
    void carregarAsset("moeda").then(({ cena }) => {
      if (!vivo) return;
      const malhas: THREE.Mesh[] = []; cena.traverse((o) => { if ((o as THREE.Mesh).isMesh) malhas.push(o as THREE.Mesh); });
      const insts = malhas.map((m) => { m.updateMatrixWorld(true); const i = new THREE.InstancedMesh(m.geometry, m.material, N); i.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(i); return { i, base: m.matrixWorld.clone() }; });
      // estado de cada moeda: posição, velocidade, giro
      const vis = cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); const larg = vis * cam.aspect;
      const P = Array.from({ length: N }, (_, k) => ({
        p: new THREE.Vector3((Math.random() * 2 - 1) * larg * 0.95, vis + 0.5 + Math.random() * vis * 1.6, (Math.random() - 0.5) * 3),
        v: new THREE.Vector3((Math.random() - 0.5) * 0.8, -2 - Math.random() * 2.5, 0),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), w: new THREE.Vector3(4 + Math.random() * 8, 2 + Math.random() * 6, Math.random() * 3),
        atraso: (k / N) * 0.9,
      }));
      const chao = -vis * 0.92, esc = new THREE.Vector3(5, 5, 5), q = new THREE.Quaternion(), m = new THREE.Matrix4();
      let t0 = performance.now(), ant = t0, congelado = false;
      const quadro = (agora: number) => {
        if (!vivo) return;
        const t = instante ?? (agora - t0) / 1000, dt = instante !== undefined ? 0 : Math.min(0.05, (agora - ant) / 1000); ant = agora;
        if (instante !== undefined && !congelado) { congelado = true; P.forEach((c) => { const tt = Math.max(0, instante - c.atraso); for (let k = 0; k < tt * 60; k++) { c.v.y -= 14 / 60; c.p.addScaledVector(c.v, 1 / 60); if (c.p.y < chao) { c.p.y = chao; c.v.y *= -0.35; } c.r.x += c.w.x / 60; c.r.y += c.w.y / 60; } }); }
        P.forEach((c, j) => {
          if (t > c.atraso) {
            c.v.y -= 14 * dt; c.p.addScaledVector(c.v, dt);
            if (c.p.y < chao) { c.p.y = chao; c.v.y *= -0.35; c.v.x *= 0.7; c.w.multiplyScalar(0.6); }
            c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
          }
          const fade = t > DUR - 0.5 ? Math.max(0, (DUR - t) / 0.5) : 1;
          q.setFromEuler(c.r); m.compose(c.p, q, esc.clone().multiplyScalar(fade));
          for (const { i, base } of insts) i.setMatrixAt(j, m.clone().multiply(base));
        });
        for (const { i } of insts) i.instanceMatrix.needsUpdate = true;
        renderer.render(scene, cam);
        if (t < DUR && instante === undefined) raf = requestAnimationFrame(quadro); else if (instante === undefined) onFim?.();
      };
      raf = requestAnimationFrame(quadro);
    }).catch(() => onFim?.());
    return () => { vivo = false; cancelAnimationFrame(raf); ro.disconnect(); amb.dispose(); pm.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={host} className="pointer-events-none fixed inset-0 z-[70]" aria-hidden />;
}
