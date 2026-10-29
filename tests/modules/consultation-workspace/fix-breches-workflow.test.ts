import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closureBlocker, CLOSURE_NEEDS_NOTE } from "@/modules/consultation-workspace/consultation-closure";
import { reviewedSoapContent } from "@/modules/consultations/local-ai/soap-review";
import {
  levelFromRms,
  MICROPHONE_NO_ANSWER,
  prepareMicrophone,
} from "@/modules/consultations/local-ai/audio-capture";
import { DictationLevelMeter, MicrophonePermissionWait } from "@/modules/consultations/components/dictation-states";
import { consultationSummary, NO_REPORT } from "@/modules/patients/components/patient-timeline";
import type { ConsultationSoap } from "@/types/db";

const read = (path: string) => readFileSync(path, "utf8");
const sections = {
  subjective: "Se gratte l’oreille droite.",
  objective: "Cérumen brun abondant.",
  assessment: "Otite externe droite à Malassezia.",
  plan: "Nettoyage, gouttes auriculaires 10 jours.",
};
const soap = (reviewed: boolean): ConsultationSoap => ({
  id: "soap-1",
  appointmentId: "visite-1",
  patientId: "max",
  ...sections,
  content: reviewed ? reviewedSoapContent(sections, "{}", "vet-1") : "{}",
  aiDraft: null,
  aiConfidence: null,
  transcript: null,
  templateVersion: "local-ai-soap-1",
  createdAt: "2026-10-29T09:00:00Z",
  updatedAt: "2026-10-29T09:10:00Z",
});

describe("B1 · clôturer et facturer exige une note validée", () => {
  it("bloque sans note, ou avec une note non validée ; laisse passer une note validée", () => {
    expect(closureBlocker(null)).toBe(CLOSURE_NEEDS_NOTE);
    expect(closureBlocker(soap(false))).toBe(CLOSURE_NEEDS_NOTE);
    expect(closureBlocker({ ...soap(true), aiDraft: "{}" })).toBe(CLOSURE_NEEDS_NOTE);
    expect(closureBlocker(soap(true))).toBeNull();
  });

  it("le bouton et la clôture posent la même question, et le message mène à la note", () => {
    const dialog = read("src/modules/clinique/components/clinique-shared.tsx");
    expect(dialog).toMatch(/disabled=\{isSavingDraft \|\| isCompleting \|\| Boolean\(closingBlocker\)\}/);
    expect(dialog).toContain("Écrire la note");
    expect(dialog).toContain("Dicter la note");
    expect(dialog).toContain("OPEN_SOAP_ASSISTANT_EVENT");
    const session = read("src/modules/consultation-workspace/use-consultation-session.ts");
    expect(session).toMatch(/const blocker = closureBlocker\(soapsRepo\.forAppointment\(activeConsultation\.id\)\);\s+if \(blocker\) \{\s+toast\.error\(blocker\);\s+return;/);
    expect(session).toContain("closingBlocker,");
    expect(read("src/modules/consultation-workspace/consultation-workspace.tsx")).toContain("closingBlocker={closingBlocker}");
    expect(read("src/modules/consultations/components/soap-panel.tsx")).toContain("window.addEventListener(OPEN_SOAP_ASSISTANT_EVENT, open)");
  });
});

describe("B2 · états du panneau de dictée", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("une autorisation du micro sans réponse se termine par un message clair", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => new Promise(() => {}) } });
    const waiting = prepareMicrophone(new AbortController().signal, { permissionTimeoutMs: 30_000 });
    const outcome = expect(waiting).rejects.toThrow(MICROPHONE_NO_ANSWER);
    await vi.advanceTimersByTimeAsync(30_000);
    await outcome;
    expect(MICROPHONE_NO_ANSWER).toContain("Réglages Système → Confidentialité et sécurité → Microphone");
  });

  it("Annuler sort de l’attente, et un micro accordé trop tard est refermé", async () => {
    let grant: (stream: unknown) => void = () => {};
    const stop = vi.fn();
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: () => new Promise((resolve) => (grant = resolve)) },
    });
    const controller = new AbortController();
    const waiting = prepareMicrophone(controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    grant({ getTracks: () => [{ stop }] });
    await Promise.resolve();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("l’attente du micro propose toujours Annuler", () => {
    const html = renderToStaticMarkup(React.createElement(MicrophonePermissionWait, { onCancel: () => {} }));
    expect(html).toContain("Autorisation du microphone…");
    expect(html).toContain("Annuler");
  });

  it("le niveau suit la voix et retombe dans le silence", () => {
    expect(levelFromRms(0)).toBe(0);
    expect(levelFromRms(0.0005)).toBe(0); // pièce calme, environ -66 dBFS
    expect(levelFromRms(0.01)).toBeGreaterThan(0.2); // voix posée à distance
    expect(levelFromRms(0.2)).toBe(1); // voix proche, environ -14 dBFS
    const html = renderToStaticMarkup(React.createElement(DictationLevelMeter, { read: () => 0 }));
    expect(html).toContain('role="img"');
    expect(html.match(/--bar:/g)).toHaveLength(5);
    expect(read("src/modules/consultations/components/local-consultation-assistant.tsx")).toContain("<DictationLevelMeter read={ai.readLevel} />");
  });
});

describe("B3 · la Chronologie lit la note validée, comme la Synthèse", () => {
  const visit = { diagnosis: undefined, treatment: undefined, notes: undefined };

  it("une note validée apparaît dans la Chronologie, avec la même évaluation que la Synthèse", () => {
    const row = consultationSummary(visit, soap(true));
    expect(row.summary).toBe(sections.assessment);
    expect(row.summaryDetail).toBe(`Plan · ${sections.plan}`);
    // The Synthèse shows the same field of the same note.
    expect(read("src/modules/patients/components/patient-overview.tsx")).toContain("excerpt(lastSoap?.assessment)");
    expect(read("src/modules/patients/components/patient-timeline.tsx")).toContain("soapsRepo.forAppointment");
  });

  it("« non renseigné » seulement sans aucune note ; une note non validée est dite telle", () => {
    expect(consultationSummary(visit, null).summary).toBe(NO_REPORT);
    expect(consultationSummary({ ...visit, diagnosis: "Otite" }, null).summary).toBe("Otite");
    expect(consultationSummary(visit, soap(false)).summaryDetail).toContain("Note non validée");
  });
});
