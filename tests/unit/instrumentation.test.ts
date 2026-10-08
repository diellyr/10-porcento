import { describe, expect, it, vi } from "vitest";

describe("pré-aquecimento do servidor (instrumentation)", () => {
  it("registra as fontes e dispara a carga do cadastro fora da renderização; falhas não derrubam o servidor", async () => {
    vi.resetModules();
    const ensureRegistry = vi.fn(async () => undefined);
    const ensure = vi.fn(async () => { throw new Error("sem rede"); });
    vi.doMock("@/server/container", () => ({ container: () => ({ router: { ensureRegistry, catalog: { ensure } } }) }));
    vi.doMock("./server/container", () => ({ container: () => ({ router: { ensureRegistry, catalog: { ensure } } }) }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { warmUp } = await import("../../src/instrumentation-node");
    await expect(warmUp()).resolves.toBeUndefined();
    await new Promise((r) => setTimeout(r, 10));
    expect(ensureRegistry).toHaveBeenCalledTimes(1);
    expect(ensure).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("pré-carga do cadastro adiada"), "sem rede");
    warn.mockRestore();
  });
  it("sem configuração do Supabase, o pré-aquecimento é ignorado (não lança)", async () => {
    vi.resetModules();
    vi.doMock("@/server/container", () => ({ container: () => { throw new Error("SUPABASE_URL não configurada"); } }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { warmUp } = await import("../../src/instrumentation-node");
    await expect(warmUp()).resolves.toBeUndefined();
    warn.mockRestore();
  });
  it("o ponto de entrada só carrega o código Node no runtime nodejs", async () => {
    vi.resetModules();
    const warmUp = vi.fn(async () => undefined);
    vi.doMock("@/instrumentation-node", () => ({ warmUp }));
    const { register } = await import("../../src/instrumentation");
    process.env.NEXT_RUNTIME = "edge";
    await register();
    expect(warmUp).not.toHaveBeenCalled();
    process.env.NEXT_RUNTIME = "nodejs";
    await register();
    expect(warmUp).toHaveBeenCalledTimes(1);
    delete process.env.NEXT_RUNTIME;
  });
});
