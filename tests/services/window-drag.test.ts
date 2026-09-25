import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useTauriDrag } from "@/hooks/use-tauri-drag";

const native = vi.hoisted(() => ({
  enabled: true,
  drag: vi.fn().mockResolvedValue(undefined),
  zoom: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ startDragging: native.drag, toggleMaximize: native.zoom }),
}));
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => native.enabled }));
// Exercise the gesture lifecycle with native EventTargets; no renderer needed.
vi.mock("react", () => ({
  useRef: (current: unknown) => ({ current }),
  useCallback: (callback: unknown) => callback,
  useEffect: () => undefined,
}));
const press = (detail = 1, blocked = false) => ({
  button: 0, detail, screenX: 100, screenY: 100,
  target: { closest: () => blocked ? {} : null },
  preventDefault: vi.fn(),
}) as unknown as ReactMouseEvent;
function move(x: number, buttons = 1) {
  const event = new Event("mousemove");
  Object.assign(event, { screenX: x, screenY: 100, buttons });
  document.dispatchEvent(event);
}
beforeEach(() => {
  vi.clearAllMocks();
  native.enabled = true;
  vi.stubGlobal("document", new EventTarget());
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

describe("shell native window gestures", () => {
  it("keeps a simple click out of the native drag loop", () => {
    useTauriDrag(true).handleMouseDown(press());
    move(102);
    document.dispatchEvent(new Event("mouseup"));
    move(140);
    expect(native.drag).not.toHaveBeenCalled();
    expect(native.zoom).not.toHaveBeenCalled();
  });
  it("starts one native drag after actual movement", () => {
    useTauriDrag(true).handleMouseDown(press());
    move(106);
    move(130);
    expect(native.drag).toHaveBeenCalledTimes(1);
  });
  it("double-clicks zoom exactly once without dragging", () => {
    const gesture = useTauriDrag(true);
    gesture.handleMouseDown(press());
    document.dispatchEvent(new Event("mouseup"));
    gesture.handleMouseDown(press(2));
    move(120);
    expect(native.zoom).toHaveBeenCalledTimes(1);
    expect(native.drag).not.toHaveBeenCalled();
  });
  it("does not hijack interactive controls", () => {
    const gesture = useTauriDrag(true);
    gesture.handleMouseDown(press(1, true));
    gesture.handleMouseDown(press(2, true));
    move(140);
    expect(native.drag).not.toHaveBeenCalled();
    expect(native.zoom).not.toHaveBeenCalled();
  });
  it("cancels a pending drag on lost focus", () => {
    useTauriDrag(true).handleMouseDown(press());
    window.dispatchEvent(new Event("blur"));
    move(140);
    expect(native.drag).not.toHaveBeenCalled();
  });
  it("leaves the browser alone", () => {
    native.enabled = false;
    useTauriDrag(true).handleMouseDown(press(2));
    move(140);
    expect(native.zoom).not.toHaveBeenCalled();
    expect(native.drag).not.toHaveBeenCalled();
  });
});
