/** The label shown for a user's role (Paramètres, sidebar footer). */
export function roleLabel(role: string | null | undefined, email?: string | null): string {
  if (email === "zohir.kh@gmail.com") return "Super Administrateur";
  switch (role || "stagiaire") {
    case "admin":
      return "Administrateur";
    case "vet_principal":
      return "Vétérinaire Principal";
    case "vet_adjoint":
      return "Vétérinaire Adjoint";
    case "assistant":
      return "Assistant(e)";
    default:
      return "Stagiaire";
  }
}
