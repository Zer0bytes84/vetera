// Usage: node capture.mjs <outDir> <name>=<url> ...  (first screen 1440x900 and full page, @2x, JPEG)
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [outDir, ...jobs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const port = 9333;
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", "--no-first-run",
  `--user-data-dir=${process.env.TMPDIR || "/tmp"}/cap-profile`, "about:blank",
], { stdio: "ignore" });
let ws;
for (let i = 0; i < 50; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((t) => t.type === "page");
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(200);
}
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");
for (const job of jobs) {
  const eq = job.indexOf("=");
  const name = job.slice(0, eq), url = job.slice(eq + 1);
  const dark = url.includes("theme=dark");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
  await send("Page.navigate", { url });
  await sleep(1500);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 88 });
  writeFileSync(`${outDir}/${name}.jpg`, Buffer.from(shot.result.data, "base64"));
  const { result } = await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
  const h = result.result.value;
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: h, deviceScaleFactor: 1.5, mobile: false });
  await sleep(400);
  const full = await send("Page.captureScreenshot", { format: "jpeg", quality: 85, captureBeyondViewport: true });
  writeFileSync(`${outDir}/${name}-page.jpg`, Buffer.from(full.result.data, "base64"));
  console.log(name, h);
}
ws.close(); chrome.kill();
