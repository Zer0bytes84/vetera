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
import * as React from "react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  icon: any;
  description: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    icon: HelpCircleIcon,
    description: `Bienvenue dans l'espace de documentation et de support de ${APP_NAME}.`,
    content: (
      <div className="space-y-6">
        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
          {APP_NAME} est une plateforme clinique intelligente tout-en-un conçue pour simplifier la gestion quotidienne de votre activité vétérinaire. De l'accueil du patient à la facturation, en passant par le suivi des dossiers médicaux et des stocks, découvrez comment optimiser vos flux de travail.
        </p>

        <div className="mt-8">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-widest mb-4">
            Guides de démarrage rapide
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-zinc-100 bg-zinc-50/50 dark:border-white/5 dark:bg-white/[0.01] hover:border-zinc-200 dark:hover:border-white/10 transition-all duration-200">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">🐾 1. Fiches Patients</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Configurez les profils des animaux (espèce, race, poids, antécédents) et associez-les instantanément à leurs propriétaires pour un accès rapide.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-100 bg-zinc-50/50 dark:border-white/5 dark:bg-white/[0.01] hover:border-zinc-200 dark:hover:border-white/10 transition-all duration-200">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">📅 2. Agenda Clinique</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Planifiez des consultations et des chirurgies. Utilisez les codes couleurs pour catégoriser vos rendez-vous et optimiser votre temps.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-100 bg-zinc-50/50 dark:border-white/5 dark:bg-white/[0.01] hover:border-zinc-200 dark:hover:border-white/10 transition-all duration-200">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">🩺 3. Consultation active</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Suivez la salle d'attente, rédigez vos comptes-rendus médicaux, saisissez vos prescriptions et facturez le client en un clic.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-100 bg-zinc-50/50 dark:border-white/5 dark:bg-white/[0.01] hover:border-zinc-200 dark:hover:border-white/10 transition-all duration-200">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">📦 4. Gestion de Stock</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Suivez votre pharmacie et vos consommables en temps réel. Configurez des alertes de rupture pour ne jamais manquer de produits clés.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-100 bg-zinc-50/50 dark:border-white/5 dark:bg-white/[0.01] p-5">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-widest mb-3">
            Foire Aux Questions (FAQ)
          </h3>
          <div className="space-y-4 divide-y divide-zinc-100 dark:divide-white/5">
            <div className="pt-3 first:pt-0">
              <h5 className="text-xs font-semibold text-zinc-900 dark:text-white">Comment fonctionne la facturation automatique ?</h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                À la fin d'une consultation active dans le module Clinique, cliquez sur "Générer la facture". Le système regroupe les actes saisis et les produits consommés pour créer un document prêt à être encaissé et comptabilisé.
              </p>
            </div>
            <div className="pt-3">
              <h5 className="text-xs font-semibold text-zinc-900 dark:text-white">Les données de stock se mettent-elles à jour toutes seules ?</h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Oui. Dès qu'un produit ou médicament est prescrit et facturé lors d'une consultation, la quantité correspondante est automatiquement déduite de votre inventaire en temps réel.
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
    description: "Base de données centralisée de vos patients et propriétaires.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Accédez à l'historique complet de chaque animal :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Fiches détaillées :</strong> Suivi de la photo, espèce, race, poids et antécédents médicaux.</li>
          <li><strong>Propriétaires liés :</strong> Coordonnées complètes, historique de facturation et encours.</li>
          <li><strong>Courbe de poids :</strong> Visualisation graphique de l'évolution pondérale de l'animal.</li>
          <li><strong>Recherche ultra-rapide :</strong> Recherche instantanée par nom d'animal, nom du propriétaire ou numéro de puce.</li>
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
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Gérez votre temps efficacement avec notre agenda intuitif :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Création rapide :</strong> Double-cliquez sur un créneau ou cliquez sur le bouton "Nouveau RDV".</li>
          <li><strong>Codes couleurs :</strong> Identifiez rapidement le type de rendez-vous (Consultation, Chirurgie, Vaccin, Urgence).</li>
          <li><strong>Vues multiples :</strong> Basculez d'un clic entre les vues jour, semaine et mois pour une meilleure visibilité.</li>
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
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Suivez le flux des patients de la salle d'attente à la facturation :</p>
        <ol className="list-decimal space-y-3 pl-5">
          <li><strong>Salle d'attente :</strong> Voyez qui est arrivé, l'heure d'arrivée et le statut de chaque patient.</li>
          <li><strong>Consultation Active :</strong> Lancez l'examen, saisissez le diagnostic, rédigez vos prescriptions et mettez à jour la fiche médicale.</li>
          <li><strong>Ordonnances & Facturation :</strong> Éditez l'ordonnance et validez les lignes de soins pour générer directement la facture en un clic.</li>
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
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Prenez des notes libres, créez des mémos ou des comptes-rendus :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Éditeur de texte riche :</strong> Formatez vos notes avec des listes, des titres, et des tableaux médicaux.</li>
          <li><strong>Favoris & Recherche :</strong> Marquez vos notes les plus consultées pour les retrouver en un clic.</li>
          <li><strong>Sauvegarde automatique :</strong> Vos modifications sont enregistrées en temps réel pour ne jamais rien perdre.</li>
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
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Ne soyez jamais à court de produits essentiels :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Inventaire en temps réel :</strong> Mises à jour automatiques lors des ventes et prescriptions cliniques.</li>
          <li><strong>Alertes de stocks bas :</strong> Notifications visuelles dès qu'un produit franchit son seuil de sécurité.</li>
          <li><strong>Gestion des fournisseurs :</strong> Centralisez vos fiches fournisseurs pour simplifier vos réapprovisionnements.</li>
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
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Gardez un œil sur la santé financière de votre clinique :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Recettes du jour :</strong> Suivi immédiat du chiffre d'affaires et ventilation par mode de paiement (espèces, carte, chèque).</li>
          <li><strong>Factures & Règlements :</strong> Historique complet de facturation, gestion des paiements fractionnés ou différés.</li>
          <li><strong>Export comptable :</strong> Générez en un clic les fichiers nécessaires pour votre expert-comptable.</li>
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
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Coordonnez les actions de toute l'équipe vétérinaire :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Priorités visuelles :</strong> Attribuez des priorités (Haute, Moyenne, Basse) avec indicateurs lumineux.</li>
          <li><strong>Attribution :</strong> Affectez chaque tâche à un vétérinaire ou à un assistant de la clinique.</li>
          <li><strong>Actions rapides :</strong> Cochez une tâche directement depuis le tableau de bord pour mettre à jour les indicateurs.</li>
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
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Contrôlez l'accès aux données de votre structure :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Gestion des profils :</strong> Créez des comptes individuels pour chaque collaborateur.</li>
          <li><strong>Niveaux d'accès :</strong> Définissez les rôles : Administrateur (accès complet), Vétérinaire (médical & facturation), Assistant (salle d'attente, administratif).</li>
          <li><strong>Sécurité des données :</strong> Chiffrement des accès et respect de la confidentialité médicale.</li>
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
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-white">Ajustez l'application selon vos préférences :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Fiche Clinique :</strong> Renseignez les coordonnées de votre établissement, numéros de TVA et logo.</li>
          <li><strong>Thèmes de l'interface :</strong> Basculez instantanément entre les modes Clair, Sombre et Système.</li>
          <li><strong>Paramètres régionaux :</strong> Gestion de la langue, devises et fuseaux horaires.</li>
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

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] w-full min-w-0 max-w-[1400px] flex-col gap-0 px-4 lg:px-8 pb-6 page-enter">
      <div className="flex flex-1 overflow-hidden gap-8 mt-6">
        
        {/* Left Minimalist Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col gap-6 md:flex pr-4 border-r border-zinc-100 dark:border-white/5">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-6">
              {sidebarCategories.map((category) => (
                <div key={category.title} className="space-y-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-4">
                    {category.title}
                  </h3>
                  <ul role="list" className="space-y-1 relative pl-2">
                    {/* Vertical guideline */}
                    <div className="absolute left-2.5 top-0 bottom-0 w-px bg-zinc-100 dark:bg-white/5" />
                    
                    {category.items.map((itemId) => {
                      const section = sections.find((s) => s.id === itemId);
                      if (!section) return null;
                      
                      const Icon = section.icon;
                      const isActive = activeSectionId === itemId;
                      
                      return (
                        <li key={itemId} className="relative">
                          {isActive && (
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-500 rounded-r" />
                          )}
                          <button
                            onClick={() => {
                              setActiveSectionId(itemId);
                              setFeedbackSubmitted(false);
                            }}
                            className={cn(
                              "group flex items-center gap-3 py-1.5 pl-6 text-xs font-semibold transition-all duration-200 cursor-pointer w-full text-left rounded-md",
                              isActive
                                ? "text-zinc-900 dark:text-white font-bold"
                                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                            )}
                            type="button"
                          >
                            <HugeiconsIcon
                              className={cn(
                                "size-4 shrink-0 transition-transform duration-200",
                                isActive 
                                  ? "text-emerald-500 scale-105" 
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
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Right Documentation Pane (Transparent full-bleed typography layout) */}
        <ScrollArea className="flex-1 min-w-0 h-full">
          <main className="max-w-2xl px-2 md:px-6 pb-16">
            <div className="space-y-6">
              
              {/* Header Topic details */}
              <div className="flex items-start gap-4 border-b border-zinc-100 pb-6 dark:border-white/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 ring-1 ring-zinc-200/80 dark:bg-white/[0.02] dark:ring-white/5 shadow-xs">
                  <HugeiconsIcon
                    className="size-5 text-zinc-700 dark:text-zinc-200"
                    icon={activeSection.icon}
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                    {activeSection.title}
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed font-semibold">
                    {activeSection.description}
                  </p>
                </div>
              </div>

              {/* Active Section Content */}
              <div className="py-2 min-h-[30vh]">
                {activeSection.content}
              </div>

              {/* Alert Tips inside active section */}
              {activeSection.id !== "introduction" && (
                <div className="mt-8 flex gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-4 dark:border-emerald-400/10 dark:bg-emerald-400/[0.01]">
                  <HugeiconsIcon
                    className="mt-0.5 size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    icon={InformationCircleIcon}
                    strokeWidth={2}
                  />
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">Conseil :</strong> Les données et indicateurs sont synchronisés automatiquement. Si vous rencontrez un problème persistant, n'hésitez pas à solliciter notre support technique.
                  </div>
                </div>
              )}

              {/* Integrated Feedback & Stats footer block */}
              <footer className="mt-12 border-t border-zinc-100 dark:border-white/5 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                  <HugeiconsIcon className="size-4 shrink-0" icon={Book01Icon} strokeWidth={2} />
                  <span>Documentation officielle bAItari • Mis à jour le {new Date().toLocaleDateString("fr-FR")}</span>
                </div>

                {/* Integrated "Useful?" feedback */}
                <div className="flex items-center gap-4">
                  {feedbackSubmitted ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in duration-300">
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Merci pour votre retour !
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Cette page est-elle utile ?</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFeedback(true)}
                          className="px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors duration-200 text-xs font-semibold"
                          type="button"
                        >
                          Oui
                        </button>
                        <button
                          onClick={() => handleFeedback(false)}
                          className="px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors duration-200 text-xs font-semibold"
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
    </div>
  );
}

export default Help;
