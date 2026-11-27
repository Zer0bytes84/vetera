// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { LayoutProvider, useLayout } from "@/contexts/layout-provider";
import { SidebarCollapseRule } from "@/modules/shell/sidebar-collapse-rule";

// « Réduire la barre latérale » (Paramètres, Apparence) : le choix ne se voyait qu'une fois la barre réduite, et
// « Jamais » laissait ⌘ B et le bouton plier le contenu de la barre dans une barre restée large.

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const handles: {
  choose: (value: "icon" | "offcanvas" | "none") => void;
  toggle: () => void;
  state: () => string;
} = { choose: () => undefined, toggle: () => undefined, state: () => "" };

function Probe() {
  const { setCollapsible } = useLayout();
  const { toggleSidebar, state } = useSidebar();
  useEffect(() => {
    handles.choose = setCollapsible;
    handles.toggle = toggleSidebar;
    handles.state = () => state;
  });
  return null;
}

let container: HTMLDivElement;
let root: Root;
function mount() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <LayoutProvider>
        <SidebarProvider defaultOpen>
          <SidebarCollapseRule />
          <Probe />
        </SidebarProvider>
      </LayoutProvider>
    );
  });
}
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1400,
  });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Réduire la barre latérale", () => {
  it("le choix fait dans les réglages se voit tout de suite", () => {
    mount();
    expect(handles.state()).toBe("expanded");
    act(() => handles.choose("offcanvas"));
    expect(handles.state()).toBe("collapsed");
    act(() => handles.choose("icon"));
    expect(handles.state()).toBe("collapsed");
    act(() => handles.choose("none"));
    expect(handles.state()).toBe("expanded");
  });

  it("« Jamais » garde la barre ouverte : ni le bouton ni ⌘ B ne la réduisent", () => {
    mount();
    act(() => handles.choose("none"));
    act(() => handles.toggle());
    expect(handles.state()).toBe("expanded");
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", metaKey: true })
      );
    });
    expect(handles.state()).toBe("expanded");
  });

  it("le choix enregistré s'applique au lancement sans bouger la barre", () => {
    localStorage.setItem("layout_collapsible_v7", "offcanvas");
    mount();
    expect(handles.state()).toBe("expanded");
    act(() => handles.toggle());
    expect(handles.state()).toBe("collapsed");
  });
});
