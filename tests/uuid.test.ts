import { webcrypto } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { createUuid } from "../src/lib/uuid";
afterEach(() => vi.unstubAllGlobals());
it("utilise l’UUID natif quand il est disponible", () => {
  const randomUUID = vi.fn(() => "cce3999b-9a81-43f5-9c75-673482a44ace");
  vi.stubGlobal("crypto", { randomUUID });
  expect(createUuid()).toBe("cce3999b-9a81-43f5-9c75-673482a44ace");
  expect(randomUUID).toHaveBeenCalledOnce();
});
it("génère des UUID v4 uniques sans randomUUID, avec une source cryptographique", () => {
  vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  const ids = Array.from({ length: 1000 }, createUuid);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
it("refuse de remplacer l’aléatoire sécurisé par Math.random", () => {
  vi.stubGlobal("crypto", undefined);
  expect(createUuid).toThrow("génération sécurisée");
});
