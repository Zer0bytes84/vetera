import { mkdtempSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  MAX_RESULT_BYTES,
  clientSource,
  createHarnessState,
  handleHarnessRequest,
  harnessEnabled,
  newJobId,
  testHarnessPlugin,
} from "../scripts/test-harness-plugin.mjs";

const folder = () => mkdtempSync(path.join(tmpdir(), "harness-"));

function request({ method = "GET", url = "/job", token, address = "127.0.0.1", body = [] }) {
  const req = Readable.from(body);
  req.method = method;
  req.url = url;
  req.headers = token === undefined ? {} : { "x-h-token": token };
  req.socket = { remoteAddress: address };
  return req;
}

function response() {
  const res = { statusCode: 0, headers: {}, body: undefined, finished: false };
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.end = (body) => { res.body = body; res.finished = true; };
  return res;
}

const call = async (state, options) => {
  const res = response();
  handleHarnessRequest(request(options), res, state);
  for (let i = 0; i < 50 && !res.finished; i += 1) await new Promise((r) => setTimeout(r, 5));
  return res;
};

describe("le pilote de test : quand il existe", () => {
  it("seulement avec la variable à 1, le serveur de développement et hors production", () => {
    expect(harnessEnabled("serve", { BAITARI_TEST_HARNESS: "1" })).toBe(true);
    expect(harnessEnabled("serve", {})).toBe(false);
    expect(harnessEnabled("serve", { BAITARI_TEST_HARNESS: "true" })).toBe(false);
    expect(harnessEnabled("serve", { BAITARI_TEST_HARNESS: "0" })).toBe(false);
    expect(harnessEnabled("build", { BAITARI_TEST_HARNESS: "1" })).toBe(false);
    expect(harnessEnabled("serve", { BAITARI_TEST_HARNESS: "1", NODE_ENV: "production" })).toBe(false);
  });

  it("ne donne aucun plugin, et ne crée aucun fichier, quand il n'est pas activé", () => {
    const dir = path.join(folder(), "h");
    expect(testHarnessPlugin("serve", {}, dir)).toEqual([]);
    expect(testHarnessPlugin("build", { BAITARI_TEST_HARNESS: "1" }, dir)).toEqual([]);
    expect(existsSync(dir)).toBe(false);
  });

  it("la configuration de Vite ne l'ajoute qu'à partir de la commande, jamais en dur", () => {
    const config = readFileSync("vite.config.ts", "utf8");
    expect(config).toContain("...testHarnessPlugin(command)");
    expect(config).not.toMatch(/BAITARI_TEST_HARNESS/);
  });

  it("ne vit que dans le serveur de développement (apply: serve)", () => {
    const [plugin] = testHarnessPlugin("serve", { BAITARI_TEST_HARNESS: "1" }, path.join(folder(), "h"));
    expect(plugin.apply).toBe("serve");
  });
});

describe("le pilote de test : qui peut lui parler", () => {
  it("tire un jeton neuf à chaque démarrage, lisible par son propriétaire seul", () => {
    const a = createHarnessState(path.join(folder(), "a"));
    const b = createHarnessState(path.join(folder(), "b"));
    expect(a.token).toMatch(/^[0-9a-f]{48}$/);
    expect(a.token).not.toBe(b.token);
    expect(statSync(path.join(a.dir, "token")).mode & 0o777).toBe(0o600);
    expect(readFileSync(path.join(a.dir, "token"), "utf8")).toBe(a.token);
  });

  it("efface les tâches et résultats d'un lancement précédent", () => {
    const dir = path.join(folder(), "h");
    const first = createHarnessState(dir);
    writeFileSync(path.join(first.jobs, "1.js"), "return 1");
    writeFileSync(path.join(first.results, "1.json"), "{}");
    const second = createHarnessState(dir);
    expect(readdirSync(second.jobs)).toEqual([]);
    expect(readdirSync(second.results)).toEqual([]);
  });

  it("refuse une machine voisine, même avec le bon jeton", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    for (const address of ["10.211.55.4", "100.104.170.73", "192.168.1.20", null]) {
      expect((await call(state, { token: state.token, address })).statusCode, String(address)).toBe(403);
    }
  });

  it("refuse la machine locale sans jeton ou avec un mauvais jeton", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    for (const token of [undefined, "", "faux", state.token.slice(0, -1), `${state.token}x`]) {
      expect((await call(state, { token })).statusCode, String(token)).toBe(403);
    }
  });

  it("accepte la machine locale, en IPv4 comme en IPv6, avec le jeton", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    for (const address of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
      expect((await call(state, { token: state.token, address })).statusCode, address).toBe(204);
    }
  });

  it("répond 404 à tout le reste", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    expect((await call(state, { token: state.token, url: "/autre" })).statusCode).toBe(404);
    expect((await call(state, { token: state.token, method: "DELETE", url: "/job" })).statusCode).toBe(404);
    expect((await call(state, { token: state.token, method: "POST", url: "/job" })).statusCode).toBe(404);
  });
});

