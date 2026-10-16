import { expect, it } from "vitest";
import { careErrorMessage } from "../../../src/modules/care-tasks/feedback";

it("conserve la consigne de concurrence et le besoin de connexion", () => {
  const conflict = "Ce soin vient d’être modifié. Actualisez la vue.";
  expect(careErrorMessage(new Error(conflict), "update")).toBe(conflict);
  expect(careErrorMessage("Un utilisateur connecté est requis.", "create"))
    .toBe("Un utilisateur connecté est requis.");
});
it("ne montre aucun détail SQLite, nom de table ou chemin local en création", () => {
  const error = new Error("SQLITE_CONSTRAINT care_tasks /private/clinic.db");
  expect(careErrorMessage(error, "create")).toBe("Le soin n’a pas pu être enregistré. Réessayez.");
});
it("fournit une erreur française pour les autres rejets sans exposer leur contenu", () => {
  for (const error of [null, { code: "SQLITE_BUSY" }, "database is locked"]) {
    expect(careErrorMessage(error, "update")).toBe("Le soin n’a pas pu être modifié. Réessayez.");
  }
});
