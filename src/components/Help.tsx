import React, { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Book01Icon,
  Building01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  File01Icon,
  Grid02Icon,
  HelpCircleIcon,
  Home01Icon,
  InformationCircleIcon,
  ListChecks,
  Package02Icon,
  SearchIcon,
  Settings01Icon,
  Shield01Icon,
  User02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const sections = [
  {
    id: "dashboard",
    title: "Tableau de Bord",
    icon: Home01Icon,
    description: "Vue d'ensemble de l'activité de votre clinique.",
    content: (
      <div className="space-y-4">
        <p>
          Le tableau de bord est votre centre de contrôle. Il vous permet de
          visualiser rapidement :
        </p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Le nombre de consultations du jour.</li>
          <li>Le chiffre d'affaires en temps réel.</li>
          <li>Les patients actifs et les rendez-vous à venir.</li>
          <li>Des graphiques de performance sur la semaine et le mois.</li>
        </ul>
        <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            strokeWidth={2}
            className="mt-0.5 size-4.5 shrink-0 text-primary"
          />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Les données se mettent à jour automatiquement à chaque action (fin
            de consultation, encaissement, etc.).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "agenda",
    title: "Agenda",
    icon: Calendar01Icon,
    description: "Gestion complète de votre planning et des rendez-vous.",
    content: (
      <div className="space-y-4">
        <p>Gérez votre temps efficacement avec notre agenda intuitif :</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            <strong>Création rapide :</strong> Cliquez sur "Nouveau RDV" ou sur
            un créneau libre.
          </li>
          <li>
            <strong>Codes couleurs :</strong> Identifiez rapidement le type de
            RDV (Consultation, Chirurgie, Vaccin...).
          </li>
          <li>
            <strong>Navigation :</strong> Basculez facilement entre les vues
            jour, semaine et mois.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "clinique",
    title: "Clinique",
    icon: Building01Icon,
    description: "Le cœur de votre activité médicale au quotidien.",
    content: (
      <div className="space-y-4">
        <p>C'est ici que vous gérez le flux de la journée :</p>
        <ol className="list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>
            <strong>Salle d'attente :</strong> Voyez qui est arrivé et depuis
            combien de temps.
          </li>
          <li>
            <strong>Consultation :</strong> Lancez une consultation, rédigez
            votre rapport (Diagnostic, Traitement).
          </li>
          <li>
            <strong>Facturation :</strong> Générez la facture en un clic à la
            fin de la consultation.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "patients",
    title: "Patients",
    icon: User02Icon,
    description:
      "Base de données centralisée de vos patients et propriétaires.",
    content: (
      <div className="space-y-4">
        <p>Accédez à l'historique complet de chaque animal :</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Fiches détaillées avec photo, espèce, race, et antécédents.</li>
          <li>Coordonnées des propriétaires liées.</li>
          <li>Historique des poids, vaccins et consultations passées.</li>
          <li>
            Recherche ultra-rapide par nom, propriétaire ou numéro de puce.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "notes",
    title: "Notes",
    icon: File01Icon,
    description: "Votre bloc-notes numérique intelligent.",
    content: (
      <div className="space-y-4">
        <p>Prenez des notes libres, créez des mémos ou des comptes-rendus.</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Éditeur de texte riche.</li>
          <li>Système de favoris pour retrouver vos notes importantes.</li>
          <li>Sauvegarde automatique en temps réel.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "stock",
    title: "Stock & Pharma",
    icon: Package02Icon,
    description: "Suivi précis de votre inventaire et pharmacie.",
    content: (
      <div className="space-y-4">
        <p>Ne soyez jamais à court de produits essentiels :</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Suivi des quantités en temps réel.</li>
          <li>Alertes automatiques pour les stocks bas et les péremptions.</li>
          <li>
            Gestion des fournisseurs et des commandes de réapprovisionnement.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "finances",
    title: "Finances",
    icon: Wallet01Icon,
    description: "Comptabilité simplifiée et suivi de trésorerie.",
    content: (
      <div className="space-y-4">
        <p>Gardez un œil sur la santé financière de votre clinique :</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Suivi des recettes et des dépenses.</li>
          <li>Calcul automatique du chiffre d'affaires et du bénéfice net.</li>
          <li>Export des rapports comptables pour votre expert-comptable.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "taches",
    title: "Tâches",
    icon: ListChecks,
    description: "N'oubliez plus rien grâce au gestionnaire de tâches.",
    content: (
      <div className="space-y-4">
        <p>Organisez le travail de toute l'équipe :</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Création de tâches avec priorités et dates d'échéance.</li>
          <li>Attribution des tâches aux membres de l'équipe.</li>
          <li>Rappels automatiques pour ne rien manquer.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "equipe",
    title: "Équipe",
    icon: Shield01Icon,
    description: "Gestion des utilisateurs et des permissions.",
    content: (
      <div className="space-y-4">
        <p>Gérez l'accès à l'application :</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Ajout et suppression de membres.</li>
          <li>Définition des rôles (Vétérinaire, Assistant, Admin...).</li>
          <li>Contrôle des accès aux données sensibles.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "parametres",
    title: "Paramètres",
    icon: Settings01Icon,
    description: "Configuration de l'application selon vos besoins.",
    content: (
      <div className="space-y-4">
        <p>Personnalisez votre expérience Luma Vet :</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Modification de votre profil et mot de passe.</li>
          <li>Choix du thème (Clair, Sombre, Système).</li>
          <li>Configuration des notifications et alertes.</li>
        </ul>
      </div>
    ),
  },
]

const Help: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState("dashboard")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSections = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeSection =
    sections.find((s) => s.id === activeSectionId) || sections[0]

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-[1600px] flex-col gap-0">
      {/* Hero Banner */}
      <Card className="relative overflow-hidden rounded-none border-x-0 border-t-0 shadow-sm">
        <div className="pointer-events-none absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 blur-3xl" />
        <CardContent className="relative z-10 max-w-2xl px-8 py-4">
          <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-foreground">
            <HugeiconsIcon
              icon={HelpCircleIcon}
              strokeWidth={2}
              className="size-8 text-primary"
            />
            Centre d'Aide Luma Vet
          </h1>
          <p className="mb-6 text-lg text-muted-foreground">
            Tout ce que vous devez savoir pour maîtriser votre logiciel
            vétérinaire.
          </p>

          <div className="relative max-w-md">
            <HugeiconsIcon
              icon={SearchIcon}
              strokeWidth={2}
              className="absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Rechercher dans l'aide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl py-3 pr-4 pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Menu */}
        <ScrollArea className="hidden w-72 border-r border-border bg-card md:block">
          <div className="space-y-1 p-4">
            <p className="mb-2 px-3 py-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Sommaire
            </p>
            {filteredSections.map((section) => {
              const Icon = section.icon
              const isActive = activeSectionId === section.id
              return (
                <Button
                  key={section.id}
                  variant="ghost"
                  onClick={() => setActiveSectionId(section.id)}
                  className={cn(
                    "h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive
                      ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                      : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={Icon}
                    strokeWidth={2}
                    className="size-4.5"
                  />
                  <span>{section.title}</span>
                  {isActive && (
                    <HugeiconsIcon
                      icon={Grid02Icon}
                      strokeWidth={2}
                      className="ml-auto size-4 opacity-50"
                    />
                  )}
                </Button>
              )
            })}
          </div>
        </ScrollArea>

        {/* Content Area */}
        <ScrollArea className="flex-1 bg-background">
          <div className="p-8">
            <div className="mx-auto max-w-3xl">
              <Card className="animate-in duration-500 fade-in slide-in-from-bottom-4">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                      <HugeiconsIcon
                        icon={activeSection.icon}
                        strokeWidth={2}
                        className="size-8"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold">
                        {activeSection.title}
                      </CardTitle>
                      <CardDescription>
                        {activeSection.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <Separator />

                <CardContent>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    {activeSection.content}
                  </div>
                </CardContent>

                <Separator />

                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <Badge variant="secondary" className="gap-1.5">
                      <HugeiconsIcon
                        icon={Book01Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                      Documentation officielle
                    </Badge>
                    <span>
                      Mis à jour le {new Date().toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export default Help