describe("le pilote de test : la file de tâches", () => {
  it("rend la plus ancienne tâche d'abord, une seule fois, puis 204", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    writeFileSync(path.join(state.jobs, "12.js"), "return 12");
    writeFileSync(path.join(state.jobs, "3.js"), "return 3");
    const first = await call(state, { token: state.token });
    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toEqual({ id: "3", code: "return 3" });
    expect(JSON.parse((await call(state, { token: state.token })).body)).toEqual({ id: "12", code: "return 12" });
    expect((await call(state, { token: state.token })).statusCode).toBe(204);
    expect(readdirSync(state.jobs)).toEqual([]);
  });

  it("ignore tout fichier dont le nom n'est pas un numéro", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    for (const name of ["abc.js", "..js", ".5.tmp", "5.txt", "5.js.bak"]) writeFileSync(path.join(state.jobs, name), "return 1");
    expect((await call(state, { token: state.token })).statusCode).toBe(204);
  });

  it("enregistre le résultat sous le numéro de la tâche", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    const res = await call(state, { token: state.token, method: "POST", url: "/result?id=42", body: ['{"ok":true,"value":1}'] });
    expect(res.statusCode).toBe(200);
    expect(readFileSync(path.join(state.results, "42.json"), "utf8")).toBe('{"ok":true,"value":1}');
  });

  it("accepte les numéros que fabrique l'exécutable, aujourd'hui et pour longtemps", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    for (const id of [newJobId(), newJobId(Date.now() + 3e11), newJobId(0, 0.99)]) {
      expect(id.length, id).toBeLessThanOrEqual(15);
      const res = await call(state, { token: state.token, method: "POST", url: `/result?id=${id}`, body: ["{}"] });
      expect(res.statusCode, id).toBe(200);
    }
  });

  it("refuse un numéro qui tenterait de sortir du dossier, et n'écrit rien", async () => {
    const dir = path.join(folder(), "h");
    const state = createHarnessState(dir);
    for (const id of ["../../evil", "..%2F..%2Fevil", "1/../../x", "", "abc", "1234567890123456"]) {
      const res = await call(state, { token: state.token, method: "POST", url: `/result?id=${id}`, body: ["x"] });
      expect(res.statusCode, id).toBe(400);
    }
    expect((await call(state, { token: state.token, method: "POST", url: "/result", body: ["x"] })).statusCode).toBe(400);
    expect(readdirSync(state.results)).toEqual([]);
    expect(existsSync(path.join(dir, "..", "evil"))).toBe(false);
  });

  it("refuse un résultat plus gros que la limite", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    const big = Buffer.alloc(MAX_RESULT_BYTES + 1, 120);
    const res = await call(state, { token: state.token, method: "POST", url: "/result?id=7", body: [big.subarray(0, 1024 * 1024), big.subarray(1024 * 1024)] });
    expect(res.statusCode).toBe(413);
    expect(existsSync(path.join(state.results, "7.json"))).toBe(false);
  });

  it("note que la fenêtre répond, sans réécrire le fichier à chaque interrogation", async () => {
    const state = createHarnessState(path.join(folder(), "h"));
    const res = response();
    handleHarnessRequest(request({ token: state.token }), res, state, 10_000);
    expect(readFileSync(path.join(state.dir, "alive"), "utf8")).toBe("10000");
    handleHarnessRequest(request({ token: state.token }), response(), state, 10_500);
    expect(readFileSync(path.join(state.dir, "alive"), "utf8")).toBe("10000");
  });
});

describe("le pilote de test : le script injecté dans la page", () => {
  it("est du JavaScript valide et porte le jeton, échappé", () => {
    const source = clientSource('a"b\\c');
    expect(() => new Function(source)).not.toThrow();
    expect(source).toContain(JSON.stringify('a"b\\c'));
  });

  it("garde les erreurs de console et rend les aides promises", () => {
    const source = clientSource("t");
    for (const name of ["errors", "press", "setVal", "setFiles", "byText", "text", "toasts", "waitFor", "tauri"]) expect(source).toContain(`${name}:`);
    expect(source).toContain("unhandledrejection");
    expect(source).toContain("console.");
  });
});

