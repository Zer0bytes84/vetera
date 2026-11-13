import { describe, expect, it } from "vitest";
import { readTeam } from "../../src/components/team-reading";

const u = (role: string, status = "active") => ({ role, status }) as Parameters<typeof readTeam>[0][number];

describe("Équipe : la bande lit l'état réel", () => {
  it("équipe réduite : un administrateur et un vétérinaire, aucun soignant, aucun accès en attente", () => {
    const team = readTeam([u("admin"), u("vet_principal")]);
    expect(team.state).toBe("effectif complet · 1 praticien, 0 soignant · accès à jour");
    expect(team.lines).toEqual({
      active: "1 praticien · 0 soignant · 1 autre rôle",
      vets: "1 principal · 0 adjoint",
      support: "Aucun assistant ni stagiaire",
      access: "Tous les comptes sont actifs",
    });
  });
  it("équipe complète avec un compte inactif : la ligne le dit", () => {
    const team = readTeam([u("admin"), u("vet_principal"), u("vet_adjoint"), u("assistant"), u("assistant"), u("stagiaire", "inactive")]);
    expect(team.state).toBe("5 sur 6 en poste · 2 praticiens, 3 soignants · 1 accès en attente");
    expect(team.lines.support).toBe("2 assistants · 1 stagiaire");
    expect(team.lines.access).toBe("1 compte inactif");
  });
  it("aucun membre : jamais une ligne vide de sens", () => {
    const team = readTeam([]);
    expect(team.state).toBe("aucun membre · 0 praticien, 0 soignant · accès à jour");
    expect(team.lines.active).toBe("Aucun membre enregistré");
    expect(team.lines.vets).toBe("Aucun vétérinaire");
  });
});
