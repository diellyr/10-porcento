import * as THREE from "three";
import { darken, lighten, mix } from "../art/color";

/**
 * Braço, mão e caneta 3D PROCEDURAIS (objetos reais: palma, 5 dedos com 3/3/3/3/2 falanges articuladas, unhas, antebraço,
 * manga/punho, caneta com corpo, aro, clipe e pena). A pegada é calculada por cinemática inversa (CCD) contra a própria caneta,
 * então os dedos tocam o corpo da caneta e ela fica presa à mão. O 3D abstrai medidas reais: unidade = comprimento da palma (~9,5 cm).
 * STATUS: provisório — acabamento final exige modelo esculpido/riggado (ASSETS_PENDENTES.md).
 */
const V = THREE.Vector3;

const FINGERS = [
  { name: "indicador", x: 0.34, z: 1.02, L: [0.4, 0.24, 0.2], r: 0.088 },
  { name: "medio", x: 0.115, z: 1.06, L: [0.44, 0.27, 0.21], r: 0.092 },
  { name: "anelar", x: -0.115, z: 1.02, L: [0.4, 0.25, 0.2], r: 0.086 },
  { name: "minimo", x: -0.34, z: 0.93, L: [0.31, 0.19, 0.17], r: 0.076 },
] as const;

export interface HandRig {
  root: THREE.Group;            // origem no punho; +Z dedos; +Y dorso; +X polegar
  penTip: THREE.Object3D;       // ponta da pena (referência de contato com o papel)
  pen: THREE.Group;
  forearm: THREE.Group;
  setGrip: (g: number) => void; // 0 = mão relaxada (caneta solta junto), 1 = pegada de escrita
  dispose: () => void;
  tipLocal: THREE.Vector3;
  wristLocal: THREE.Vector3;
}

