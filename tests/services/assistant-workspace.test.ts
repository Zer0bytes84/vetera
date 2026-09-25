import { describe, expect, it } from "vitest";
import {
  buildAssistantDocument,
  escapeAssistantHtml,
  waitForAssistant,
  type AssistantRecord,
} from "@/services/assistantWorkspace";

const record: AssistantRecord = {
  patient: {
    id: "p1",
    name: "Maya",
    ownerId: "o1",
    species: "Chat",
    sex: "F",
    status: "sante",
    createdAt: "2026-09-01",
  },
  soaps: [],
  appointments: [],
  vaccinations: [],
};

describe("assistant documents", () => {
  it("marks missing medical information instead of inventing normal findings", () => {
    const output = buildAssistantDocument("summary", record);
    expect(output).toContain("Allergies : Non renseigné");
    expect(output).toContain("Aucune pesée enregistrée");
    expect(output).not.toContain("aucune connue");
  });
  it("excludes data belonging to another patient", () => {
    const output = buildAssistantDocument("summary", {
      ...record,
      soaps: [
        {
          patientId: "p2",
          updatedAt: "2026-09-20",
          assessment: "SECRET",
        } as any,
      ],
      vaccinations: [{ patientId: "p2", vaccineName: "SECRET" } as any],
      weight: { patientId: "p2", weightKg: 999 } as any,
    });
    expect(output).not.toContain("SECRET");
    expect(output).not.toContain("999");
  });
  it("uses the latest SOAP and identifies it as an existing document", () => {
    const output = buildAssistantDocument("soap", {
      ...record,
      soaps: [
        { patientId: "p1", updatedAt: "2026-09-01", assessment: "Ancien" },
        { patientId: "p1", updatedAt: "2026-09-20", assessment: "Récent" },
      ] as any,
    });
    expect(output).toContain("Reprise du dernier SOAP");
    expect(output).toContain("Récent");
    expect(output).not.toContain("Ancien");
  });
  it("lists only future, non-cancelled visits of this patient", () => {
    const appointments = [
      {
        patientId: "p1",
        title: "Prochain",
        startTime: "2026-10-02T10:00:00Z",
        status: "scheduled",
      },
      {
        patientId: "p1",
        title: "Annulé",
        startTime: "2026-10-02T10:00:00Z",
        status: "cancelled",
      },
      {
        patientId: "p2",
        title: "Autre",
        startTime: "2026-10-02T10:00:00Z",
        status: "scheduled",
      },
      {
        patientId: "p1",
        title: "Passé",
        startTime: "2026-08-02T10:00:00Z",
        status: "scheduled",
      },
    ] as any;
    const output = buildAssistantDocument(
      "appointments",
      { ...record, appointments },
      new Date("2026-09-21T10:00:00Z")
    );
    expect(output).toContain("Prochain");
    for (const excluded of ["Annulé", "Autre", "Passé"])
      expect(output).not.toContain(excluded);
  });
  it("never claims the message was sent", () => {
    expect(buildAssistantDocument("email", record)).toContain(
      "Ce message n’a pas été envoyé."
    );
  });
  it("escapes HTML before saving a note", () => {
    expect(escapeAssistantHtml('<img src=x onerror="alert(1)">&')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;"
    );
  });
  it("stops waiting immediately without requiring the model download to finish", async () => {
    const controller = new AbortController();
    const waiting = waitForAssistant(new Promise(() => {}), controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
  });
  it("propagates download failures", async () => {
    await expect(
      waitForAssistant(
        Promise.reject(new Error("download failed")),
        new AbortController().signal
      )
    ).rejects.toThrow("download failed");
  });
});
