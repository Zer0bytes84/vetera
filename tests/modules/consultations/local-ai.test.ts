import { afterEach, describe, expect, it, vi } from "vitest";
import type { Appointment, ConsultationSoap, Patient } from "@/types/db";
import {
  assertMentionsForPatient,
  autocompleteMention,
  insertPatientMention,
  normalizeSpokenMentions,
  parsePatientMentions,
  resolvePatientMentions,
} from "@/modules/consultations/local-ai/patient-mentions";
import {
  buildPatientContext,
  createSoapPrompt,
} from "@/modules/consultations/local-ai/patient-context";
import {
  containsDosage,
  localSoapSchema,
  parseGeneratedSoap,
} from "@/modules/consultations/local-ai/soap-schema";
import {
  assertLocalUrl,
  enforceOfflineWorker,
} from "@/modules/consultations/local-ai/offline-policy";
import {
  assertChatModelAvailable,
  isClinicalModelReserved,
  reserveClinicalModel,
} from "@/modules/consultations/local-ai/model-lease";
import {
  prepareMicrophone,
  resampleAudio,
  normalizeMicrophoneAudio,
} from "@/modules/consultations/local-ai/audio-capture";

const patient = (id: string, name: string): Patient => ({
  id,
  name,
  ownerId: `owner-${id}`,
  species: "Chien",
  sex: "M",
  status: "sante",
  createdAt: "2026-01-01",
});
const rex = patient("rex-1", "Rex");
const appointment = (
  id: string,
  startTime: string,
  patientId = rex.id
): Appointment => ({
  id,
  patientId,
  startTime,
  endTime: startTime,
  ownerId: rex.ownerId,
  vetId: "vet",
  status: "completed",
  type: "consultation",
  createdAt: startTime,
});
const soap = (id: string): ConsultationSoap => ({
  id,
  appointmentId: id,
  patientId: rex.id,
  subjective: "Toux",
  objective: "Température 38,5 °C",
  assessment: "À confirmer",
  plan: "Contrôle dans 7 jours",
  transcript: null,
  aiDraft: null,
  aiConfidence: null,
  content: "{}",
  templateVersion: "1.0",
  createdAt: "2026-01-01",
  updatedAt: "2026-10-07",
});
const validNote = {
  subjective: "Toux depuis hier",
  objective: "Température 38,5 °C",
  assessment: "Évaluation à confirmer",
  plan: "Contrôle dans 7 jours",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("deterministic patient mentions", () => {
  it("parses Unicode, quoted multiword names and ignores emails", () => {
    expect(
      parsePatientMentions(
        'mail@exemple.fr, @Rex puis @"Étoile du Nord" et @Milo.'
      ).map((m) => m.name)
    ).toEqual(["Rex", "Étoile du Nord", "Milo"]);
  });
  it("normalizes spoken arobase without an AI call", () =>
    expect(normalizeSpokenMentions("Pour arobase Rex, toux.")).toBe(
      "Pour @Rex, toux."
    ));
  it("recognizes the spoken spelling arobas without changing other words", () => {
    expect(normalizeSpokenMentions("Pour Arobas Rex, il tousse.")).toBe(
      "Pour @Rex, il tousse."
    );
    expect(normalizeSpokenMentions("arobasque Rex, mail@exemple.fr")).toBe(
      "arobasque Rex, mail@exemple.fr"
    );
  });
  it("never silently picks one of two namesakes", () => {
    const patients = [rex, patient("rex-2", "Rex")];
    expect(resolvePatientMentions("@Rex", patients)[0].patient).toBeNull();
    expect(() => assertMentionsForPatient("@Rex", patients, rex.id)).toThrow(
      "Plusieurs"
    );
    expect(
      assertMentionsForPatient("@Rex", patients, rex.id, { rex: rex.id })[0]
        .patient?.id
    ).toBe(rex.id);
  });
  it("rejects wrong-patient, unknown and stale choice references", () => {
    expect(() =>
      assertMentionsForPatient("@Milo", [rex, patient("milo", "Milo")], rex.id)
    ).toThrow("autre patient");
    expect(() => assertMentionsForPatient("@Rexx", [rex], rex.id)).toThrow(
      "introuvable"
    );
    expect(
      resolvePatientMentions("@Rex", [rex, patient("rex-2", "Rex")], {
        rex: "deleted",
      })[0].patient
    ).toBeNull();
  });
  it("matches accents/case but preserves ambiguities", () => {
    expect(
      resolvePatientMentions("@ETOILE", [patient("a", "Étoile")])[0].patient?.id
    ).toBe("a");
    expect(
      resolvePatientMentions("@ETOILE", [
        patient("a", "Étoile"),
        patient("b", "Etoile"),
      ])[0].patient
    ).toBeNull();
  });
  it("replaces only the mention at the cursor, quoting spaces", () => {
    const text = "Pour @Re ce matin";
    const range = autocompleteMention(text, 8)!;
    expect(insertPatientMention(text, range, "Rex Junior").value).toBe(
      'Pour @"Rex Junior"  ce matin'
    );
    expect(autocompleteMention("contact@mail", 12)).toBeNull();
  });
});
describe("patient context and SOAP schema", () => {
  it("takes the last three clinical dates, excluding current/future/other patient", () => {
    const rows = [
      appointment("current", "2026-10-07T10:00:00"),
      appointment("old", "2026-01-01"),
      appointment("a", "2026-02-01"),
      appointment("b", "2026-03-01"),
      appointment("c", "2026-04-01"),
      appointment("future", "2027-01-01"),
      appointment("other", "2026-05-01", "other"),
    ];
    const context = buildPatientContext(
      { ...rex, allergies: "Pénicilline", chronicConditions: "Cardiopathie" },
      rows,
      rows.map((row) => soap(row.id)),
      "current"
    );
    expect(context.dernieresConsultations.map((row) => row.date)).toEqual([
      "2026-04-01",
      "2026-03-01",
      "2026-02-01",
    ]);
    expect(context.patient.allergies).toBe("Pénicilline");
    expect(JSON.stringify(context)).not.toContain(rex.ownerId);
  });
  it("refuses missing or mismatched appointment bindings", () => {
    expect(() => buildPatientContext(rex, [], [], "missing")).toThrow(
      "consultation"
    );
    expect(() =>
      buildPatientContext(
        rex,
        [appointment("x", "2026-01-01", "other")],
        [],
        "x"
      )
    ).toThrow("patient");
  });
  it("removes historic dosages from model context and bounds prompt input", () => {
    const old = {
      ...soap("old"),
      plan: "Administrer 5 mg/kg. Contrôle dans 7 jours.",
    };
    const context = buildPatientContext(
      rex,
      [appointment("current", "2026-10-07"), appointment("old", "2026-01-01")],
      [old],
      "current"
    );
    expect(context.dernieresConsultations[0].plan).toBe(
      "Contrôle dans 7 jours."
    );
    const prompt = createSoapPrompt("Toux depuis hier", context);
    expect(prompt).toContain('"dictee":"Toux depuis hier"');
    expect(prompt).toContain("Interdiction absolue de calculer");
    expect(() => createSoapPrompt("a".repeat(6001), context)).toThrow(
      "trop longue"
    );
  });
  it("accepts exactly four JSON strings, preserves measured values and follow-up dates", () => {
    expect(
      parseGeneratedSoap(`\`\`\`json\n${JSON.stringify(validNote)}\n\`\`\``)
    ).toEqual(validNote);
    expect(
      localSoapSchema.safeParse({ ...validNote, objective: 38.5 }).success
    ).toBe(false);
    expect(() =>
      parseGeneratedSoap(JSON.stringify({ ...validNote, medications: [] }))
    ).toThrow("sections SOAP");
    expect(() =>
      parseGeneratedSoap("<analysis>" + JSON.stringify(validNote))
    ).toThrow("JSON SOAP");
    expect(() =>
      parseGeneratedSoap(
        JSON.stringify({
          subjective: "",
          objective: "",
          assessment: "",
          plan: "",
        })
      )
    ).toThrow();
  });
  it.each([
    "Administrer 5 mg/kg",
    "Donner 0,5 mL",
    "Dose : deux comprimés",
    "Administrer deux fois par jour",
    "Posologie calculée par multiplication de la dose",
    "Injecter 3 milligrammes",
    "5 UI/kg",
    "Amoxicilline : un comprimé matin et soir",
    "½ gélule",
    "1/2 comprimé",
    "vingt milligrammes",
    "six fois par jour",
  ])("rejects model dosage: %s", (text) => {
    expect(containsDosage(text)).toBe(true);
    expect(() =>
      parseGeneratedSoap(JSON.stringify({ ...validNote, plan: text }))
    ).toThrow("posologie");
  });
  it("allows human edits through the review schema without any LLM dose calculation", () =>
    expect(
      localSoapSchema.safeParse({
        ...validNote,
        plan: "Posologie saisie par le vétérinaire : 5 mg/kg",
      }).success
    ).toBe(true));
});
describe("dosage guard word boundaries", () => {
  it("does not confuse a word containing un or cent with an administration quantity", () => {
    expect(containsDosage("Traitement : aucun actuellement.")).toBe(false);
    expect(
      containsDosage("Prescription : aucune. Contrôle dans sept jours.")
    ).toBe(false);
    expect(containsDosage("Injection : aucune pour le moment.")).toBe(false);
  });
});
describe("offline runtime and exclusive model lease", () => {
  const roots = [
    "http://127.0.0.1:5180/local-ai-runtime/",
    "asset://localhost/models/",
  ];
  it("rejects CDN/cloud/nearby-root URLs and traversal", () => {
    expect(() =>
      assertLocalUrl("asset://localhost/models/whisper/config.json", roots)
    ).not.toThrow();
    for (const url of [
      "https://huggingface.co/model",
      "http://127.0.0.1:5180/patients",
      "asset://localhost/models-evil/test",
      "asset://localhost/models/%2e%2e/private",
    ])
      expect(() => assertLocalUrl(url, roots)).toThrow();
  });
  it("blocks fetch before transmission and disables redirects", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ url: "asset://localhost/models/config.json" });
    vi.stubGlobal("fetch", fetch);
    class XHR {
      open() {}
    }
    vi.stubGlobal("XMLHttpRequest", XHR);
    enforceOfflineWorker(roots);
    await expect(
      globalThis.fetch("https://cloud.invalid/clinical")
    ).rejects.toThrow("Accès réseau interdit");
    expect(fetch).not.toHaveBeenCalled();
    await globalThis.fetch("asset://localhost/models/config.json");
    expect(fetch).toHaveBeenCalledWith("asset://localhost/models/config.json", {
      redirect: "error",
    });
    expect(() =>
      new XMLHttpRequest().open("GET", "https://cloud.invalid")
    ).toThrow();
  });
  it("prevents simultaneous local models and chat loads, releasing exactly once", () => {
    const release = reserveClinicalModel();
    try {
      expect(isClinicalModelReserved()).toBe(true);
      expect(() => reserveClinicalModel()).toThrow("déjà");
      expect(() => assertChatModelAvailable()).toThrow("réservé");
    } finally {
      release();
      release();
    }
    expect(isClinicalModelReserved()).toBe(false);
    expect(() => assertChatModelAvailable()).not.toThrow();
  });
});
describe("local audio", () => {
  it("normalizes a quiet recording with bounded gain and removes DC", () => {
    const input = new Float32Array([0.08, 0.1, 0.12, 0.1]);
    const output = normalizeMicrophoneAudio(input);
    expect(output[0]).toBeCloseTo(-0.08);
    expect(output[2]).toBeCloseTo(0.08);
    expect(input[0]).toBeCloseTo(0.08);
  });
  it("keeps loud recordings below clipping without changing their length", () => {
    const output = normalizeMicrophoneAudio(new Float32Array([-1, 0, 1]));
    expect(output).toHaveLength(3);
    expect(output[0]).toBeCloseTo(-0.8);
    expect(output[2]).toBeCloseTo(0.8);
  });
  it("rejects silence, constant DC, sub-threshold noise and invalid samples", () => {
    for (const input of [
      new Float32Array(16000),
      new Float32Array([0.3, 0.3]),
      new Float32Array([-0.0001, 0.0001]),
    ])
      expect(() => normalizeMicrophoneAudio(input)).toThrow("Aucun son");
    expect(() => normalizeMicrophoneAudio(new Float32Array([NaN]))).toThrow(
      "invalide"
    );
  });
  it("resamples 44.1 kHz without pitch changes or a duration mismatch", () => {
    const input = Float32Array.from({ length: 44100 }, (_, i) =>
      Math.sin((2 * Math.PI * 440 * i) / 44100)
    );
    const output = resampleAudio(input, 44100);
    expect(output).toHaveLength(16000);
    const crossings = output.reduce(
      (n, sample, i) => n + (i > 0 && output[i - 1] <= 0 && sample > 0 ? 1 : 0),
      0
    );
    expect(crossings).toBeGreaterThanOrEqual(439);
    expect(crossings).toBeLessThanOrEqual(441);
    expect(() => resampleAudio(input, 44100, 0)).toThrow("invalide");
  });
  it("resamples 48 kHz PCM to 16 kHz without skipping signal averaging", () => {
    const input = new Float32Array([0, 1, 2, 3, 4, 5]);
    expect([...resampleAudio(input, 48000)]).toEqual([1, 4]);
    expect(resampleAudio(input, 16000)).not.toBe(input);
    expect(() => resampleAudio(input, 0)).toThrow();
  });
  it("reports unavailable or refused microphones in French", async () => {
    vi.stubGlobal("navigator", {});
    await expect(
      prepareMicrophone(new AbortController().signal)
    ).rejects.toThrow("Micro indisponible");
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(new DOMException("denied", "NotAllowedError")),
      },
    });
    await expect(
      prepareMicrophone(new AbortController().signal)
    ).rejects.toThrow("refusé");
  });
  it("stops a microphone obtained after cancellation instead of leaving it live", async () => {
    const stop = vi.fn(),
      controller = new AbortController();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: async () => {
          controller.abort();
          return { getTracks: () => [{ stop }] };
        },
      },
    });
    await expect(prepareMicrophone(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(stop).toHaveBeenCalledOnce();
  });
});
