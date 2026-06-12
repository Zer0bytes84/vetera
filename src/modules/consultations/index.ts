export { ConsultationSessionDrawer } from "./components/consultation-session-drawer";
export { MicrophoneButton } from "./components/microphone-button";
export { SoapPanel } from "./components/soap-panel";
export { SoapSectionEditor } from "./components/soap-section-editor";
export { useEnsureWebLLM } from "./hooks/use-ensure-webllm";
export { useSpeechToText } from "./hooks/use-speech-to-text";
export {
  EMPTY_SOAP_DRAFT,
  extractJsonObject,
  normalizeSoapDraft,
  type SoapDraft,
  type StructureOptions,
  structureDictationIntoSoap,
} from "./lib/voice-to-soap";
