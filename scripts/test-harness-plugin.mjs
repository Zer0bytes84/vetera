import { chmodSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

/**
 * Test harness for the development server. It lets a script on this machine run code inside the app's own window (the
 * Tauri webview or a browser tab) and read the result back, so the app can be tested where nobody can click or take a
 * screenshot (a virtual machine, a remote session). See docs/TEST-HARNESS.md.
 *
 * It exists only when ALL of these hold:
 *  - the variable BAITARI_TEST_HARNESS is "1";
 *  - Vite runs its development server (never `vite build`, so nothing of it reaches an installer);
 *  - NODE_ENV is not "production".
 * Even then, every request must come from this machine AND carry a token drawn at random at each start and kept in a
 * file readable by its owner only: the development server listens on every network interface, a neighbour must never be
 * able to run code in the app.
 */

export const HARNESS_ENV = "BAITARI_TEST_HARNESS";
export const MAX_RESULT_BYTES = 2 * 1024 * 1024;
const ID = /^\d{1,15}$/;

/** A job number: the time in milliseconds and one more digit, 14 digits, in order of arrival. */
export const newJobId = (now = Date.now(), random = Math.random()) => `${now}${Math.floor(random * 10)}`;

export function harnessEnabled(command, env) {
  return command === "serve" && env.NODE_ENV !== "production" && env[HARNESS_ENV] === "1";
}

const isLoopback = (address) => address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";

/** Folders and token of one harness run. Stale jobs and results of an earlier run are removed. */
export function createHarnessState(dir) {
  const jobs = path.join(dir, "jobs");
  const results = path.join(dir, "results");
  for (const folder of [jobs, results]) {
    mkdirSync(folder, { recursive: true });
    for (const name of readdirSync(folder)) rmSync(path.join(folder, name), { force: true });
  }
  const token = randomBytes(24).toString("hex");
  const tokenFile = path.join(dir, "token");
  writeFileSync(tokenFile, token, { mode: 0o600 });
  chmodSync(tokenFile, 0o600);
  return { dir, jobs, results, token, lastAliveWrite: 0 };
}

function reply(res, status, body, type) {
  res.statusCode = status;
  if (type) res.setHeader("content-type", type);
  res.end(body ?? "");
}

/** Reads a request body, refusing more than `limit` bytes. */
function readBody(req, limit, done) {
  const chunks = [];
  let size = 0;
  let refused = false;
  req.on("data", (raw) => {
    if (refused) return;
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    size += chunk.length;
    if (size > limit) {
      refused = true;
      done(null);
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => {
    if (!refused) done(Buffer.concat(chunks).toString());
  });
}

/**
 * GET  /job     : the oldest waiting job as {id, code}, or 204.
 * POST /result  : ?id=<n>, the job's outcome as the body.
 * Anything else, and anything not from this machine with the token, is refused.
 */
export function handleHarnessRequest(req, res, state, now = Date.now()) {
  if (!isLoopback(req.socket?.remoteAddress) || req.headers["x-h-token"] !== state.token) {
    reply(res, 403);
    return;
  }
  const url = new URL(req.url ?? "/", "http://harness");
  if (req.method === "GET" && url.pathname === "/job") {
    // The runner reads this to tell a window that answers from one that does not.
    if (now - state.lastAliveWrite > 2000) {
      state.lastAliveWrite = now;
      writeFileSync(path.join(state.dir, "alive"), String(now));
    }
    const waiting = readdirSync(state.jobs).filter((name) => ID.test(name.replace(/\.js$/, "")) && name.endsWith(".js")).sort((a, b) => Number(a.slice(0, -3)) - Number(b.slice(0, -3)));
    if (!waiting.length) {
      reply(res, 204);
      return;
    }
    const file = path.join(state.jobs, waiting[0]);
    const code = readFileSync(file, "utf8");
    rmSync(file, { force: true });
    reply(res, 200, JSON.stringify({ id: waiting[0].slice(0, -3), code }), "application/json");
    return;
  }
  if (req.method === "POST" && url.pathname === "/result") {
    const id = url.searchParams.get("id") ?? "";
    if (!ID.test(id)) {
      reply(res, 400);
      return;
    }
    readBody(req, MAX_RESULT_BYTES, (body) => {
      if (body === null) {
        reply(res, 413);
        return;
      }
      writeFileSync(path.join(state.results, `${id}.json`), body);
      reply(res, 200, "ok");
    });
    return;
  }
  reply(res, 404);
}

/** The script injected in the page: error buffer, helpers, and the loop that fetches and runs jobs. */
export function clientSource(token) {
  return `(() => {
  if (window.H) return;
  const TOKEN = ${JSON.stringify(token)};
  const headers = { "x-h-token": TOKEN };
  const trim = (v) => { try { return (typeof v === "string" ? v : v && v.stack ? v.stack : JSON.stringify(v)).slice(0, 600); } catch { return String(v).slice(0, 600); } };
  const errs = [];
  const note = (kind, args) => { errs.push({ kind, at: new Date().toISOString(), message: args.map(trim).join(" ") }); if (errs.length > 200) errs.shift(); };
  for (const kind of ["error", "warn"]) { const original = console[kind].bind(console); console[kind] = (...a) => { note("console." + kind, a); original(...a); }; }
  window.addEventListener("error", (e) => note("window.error", [e.message + " @ " + e.filename + ":" + e.lineno]));
  window.addEventListener("unhandledrejection", (e) => note("unhandledrejection", [e.reason]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const events = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
  window.H = {
    sleep,
    /** Console errors and warnings, window errors and rejected promises since the page loaded. */
    errors: (clear = false) => { const copy = errs.slice(); if (clear) errs.length = 0; return copy; },
    /** A full pointer sequence: menus and buttons of the app react to it as to a real click. */
    press: (el) => { if (!el) throw new Error("press: élément introuvable"); for (const t of events) el.dispatchEvent(new (t.startsWith("pointer") ? PointerEvent : MouseEvent)(t, { bubbles: true, cancelable: true, pointerType: "mouse", button: 0 })); },
    /** Types into a controlled input: the framework hears it. */
    setVal: (el, value) => { if (!el) throw new Error("setVal: élément introuvable"); const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value); el.dispatchEvent(new Event("input", { bubbles: true })); },
    /** Hands files to <input type="file"> without a system dialog. */
    setFiles: (input, files) => { const dt = new DataTransfer(); for (const f of files) dt.items.add(f); input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true })); },
    /** The first element whose visible text OR accessible label matches (each tested alone, so ^ and $ mean what they say). */
    byText: (selector, pattern) => [...document.querySelectorAll(selector)].find((e) => pattern.test((e.innerText || "").trim()) || pattern.test(e.getAttribute("aria-label") || "")),
    /** The visible text of the page (or of a selector), whitespace collapsed. */
    text: (selector = "body", max = 2000) => (document.querySelector(selector)?.innerText || "").replace(/\\s+/g, " ").trim().slice(0, max),
    toasts: () => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText.replace(/\\s+/g, " ").trim()),
    /** Polls until fn() is truthy, or throws after the delay. */
    waitFor: async (fn, ms = 5000, what = "condition") => { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error("waitFor: délai dépassé (" + what + ")"); await sleep(100); } },
    tauri: () => Boolean(window.__TAURI_INTERNALS__),
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  (async function loop() {
    for (;;) {
      try {
        const r = await fetch("/__h/job", { headers });
        if (r.status === 200) {
          const { id, code } = await r.json();
          const started = Date.now();
          let out;
          try { out = { ok: true, value: await new AsyncFunction("H", code)(window.H) }; } catch (e) { out = { ok: false, error: String((e && e.message) || e) + (e && e.stack ? "\\n" + String(e.stack).split("\\n").slice(0, 3).join("\\n") : "") }; }
          out.ms = Date.now() - started;
          await fetch("/__h/result?id=" + id, { method: "POST", headers, body: JSON.stringify(out, (k, v) => (v === undefined ? null : v)) });
        }
      } catch {}
      await sleep(500);
    }
  })();
})();`;
}

/** The Vite plugin, or nothing at all when the harness is not enabled. */
export function testHarnessPlugin(command, env = process.env, dir = env.BAITARI_TEST_HARNESS_DIR || path.resolve(".test-harness")) {
  if (!harnessEnabled(command, env)) return [];
  const state = createHarnessState(dir);
  return [
    {
      name: "baitari-test-harness",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/__h", (req, res) => handleHarnessRequest(req, res, state));
        server.httpServer?.once("listening", () => {
          // Written to the terminal where the app was started: nobody can mistake a harness run for a normal one.
          console.warn(`\n  ⚠ Pilote de test ACTIF (${HARNESS_ENV}=1), dossier ${state.dir}. Ne jamais l'activer sur une machine qui n'est pas la vôtre.\n`);
        });
      },
      transformIndexHtml: () => [{ tag: "script", injectTo: "head-prepend", children: clientSource(state.token) }],
    },
  ];
}

