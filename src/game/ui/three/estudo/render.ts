import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildCena } from "./cena";
import type { Estilo } from "./personagem";

/** Correção de cor + vinheta (cinematográfica: sombras frias, luzes quentes). */
export const Grade = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 1 }, vignette: { value: 0.35 }, warm: { value: 0.08 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount, vignette, warm; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      vec3 sh = vec3(0.0, 0.03, 0.06), hi = vec3(warm, warm*0.45, -warm*0.4);
      c.rgb += mix(sh, hi, smoothstep(0.15, 0.85, l)) * amount;
      c.rgb = mix(vec3(l), c.rgb, 1.0 + 0.08*amount);
      float d = distance(vUv, vec2(0.5)); c.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, d);
      gl_FragColor = c; }`,
};

export interface Estudo { render: () => void; dispose: () => void }

/** Monta renderer, cena, câmera e pós-processamento de uma direção e de uma vista (1 = cena, 2 = personagem). */
export function montarEstudo(canvas: HTMLCanvasElement, e: Estilo, vista: 1 | 2, w: number, h: number): Estudo {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = e === "b" ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = e === "a" ? 1.05 : e === "b" ? 1.12 : 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const { scene, cornelio, poeira } = buildCena(e);
  scene.background = new THREE.Color(e === "a" ? "#bfe3ff" : e === "b" ? "#d9dde3" : "#141018");
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture; scene.environmentIntensity = e === "a" ? 0.5 : e === "b" ? 0.6 : 0.22;

  const cam = new THREE.PerspectiveCamera(32, w / h, 0.05, 80);
  scene.updateMatrixWorld(true);
  const head = new THREE.Vector3(); cornelio.cabeca.getWorldPosition(head);
  let foco = 6;
  if (vista === 1) {
    if (e === "c") { cam.position.set(4.6, 2.5, 6.0); cam.lookAt(-0.1, 1.05, -0.6); cam.fov = 34; }
    else { cam.position.set(5.6, 5.0, 7.0); cam.lookAt(0, 0.85, -0.3); cam.fov = 33; }
  } else {
    const k = cornelio.altura / 1.78;
    const alvo = head.clone().add(new THREE.Vector3(0.16 * k, -0.2 * k, 0));
    const dir = new THREE.Vector3(0.42, 0.06, 1).normalize();
    cam.fov = e === "c" ? 24 : 26;
    cam.position.copy(alvo).addScaledVector(dir, (e === "a" ? 2.0 : 1.95) * Math.max(0.85, k));
    cam.lookAt(alvo); foco = cam.position.distanceTo(head);
  }
  cam.updateProjectionMatrix();

  const comp = new EffectComposer(renderer, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }));
  comp.setPixelRatio(1); comp.setSize(w, h);
  comp.addPass(new RenderPass(scene, cam));
  const ao = new GTAOPass(scene, cam, w, h);
  ao.updateGtaoMaterial({ radius: vista === 2 ? 0.12 : 0.35, distanceExponent: 1, thickness: 1, scale: 1 });
  ao.blendIntensity = e === "a" ? 0.55 : e === "b" ? 0.85 : 1.0;
  comp.addPass(ao);
  if (e === "c") {
    comp.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.26, 0.55, 0.9));
    if (vista === 2) comp.addPass(new BokehPass(scene, cam, { focus: foco, aperture: 0.0035, maxblur: 0.008 }));
  }
  if (e === "a") comp.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.12, 0.4, 0.92));
  comp.addPass(new OutputPass());
  const grade = new ShaderPass(Grade);
  grade.uniforms.amount!.value = e === "c" ? 1 : e === "b" ? 0.25 : 0.1;
  grade.uniforms.vignette!.value = e === "c" ? 0.45 : e === "b" ? 0.18 : 0.1;
  grade.uniforms.warm!.value = e === "c" ? 0.09 : 0.03;
  comp.addPass(grade);
  comp.addPass(new SMAAPass());
  void poeira;

  return {
    render: () => comp.render(),
    dispose: () => { comp.dispose(); env.dispose(); pm.dispose(); renderer.dispose(); },
  };
}
