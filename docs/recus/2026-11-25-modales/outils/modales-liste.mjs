// Chaque modale : sa page, les gestes qui l'ouvrent.
const dossier = async (p, nom = "Rex") => { await p.go("patients"); await p.btn(`Ouvrir le dossier de ${nom}`); await p.waitForTimeout(1500); };
const onglet = async (p, nom) => { await p.getByRole("tab", { name: new RegExp(`^${nom}`) }).first().click(); await p.waitForTimeout(1200); };
const creerPatient = async (p) => {
  await p.go("patients"); await p.btn("Nouveau patient");
  await p.getByPlaceholder("Nom de famille").fill("Banc"); await p.getByPlaceholder("Numéro de mobile").fill("0550000000");
  await p.getByPlaceholder("Nom de l’animal").fill("Pixel"); await p.getByPlaceholder("Chien, chat…").or(p.getByPlaceholder("Chien, chat...")).first().fill("Chien");
  await p.getByRole("button", { name: /Créer le dossier/ }).click(); await p.waitForTimeout(1500);
};
export const MODALES = [
  { id: "patients-nouveau", open: async (p) => { await p.go("patients"); await p.btn("Nouveau patient"); } },
  { id: "patients-coordonnees", open: async (p) => { await p.go("patients"); await p.btn(/Modifier les coordonnées de/); } },
  { id: "agenda-nouveau-rdv", open: async (p) => { await p.go("agenda"); await p.btn("Nouveau rendez-vous"); } },
  { id: "flux-sans-rdv", open: async (p) => { await p.go("flux"); await p.btn("Arrivée sans RDV"); } },
  { id: "soins-planifier", open: async (p) => { await p.go("clinique"); await p.btn("Planifier un soin"); } },
  { id: "stock-nouveau-produit", open: async (p) => { await p.go("stock"); await p.btn("Nouveau produit"); } },
  { id: "finances-nouvelle-facture", open: async (p) => { await p.go("finances"); await p.btn("Nouvelle facture"); } },
  { id: "equipe-nouveau-membre", open: async (p) => { await p.go("equipe"); await p.btn("Nouveau membre"); } },
  { id: "dossier-archiver", open: async (p) => { await dossier(p); await p.btn(/^Actions$/); await p.item("Archiver ce dossier"); } },
  { id: "dossier-export-pdf", open: async (p) => { await dossier(p); await p.btn(/^Actions$/); await p.item("Exporter en PDF"); } },
  { id: "dossier-carnet-sante", open: async (p) => { await dossier(p); await p.btn(/^Actions$/); await p.item("Carnet de santé"); } },
  { id: "dossier-ordonnance", open: async (p) => { await dossier(p); await onglet(p, "Ordonnances"); await p.btn("Nouvelle ordonnance"); } },
  { id: "dossier-hospitalisation", open: async (p) => { await dossier(p); await onglet(p, "Hospitalisations"); await p.btn("Nouvelle hospitalisation"); } },
  { id: "dossier-anesthesie", open: async (p) => { await dossier(p); await onglet(p, "Anesthésies"); await p.btn("Nouvelle feuille d'anesthésie"); } },
  { id: "dossier-vaccin", open: async (p) => { await dossier(p); await onglet(p, "Vaccinations"); await p.btn("Ajouter un vaccin"); } },
  { id: "dossier-pesee", open: async (p) => { await dossier(p); await onglet(p, "Poids"); await p.btn("Ajouter une pesée"); } },
  { id: "dossier-lecture-documents", open: async (p) => { await dossier(p); await onglet(p, "Documents"); await p.btn("Lire avec l’assistant"); } },
  { id: "dossier-coordonnees", open: async (p) => { await dossier(p); await p.btn("Modifier les coordonnées"); } },
  { id: "stock-reception", open: async (p) => { await p.go("stock"); await p.btn("Actions pour Vaccin rage canine"); await p.item(/^Réceptionner/); } },
  { id: "stock-modifier", open: async (p) => { await p.go("stock"); await p.btn("Actions pour Vaccin rage canine"); await p.item(/^Modifier/); } },
  { id: "stock-inventaire", open: async (p) => { await p.go("stock"); await onglet(p, "Inventaire"); await p.btn("Démarrer un comptage"); } },
  { id: "equipe-reinitialiser", open: async (p) => { await p.go("equipe"); await p.btn(/Actions pour Dr Lina/); await p.item(/Réinitialiser le mot de passe/); } },
  { id: "equipe-modifier", open: async (p) => { await p.go("equipe"); await p.btn(/Actions pour Dr Lina/); await p.item(/Modifier le rôle/); } },
  { id: "equipe-supprimer", open: async (p) => { await p.go("equipe"); await p.btn(/Actions pour Dr Lina/); await p.item(/Supprimer définitivement/); } },
  { id: "equipe-mot-de-passe-temporaire", open: async (p) => { await p.go("equipe"); await p.btn(/Actions pour Dr Lina/); await p.item(/Réinitialiser le mot de passe/); await p.getByRole("alertdialog").getByRole("button", { name: /^Générer/ }).last().click(); await p.waitForTimeout(1500); } },
  { id: "documents-lien", open: async (p) => { await p.go("notes"); await p.btn(/^Ajouter$/); await p.item(/Ajouter un lien/); } },
  { id: "agenda-modifier-rdv", open: async (p) => { await p.go("agenda"); await p.btn(/Actions pour Milo/); await p.btn(/^Modifier$/); } },
  { id: "agenda-supprimer-rdv", open: async (p) => { await p.go("agenda"); await p.btn(/Actions pour Milo/); await p.btn(/^Modifier$/); await p.getByRole("dialog").getByRole("button", { name: /^Supprimer/ }).first().click(); await p.waitForTimeout(900); } },
  { id: "parametres-modele-nouveau", open: async (p) => { await p.go("parametres"); await p.btn(/^Modèles de documents$/); await p.btn(/^Nouveau modèle$/); } },
  { id: "parametres-modele-supprimer", open: async (p) => { await p.go("parametres"); await p.btn(/^Modèles de documents$/); await p.btn(/^Supprimer Certificat de consultation$/); } },
  { id: "parametres-reinitialiser", open: async (p) => { await p.go("parametres"); await p.btn(/^Sauvegarde$/); await p.btn(/^Réinitialiser$/); } },
  { id: "parametres-apercu-facture", open: async (p) => { await p.go("parametres"); await p.btn(/^Facturation$/); await p.btn(/^Aperçu PDF$/); } },
  { id: "hospitalisation-admettre", open: async (p) => { await p.go("clinique"); await onglet(p, "Hospitalisation"); await p.btn(/^Admettre un patient$/); } },
  { id: "rapide-consultation", open: async (p) => { await p.go("dashboard"); await p.btn("Actions rapides"); await p.item(/^Consultation$/); } },
  { id: "rapide-soin", open: async (p) => { await p.go("dashboard"); await p.btn("Actions rapides"); await p.item(/^Soin$/); } },
  { id: "rapide-patient", open: async (p) => { await p.go("dashboard"); await p.btn("Actions rapides"); await p.item(/^Patient$/); } },
  { id: "flux-dossier-apercu", open: async (p) => { await p.go("flux"); await p.btn("Ouvrir le dossier de Milo"); } },
  { id: "hospitalisation-emplacement", open: async (p) => { await p.go("clinique"); await onglet(p, "Hospitalisation"); await onglet(p, "Emplacements"); await p.btn(/^Créer un emplacement$/); } },
  { id: "patients-dossier-cree", open: async (p) => { await creerPatient(p); } },
  { id: "patients-fiche", open: async (p) => { await creerPatient(p); await p.keyboard.press("Escape"); await p.waitForTimeout(1200); } },
  { id: "ordonnance-signer", open: async (p) => { await dossier(p); await onglet(p, "Ordonnances"); await p.btn("Nouvelle ordonnance"); await p.btn(/^Signer et finaliser$/); } },
  { id: "ordonnance-modeles", open: async (p) => { await dossier(p); await onglet(p, "Ordonnances"); await p.btn("Nouvelle ordonnance"); await p.btn(/^Modèles$/); } },
  { id: "ordonnance-apercu", open: async (p) => { await dossier(p); await onglet(p, "Ordonnances"); await p.btn("Nouvelle ordonnance"); await p.btn(/^Aperçu$/); } },
  { id: "dossier-vaccin-supprimer", open: async (p) => { await dossier(p); await onglet(p, "Vaccinations"); await p.btn("Ajouter un vaccin"); await p.getByPlaceholder("Ex. Nobivac Rabies").fill("Rage"); await p.getByRole("dialog").getByRole("button", { name: /Enregistrer|Ajouter/ }).last().click(); await p.waitForTimeout(1500); await p.getByRole("button", { name: /^Supprimer/ }).first().click(); await p.waitForTimeout(900); } },
];
