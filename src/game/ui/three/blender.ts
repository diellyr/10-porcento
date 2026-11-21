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

/** Asset estático (sem mixer). `quadroFinal`: posa no último quadro da animação (ex.: maleta já aberta). */
export function assetEstatico(nome: string, escala = 1, quadroFinal = false): THREE.Group {
  const grupo = new THREE.Group(); grupo.name = `blender-${nome}`;
  void carregarAsset(nome).then(({ cena, clipes }) => {
    const c = cena.clone(true); c.scale.setScalar(escala); marcar(c); grupo.add(c);
    if (quadroFinal && clipes[0]) { const mx = new THREE.AnimationMixer(c); mx.clipAction(clipes[0]).play(); mx.setTime(clipes[0].duration); }
  }).catch(() => undefined);
  return grupo;
}

/**
 * Pilha de maços de dinheiro com instancing (uma chamada de desenho por material, qualquer quantidade).
 * O formato é determinístico (mesma pilha para o mesmo `n` e `semente`).
 */
export function pilhaDeDinheiro(n: number, semente = 1, escala = 1.6): THREE.Group {
  const grupo = new THREE.Group(); grupo.name = "pilha-dinheiro";
  void carregarAsset("maco").then(({ cena }) => {
    const malhas: THREE.Mesh[] = []; cena.traverse((o) => { if ((o as THREE.Mesh).isMesh) malhas.push(o as THREE.Mesh); });
    let s = semente * 9301 + 49297; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), e = new THREE.Vector3(escala, escala, escala);
    const mats: THREE.Matrix4[] = [];
    const porCamada = 6; let i = 0;
    for (let camada = 0; i < n; camada++) {
      for (let k = 0; k < porCamada - camada && i < n; k++, i++) {
        const lado = (k % 2) * 0.1, fila = Math.floor(k / 2) * 0.16 + camada * 0.08;
        p.set((fila - 0.2) * escala, (0.017 + camada * 0.034) * escala, (lado - 0.05 + (rnd() - 0.5) * 0.02) * escala);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rnd() - 0.5) * 0.25);
        mats.push(m.compose(p, q, e).clone());
      }
    }
    for (const src of malhas) {
      src.updateMatrixWorld(true);
      const inst = new THREE.InstancedMesh(src.geometry, src.material, mats.length);
      mats.forEach((mm, j) => inst.setMatrixAt(j, mm.clone().multiply(src.matrixWorld)));
      inst.castShadow = true; inst.receiveShadow = true; inst.userData.keep = true; grupo.add(inst);
    }
  }).catch(() => undefined);
  return grupo;
}
