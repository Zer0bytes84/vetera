// Moteur natif de dictée : le PCM du parcours réel part vers le compagnon
// whisper.cpp par IPC. Aucun repli silencieux vers le WASM en Tauri : une panne
// doit se voir et se dire, pas coûter cinquante secondes de transcription.

import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/services/browser-store";
import type { DictationLanguage } from "./whisper-language";

export interface NativeDictationStatus {
  disponible: boolean;
  modele: string | null;
  cheminAttendu: string;
  source: string;
  raison: string | null;
}

export interface NativeDictationResult {
  texte: string;
  secondes: number;
  pid: number | null;
  pidApplication: number;
  code: number | null;
  journal: string;
}

/**
 * Sur l'app de bureau macOS, la dictée passe par le compagnon natif ; ailleurs
 * (navigateur, Windows, où aucun compagnon n'est empaqueté), le WASM reste.
 */
export function nativeDictationEnabled(
  platform = globalThis.navigator?.userAgent ?? ""
) {
  return isTauriRuntime() && /Macintosh|Mac OS X/.test(platform);
}

export async function nativeDictationStatus(): Promise<NativeDictationStatus> {
  return invoke<NativeDictationStatus>("dictee_status");
}

/**
 * Encode le PCM Float32 little-endian en base64 par morceaux : `String.fromCharCode`
 * avec deux millions d'arguments ferait sauter la pile.
 */
export function encodePcmBase64(pcm: Float32Array) {
  const octets = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binaire = "";
  const morceau = 0x2000;
  for (let index = 0; index < octets.length; index += morceau)
    binaire += String.fromCharCode(
      ...octets.subarray(index, Math.min(index + morceau, octets.length))
    );
  return btoa(binaire);
}

export async function transcribeNatively(
  pcm: Float32Array,
  language: DictationLanguage = "fr"
): Promise<NativeDictationResult> {
  return invoke<NativeDictationResult>("transcrire_dictee", {
    audio: encodePcmBase64(pcm),
    langue: language,
  });
}
