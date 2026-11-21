"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { assetEstatico, pilhaDeDinheiro } from "./blender";
import { pixelRatioFor, type Quality } from "./support";

/**
 * Vitrine do patrimônio fictício: pedestal giratório com a pilha de dinheiro (cresce com o patrimônio) e os objetos
 * das faixas de ostentação (as mesmas do gabinete). Evidências registradas acendem uma luz vermelha de alerta.
 * Só lê valores do estado; não calcula nada do jogo.
 */
export default function VitrinePatrimonio({ patrimonio, luxo, evidencias, qualidade, reduzir }: { patrimonio: number; luxo: number; evidencias: number; qualidade: Quality; reduzir: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    let vivo = true, raf = 0;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "default" });
    renderer.setPixelRatio(pixelRatioFor(qualidade)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = qualidade !== "baixa"; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement); Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer); const amb = pm.fromScene(new RoomEnvironment(), 0.04); scene.environment = amb.texture; scene.environmentIntensity = 0.55;
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 30); cam.position.set(0, 2.3, 5.4); cam.lookAt(0, 0.55, 0);
    const key = new THREE.DirectionalLight(0xffe2b8, 2.4); key.position.set(-2.5, 4.5, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a30, 0.6));

    const mesa = new THREE.Group(); scene.add(mesa);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 0.28, 64), new THREE.MeshPhysicalMaterial({ color: 0x2c2f36, metalness: 0.6, roughness: 0.35, clearcoat: 0.5 }));
    ped.position.y = 0.14; ped.receiveShadow = true; mesa.add(ped);
    const veludo = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.02, 64), new THREE.MeshStandardMaterial({ color: 0x5c1622, roughness: 0.9 }));
    veludo.position.y = 0.29; veludo.receiveShadow = true; mesa.add(veludo);
    const friso = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.025, 10, 96), new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: 0.25 }));
    friso.rotation.x = Math.PI / 2; friso.position.y = 0.28; mesa.add(friso);
    const topo = 0.3;
    const por = (o: THREE.Object3D, x: number, z: number, r = 0) => { o.position.set(x, topo, z); o.rotation.y = r; mesa.add(o); };
    // pilha: ~1 maço a cada R$ 15 mil (mínimo 1, máximo 28)
    if (patrimonio > 0) por(pilhaDeDinheiro(Math.max(1, Math.min(28, Math.round(patrimonio / 15000))), 7, 2.6), 0.15, 0.2, 0.2);
    if (luxo >= 1) { por(assetEstatico("maleta", 1.5, true), -0.95, 0.55, 0.5); por(assetEstatico("trofeu", 1.4), 0.95, -0.55, -0.3); }
    if (luxo >= 2) por(assetEstatico("maleta", 1.5, true), 0.9, 0.7, -0.6);
    if (luxo >= 3) { por(assetEstatico("trono", 0.75), -0.55, -0.75, 0.35); por(assetEstatico("coroa", 1.3), 0.55, 0.85, 0); }

    // consequência à vista: evidências acendem a sirene
    const sirene = new THREE.PointLight(0xff2030, 0, 6, 1.4); sirene.position.set(0, 2.2, 0.6); scene.add(sirene);

    const tam = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
    tam(); const ro = new ResizeObserver(tam); ro.observe(el);
    const t0 = performance.now();
    const quadro = (agora: number) => {
      if (!vivo) return;
      const t = (agora - t0) / 1000;
      if (!reduzir) mesa.rotation.y = t * 0.35;
      sirene.intensity = evidencias > 0 ? (reduzir ? 10 : 10 + 10 * Math.sin(t * 5)) * Math.min(1, evidencias / 4) : 0;
      renderer.render(scene, cam);
      // sem movimento, basta redesenhar até os modelos chegarem
      raf = reduzir && t > 4 ? 0 : requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => { vivo = false; cancelAnimationFrame(raf); ro.disconnect(); amb.dispose(); pm.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
  }, [patrimonio, luxo, evidencias, qualidade, reduzir]);
  const faixa = ["Modesta", "Confortável", "Exagerada", "Imperial"][Math.max(0, Math.min(3, luxo))];
  return (
    <figure className="relative mt-2 overflow-hidden rounded-2xl" style={{ background: "radial-gradient(120% 90% at 50% 20%, #3a3340, #17141c)" }}>
      <div ref={host} className="aspect-[16/9] w-full" role="img" aria-label={`Vitrine do patrimônio fictício: faixa de ostentação ${faixa}${evidencias > 0 ? `, com ${evidencias} evidência(s) registrada(s)` : ""}.`} />
      <figcaption className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap items-center justify-between gap-1 text-xs font-bold">
        <span className="rounded-full bg-[#ffe28a] px-2.5 py-1 text-[#3a2a08]">✨ Ostentação: {faixa}</span>
        {evidencias > 0 && <span className="rounded-full bg-[#c8323c] px-2.5 py-1 text-white">🔎 {evidencias} evidência(s) no arquivo</span>}
      </figcaption>
    </figure>
  );
}
