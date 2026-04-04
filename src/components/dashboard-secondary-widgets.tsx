import {
  Calendar01Icon,
  Package02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type DashboardSecondaryWidgetsProps = {
  nextAppointment: {
    patient: string
    owner: string
    type: string
    when: string
  } | null
  leadVet: {
    name: string
    appointments: number
  } | null
  criticalProduct: {
    name: string
    quantity: number
    unit: string
    minStock: number
  } | null
  onOpenAgenda: () => void
  onOpenStock: () => void
  onOpenTeam: () => void
}

function WidgetMeta({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground [&_svg]:shrink-0">
      {icon}
      <span>{label}</span>
    </div>
  )
}

export function DashboardSecondaryWidgets({
  nextAppointment,
  leadVet,
  criticalProduct,
  onOpenAgenda,
  onOpenStock,
  onOpenTeam,
}: DashboardSecondaryWidgetsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
      <Card className="min-h-[220px]">
        <CardHeader>
          <WidgetMeta
            icon={<HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />}
            label="Pilotage temps réel"
          />
          <CardTitle className="text-2xl font-semibold tracking-[-0.04em]">
            {nextAppointment ? nextAppointment.patient : "Aucun créneau imminent"}
          </CardTitle>
          <CardDescription className="max-w-[48ch] text-sm leading-6">
            {nextAppointment
              ? `${nextAppointment.type} prévu pour ${nextAppointment.owner}. Le prochain passage est déjà prêt à être repris dans l'agenda.`
              : "La file clinique est calme pour l'instant. Vous pouvez préparer le prochain bloc de rendez-vous."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-muted p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Prochain créneau
            </p>
            <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground">
              {nextAppointment?.when ?? "Disponible"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextAppointment ? nextAppointment.type : "Aucun rendez-vous planifié"}
            </p>
          </div>
          <div className="rounded-3xl bg-muted p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Propriétaire
            </p>
            <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground">
              {nextAppointment?.owner ?? "Aucun dossier"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextAppointment ? "Ouverture rapide du dossier depuis l'agenda" : "Aucune action urgente en attente"}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onOpenAgenda}>
            Ouvrir l'agenda
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Card size="sm">
          <CardHeader>
            <WidgetMeta
              icon={<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />}
              label="Charge équipe"
            />
            <CardTitle className="text-xl font-semibold tracking-[-0.03em]">
              {leadVet?.name ?? "Équipe locale"}
            </CardTitle>
            <CardDescription>
              {leadVet
                ? `${leadVet.appointments} rendez-vous à absorber sur la période visible.`
                : "Aucune charge distribuée pour l'instant."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" size="sm" onClick={onOpenTeam}>
              Voir l'équipe
            </Button>
          </CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <WidgetMeta
              icon={<HugeiconsIcon icon={Package02Icon} strokeWidth={2} />}
              label="Vigilance stock"
            />
            <CardTitle className="text-xl font-semibold tracking-[-0.03em]">
              {criticalProduct?.name ?? "Stock sous contrôle"}
            </CardTitle>
            <CardDescription>
              {criticalProduct
                ? `${criticalProduct.quantity} ${criticalProduct.unit} restants pour un seuil à ${criticalProduct.minStock}.`
                : "Aucun article critique n'est remonté sur la vue actuelle."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" size="sm" onClick={onOpenStock}>
              Ouvrir les produits
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
