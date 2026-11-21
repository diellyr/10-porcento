"use client";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Assets produzidos no Blender (tools/blender/*.py → public/jogo/3d/blender/*.glb).
 * Carregados sob demanda, uma vez por sessão; cada uso recebe um clone com o próprio mixer de animação.
 */
const BASE = "/jogo/3d/blender/";
const loader = new GLTFLoader();
const cache = new Map<string, Promise<{ cena: THREE.Group; clipes: THREE.AnimationClip[] }>>();

export function carregarAsset(nome: string) {
  let p = cache.get(nome);
  if (!p) {
    p = loader.loadAsync(`${BASE}${nome}.glb`).then((g) => ({ cena: g.scene, clipes: g.animations }));
    p.catch(() => cache.delete(nome));
    cache.set(nome, p);
  }
  return p;
}

const marcar = (o: THREE.Object3D) => o.traverse((c) => {
  c.userData.keep = true; // não entra no "bake" de malhas do cenário
  const m = c as THREE.Mesh;
  if (!m.isMesh) return;
  m.castShadow = c.name !== "Brilho"; m.receiveShadow = true;
  const mat = m.material as THREE.MeshStandardMaterial;
  if (c.name === "Brilho") { mat.toneMapped = false; mat.emissiveIntensity = 2.2; }
});

export interface AssetAnimado {
  grupo: THREE.Group;
  /** abre (true) ou fecha (false) com a animação principal, de onde ela estiver */
  tocar: (abrir: boolean) => void;
  atualizar: (dt: number) => void;
  /** posição da porta: 0 fechado … 1 aberto */
  progresso: () => number;
}

/**
 * Cofre do Guardião: o lugar fica reservado de imediato e o modelo entra quando o GLB chega.
 * `reduzir` (movimento reduzido): sem animação, a porta salta direto para o estado final.
 */
export function cofreBlender(escala = 1, reduzir = () => false): AssetAnimado {
  const grupo = new THREE.Group(); grupo.name = "cofre-blender";
  let mixer: THREE.AnimationMixer | null = null; let acao: THREE.AnimationAction | null = null; let querAberto = false;
  // brilho do tesouro: luz quente dentro do cofre, que acende conforme a porta abre
  const luz = new THREE.PointLight(0xffc35a, 0, 2.6 * escala, 1.6); luz.position.set(0, 1.25 * escala, 0.05 * escala); luz.castShadow = false; grupo.add(luz);
  void carregarAsset("cofre").then(({ cena, clipes }) => {
    const c = cena.clone(true); c.scale.setScalar(escala); marcar(c); grupo.add(c);
    if (clipes[0]) {
      mixer = new THREE.AnimationMixer(c); acao = mixer.clipAction(clipes[0]);
      acao.setLoop(THREE.LoopOnce, 1); acao.clampWhenFinished = true; acao.play(); acao.paused = true; acao.time = 0;
      aplicar(querAberto);
    }
  }).catch(() => { /* sem o GLB: a sala segue sem o cofre novo */ });
  const aplicar = (abrir: boolean) => {
    if (!acao || !mixer) return;
    const dur = acao.getClip().duration;
    if (reduzir()) { acao.paused = true; acao.time = abrir ? dur : 0; mixer.update(0); return; }
    acao.paused = false; acao.enabled = true; acao.timeScale = abrir ? 1 : -1.6;
    if (!abrir && acao.time <= 0) acao.time = 0;
    if (abrir && acao.time >= dur) acao.time = dur;
  };
  return {
    grupo,
    tocar: (abrir) => { if (abrir === querAberto) return; querAberto = abrir; aplicar(abrir); },
    atualizar: (dt) => { if (!mixer || !acao) return; mixer.update(dt); luz.intensity = 5 * Math.min(1, (acao.time / acao.getClip().duration) * 1.4); const dur = acao.getClip().duration; if (acao.time <= 0 && acao.timeScale < 0) { acao.time = 0; acao.paused = true; } if (acao.time >= dur && acao.timeScale > 0) { acao.time = dur; acao.paused = true; } },
    progresso: () => (acao ? acao.time / acao.getClip().duration : 0),
  };
}
