"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Look } from "../../content/types";
import { carregarAsset } from "./blender";
import { buildPersonagem } from "./estudo/personagem";
import { ambienteHDRI } from "./realismo";
import { pixelRatioFor, type Quality } from "./support";

/**
 * Final "Imperador": coroação aparente. O avatar do jogador, sentado no trono do Blender, recebe a coroa
 * que desce do alto; moedas no chão; então a luz vermelha da auditoria corta a cerimônia (como no texto do final).
 * Só ilustra o desfecho já calculado pelo motor.
 */
export default function Coroacao({ look, qualidade, reduzir }: { look: Look; qualidade: Quality; reduzir: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [etapa, setEtapa] = useState<"coroa" | "auditoria">(reduzir ? "auditoria" : "coroa");
  useEffect(() => {
    const el = host.current; if (!el) return;
    let vivo = true, raf = 0;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "default" });
    renderer.setPixelRatio(pixelRatioFor(qualidade)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = qualidade !== "baixa"; renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement); Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x15121c); scene.fog = new THREE.Fog(0x15121c, 8, 16);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    let envOff = () => {}; void ambienteHDRI(renderer, scene, 0.25).then((off) => { if (vivo) envOff = off; else off(); }).catch(() => undefined);

    // palco: piso escuro polido, tapete vermelho, colunas e luz dourada
    const piso = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshPhysicalMaterial({ color: 0x1d1a24, roughness: 0.25, clearcoat: 0.6 }));
    piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; scene.add(piso);
    const tapete = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 6), new THREE.MeshStandardMaterial({ color: 0x8a1626, roughness: 0.9 }));
    tapete.rotation.x = -Math.PI / 2; tapete.position.set(0, 0.005, 2.4); tapete.receiveShadow = true; scene.add(tapete);
    const ouro = new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: 0.25 });
    for (const x of [-2.4, 2.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 32), new THREE.MeshPhysicalMaterial({ color: 0xece4d4, roughness: 0.4 })); c.position.set(x, 2.1, -0.6); c.castShadow = true; scene.add(c); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.2, 32), ouro); cap.position.set(x, 4.2, -0.6); scene.add(cap); }
    scene.add(new THREE.HemisphereLight(0xffe8c8, 0x2a1d2a, 0.5));
    const foco = new THREE.SpotLight(0xffd8a0, 60, 14, 0.42, 0.5, 1.4); foco.position.set(0.5, 6.5, 3.5); foco.target.position.set(0, 1, 0); foco.castShadow = true; foco.shadow.mapSize.set(1024, 1024); scene.add(foco, foco.target);
    const sirene = new THREE.PointLight(0xff2030, 0, 12, 1.2); sirene.position.set(0, 3.2, 2.6); scene.add(sirene);

    // jogador sentado (avatar) e assets do Blender
    const pers = buildPersonagem(look, "b", "sentado", { leve: qualidade !== "alta" });
    pers.root.scale.set(1.3, 1.2, 1.3); pers.root.position.set(0, 0.62, 0.02); scene.add(pers.root);
    pers.root.traverse((o) => { o.castShadow = true; });
    const cabeca = new THREE.Vector3();
    const coroa = new THREE.Group(); scene.add(coroa);
    const moedas = new THREE.Group(); scene.add(moedas);
    let t0 = performance.now(); let prontos = 0; const pronto = () => { if (++prontos === 2) t0 = performance.now(); };
    void carregarAsset("trono").then(({ cena }) => { if (!vivo) return; pronto(); const t = cena.clone(true); t.scale.setScalar(1.3); t.position.set(0, 0, -0.05); t.traverse((o) => { o.castShadow = o.receiveShadow = true; }); scene.add(t); });
    void carregarAsset("coroa").then(({ cena }) => { if (!vivo) return; pronto(); const c = cena.clone(true); c.scale.setScalar(1.25); coroa.add(c); });
    void carregarAsset("moeda").then(({ cena }) => {
      if (!vivo) return;
      for (let i = 0; i < 26; i++) { const m = cena.clone(true); const a = i * 2.4, r = 1.0 + (i % 7) * 0.22; m.position.set(Math.cos(a) * r, 0.005 + (i % 3) * 0.009, 0.6 + Math.sin(a) * r * 0.6); m.rotation.set(0, a, (i % 4) * 0.08); m.scale.setScalar(1.6); moedas.add(m); }
    });

    const tam = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
    tam(); const ro = new ResizeObserver(tam); ro.observe(el);
    let aud = false;
    const quadro = (agora: number) => {
      if (!vivo) return;
      const t = reduzir ? 9 : prontos < 2 ? 0 : (agora - t0) / 1000;
      scene.updateMatrixWorld(true); pers.cabeca.getWorldPosition(cabeca);
      // câmera: aproximação lenta do trono
      const k = Math.min(1, t / 5), ease = 1 - Math.pow(1 - k, 3);
      cam.position.set(1.1 - ease * 0.6, 2.5 - ease * 0.35, 8.2 - ease * 2.2); cam.lookAt(0, 1.4, 0);
      // coroa desce do alto e pousa na cabeça (≈ 3,2 s), com brilho girando
      const kc = Math.min(1, Math.max(0, (t - 0.6) / 2.6)), ec = 1 - Math.pow(1 - kc, 2);
      coroa.position.set(cabeca.x, cabeca.y + 0.11 + (1 - ec) * 2.6, cabeca.z - 0.02); coroa.rotation.y = (1 - ec) * 3.2;
      pers.animar({ falando: false, nivel: 0, emocao: t > 4.4 ? "preocupado" : "feliz", ...(t > 4.4 ? { olhar: { x: 0.25, y: 0.05 } } : {}) }, 1 / 60, t);
      // auditoria: sirene vermelha pulsando e luz dourada apagando
      if (t > 4.2) { if (!aud) { aud = true; setEtapa("auditoria"); } sirene.intensity = 30 * (0.5 + 0.5 * Math.sin(t * 9)); foco.intensity = Math.max(12, 60 - (t - 4.2) * 40); }
      renderer.render(scene, cam);
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => { vivo = false; cancelAnimationFrame(raf); ro.disconnect(); envOff(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-3xl overflow-hidden rounded-2xl bg-[#15121c]">
      <div ref={host} className="absolute inset-0" role="img" aria-label="Coroação aparente: você no trono recebe a coroa, até a auditoria interromper a cerimônia." />
      <p className={`pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-extrabold shadow-lg ${etapa === "coroa" ? "bg-[#ffe28a] text-[#3a2a08]" : "bg-[#c8323c] text-white"}`} role="status">
        {etapa === "coroa" ? "👑 Coroação aparente" : "🚨 Auditoria em andamento"}
      </p>
    </div>
  );
}
