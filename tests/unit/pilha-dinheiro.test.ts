import { describe, expect, it } from "vitest";
import { posicoesDaPilha } from "@/game/ui/three/blender";

describe("posicoesDaPilha", () => {
  it("gera exatamente n posições para qualquer n (sem laço infinito acima de 21)", () => {
    for (const n of [0, 1, 6, 21, 22, 40, 120]) expect(posicoesDaPilha(n)).toHaveLength(n);
  });
  it("cada camada fica acima da anterior", () => {
    const ps = posicoesDaPilha(40);
    expect(ps[39]![1]).toBeGreaterThan(ps[0]![1]);
  });
});
