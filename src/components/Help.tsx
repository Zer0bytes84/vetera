"use client";

import {
  Book01Icon,
  Building01Icon,
  Calendar01Icon,
  File01Icon,
  HelpCircleIcon,
  InformationCircleIcon,
  ListChecks,
  Package02Icon,
  Settings01Icon,
  Shield01Icon,
  User02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as React from "react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface Section {
  content: React.ReactNode;
  description: string;
  icon: any;
  id: string;
  title: string;
}

const sections: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    icon: HelpCircleIcon,
    description: `Bienvenue dans l'espace de documentation et de support de ${APP_NAME}.`,
    content: (
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
          {APP_NAME} est une plateforme clinique intelligente tout-en-un conçue
          pour simplifier la gestion quotidienne de votre activité vétérinaire.
          De l'accueil du patient à la facturation, en passant par le suivi des
          dossiers médicaux et des stocks, découvrez comment optimiser vos flux
          de travail.
        </p>

        <div className="mt-8">
          <h3 className="mb-4 font-bold text-xs text-zinc-800 uppercase tracking-widest dark:text-zinc-300">
            Guides de démarrage rapide
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-5 transition-all duration-200 hover:border-zinc-200 dark:border-white/5 dark:bg-white/[0.01] dark:hover:border-white/10">
              <h4 className="mb-2 font-semibold text-sm text-zinc-900 dark:text-white">
                🐾 1. Fiches Patients
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
                Configurez les profils des animaux (espèce, race, poids,
                antécédents) et associez-les instantanément à leurs
                propriétaires pour un accès rapide.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-5 transition-all duration-200 hover:border-zinc-200 dark:border-white/5 dark:bg-white/[0.01] dark:hover:border-white/10">
              <h4 className="mb-2 font-semibold text-sm text-zinc-900 dark:text-white">
                📅 2. Agenda Clinique
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
                Planifiez des consultations et des chirurgies. Utilisez les
                codes couleurs pour catégoriser vos rendez-vous et optimiser
                votre temps.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-5 transition-all duration-200 hover:border-zinc-200 dark:border-white/5 dark:bg-white/[0.01] dark:hover:border-white/10">
              <h4 className="mb-2 font-semibold text-sm text-zinc-900 dark:text-white">
                🩺 3. Consultation active
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
                Suivez la salle d'attente, rédigez vos comptes-rendus médicaux,
                saisissez vos prescriptions et facturez le client en un clic.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-5 transition-all duration-200 hover:border-zinc-200 dark:border-white/5 dark:bg-white/[0.01] dark:hover:border-white/10">
              <h4 className="mb-2 font-semibold text-sm text-zinc-900 dark:text-white">
                📦 4. Gestion de Stock
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
                Suivez votre pharmacie et vos consommables en temps réel.
                Configurez des alertes de rupture pour ne jamais manquer de
                produits clés.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-100 bg-zinc-50/50 p-5 dark:border-white/5 dark:bg-white/[0.01]">
          <h3 className="mb-3 font-bold text-xs text-zinc-800 uppercase tracking-widest dark:text-zinc-300">
            Foire Aux Questions (FAQ)
          </h3>
          <div className="space-y-4 divide-y divide-zinc-100 dark:divide-white/5">
            <div className="pt-3 first:pt-0">
              <h5 className="font-semibold text-xs text-zinc-900 dark:text-white">
                Comment fonctionne la facturation automatique ?
              </h5>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
                À la fin d'une consultation active dans le module Clinique,
                cliquez sur "Générer la facture". Le système regroupe les actes
                saisis et les produits consommés pour créer un document prêt à
                être encaissé et comptabilisé.
              </p>
            </div>
            <div className="pt-3">
              <h5 className="font-semibold text-xs text-zinc-900 dark:text-white">
                Les données de stock se mettent-elles à jour toutes seules ?
              </h5>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
                Oui. Dès qu'un produit ou médicament est prescrit et facturé
                lors d'une consultation, la quantité correspondante est
                automatiquement déduite de votre inventaire en temps réel.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "patients",
    title: "Patients & Propriétaires",
    icon: User02Icon,
    description:
      "Base de données centralisée de vos patients et propriétaires.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Accédez à l'historique complet de chaque animal :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Fiches détaillées :</strong> Suivi de la photo, espèce,
            race, poids et antécédents médicaux.
          </li>
          <li>
            <strong>Propriétaires liés :</strong> Coordonnées complètes,
            historique de facturation et encours.
          </li>
          <li>
            <strong>Courbe de poids :</strong> Visualisation graphique de
            l'évolution pondérale de l'animal.
          </li>
          <li>
            <strong>Recherche ultra-rapide :</strong> Recherche instantanée par
            nom d'animal, nom du propriétaire ou numéro de puce.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "agenda",
    title: "Agenda & Calendrier",
    icon: Calendar01Icon,
    description: "Gestion complète de votre planning et des rendez-vous.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Gérez votre temps efficacement avec notre agenda intuitif :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Création rapide :</strong> Double-cliquez sur un créneau ou
            cliquez sur le bouton "Nouveau RDV".
          </li>
          <li>
            <strong>Codes couleurs :</strong> Identifiez rapidement le type de
            rendez-vous (Consultation, Chirurgie, Vaccin, Urgence).
          </li>
          <li>
            <strong>Vues multiples :</strong> Basculez d'un clic entre les vues
            jour, semaine et mois pour une meilleure visibilité.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "clinique",
    title: "Clinique & Consultations",
    icon: Building01Icon,
    description: "Le cœur de votre activité médicale au quotidien.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Suivez le flux des patients de la salle d'attente à la facturation :
        </p>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong>Salle d'attente :</strong> Voyez qui est arrivé, l'heure
            d'arrivée et le statut de chaque patient.
          </li>
          <li>
            <strong>Consultation Active :</strong> Lancez l'examen, saisissez le
            diagnostic, rédigez vos prescriptions et mettez à jour la fiche
            médicale.
          </li>
          <li>
            <strong>Ordonnances & Facturation :</strong> Éditez l'ordonnance et
            validez les lignes de soins pour générer directement la facture en
            un clic.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "notes",
    title: "Notes & Comptes-rendus",
    icon: File01Icon,
    description: "Votre bloc-notes numérique intelligent et partagé.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Prenez des notes libres, créez des mémos ou des comptes-rendus :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Éditeur de texte riche :</strong> Formatez vos notes avec
            des listes, des titres, et des tableaux médicaux.
          </li>
          <li>
            <strong>Favoris & Recherche :</strong> Marquez vos notes les plus
            consultées pour les retrouver en un clic.
          </li>
          <li>
            <strong>Sauvegarde automatique :</strong> Vos modifications sont
            enregistrées en temps réel pour ne jamais rien perdre.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "stock",
    title: "Stock & Pharmacie",
    icon: Package02Icon,
    description: "Suivi précis de votre inventaire et pharmacie.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Ne soyez jamais à court de produits essentiels :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Inventaire en temps réel :</strong> Mises à jour
            automatiques lors des ventes et prescriptions cliniques.
          </li>
          <li>
            <strong>Alertes de stocks bas :</strong> Notifications visuelles dès
            qu'un produit franchit son seuil de sécurité.
          </li>
          <li>
            <strong>Gestion des fournisseurs :</strong> Centralisez vos fiches
            fournisseurs pour simplifier vos réapprovisionnements.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "finances",
    title: "Finances & Recettes",
    icon: Wallet01Icon,
    description: "Comptabilité simplifiée et suivi de trésorerie.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Gardez un œil sur la santé financière de votre clinique :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Recettes du jour :</strong> Suivi immédiat du chiffre
            d'affaires et ventilation par mode de paiement (espèces, carte,
            chèque).
          </li>
          <li>
            <strong>Factures & Règlements :</strong> Historique complet de
            facturation, gestion des paiements fractionnés ou différés.
          </li>
          <li>
            <strong>Export comptable :</strong> Générez en un clic les fichiers
            nécessaires pour votre expert-comptable.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "taches",
    title: "Tâches & Organisation",
    icon: ListChecks,
    description: "Ne manquez aucun événement ou action clinique.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Coordonnez les actions de toute l'équipe vétérinaire :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Priorités visuelles :</strong> Attribuez des priorités
            (Haute, Moyenne, Basse) avec indicateurs lumineux.
          </li>
          <li>
            <strong>Attribution :</strong> Affectez chaque tâche à un
            vétérinaire ou à un assistant de la clinique.
          </li>
          <li>
            <strong>Actions rapides :</strong> Cochez une tâche directement
            depuis le tableau de bord pour mettre à jour les indicateurs.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "equipe",
    title: "Équipe & Rôles",
    icon: Shield01Icon,
    description: "Gestion des utilisateurs et des niveaux de permissions.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Contrôlez l'accès aux données de votre structure :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Gestion des profils :</strong> Créez des comptes individuels
            pour chaque collaborateur.
          </li>
          <li>
            <strong>Niveaux d'accès :</strong> Définissez les rôles :
            Administrateur (accès complet), Vétérinaire (médical & facturation),
            Assistant (salle d'attente, administratif).
          </li>
          <li>
            <strong>Sécurité des données :</strong> Chiffrement des accès et
            respect de la confidentialité médicale.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "parametres",
    title: "Paramètres du Système",
    icon: Settings01Icon,
    description: "Configuration générale et préférences.",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">
          Ajustez l'application selon vos préférences :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Fiche Clinique :</strong> Renseignez les coordonnées de
            votre établissement, numéros de TVA et logo.
          </li>
          <li>
            <strong>Thèmes de l'interface :</strong> Basculez instantanément
            entre les modes Clair, Sombre et Système.
          </li>
          <li>
            <strong>Paramètres régionaux :</strong> Gestion de la langue,
            devises et fuseaux horaires.
          </li>
        </ul>
      </div>
    ),
  },
];

