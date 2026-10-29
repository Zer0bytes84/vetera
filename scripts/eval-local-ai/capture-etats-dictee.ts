// States of the dictation panel, photographed and measured, in light then
// dark: waiting for the microphone permission (then its hint, then the end of
// the wait), permission refused, recording while a voice plays, recording in
// silence, transcription. The microphone itself is replaced (macOS permission
// is not granted to this build): a source that never answers, one that
// refuses, and the real audio of a dictation clip played into the same panel,
// so the level indicator reads a real signal. Each state: "ready:<name>" →
// "done:<name>" for the shell, measures in "<signal>.etats.json".
import { readFile, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { sleep, waitFor } from "./capture-dictee";

const PATIENT = "mnma3iqx51fr51th3ta"; // Rifka, an existing patient of the copy.
const bodyHas = (text: string) => document.body.innerText.includes(text);
const buttons = () => [...document.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.getClientRects().length > 0);
const dicter = () => buttons().find((b) => /^(Dicter|Compléter)$/.test(b.textContent?.trim() ?? "") && !b.disabled);
const alertText = () => document.querySelector('[role="alert"]')?.textContent ?? null;
type Media = { getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream> };

export async function captureDictationStates(signal: string) {
  const phase = sessionStorage.getItem("etats-dictee") ?? "light";
  const results: Record<string, unknown>[] = JSON.parse(sessionStorage.getItem("etats-dictee-results") ?? "[]");
  const save = async () => {
    sessionStorage.setItem("etats-dictee-results", JSON.stringify(results));
    await writeTextFile(`${signal}.etats.json`, JSON.stringify(results, null, 2));
  };
  const shot = async (name: string, measures: Record<string, unknown> = {}) => {
    await sleep(500);
    results.push({ theme: phase, name, ...measures });
    await save();
    await writeTextFile(signal, `ready:${phase}-${name}`);
    for (let i = 0; i < 400 && (await readTextFile(signal).catch(() => "")).trim() !== `done:${phase}-${name}`; i++) await sleep(250);
  };
  const bars = () =>
    [...document.querySelectorAll<HTMLElement>(".dictation-level > span")].map((bar) => Math.round(bar.getBoundingClientRect().height));
  const meter = () => document.querySelector<HTMLElement>(".dictation-level");
  const media = navigator.mediaDevices as unknown as Media;

  if (localStorage.getItem("theme") !== phase) {
    localStorage.setItem("theme", phase);
    location.reload();
    return;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFocus();
  location.hash = `#/patient/${encodeURIComponent(PATIENT)}`;
  await waitFor(() => bodyHas("Dossier patient"), 60_000);
  await sleep(1500);
  const opener = await waitFor(() =>
    buttons().find((b) => /assistant/i.test(b.getAttribute("aria-label") ?? b.textContent ?? "")),
  );
  opener.click();
  await waitFor(() => document.querySelector("textarea.assistant-dictation-field") && dicter(), 180_000);

  if (phase === "light") {
    // 1. Permission never answered: the wait, its hint, then its end.
    media.getUserMedia = () => new Promise<MediaStream>(() => {});
    dicter()!.click();
    await waitFor(() => bodyHas("Autorisation du microphone…"), 60_000);
    await shot("attente-micro", { annuler: Boolean(buttons().find((b) => b.textContent?.trim() === "Annuler")) });
    await sleep(5_500);
    await shot("attente-micro-aide", { aide: bodyHas("Aucune fenêtre ne s’affiche") });
    await waitFor(() => alertText(), 40_000);
    await shot("micro-sans-reponse", { message: alertText(), dicterDisponible: Boolean(dicter()) });
    // 2. Annuler ends a wait at once.
    dicter()!.click();
    await waitFor(() => bodyHas("Autorisation du microphone…"), 30_000);
    buttons().find((b) => b.textContent?.trim() === "Annuler")!.click();
    await sleep(800);
    await shot("attente-annulee", { attenteAffichee: bodyHas("Autorisation du microphone…"), dicterDisponible: Boolean(dicter()) });
    // 3. Permission refused.
    media.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
    dicter()!.click();
    await waitFor(() => alertText(), 30_000);
    await shot("micro-refuse", { message: alertText() });
  }

  // 4. Recording with a voice, then in silence: the real audio of a clip.
  const bytes = await readFile(signal.replace(/signal$/, "clip.wav"));
  const element = new Audio(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  context.createMediaElementSource(element).connect(destination);
  media.getUserMedia = async () => {
    await context.resume();
    return destination.stream;
  };
  dicter()!.click();
  await waitFor(() => bodyHas("Écoute en cours") || alertText(), 60_000);
  if (alertText()) {
    await shot("echec-ecoute", { message: alertText() });
    await writeTextFile(signal, `failed: écoute impossible : ${alertText()}`);
    return;
  }
  await element.play().catch(() => undefined);
  await sleep(3000);
  const voice = { bars: bars(), silent: meter()?.hasAttribute("data-silent"), playing: !element.paused };
  await shot("ecoute-voix", voice);
  element.pause();
  await sleep(3000);
  await shot("ecoute-silence", { bars: bars(), silent: meter()?.hasAttribute("data-silent") });
  if (phase === "light") {
    buttons().find((b) => b.textContent?.trim() === "Arrêter")!.click();
    await waitFor(() => document.querySelector<HTMLTextAreaElement>("textarea.assistant-dictation-field")?.value.trim() || alertText(), 300_000);
    await shot("transcription", {
      texte: document.querySelector<HTMLTextAreaElement>("textarea.assistant-dictation-field")?.value.slice(0, 200),
      erreur: alertText(),
    });
  }

  if (phase === "light") {
    sessionStorage.setItem("etats-dictee", "dark");
    localStorage.setItem("theme", "dark");
    location.reload();
    return;
  }
  localStorage.setItem("theme", "light");
  await writeTextFile(signal, "restored");
}
