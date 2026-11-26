import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/lib/icons";

/*
 * La charte des fenêtres : celle des cartes de l'application (`Shell` / `Panel` de surface.tsx). La fenêtre est le cadre
 * gris (`--card-band`) ; sa première bande porte l'en-tête (tuile d'icône, titre, sous-titre), les actions en pilules à
 * droite et la fermeture, toujours visible. Le contenu est un panneau (`--card-inset`) qui défile seul. Aucun trait,
 * aucune ombre : le bord n'est que le contraste des deux fonds. Rayons concentriques 16 + 6 = 22 px (modal-charter.css).
 *
 * Les composants gardent leur API : `DialogHeader` va dans la bande, `DialogFooter` envoie ses boutons dans la bande
 * (portail) et laisse ses mentions en bas du panneau. Un bouton d'envoi reste rattaché à son formulaire par l'attribut
 * `form`, si bien qu'Entrée, la validation et l'envoi ne changent pas.
 */

export type ModalSlot = "header" | "footer";

/** Marque un composant comme en-tête ou pied de fenêtre, pour que le contenu le range dans la bande. */
export function markModalSlot<T extends object>(
  component: T,
  slot: ModalSlot
): T {
  (component as { modalSlot?: ModalSlot }).modalSlot = slot;
  return component;
}

/**
 * Marque un en-tête dont l'ancienne bannière portait sa croix avant le contenu : la croix recevait alors le focus à
 * l'ouverture, et le garde.
 */
export function markFocusesClose<T extends object>(component: T): T {
  (component as { focusesClose?: boolean }).focusesClose = true;
  return component;
}

export function headerFocusesClose(nodes: ReactNode[]) {
  return nodes.some(
    (node) =>
      isValidElement(node) &&
      typeof node.type !== "string" &&
      (node.type as { focusesClose?: boolean }).focusesClose === true
  );
}

export function modalSlotOf(node: ReactNode): ModalSlot | undefined {
  if (!isValidElement(node) || typeof node.type === "string") {
    return undefined;
  }
  return (node.type as { modalSlot?: ModalSlot }).modalSlot;
}

/** Les enfants à plat : un fragment ne cache pas l'en-tête qu'il contient. */
export function flattenChildren(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      out.push(...flattenChildren(child.props.children));
    } else if (
      child !== null &&
      child !== undefined &&
      typeof child !== "boolean"
    ) {
      out.push(child);
    }
  });
  // Children.forEach ne donne pas de clés : on les reprend de toArray pour que React suive chaque enfant.
  return Children.toArray(out);
}

const ModalActionsContext = createContext<HTMLElement | null | undefined>(
  undefined
);

/** La première bande et le panneau. `header` est l'en-tête, `children` le contenu du panneau. */
export function ModalChrome({
  close,
  header,
  children,
  panelRef,
}: {
  close: ReactNode;
  header: ReactNode;
  children: ReactNode;
  panelRef?: React.Ref<HTMLDivElement>;
}) {
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const hasPanel = flattenChildren(children).length > 0;
  return (
    <ModalActionsContext.Provider value={actions}>
      <div data-slot="modal-band">
        <div data-slot="modal-heading">{header}</div>
        <div data-slot="modal-actions" ref={setActions} />
        {close}
      </div>
      {hasPanel ? (
        <div data-slot="modal-panel" ref={panelRef}>
          {children}
        </div>
      ) : null}
    </ModalActionsContext.Provider>
  );
}

/** Vrai dans une fenêtre à la charte : le pied envoie alors ses boutons dans la bande. */
export function useInModalChrome() {
  return useContext(ModalActionsContext) !== undefined;
}

/** Une mention de pied (texte, erreur, aide) reste sous le contenu ; tout le reste est une action. */
function isFooterMeta(node: ReactNode) {
  if (typeof node === "string" || typeof node === "number") {
    return true;
  }
  if (!isValidElement<{ className?: unknown; "data-footer"?: unknown }>(node)) {
    return false;
  }
  if (node.type === "p" || node.type === "span") {
    return true;
  }
  if (node.props["data-footer"] === "meta") {
    return true;
  }
  return (
    typeof node.props.className === "string" &&
    /\b(modal-medical-footer-meta|patient-export-footer-hint)\b/.test(
      node.props.className
    )
  );
}

export function splitFooter(children: ReactNode) {
  const meta: ReactNode[] = [];
  const actions: ReactNode[] = [];
  for (const child of flattenChildren(children)) {
    (isFooterMeta(child) ? meta : actions).push(child);
  }
  return { actions, meta };
}

/**
 * Les boutons du pied, rendus dans la bande. Dans un formulaire, chacun reste rattaché au formulaire d'origine.
 * Hors d'une fenêtre à la charte (un éditeur posé dans une page), ils restent à leur place.
 */
export function ModalBandActions({ children }: { children: ReactNode }) {
  const target = useContext(ModalActionsContext);
  const anchor = useRef<HTMLSpanElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  useLayoutEffect(() => {
    const form = anchor.current?.closest("form");
    const box = group.current;
    if (!(form && box)) {
      return;
    }
    if (!form.id) {
      form.id = `modal-form-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    }
    const link = () => {
      for (const control of box.querySelectorAll(
        "button, input, select, textarea"
      )) {
        if (!control.hasAttribute("form")) {
          control.setAttribute("form", form.id);
        }
      }
    };
    link();
    const observer = new MutationObserver(link);
    observer.observe(box, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [generatedId, target]);
  if (target === undefined) {
    return <>{children}</>;
  }
  return (
    <>
      <span data-slot="modal-actions-anchor" hidden ref={anchor} />
      {target
        ? createPortal(
            <div data-slot="modal-actions-group" ref={group}>
              {children}
            </div>,
            target
          )
        : null}
    </>
  );
}

/**
 * Le focus d'ouverture reste celui d'avant : le premier élément atteignable dans l'ordre d'origine (en-tête, contenu,
 * pied). Les actions passées en tête ne le prennent donc pas ; un champ `autoFocus` garde la main.
 */
export function firstPanelField(panel: HTMLElement | null): HTMLElement | null {
  if (!panel) {
    return null;
  }
  const candidates = panel.querySelectorAll<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
  );
  for (const el of candidates) {
    if (el.closest("[hidden], [inert]") || !el.getClientRects().length) {
      continue;
    }
    return el;
  }
  return null;
}

/** La croix de fermeture, toujours dans la bande. */
export function ModalCloseIcon() {
  return <XIcon aria-hidden="true" size={17} strokeWidth={2} />;
}

export type ModalChromeElement = ReactElement<{ children?: ReactNode }>;
