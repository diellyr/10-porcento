import pkg from "../../package.json";

/** Versão do app (semver). Fonte única: `package.json`; o histórico fica em `version.md` (um teste garante que os dois batem). */
export const APP_VERSION: string = pkg.version;
