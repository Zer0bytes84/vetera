import { beforeEach, describe, expect, it, vi } from "vitest";

const created: FakeSession[] = [];
class FakeSession {
  isClosed = false;
  park = vi.fn();
  resume = vi.fn();
  close = vi.fn(() => {
    this.isClosed = true;
  });
}
vi.mock("@/modules/consultations/local-ai/inference-client", () => ({
  LocalInferenceSession: {
    create: vi.fn(async () => {
      const session = new FakeSession();
      created.push(session);
      return session;
    }),
  },
}));

const load = () => import("@/modules/consultations/local-ai/whisper-session");
const signal = new AbortController().signal;

describe("dictée : modèle gardé entre deux rubriques", () => {
  beforeEach(async () => {
    (await load()).releaseWhisperSession();
    created.length = 0;
  });

  it("la première dictée charge le modèle, la suivante reprend la même session sans recharger", async () => {
    const { takeWhisperSession, parkWhisperSession } = await load();
    const first = await takeWhisperSession("medium#4", signal, () => {});
    expect(first.loaded).toBe(false);
    parkWhisperSession(first.session as never, "medium#4");
    expect(created[0].park).toHaveBeenCalledOnce();
    const second = await takeWhisperSession("medium#4", signal, () => {});
    expect(second.loaded).toBe(true);
    expect(second.session).toBe(first.session);
    expect(created).toHaveLength(1);
  });

  it("un autre modèle ou d'autres threads ferment la session gardée", async () => {
    const { takeWhisperSession, parkWhisperSession } = await load();
    const first = await takeWhisperSession("medium#4", signal, () => {});
    parkWhisperSession(first.session as never, "medium#4");
    const other = await takeWhisperSession("small#4", signal, () => {});
    expect(other.loaded).toBe(false);
    expect(created[0].close).toHaveBeenCalled();
  });

  it("la fermeture de l'assistant libère le modèle gardé", async () => {
    const { takeWhisperSession, parkWhisperSession, releaseWhisperSession } = await load();
    const first = await takeWhisperSession("medium#4", signal, () => {});
    parkWhisperSession(first.session as never, "medium#4");
    releaseWhisperSession();
    expect(created[0].close).toHaveBeenCalled();
    expect((await takeWhisperSession("medium#4", signal, () => {})).loaded).toBe(false);
  });
});
