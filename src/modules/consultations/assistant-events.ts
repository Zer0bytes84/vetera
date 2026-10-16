export const ASSISTANT_TOGGLE_EVENT = "baitari:assistant-toggle";

export interface AssistantOpenOptions {
  patientId?: string;
  appointmentId?: string;
  open?: boolean;
}

export function openAssistant(options?: AssistantOpenOptions) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ASSISTANT_TOGGLE_EVENT, {
      detail: { open: true, ...options },
    })
  );
}

export function closeAssistant() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ASSISTANT_TOGGLE_EVENT, {
      detail: { open: false },
    })
  );
}

export function toggleAssistant(options?: AssistantOpenOptions) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ASSISTANT_TOGGLE_EVENT, {
      detail: options,
    })
  );
}
