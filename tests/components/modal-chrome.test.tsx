import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialogFooter, AlertDialogHeader } from "@/components/ui/alert-dialog";
import { DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { FormDialogFooter, FormDialogHeader } from "@/components/ui/form-dialog";
import { flattenChildren, headerFocusesClose, modalSlotOf, splitFooter } from "@/components/ui/modal-chrome";
import { SheetFooter, SheetHeader } from "@/components/ui/sheet";

// La charte range l'en-tête dans la bande et les boutons du pied en pilules à droite ; ces règles de tri décident
// de ce qui monte et de ce qui reste sous le contenu.
describe("charte des fenêtres : tri des enfants", () => {
  it("reconnaît chaque en-tête et chaque pied des quatre familles de fenêtres", () => {
    for (const header of [<DialogHeader key="a" />, <FormDialogHeader icon={null} key="b" title="T" />, <AlertDialogHeader key="c" />, <SheetHeader key="d" />]) {
      expect(modalSlotOf(header)).toBe("header");
    }
    for (const footer of [<DialogFooter key="a" />, <FormDialogFooter key="b" />, <AlertDialogFooter key="c" />, <SheetFooter key="d" />]) {
      expect(modalSlotOf(footer)).toBe("footer");
    }
    expect(modalSlotOf(<div />)).toBeUndefined();
    expect(modalSlotOf("texte")).toBeUndefined();
  });

  it("voit l'en-tête à travers un fragment conditionnel et ignore les vides", () => {
    const open = true;
    const parts = flattenChildren([
      open ? (
        <>
          <DialogHeader key="h" />
          <div key="b" />
        </>
      ) : null,
      false,
      undefined,
      <DialogFooter key="f" />,
    ]);
    expect(parts.map(modalSlotOf)).toEqual(["header", undefined, "footer"]);
  });

  it("garde mentions et erreurs sous le contenu, envoie les boutons dans la bande", () => {
    const error = "Le nom est requis.";
    const { actions, meta } = splitFooter(
      <>
        <p>Un aperçu s’ouvrira avant l’enregistrement.</p>
        {error && <span role="alert">{error}</span>}
        <div className="modal-medical-footer-meta">Le propriétaire et le patient seront créés ensemble.</div>
        <div data-footer="meta">Page 1 / 3</div>
        <Button variant="outline">Annuler</Button>
        <div className="modal-medical-actions">
          <Button type="submit">Créer le dossier</Button>
        </div>
      </>
    );
    expect(meta).toHaveLength(4);
    expect(actions).toHaveLength(2);
    expect(actions.every((node) => isValidElement(node) && (node.type === Button || node.type === "div"))).toBe(true);
  });

  it("donne le focus d'ouverture à la croix là où l'ancienne bannière la plaçait en premier", () => {
    expect(headerFocusesClose([<FormDialogHeader icon={null} key="f" title="Nouveau patient" />])).toBe(true);
    expect(headerFocusesClose([<DialogHeader key="d" />])).toBe(false);
    expect(headerFocusesClose([<AlertDialogHeader key="a" />])).toBe(false);
  });
});