const sidebarCategories = [
  {
    title: "GUIDE DE BIENVENUE",
    items: ["introduction"],
  },
  {
    title: "PARCOURS PATIENT",
    items: ["patients", "agenda", "clinique"],
  },
  {
    title: "OPÉRATIONS",
    items: ["stock", "finances"],
  },
  {
    title: "OUTILS COLLABORATIFS",
    items: ["notes", "taches"],
  },
  {
    title: "SÉCURITÉ & OPTIONS",
    items: ["equipe", "parametres"],
  },
];

export function Help() {
  const [activeSectionId, setActiveSectionId] = useState("introduction");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const activeSection =
    sections.find((s) => s.id === activeSectionId) || sections[0];

  const handleFeedback = (helpful: boolean) => {
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
    }, 4000);
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = sidebarCategories
    .map((category) => {
      const items = category.items.filter((itemId) => {
        const section = sections.find((s) => s.id === itemId);
        if (!section) {
          return false;
        }
        return (
          section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      return { ...category, items };
    })
    .filter((c) => c.items.length > 0);

  return (
    <div className="mx-auto flex h-[calc(100svh-88px)] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/50 shadow-sm backdrop-blur-xl lg:flex-row dark:border-white/10 dark:bg-zinc-950/20">
      {/* Left Premium Secondary Sidebar */}
      <aside className="flex w-full shrink-0 flex-col border-zinc-200/80 border-r bg-zinc-50/50 lg:w-72 dark:border-white/5 dark:bg-zinc-900/30">
        <div className="border-zinc-200/80 border-b p-4 dark:border-white/5">
          <h2 className="mb-3 font-semibold text-zinc-900 tracking-tight dark:text-white">
            Centre d'aide
          </h2>
          <div className="relative">
            <HugeiconsIcon
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400"
              icon={HelpCircleIcon}
            />
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pr-3 pl-9 text-sm outline-none transition-all placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-zinc-900"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une rubrique..."
              type="text"
              value={searchQuery}
            />
          </div>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-6">
            {filteredCategories.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                Aucun résultat trouvé.
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div className="space-y-1.5" key={category.title}>
                  <h3 className="mb-2 pl-3 font-semibold text-[11px] text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    {category.title}
                  </h3>
                  <ul className="space-y-0.5" role="list">
                    {category.items.map((itemId) => {
                      const section = sections.find((s) => s.id === itemId);
                      if (!section) {
                        return null;
                      }

                      const Icon = section.icon;
                      const isActive = activeSectionId === itemId;

                      return (
                        <li key={itemId}>
                          <button
                            className={cn(
                              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-sm transition-all duration-200",
                              isActive
                                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/50 dark:bg-zinc-800 dark:text-white dark:ring-white/5"
                                : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                            )}
                            onClick={() => {
                              setActiveSectionId(itemId);
                              setFeedbackSubmitted(false);
                            }}
                            type="button"
                          >
                            <HugeiconsIcon
                              className={cn(
                                "size-4 shrink-0 transition-colors duration-200",
                                isActive
                                  ? "text-primary"
                                  : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                              )}
                              icon={Icon}
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className="truncate">{section.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Right Documentation Pane */}
      <ScrollArea className="h-full min-w-0 flex-1 bg-white/40 dark:bg-transparent">
        <main className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-12">
          <div className="fade-in slide-in-from-bottom-4 animate-in space-y-8 duration-500">
            {/* Header Topic details */}
            <div className="flex items-start gap-5 border-zinc-100 border-b pb-8 dark:border-white/5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 shadow-sm ring-1 ring-zinc-200/80 dark:from-zinc-800/50 dark:to-zinc-900/50 dark:ring-white/10">
                <HugeiconsIcon
                  className="size-6 text-zinc-700 dark:text-zinc-300"
                  icon={activeSection.icon}
                  strokeWidth={2}
                />
              </div>
              <div>
                <h1 className="font-bold text-2xl text-zinc-900 tracking-tight md:text-3xl dark:text-white">
                  {activeSection.title}
                </h1>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed md:text-base dark:text-zinc-400">
                  {activeSection.description}
                </p>
              </div>
            </div>

            {/* Active Section Content */}
            <div className="prose prose-zinc dark:prose-invert prose-sm md:prose-base min-h-[35vh] max-w-none py-4">
              {activeSection.content}
            </div>

            {/* Alert Tips inside active section */}
            {activeSection.id !== "introduction" && (
              <div className="mt-8 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm dark:border-primary/20 dark:bg-primary/10">
                <HugeiconsIcon
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  icon={InformationCircleIcon}
                  strokeWidth={2}
                />
                <div className="text-sm text-zinc-700 leading-relaxed dark:text-zinc-300">
                  <strong className="mr-2 font-semibold text-primary">
                    Conseil de pro :
                  </strong>
                  Les données et indicateurs sont synchronisés automatiquement.
                  Si vous rencontrez un problème persistant, n'hésitez pas à
                  solliciter notre support technique.
                </div>
              </div>
            )}

            {/* Integrated Feedback & Stats footer block */}
            <footer className="mt-16 flex flex-col gap-4 border-zinc-100 border-t pt-8 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
              <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                <HugeiconsIcon
                  className="size-4 shrink-0"
                  icon={Book01Icon}
                  strokeWidth={2}
                />
                <span>Documentation officielle {APP_NAME} • Rév. 2026.5</span>
              </div>

              {/* Integrated "Useful?" feedback */}
              <div className="flex items-center gap-4">
                {feedbackSubmitted ? (
                  <span className="fade-in flex animate-in items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 font-semibold text-primary duration-300">
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
                    Merci pour votre retour !
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">
                      Cette page vous a-t-elle aidé ?
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 font-medium text-zinc-600 shadow-sm transition-colors duration-200 hover:bg-zinc-100 hover:shadow dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
                        onClick={() => handleFeedback(true)}
                        type="button"
                      >
                        Oui
                      </button>
                      <button
                        className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 font-medium text-zinc-600 shadow-sm transition-colors duration-200 hover:bg-zinc-100 hover:shadow dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
                        onClick={() => handleFeedback(false)}
                        type="button"
                      >
                        Non
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </footer>
          </div>
        </main>
      </ScrollArea>
    </div>
  );
}

export default Help;