function capsule(len: number, r0: number, r1: number, mat: THREE.Material, rs = 16): THREE.Mesh {
  // cilindro cônico com pontas arredondadas, eixo ao longo de +Z, começando em z=0
  const g = new THREE.CylinderGeometry(r1, r0, len, rs, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2);
  // CylinderGeometry: topo (r1) em +y → após rotateX(π/2) topo vai para +z
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function buildHand(opts: { pele: string; sombra: string; manga: string; punho: string; dourado?: string; corCaneta?: string; penDirLocal?: THREE.Vector3; tipLocal?: THREE.Vector3 }): HandRig {
  const disposables: Array<{ dispose: () => void }> = [];
  const skin = new THREE.MeshStandardMaterial({ color: opts.pele, roughness: 0.55, emissive: new THREE.Color(opts.pele).multiplyScalar(0.06) });
  const skinD = new THREE.MeshStandardMaterial({ color: mix(opts.pele, opts.sombra, 0.5), roughness: 0.6 });
  const nailM = new THREE.MeshStandardMaterial({ color: mix(lighten(opts.pele, 0.45), "#f4c9c0", 0.45), roughness: 0.25 });
  disposables.push(skin, skinD, nailM);

  const root = new THREE.Group();
  const add = (o: THREE.Object3D, parent: THREE.Object3D = root) => { parent.add(o); return o; };
  const ell = (sx: number, sy: number, sz: number, x: number, y: number, z: number, mat: THREE.Material = skin, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; disposables.push(m.geometry); parent.add(m); return m;
  };

  /* palma e dorso */
  ell(0.47, 0.17, 0.56, 0, 0, 0.5);                     // palma
  ell(0.42, 0.14, 0.34, 0.02, 0.05, 0.42);              // dorso (volume)
  ell(0.33, 0.15, 0.22, 0, -0.01, 0.1);                 // base / punho
  ell(0.2, 0.12, 0.34, 0.4, -0.09, 0.42);               // eminência tenar (base do polegar)
  ell(0.17, 0.1, 0.3, -0.38, -0.07, 0.52);              // eminência hipotenar

  /* dedos: 3 falanges com articulações */
  const fingerJoints: Record<string, { j: THREE.Group[]; tip: THREE.Object3D; base: THREE.Group }> = {};
  for (const f of FINGERS) {
    const base = new THREE.Group(); base.position.set(f.x, 0.01, f.z - 0.02); root.add(base);
    const joints: THREE.Group[] = [base];
    let parent: THREE.Object3D = base;
    for (let i = 0; i < 3; i++) {
      const r0 = f.r * (1 - i * 0.08), r1 = f.r * (1 - (i + 1) * 0.09);
      const seg = capsule(f.L[i]!, r0, r1, skin);
      parent.add(seg);
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.03, 14, 10), skin); knuckle.castShadow = true; parent.add(knuckle);
      if (i === 2) {
        const nail = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), nailM); nail.scale.set(r1 * 0.78, 0.018, f.L[2]! * 0.34); nail.position.set(0, r1 * 0.82, f.L[2]! * 0.62); nail.rotation.x = -0.08; parent.add(nail); disposables.push(nail.geometry);
        const pad = new THREE.Mesh(new THREE.SphereGeometry(r1 * 1.0, 12, 8), skin); pad.position.set(0, 0, f.L[2]!); pad.castShadow = true; parent.add(pad); disposables.push(pad.geometry);
      }
      disposables.push(seg.geometry, knuckle.geometry);
      const next = new THREE.Group(); next.position.set(0, 0, f.L[i]!); parent.add(next); joints.push(next); parent = next;
    }
    fingerJoints[f.name] = { j: joints, tip: parent, base };
  }

  /* polegar: metacarpo + 2 falanges */
  const th = new THREE.Group(); th.position.set(0.36, -0.07, 0.2); root.add(th);
  const thDir = new V(0.62, -0.22, 0.75).normalize();
  th.quaternion.setFromUnitVectors(new V(0, 0, 1), thDir);
  const thL = [0.46, 0.36, 0.3]; const thR = 0.115;
  const thJ: THREE.Group[] = [th]; let tp: THREE.Object3D = th;
  for (let i = 0; i < 3; i++) {
    const seg = capsule(thL[i]!, thR * (1 - i * 0.1), thR * (1 - (i + 1) * 0.11), skin); tp.add(seg);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(thR * (1 - i * 0.1) * 1.03, 14, 10), skin); kn.castShadow = true; tp.add(kn); disposables.push(seg.geometry, kn.geometry);
    if (i === 2) { const nail = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), nailM); nail.scale.set(thR * 0.7, 0.02, thL[2]! * 0.34); nail.position.set(0, thR * 0.72, thL[2]! * 0.62); tp.add(nail); const pad = new THREE.Mesh(new THREE.SphereGeometry(thR * 0.78, 12, 8), skin); pad.position.set(0, 0, thL[2]!); tp.add(pad); disposables.push(nail.geometry, pad.geometry); }
    const nx = new THREE.Group(); nx.position.set(0, 0, thL[i]!); tp.add(nx); thJ.push(nx); tp = nx;
  }
  const thumbTip = tp;

  /* antebraço, punho e manga: grupo próprio (gira do punho até o cotovelo apoiado na mesa) */
  const forearm = new THREE.Group();
  const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 3.0, 28), skin); fa.rotation.x = Math.PI / 2; fa.position.set(0, 0, 1.5); fa.castShadow = true; fa.receiveShadow = true; forearm.add(fa);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.42, 32), new THREE.MeshStandardMaterial({ color: opts.punho, roughness: 0.7 })); cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0, 0.5); cuff.castShadow = true; forearm.add(cuff);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.44, 2.4, 32), new THREE.MeshStandardMaterial({ color: opts.manga, roughness: 0.8 })); sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0, 1.95); sleeve.castShadow = true; sleeve.receiveShadow = true; forearm.add(sleeve);
  const sleeveEdge = new THREE.Mesh(new THREE.TorusGeometry(0.445, 0.035, 8, 32), new THREE.MeshStandardMaterial({ color: darken(opts.manga, 0.25), roughness: 0.7 })); sleeveEdge.position.set(0, 0, 0.76); forearm.add(sleeveEdge);
  disposables.push(fa.geometry, cuff.geometry, sleeve.geometry, sleeveEdge.geometry, cuff.material as THREE.Material, sleeve.material as THREE.Material, sleeveEdge.material as THREE.Material);

  /* caneta tinteiro (corpo, aro, clipe, pena) */
  const pen = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color: opts.corCaneta ?? "#1a2f9a", roughness: 0.18, metalness: 0.2 });
  const goldM = new THREE.MeshStandardMaterial({ color: opts.dourado ?? "#d9a62a", roughness: 0.25, metalness: 0.95 });
  const PL = 1.55, PR = 0.058;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR * 1.06, PL * 0.72, 24), bodyM); body.rotation.x = Math.PI / 2; body.position.z = PL * 0.36 + 0.2; body.castShadow = true; pen.add(body);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(PR * 0.78, PR * 1.0, 0.42, 24), bodyM); grip.rotation.x = Math.PI / 2; grip.position.z = 0.0 + 0.2 - 0.06; grip.castShadow = true; pen.add(grip);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(PR * 0.78, 0.2, 18), goldM); cone.rotation.x = -Math.PI / 2; cone.position.z = -0.17; cone.castShadow = true; pen.add(cone);
  const nib = new THREE.Mesh(new THREE.ConeGeometry(PR * 0.34, 0.2, 4), goldM); nib.rotation.x = -Math.PI / 2; nib.position.z = -0.37; nib.scale.set(1, 0.4, 1); nib.castShadow = true; pen.add(nib);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(PR * 1.06, 0.014, 8, 24), goldM); ring1.position.z = 0.43; pen.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(PR * 1.07, 0.014, 8, 24), goldM); ring2.position.z = PL * 0.72 + 0.12; pen.add(ring2);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.035, 0.52), goldM); clip.position.set(0, PR * 1.18, PL * 0.52 + 0.3); pen.add(clip);
  const endCap = new THREE.Mesh(new THREE.SphereGeometry(PR * 1.06, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), bodyM); endCap.rotation.x = Math.PI / 2; endCap.position.z = PL * 0.36 + 0.2 + PL * 0.36; pen.add(endCap);
  disposables.push(body.geometry, grip.geometry, cone.geometry, nib.geometry, ring1.geometry, ring2.geometry, clip.geometry, endCap.geometry, bodyM, goldM);
  const penTip = new THREE.Object3D(); penTip.position.set(0, 0, -0.47); pen.add(penTip);
  root.add(pen);

  /* posição da caneta na mão: ponta além do indicador, corpo repousando na prega entre polegar e indicador */
  const tipLocal = opts.tipLocal?.clone() ?? new V(0.56, -0.06, 1.46);
  const penDir = opts.penDirLocal?.clone().normalize() ?? new V(0.12, 0.42, -1.0).normalize();    // da ponta para o fim
  pen.position.copy(tipLocal).add(penDir.clone().multiplyScalar(0.47));
  pen.quaternion.setFromUnitVectors(new V(0, 0, 1), penDir);
  // a ponta da pena fica em z=-0.47 do pen; como o eixo +Z do pen aponta para o fim, a ponta está em tipLocal

  const penAt = (s: number) => tipLocal.clone().add(penDir.clone().multiplyScalar(s));

  /* ───── cinemática inversa (CCD) para cada dedo tocar a caneta ───── */
  root.updateMatrixWorld(true);
  const limit = (g: THREE.Group, lo: number, hi: number) => { g.rotation.x = Math.max(lo, Math.min(hi, g.rotation.x)); g.rotation.y = 0; g.rotation.z = 0; };
  const solve = (joints: THREE.Group[], tip: THREE.Object3D, target: THREE.Vector3, lim: Array<[number, number]>, iters = 24) => {
    for (let it = 0; it < iters; it++) {
      for (let k = joints.length - 1; k >= 0; k--) {
        root.updateMatrixWorld(true);
        const j = joints[k]!; const jw = new V(); j.getWorldPosition(jw);
        const tw = new V(); tip.getWorldPosition(tw);
        // trabalha no espaço local do pai da articulação, eixo X (flexão)
        const inv = new THREE.Matrix4().copy(j.parent!.matrixWorld).invert();
        const a = tw.clone().applyMatrix4(inv).sub(j.position), b = target.clone().applyMatrix4(inv).sub(j.position);
        const aa = Math.atan2(a.y, a.z), bb = Math.atan2(b.y, b.z);
        j.rotation.x += -(bb - aa) * 0.9; // ângulo no plano YZ; rotação positiva fecha o dedo para -Y
        limit(j, lim[k]![0], lim[k]![1]);
      }
    }
  };
  const world = (p: THREE.Vector3) => root.localToWorld(p.clone());
  const padOffset = 0.07;
  const contact: Record<string, number> = { indicador: 0.34, medio: 0.2 };
  const gripTargets: Record<string, THREE.Vector3> = {};
  gripTargets.indicador = world(penAt(contact.indicador!).add(new V(-(PR + padOffset - 0.0), 0.0, 0.0)));
  
  const fingerLim: Array<[number, number]> = [[0, 1.5], [0, 1.9], [0, 1.4]];
  const restAngles: Record<string, number[]> = { indicador: [0.12, 0.22, 0.14], medio: [0.2, 0.3, 0.2], anelar: [0.32, 0.4, 0.26], minimo: [0.42, 0.46, 0.3] };
  const gripAngles: Record<string, number[]> = {};
  for (const f of FINGERS) {
    const fj = fingerJoints[f.name]!;
    fj.j.slice(0, 3).forEach((g, i) => { g.rotation.set(0, 0, 0); void i; });
    if (gripTargets[f.name]) { solve(fj.j.slice(0, 3), fj.tip, gripTargets[f.name]!, fingerLim); }
    else { const a = f.name === "medio" ? [0.95, 1.25, 0.8] : f.name === "anelar" ? [1.1, 1.3, 0.8] : [1.2, 1.35, 0.8]; fj.j.slice(0, 3).forEach((g, i) => { g.rotation.set(a[i]!, 0, 0); }); }
    gripAngles[f.name] = fj.j.slice(0, 3).map((g) => g.rotation.x);
  }
  // polegar: base orientada à ponta de contato, depois ajusta as falanges
  const thumbTarget = world(penAt(0.36).add(new V(PR + 0.07, 0.0, -0.0)));
  const thumbBase = th.position.clone(); const toT = root.worldToLocal(thumbTarget.clone()).sub(thumbBase).normalize();
  th.quaternion.setFromUnitVectors(new V(0, 0, 1), toT.clone().lerp(thDir, 0.35).normalize());
  thJ.slice(0, 3).forEach((g, i) => { g.rotation.set(0, 0, 0); void i; });
  // flexão do polegar em torno de um eixo perpendicular ao plano base→alvo
  const thGrip: Array<[number, number, number]> = [];
  {
    for (let it = 0; it < 30; it++) for (let k = 2; k >= 1; k--) {
      root.updateMatrixWorld(true);
      const j = thJ[k]!; const tw = new V(); thumbTip.getWorldPosition(tw); const jw = new V(); j.getWorldPosition(jw);
      const a = tw.clone().sub(jw), b = thumbTarget.clone().sub(jw);
      const ang = a.angleTo(b);
      // 3D: gira em torno do eixo (a×b) no espaço local do pai
      const axis = new V().crossVectors(a, b).normalize(); if (!isFinite(axis.x)) continue;
      const inv = new THREE.Quaternion().copy(j.parent!.getWorldQuaternion(new THREE.Quaternion())).invert(); axis.applyQuaternion(inv);
      const q = new THREE.Quaternion().setFromAxisAngle(axis, Math.min(ang, 0.25) * 0.8);
      j.quaternion.premultiply(q);
    }
    thJ.slice(0, 3).forEach((g) => thGrip.push([g.rotation.x, g.rotation.y, g.rotation.z]));
  }
  const thQuatGrip = thJ.slice(0, 3).map((g) => g.quaternion.clone());
  const thBaseGrip = th.quaternion.clone();
  const thBaseRest = new THREE.Quaternion().setFromUnitVectors(new V(0, 0, 1), new V(0.7, -0.15, 0.7).normalize());

  const setGrip = (g: number) => {
    for (const f of FINGERS) {
      const fj = fingerJoints[f.name]!; const r = restAngles[f.name]!, gr = gripAngles[f.name]!;
      fj.j.slice(0, 3).forEach((j, i) => { j.rotation.set(r[i]! + (gr[i]! - r[i]!) * g, 0, 0); });
    }
    th.quaternion.slerpQuaternions(thBaseRest, thBaseGrip, g);
    thJ.slice(0, 3).forEach((j, i) => { j.quaternion.slerpQuaternions(new THREE.Quaternion(), thQuatGrip[i]!, g); });
  };
  setGrip(1);
  root.updateMatrixWorld(true);

  return {
    root, penTip, pen, forearm, setGrip, tipLocal, wristLocal: new V(0, 0, -0.1),
    dispose: () => { for (const d of disposables) d.dispose(); },
  };
}
