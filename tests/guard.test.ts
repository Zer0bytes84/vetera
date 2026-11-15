import { describe, expect, it } from "vitest";
import { guard, guardSync } from "../src/lib/guard";

/** Les deux formes doivent se comporter exactement comme l'instruction try d'origine. */
describe("guard / guardSync : la sémantique de try … catch … finally", () => {
  it("rend la valeur de run et exécute cleanup après elle", async () => {
    const log: string[] = [];
    const value = await guard(async () => { log.push("run"); return 7; }, { cleanup: () => { log.push("cleanup"); } });
    expect(value).toBe(7);
    expect(log).toEqual(["run", "cleanup"]);
  });

  it("transmet l'erreur de run à recover et rend sa valeur, puis cleanup", async () => {
    const log: string[] = [];
    const value = await guard<number, string>(async () => { throw new Error("boom"); }, {
      recover: (error) => { log.push(`recover:${(error as Error).message}`); return "rattrapé"; },
      cleanup: () => { log.push("cleanup"); },
    });
    expect(value).toBe("rattrapé");
    expect(log).toEqual(["recover:boom", "cleanup"]);
  });

  it("sans recover, relance l'erreur telle quelle, après cleanup (try … finally)", async () => {
    const log: string[] = [];
    const error = new Error("telle quelle");
    await expect(guard(async () => { throw error; }, { cleanup: () => { log.push("cleanup"); } })).rejects.toBe(error);
    expect(log).toEqual(["cleanup"]);
  });

  it("une erreur levée par recover se propage, et cleanup s'exécute quand même", async () => {
    const log: string[] = [];
    const second = new Error("dans le catch");
    await expect(guard(async () => { throw new Error("première"); }, { recover: () => { throw second; }, cleanup: () => { log.push("cleanup"); } })).rejects.toBe(second);
    expect(log).toEqual(["cleanup"]);
  });

  it("une erreur levée par cleanup se propage", async () => {
    const third = new Error("dans le finally");
    await expect(guard(async () => 1, { cleanup: () => { throw third; } })).rejects.toBe(third);
  });

  it("attend un recover et un cleanup asynchrones avant de rendre la main", async () => {
    const log: string[] = [];
    await guard(async () => { throw new Error("x"); }, {
      recover: async () => { await Promise.resolve(); log.push("recover"); },
      cleanup: async () => { await Promise.resolve(); await Promise.resolve(); log.push("cleanup"); },
    });
    expect(log).toEqual(["recover", "cleanup"]);
  });

  it("un throw dans le bloc est rattrapé par le recover du même appel", async () => {
    const value = await guard<never, string>(() => { throw new Error("lancé dans le try"); }, { recover: (e) => `catch:${(e as Error).message}` });
    expect(value).toBe("catch:lancé dans le try");
  });

  it("une valeur non erreur lancée est transmise intacte", async () => {
    const seen: unknown[] = [];
    await guard(() => { throw "texte"; }, { recover: (e) => { seen.push(e); } });
    expect(seen).toEqual(["texte"]);
  });

  it("guardSync s'exécute de façon synchrone, dans le même ordre", () => {
    const log: string[] = [];
    const value = guardSync(() => { log.push("run"); throw new Error("s"); }, { recover: () => { log.push("recover"); return "ok"; }, cleanup: () => { log.push("cleanup"); } });
    log.push("après");
    expect(value).toBe("ok");
    expect(log).toEqual(["run", "recover", "cleanup", "après"]);
  });

  it("guardSync sans recover relance après cleanup", () => {
    const log: string[] = [];
    expect(() => guardSync(() => { throw new Error("s"); }, { cleanup: () => { log.push("cleanup"); } })).toThrow("s");
    expect(log).toEqual(["cleanup"]);
  });

  it("le cleanup de guard s'exécute avant que l'appelant ne reprenne (comme un finally en ligne)", async () => {
    let busy = true;
    const observed: boolean[] = [];
    await guard(async () => { await Promise.resolve(); }, { cleanup: () => { busy = false; } });
    observed.push(busy);
    expect(observed).toEqual([false]);
  });
});
