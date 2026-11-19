/**
 * One polite live region for the whole app, created on first use: screen readers read what is written into it at the
 * next pause. Emptied then written on the next frame, so the same sentence twice is read twice.
 */
const REGION_ID = "app-announcer";

export function announce(text: string, doc: Document = document) {
  let region = doc.getElementById(REGION_ID);
  if (!region) {
    region = doc.createElement("div");
    region.id = REGION_ID;
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.className = "sr-only";
    doc.body.append(region);
  }
  region.textContent = "";
  const target = region;
  (doc.defaultView?.requestAnimationFrame ?? ((callback: () => void) => setTimeout(callback, 0)))(() => {
    target.textContent = text;
  });
}
