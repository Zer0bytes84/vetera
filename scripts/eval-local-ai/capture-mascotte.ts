// Captures of the sidebar mascot, one run per appearance (query =
// "light,dark"): its gaze in two
// directions, a blink, each mood, the sidebar folded, the settings' choices.
// In every state the page measures what must not move or overflow: the menu
// items' boxes, the header's height, the page's width. A pointer sweep then
// times the frames while the eyes follow. Results go to "<signal>.results.json".
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureSession, sleep, waitFor } from "./capture-dictee";

type Result = Record<string, unknown>;

/** Where the menu stands: every sidebar item's box, rounded to the pixel. */
function layout() {
  const items = [
    ...document.querySelectorAll<HTMLElement>('[data-sidebar="menu-item"]'),
  ].map((el) => {
    const box = el.getBoundingClientRect();
    return `${el.textContent?.trim().slice(0, 18)}@${Math.round(box.left)},${Math.round(box.top)},${Math.round(box.width)}x${Math.round(box.height)}`;
  });
  const header = document.querySelector<HTMLElement>('[data-sidebar="header"]');
  const scroller = document.scrollingElement!;
  return {
    items,
    header: header ? Math.round(header.getBoundingClientRect().height) : null,
    pageOverflowX: scroller.scrollWidth - scroller.clientWidth,
    bodyOverflowX: document.body.scrollWidth - document.body.clientWidth,
  };
}

function pupils() {
  return [
    ...document.querySelectorAll<SVGGElement>(".sidebar-brand .lm-pupils"),
  ].map((g) => g.style.transform || "none");
}

