import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { buildCena } from "./cena";
import { contato } from "./personagem";
import { Grade, type Estudo } from "./render";

/**
 * Direções REALISTAS do estudo (R1, R2, R3). Usam recursos externos baixados para /public/estudo-assets (fora do git):
 * HDRI e piso de madeira PBR (exemplos do three.js, origem Poly Haven, CC0), sofá de veludo (Wayfair, CC BY 4.0) e poltrona
 * de tecido (Khronos, CC BY 4.0), e um humano riggado de referência (Michelle, Mixamo) usado só como SUBSTITUTO de qualidade.
 */
export type Real = "r1" | "r2" | "r3";
const A = "/estudo-assets/";
const gltf = new GLTFLoader();
const load = (f: string) => gltf.loadAsync(A + f);
const tex = (f: string, srgb = false, rep = 4) => new THREE.TextureLoader().loadAsync(A + f).then((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; });

export async function montarRealista(canvas: HTMLCanvasElement, r: Real, vista: 1 | 2, w: number, h: number): Promise<Estudo> {
  const cine = r === "r3";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = cine ? THREE.ACESFilmicToneMapping : THREE.AgXToneMapping;
  renderer.toneMappingExposure = cine ? 0.9 : 1.15; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  RectAreaLightUniformsLib.init();

  const cena = buildCena("b", { cine });
  const { scene } = cena;
  if (cine) (cena.luzes[0] as THREE.DirectionalLight).intensity = 3.0;
  scene.background = new THREE.Color(cine ? "#120e14" : "#d9dde3");
  // iluminação por imagem (HDRI real)
  const hdr = await new HDRLoader().loadAsync(A + "venice_sunset_1k.hdr"); hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(hdr); hdr.dispose();
  scene.environment = env.texture; scene.environmentIntensity = cine ? 0.1 : 0.42; scene.environmentRotation.set(0, 1.2, 0);
  // piso de madeira PBR real
  const [cor, rug, rel] = await Promise.all([tex("hardwood2_diffuse.jpg", true, 3), tex("hardwood2_roughness.jpg", false, 3), tex("hardwood2_bump.jpg", false, 3)]);
  cena.piso.material = new THREE.MeshPhysicalMaterial({ map: cor, roughnessMap: rug, bumpMap: rel, bumpScale: 0.6, roughness: 1, clearcoat: cine ? 0 : 0.3, clearcoatRoughness: 0.35, color: cine ? "#6e5240" : "#ffffff" });
  const cm = cor.clone(); cm.repeat.set(0.6, 0.6); cm.needsUpdate = true; cena.mesaMadeira.map = cm; cena.mesaMadeira.color.set(cine ? "#6a4a32" : "#8a6448"); cena.mesaMadeira.clearcoat = 0.15; cena.mesaMadeira.roughness = 0.6; cena.mesaMadeira.needsUpdate = true;
  // móveis de catálogo (modelos PBR reais)
  const [sofa, cad] = await Promise.all([load("GlamVelvetSofa.glb"), load("SheenChair.glb")]);
  const pos = cena.sofa.position.clone(), rot = cena.sofa.rotation.y; scene.remove(cena.sofa);
  const sf = sofa.scene; const bb = new THREE.Box3().setFromObject(sf); const sz = bb.getSize(new THREE.Vector3()); sf.scale.setScalar(2.1 / Math.max(sz.x, sz.z));
  sf.position.copy(pos); sf.rotation.y = rot; scene.add(sf);
  if (cine) sf.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined; if (m && "sheen" in m) { m.sheen *= 0.35; m.specularIntensity = 0.4; } });
  for (const [x, z, ry] of [[-0.25, -0.3, Math.PI + 0.25], [0.95, -0.3, Math.PI - 0.25]] as const) {
    const c = cad.scene.clone(); const b = new THREE.Box3().setFromObject(c); const s = b.getSize(new THREE.Vector3()); c.scale.setScalar(0.85 / s.y); c.position.set(x + 0.35, 0, z - 0.25); c.rotation.y = ry; scene.add(c);
  }
  scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // personagens
  let foco: THREE.Object3D = cena.cornelio.cabeca;
  if (r === "r2") {
    for (const p of cena.pessoas) p.parent?.remove(p);
    const g = await load("Michelle.glb"); const hum = g.scene;
    const b = new THREE.Box3().setFromObject(hum); hum.scale.setScalar(1.68 / b.getSize(new THREE.Vector3()).y);
    hum.position.set(0.45, 0, 0.05); hum.rotation.y = -0.35; scene.add(hum);
    hum.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; (m.material as THREE.MeshStandardMaterial).envMapIntensity = 1; } });
    const mixer = new THREE.AnimationMixer(hum); const clip = g.animations.find((a) => a.name === "SambaDance")!; const act = mixer.clipAction(clip); act.play(); mixer.setTime(0.45);
    hum.updateMatrixWorld(true);
    const bone = (n: string) => hum.getObjectByName(n);
    foco = bone("mixamorigHead") ?? hum;
    const c = contato(0.75, 0.5); c.position.set(0.45, 0, 0.05); scene.add(c);
  }
  // luz da janela (área) + sol
  if (!cine) { const area = new THREE.RectAreaLight("#fff1dc", 6, 1.7, 1.35); area.position.set(-3.55, 1.75, -0.2); area.lookAt(0, 1.2, -0.2); scene.add(area); }

  const cam = new THREE.PerspectiveCamera(32, w / h, 0.05, 80);
  scene.updateMatrixWorld(true);
  const head = new THREE.Vector3(); foco.getWorldPosition(head);
  let dist = 6;
  if (vista === 1) { if (cine) { cam.position.set(4.6, 2.5, 6.0); cam.lookAt(-0.1, 1.05, -0.6); cam.fov = 34; } else { cam.position.set(5.6, 5.0, 7.0); cam.lookAt(0, 0.85, -0.3); cam.fov = 33; } }
  else { const pro = r !== "r2"; const alvo = head.clone().add(new THREE.Vector3(pro ? 0.16 : 0, pro ? -0.2 : -0.22, 0)); cam.fov = cine ? 24 : 26; cam.position.copy(alvo).addScaledVector(new THREE.Vector3(0.42, 0.06, 1).normalize(), pro ? 1.95 : 1.55); cam.lookAt(alvo); dist = cam.position.distanceTo(head); }
  cam.updateProjectionMatrix();

  const comp = new EffectComposer(renderer, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }));
  comp.setPixelRatio(1); comp.setSize(w, h); comp.addPass(new RenderPass(scene, cam));
  const ao = new GTAOPass(scene, cam, w, h); ao.updateGtaoMaterial({ radius: vista === 2 ? 0.15 : 0.4, distanceExponent: 1, thickness: 1, scale: 1 }); ao.blendIntensity = 1; comp.addPass(ao);
  if (cine) { comp.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.2, 0.5, 0.96)); if (vista === 2) comp.addPass(new BokehPass(scene, cam, { focus: dist, aperture: 0.004, maxblur: 0.009 })); }
  comp.addPass(new OutputPass());
  const grade = new ShaderPass(Grade); grade.uniforms.amount!.value = cine ? 1 : 0.3; grade.uniforms.vignette!.value = cine ? 0.45 : 0.2; grade.uniforms.warm!.value = cine ? 0.09 : 0.03; comp.addPass(grade);
  comp.addPass(new SMAAPass());
  return { render: () => comp.render(), dispose: () => { comp.dispose(); env.dispose(); pm.dispose(); renderer.dispose(); } };
}
