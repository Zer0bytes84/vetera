// SONDE D'ESSAI, jamais committée : tourne dans la vraie fenêtre de l'app empaquetée, sous sa politique de sécurité,
// et rapporte à un écouteur local. Elle ouvre chaque page, relève les violations de la politique, éprouve ce que la
// politique refuse, ce que les permissions refusent, et ce qu'elles laissent passer.
(() => {
  const ENDPOINT = "http://127.0.0.1:5400/report";
  const out = { ua: navigator.userAgent, href: location.href, violations: [], errors: [], globals: {}, csp: {}, routes: [], ipc: {}, note: null, done: false };
  const clip = (v, n = 200) => String(v).slice(0, n);
  document.addEventListener("securitypolicyviolation", (e) => out.violations.push({ directive: e.violatedDirective, blocked: clip(e.blockedURI, 100), source: clip(e.sourceFile).split("/").slice(-2).join("/"), line: e.lineNumber }));
  const nativeError = console.error;
  console.error = (...a) => { out.errors.push(clip(a.map(String).join(" "))); nativeError.apply(console, a); };
  window.addEventListener("error", (e) => out.errors.push("ERREUR " + clip(e.message)));
  window.addEventListener("unhandledrejection", (e) => out.errors.push("REJET " + clip(e.reason)));
  const post = (kind) => fetch(ENDPOINT, { method: "POST", mode: "cors", body: JSON.stringify({ kind, at: Date.now(), out }) }).catch(() => undefined);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const invoke = (cmd, args, opts) => window.__TAURI_INTERNALS__.invoke(cmd, args, opts);
  const verdict = (p) => p.then((v) => "OK " + clip(typeof v === "object" ? JSON.stringify(v) : v, 70), (e) => "REFUSE " + clip(e, 150));

  async function cspProbes() {
    out.globals = { tauriGlobal: typeof window.__TAURI__, internals: typeof window.__TAURI_INTERNALS__ };
    await new Promise((resolve) => { const p = document.createElement("script"); p.src = "/probe-eval.js"; p.onload = resolve; p.onerror = resolve; document.head.appendChild(p); });
    out.csp.eval = window.__probe ?? null;
    const s = document.createElement("script"); s.textContent = "window.__inline = 1"; document.head.appendChild(s);
    out.csp.inlineScriptBlocked = window.__inline !== 1;
    const d = document.createElement("div"); d.innerHTML = '<img src=x onerror="window.__handler=1">'; document.body.appendChild(d);
    await sleep(500);
    out.csp.inlineHandlerBlocked = window.__handler !== 1;
    try { await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])); out.csp.wasm = true; } catch (e) { out.csp.wasm = false; }
    try { const u = URL.createObjectURL(new Blob(["postMessage(1)"], { type: "text/javascript" })); const w = new Worker(u); out.csp.blobWorker = await new Promise((res) => { w.onmessage = () => res(true); w.onerror = () => res(false); setTimeout(() => res("délai"), 2000); }); } catch (e) { out.csp.blobWorker = "exception " + clip(e, 60); }
    try { await fetch("http://127.0.0.1:1/x"); out.csp.httpFetchBlocked = false; } catch (e) { out.csp.httpFetchBlocked = true; }
  }

  async function ipcProbes() {
    const dir = async (n) => { try { return await invoke("plugin:path|resolve_directory", { directory: n }); } catch (e) { return null; } };
    const appData = await dir(14), home = await dir(21), desktop = await dir(18), download = await dir(7), document_ = await dir(6);
    out.ipc.dirs = { appData: !!appData, home: !!home };
    const enc = new TextEncoder();
    const p = appData + "/probe-securite";
    out.ipc.appdata_mkdir = await verdict(invoke("plugin:fs|mkdir", { path: p, options: { recursive: true } }));
    out.ipc.appdata_write = await verdict(invoke("plugin:fs|write_text_file", enc.encode("sonde"), { headers: { path: encodeURIComponent(p + "/t.txt"), options: JSON.stringify({}) } }));
    out.ipc.appdata_read = await verdict(invoke("plugin:fs|read_text_file", { path: p + "/t.txt", options: {} }).then((b) => new TextDecoder().decode(new Uint8Array(b))));
    out.ipc.appdata_exists = await verdict(invoke("plugin:fs|exists", { path: p + "/t.txt", options: {} }));
    out.ipc.appdata_remove = await verdict(invoke("plugin:fs|remove", { path: p, options: { recursive: true } }));
    for (const [name, base] of [["home", home], ["desktop", desktop], ["download", download], ["document", document_]]) {
      if (!base) continue;
      out.ipc[name + "_exists"] = await verdict(invoke("plugin:fs|exists", { path: base, options: {} }));
      out.ipc[name + "_read_dir"] = await verdict(invoke("plugin:fs|read_dir", { path: base, options: {} }));
      out.ipc[name + "_mkdir"] = await verdict(invoke("plugin:fs|mkdir", { path: base + "/zz-sonde-interdite", options: { recursive: true } }));
    }
    out.ipc.copy_file = await verdict(invoke("plugin:fs|copy_file", { fromPath: appData + "/a", toPath: appData + "/b", options: {} }));
    out.ipc.dialog_ask = "non appelé (ouvrirait une boîte)";
    out.ipc.sql_load = await verdict(invoke("plugin:sql|load", { db: "sqlite:zz-sonde-interdite.db" }));
    out.ipc.sql_select = await verdict(invoke("plugin:sql|select", { db: "sqlite:baitari.db", query: "select 1 as ok", values: [] }));
    out.ipc.custom_command = await verdict(invoke("license_installation_id"));
  }

  const ROUTES = ["dashboard", "patients", "agenda", "flux", "soins", "taches", "notes", "stock", "finances", "finances_analytics", "equipe", "parametres", "clinique"];
  async function crawl() {
    for (const r of ROUTES) {
      location.hash = "#/" + r;
      await sleep(3500);
      out.routes.push({ route: r, violations: out.violations.length, errors: out.errors.length, root: document.getElementById("root")?.childElementCount ?? -1, text: clip(document.body.innerText.replace(/\s+/g, " "), 60) });
      await post("route");
    }
  }

  const press = (el) => { for (const t of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) el.dispatchEvent(new (t.startsWith("pointer") ? PointerEvent : MouseEvent)(t, { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" })); };
  const byText = (sel, re) => [...document.querySelectorAll(sel)].find((e) => re.test(e.textContent || "") || re.test(e.getAttribute("aria-label") || ""));
  async function trapNote() {
    window.__pwned = [];
    sessionStorage.setItem("documents:open-note", "zz-test-piege");
    location.hash = "#/documents";
    location.hash = "#/notes";
    await sleep(4000);
    const row = byText("button, [role=button], a, div, p, span", /ZZ-TEST note piégée/);
    out.note = { rowFound: !!row };
    if (row) press(row);
    await sleep(1500);
    const more = byText("button", /Plus d.actions pour cette note/);
    out.note.menuFound = !!more;
    if (more) press(more);
    await sleep(800);
    const item = [...document.querySelectorAll("[role=menuitem]")].find((e) => /Aperçu/.test(e.textContent || ""));
    out.note.previewItemFound = !!item;
    if (item) press(item);
    await sleep(2500);
    const box = document.querySelector(".document-rich-content");
    out.note.previewShown = !!box;
    out.note.pwned = window.__pwned;
    out.note.previewHtml = box ? clip(box.innerHTML.replace(/<h1[\s\S]*?<\/p>/, ""), 400) : null;
  }

  // Session d'essai insérée dans la copie de la base : le profil de l'app empaquetée n'a pas encore de session.
  try { localStorage.setItem("auth_token", "zz-test-token"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true })); } catch (e) { /* sans effet */ }
  window.addEventListener("load", async () => {
    await sleep(6000);
    await post("start");
    try { await cspProbes(); await post("csp"); } catch (e) { out.errors.push("cspProbes " + clip(e)); }
    try { await ipcProbes(); await post("ipc"); } catch (e) { out.errors.push("ipcProbes " + clip(e)); }
    try { await crawl(); } catch (e) { out.errors.push("crawl " + clip(e)); }
    try { await trapNote(); } catch (e) { out.errors.push("trapNote " + clip(e)); }
    out.done = true;
    await post("fin");
  });
})();
