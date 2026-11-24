import fs from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const arq = process.argv[2];
const b = fs.readFileSync(arq); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
new GLTFLoader().parse(ab, "", (g) => {
  let malhas = 0, morf = 0; g.scene.traverse((o) => { if (o.isMesh) { malhas++; if (o.morphTargetDictionary) morf++; } });
  console.log("OK", arq, "malhas", malhas, "com morph", morf, "animações", g.animations.length);
}, (e) => console.log("ERRO", arq, String(e?.message ?? e).slice(0, 500)));