/** Runs the injected script against a stand-in page and hands back its helpers. */
function pageWith({ elements = [], texts = {} } = {}) {
  const listeners = {};
  const logged = [];
  const dispatched = [];
  const win = { addEventListener: (name, fn) => { (listeners[name] ??= []).push(fn); }, __TAURI_INTERNALS__: undefined };
  const doc = {
    querySelectorAll: (selector) => elements.filter((e) => e.selector === selector),
    querySelector: (selector) => texts[selector] ?? null,
  };
  const fakeConsole = { error: (...a) => logged.push(["error", a]), warn: (...a) => logged.push(["warn", a]) };
  class FakeEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  const run = new Function("window", "document", "console", "fetch", "setTimeout", "HTMLInputElement", "HTMLTextAreaElement", "PointerEvent", "MouseEvent", "Event", "DataTransfer", clientSource("tok"));
  run(win, doc, fakeConsole, () => new Promise(() => {}), (fn) => 0, class {}, class {}, FakeEvent, FakeEvent, FakeEvent, class {});
  return { H: win.H, win, listeners, logged, dispatched, fakeConsole };
}
const element = (selector, innerText, label = "") => ({ selector, innerText, getAttribute: (n) => (n === "aria-label" ? label : null), dispatched: [], dispatchEvent(e) { this.dispatched.push(e.type); } });

describe("le pilote de test : les aides, exécutées pour de bon", () => {
  it("byText trouve par le texte ou par le libellé, et les ancres ^ $ veulent dire ce qu'elles disent", () => {
    const supprimer = element("[role='menuitem']", "  Supprimer ");
    const ouvrir = element("[role='menuitem']", "Ouvrir le lien");
    const icone = element("button", "", "Plus d’actions");
    const { H } = pageWith({ elements: [ouvrir, supprimer, icone] });
    expect(H.byText("[role='menuitem']", /^Supprimer$/)).toBe(supprimer);
    expect(H.byText("[role='menuitem']", /Ouvrir/)).toBe(ouvrir);
    expect(H.byText("button", /^Plus d’actions$/)).toBe(icone);
    expect(H.byText("[role='menuitem']", /^Supprimer le lien$/)).toBeUndefined();
  });

  it("press envoie toute la séquence d'un vrai clic, dans l'ordre", () => {
    const button = element("button", "ok");
    const { H } = pageWith();
    H.press(button);
    expect(button.dispatched).toEqual(["pointerdown", "mousedown", "pointerup", "mouseup", "click"]);
  });

  it("press et setVal disent clairement qu'un élément manque", () => {
    const { H } = pageWith();
    expect(() => H.press(undefined)).toThrow(/introuvable/);
    expect(() => H.setVal(null, "x")).toThrow(/introuvable/);
  });

  it("garde les erreurs et avertissements de console sans les avaler, les exceptions et les rejets aussi", () => {
    const { H, listeners, logged, fakeConsole } = pageWith();
    expect(H.errors()).toEqual([]);
    fakeConsole.error("boom", { a: 1 });
    fakeConsole.warn("attention");
    listeners.error[0]({ message: "oups", filename: "app.js", lineno: 7 });
    listeners.unhandledrejection[0]({ reason: new Error("rejet") });
    const seen = H.errors();
    expect(seen.map((e) => e.kind)).toEqual(["console.error", "console.warn", "window.error", "unhandledrejection"]);
    expect(seen[0].message).toContain("boom");
    expect(seen[0].message).toContain('"a":1');
    expect(seen[2].message).toContain("oups @ app.js:7");
    // the page's own console still receives everything
    expect(logged.map(([kind]) => kind)).toEqual(["error", "warn"]);
  });

  it("errors(true) vide le tampon, et le tampon ne grossit pas sans fin", () => {
    const { H, listeners } = pageWith();
    for (let i = 0; i < 350; i += 1) listeners.error[0]({ message: `e${i}`, filename: "f", lineno: i });
    const all = H.errors();
    expect(all).toHaveLength(200);
    expect(all[0].message).toContain("e150");
    expect(H.errors(true)).toHaveLength(200);
    expect(H.errors()).toEqual([]);
  });

  it("tauri() dit si la page tourne dans l'app de bureau", () => {
    const { H, win } = pageWith();
    expect(H.tauri()).toBe(false);
    win.__TAURI_INTERNALS__ = {};
    expect(H.tauri()).toBe(true);
  });
});