export async function captureMascot(signal: string, appearances: string[]) {
  const results: Result[] = JSON.parse(
    sessionStorage.getItem("mascotte-results") ?? "[]",
  );
  const save = () => {
    sessionStorage.setItem("mascotte-results", JSON.stringify(results));
    return writeTextFile(
      `${signal}.results.json`,
      JSON.stringify(results, null, 2),
    );
  };
  const handshake = async (message: string, answer: string) => {
    await writeTextFile(signal, message);
    for (
      let i = 0;
      i < 1200 &&
      (await readTextFile(signal).catch(() => "")).trim() !== answer;
      i++
    )
      await sleep(250);
  };
  await ensureSession();
  localStorage.setItem("baitari:ai-models-onboarding-dismissed", "true");
  localStorage.setItem(
    "baitari:mascot:v1",
    JSON.stringify({ mode: "mascot", animal: "chien", animated: true }),
  );
  const index = Number(sessionStorage.getItem("mascotte-index") ?? "0");
  const appearance = appearances[index];
  if (!appearance) {
    await writeTextFile(signal, "restored");
    return;
  }
  if (appearance.startsWith("premium")) throw new Error("Premium a été retiré : une seule interface (Clean), clair ou sombre.");
  const mode = appearance.endsWith("dark") ? "dark" : "light";
  if (localStorage.getItem("theme") !== mode) {
    localStorage.setItem("theme", mode);
    location.reload();
    return;
  }
  location.hash = "#/dashboard";
  await waitFor(() => document.querySelector(".sidebar-brand"), 60_000);
  await sleep(2000);
  const shot = async (name: string, extra: Result = {}) => {
    results.push({
      appearance,
      state: name,
      ...layout(),
      pupils: pupils(),
      ...extra,
    });
    await save();
    await handshake(
      `ready:${appearance}-${name}`,
      `done:${appearance}-${name}`,
    );
  };
  const root = document.querySelector<HTMLElement>(".sidebar-brand .lm-root");
  const look = async (dx: number, dy: number) => {
    const box = (root ??
      document.querySelector(".sidebar-brand"))!.getBoundingClientRect();
    const x = Math.max(
      1,
      Math.min(innerWidth - 1, box.left + box.width / 2 + dx),
    );
    const y = Math.max(
      1,
      Math.min(innerHeight - 1, box.top + box.height / 2 + dy),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: x,
        clientY: y,
        pointerType: "mouse",
        bubbles: true,
      }),
    );
    await sleep(1100);
  };

  // A run interrupted by a reload resumes at the settings, not from the start.
  const phase = `mascotte-phase-${index}`;
  if (!sessionStorage.getItem(phase)) {
    // The colours the drawing actually gets, and anything that dims it on the way up.
    const style = root ? getComputedStyle(root) : null;
    const path = root?.querySelector("path");
    const dimmers: string[] = [];
    for (let el: Element | null = root; el; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.opacity !== "1" || cs.filter !== "none" || cs.mixBlendMode !== "normal") dimmers.push(`${el.tagName}.${el.className}:${cs.opacity}/${cs.filter}/${cs.mixBlendMode}`);
    }
    await shot("repos", {
      ink: style?.getPropertyValue("--pet-ink"),
      paper: style?.getPropertyValue("--pet-paper"),
      stroke: path ? getComputedStyle(path).stroke : null,
      dimmers,
    });
  }
  if (root && !sessionStorage.getItem(phase)) {
    for (const [name, dx, dy] of [
      ["yeux-gauche", -400, 0],
      ["yeux-droite", 600, 0],
      ["yeux-haut", 0, -400],
      ["yeux-bas", 0, 500],
    ] as const) {
      await look(dx, dy);
      await shot(name);
    }
    await look(300, 300);
    root.setAttribute("data-blink", "");
    await sleep(120);
    await shot("clignement");
    root.removeAttribute("data-blink");
    root.dispatchEvent(
      new PointerEvent("pointerenter", { pointerType: "mouse" }),
    );
    await sleep(400);
    await shot("joyeux", { mood: root.dataset.mood });
    root.dispatchEvent(
      new PointerEvent("pointerleave", { pointerType: "mouse" }),
    );
    await sleep(400);
    await shot("neutre", { mood: root.dataset.mood });
    // Thinking comes by itself after 25 s of a still pointer: waited for once, in the first run.
    if (index === 0) {
      await sleep(26_000);
      await shot("reflexion", {
        mood: root.dataset.mood,
        waited: "26 s sans mouvement",
      });
    } else {
      root.setAttribute("data-mood", "thinking");
      await sleep(400);
      await shot("reflexion", { mood: "thinking (posé pour la capture)" });
    }

    // Frames while the eyes follow a pointer sweeping the window for 3 s.
    const frames: number[] = [];
    let previous = performance.now();
    const started = previous;
    await new Promise<void>((done) => {
      const step = (now: number) => {
        frames.push(now - previous);
        previous = now;
        const t = (now - started) / 3000;
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: innerWidth * (0.5 + 0.45 * Math.sin(t * Math.PI * 4)),
            clientY: innerHeight * (0.5 + 0.4 * Math.cos(t * Math.PI * 3)),
            pointerType: "mouse",
          }),
        );
        if (now - started < 3000) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    const sorted = frames.slice(1).sort((a, b) => a - b);
    results.push({
      appearance,
      state: "balayage-3s",
      frames: sorted.length,
      meanMs:
        Math.round((sorted.reduce((s, f) => s + f, 0) / sorted.length) * 10) /
        10,
      p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
      maxMs: Math.round(sorted[sorted.length - 1] * 10) / 10,
      over20ms: sorted.filter((f) => f > 20).length,
    });
    await save();
    root.removeAttribute("data-mood");
  }

  // Folded into icons.
  if (!sessionStorage.getItem(phase)) {
    const toggle = document.querySelector<HTMLElement>(
      '[data-sidebar="trigger"], [data-header-sidebar-toggle]',
    );
    if (toggle) {
      toggle.click();
      await sleep(900);
      await shot("replie");
      toggle.click();
      await sleep(900);
    } else {
      results.push({
        appearance,
        state: "replie",
        error: "bouton de repli introuvable",
      });
    }
    sessionStorage.setItem(phase, "settings");
  }

  // The settings' twelve choices.
  location.hash = "#/parametres";
  const tab = await waitFor(
    () =>
      [...document.querySelectorAll<HTMLElement>("button, a")].find(
        (el) => el.textContent?.trim() === "Apparence",
      ),
    20_000,
  ).catch(() => null);
  tab?.click();
  const choices = await waitFor(
    () => document.querySelector<HTMLElement>(".mascot-settings"),
    20_000,
  ).catch(() => null);
  if (choices) {
    choices.scrollIntoView({ block: "start" });
    await sleep(900);
    await shot("parametres");
  }
  sessionStorage.setItem("mascotte-index", String(index + 1));
  location.hash = "#/dashboard";
  location.reload();
}
