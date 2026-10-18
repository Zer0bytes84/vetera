import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getBrowserTable, replaceBrowserTable, runBrowserTablesTransaction } from "@/services/browser-store";
import { browserDocumentDatabase, createDocumentStore } from "@/modules/documents/document-store";
import { reviewedSoapContent } from "@/modules/consultations/local-ai/soap-review";

const date = "2026-10-17T12:00:00.000Z";
const fields = { subjective: "Contrôle annuel.", objective: "Examen consigné.", assessment: "Évaluation du vétérinaire.", plan: "Contrôle dans un an." };
let sequence = 0;
const operation = <T,>(fn: Parameters<typeof runBrowserTablesTransaction<T>>[0]) => runBrowserTablesTransaction(fn);
function service() {
  const transact: Parameters<typeof createDocumentStore>[0]["transaction"] = (fn) => operation(tables => fn(browserDocumentDatabase(tables)));
  return createDocumentStore({ read: transact, transaction: transact }, () => `browser-document-${++sequence}`, () => new Date(date), { sessionToken: () => "session-token" });
}
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  sequence = 0;
  replaceBrowserTable("users", [{ id: "vet", displayName: "Dr Lina", role: "admin", status: "active" }]);
  replaceBrowserTable("sessions", [{ id: "session", userId: "vet", token: "session-token", expiresAt: "2099-01-01T12:00:00Z" }]);
  replaceBrowserTable("patients", [{ id: "rex", name: "Rex", species: "Chien", ownerId: "owner" }]);
  replaceBrowserTable("owners", [{ id: "owner", firstName: "Lina", lastName: "Martin", phone: "000" }]);
  replaceBrowserTable("appointments", [{ id: "visit", patientId: "rex", vetId: "vet", status: "completed", startTime: date }]);
  replaceBrowserTable("consultation_soaps", [{ id: "soap", patientId: "rex", appointmentId: "visit", ...fields, content: reviewedSoapContent(fields, "{}", "vet") }]);
});
afterEach(() => vi.unstubAllGlobals());

it("génère, finalise et relit un document dans le stockage navigateur sans appeler le pont Tauri", async () => {
  const store = service();
  expect(await store.listTemplates()).toHaveLength(4);
  const prepared = await store.prepare("visit", "rex", "document-report", "vet");
  expect(await store.list("rex")).toEqual([]);
  const draft = await store.createDraft(prepared, prepared, "vet", true);
  const final = await store.finalize(draft.id, "vet", "data:application/pdf;filename=generated.pdf;base64,JVBERi0xLjQK", true, draft.updatedAt);
  expect(final.status).toBe("finalise");
  expect((await service().get(final.id)).content).toContain(fields.plan);
  await expect(store.updateDraft(final.id, { title: final.title, content: "Erreur" }, "vet", final.updatedAt)).rejects.toThrow("verrouillé");
  expect((await store.history(final.id)).map(event => event.action)).toEqual(["creation", "finalisation"]);
});

it("annule une écriture partielle et conserve les anciennes notes et réglages du navigateur", async () => {
  replaceBrowserTable("notes", [{ id: "note", title: "Note historique", content: "Conserver" }]);
  await expect(runBrowserTablesTransaction(async tables => {
    tables.notes = [];
    throw new Error("Quota simulé avant validation");
  })).rejects.toThrow("Quota");
  expect(getBrowserTable("notes")).toEqual([{ id: "note", title: "Note historique", content: "Conserver" }]);
  const store = service();
  await store.listTemplates();
  await store.deleteTemplate("document-certificate", "vet");
  expect((await service().listTemplates()).some(template => template.id === "document-certificate")).toBe(false);
});
