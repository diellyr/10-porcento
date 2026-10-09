import { describe, expect, it } from "vitest";
import { porExtenso, speechText } from "@/game/audio/speech";

describe("texto para voz (pt-BR)", () => {
  it("números por extenso", () => {
    expect(porExtenso(0)).toBe("zero");
    expect(porExtenso(21)).toBe("vinte e um");
    expect(porExtenso(100)).toBe("cem");
    expect(porExtenso(130)).toBe("cento e trinta");
    expect(porExtenso(1000)).toBe("mil");
    expect(porExtenso(2150)).toBe("dois mil cento e cinquenta");
    expect(porExtenso(1_200_000)).toBe("um milhão e duzentos mil");
  });
  it("valores, percentuais, horas e siglas", () => {
    expect(speechText("R$ 130 mil")).toBe("cento e trinta mil de reais".replace(" de reais", " reais"));
    expect(speechText("R$ 1,4 milhão")).toBe("um vírgula quatro milhão de reais");
    expect(speechText("R$ 24 milhões")).toBe("vinte e quatro milhões de reais");
    expect(speechText("6,5%")).toBe("seis vírgula cinco por cento");
    expect(speechText("às 3h")).toBe("às três horas");
    expect(speechText("94 min")).toBe("noventa e quatro minutos");
    expect(speechText("A UPA e o CNPJ")).toBe("A Upa e o C N P J");
    expect(speechText("R$ 93.600,00")).toBe("noventa e três mil e seiscentos reais");
  });
});
