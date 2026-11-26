import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { mustExist } from "@/lib/must-exist";

const INLINE_SCRIPT = /<script>([\s\S]*?)<\/script>/;

it("reports repeated startup errors without replacing the app DOM or rendering HTML", () => {
  const html = readFileSync(
    new URL("../../index.html", import.meta.url),
    "utf8"
  );
  const script = mustExist(html.match(INLINE_SCRIPT), "script de démarrage")[1];
  let onError: (event: object) => void = () => undefined;
  const children: any[] = [{ id: "root", preserved: true }];
  const document = {
    body: { appendChild: (node: object) => children.push(node) },
    getElementById: (id: string) => children.find((node) => node.id === id),
    createElement: () => ({
      style: {},
      setAttribute() {
        // The fake element keeps no attribute.
      },
      textContent: "",
    }),
  };
  runInNewContext(script, {
    document,
    window: {
      addEventListener: (_type: string, listener: typeof onError) => {
        onError = listener;
      },
    },
  });
  const event = {
    message: '<img src=x onerror="alert(1)">',
    filename: "app.js",
    lineno: 1,
  };
  onError(event);
  onError(event);
  expect(children).toHaveLength(2);
  expect(children[0]).toEqual({ id: "root", preserved: true });
  expect(children[1].textContent).toBe(`${event.message}\napp.js:1`);
  document.body = null as any;
  expect(() => onError(event)).not.toThrow();
});
