import { describe, expect, it } from "vitest";
import { linkCompartilhavel } from "@/components/ShareLink";

describe("linkCompartilhavel", () => {
  it("mantém página e destino (next)", () => {
    expect(linkCompartilhavel("https://ex.com/entrar?next=%2Fjogo")).toBe("https://ex.com/entrar?next=%2Fjogo");
  });
  it("remove tokens de recuperação de senha e códigos de login", () => {
    const l = linkCompartilhavel("https://ex.com/entrar?code=abc&token_hash=x&type=recovery&next=/jogo#access_token=SEGREDO&refresh_token=R");
    expect(l).toBe("https://ex.com/entrar?next=%2Fjogo");
    expect(l).not.toMatch(/SEGREDO|code=|token/);
  });
  it("página sem parâmetros fica só com origem e caminho", () => {
    expect(linkCompartilhavel("https://ex.com/login?setup=1")).toBe("https://ex.com/login");
  });
});
