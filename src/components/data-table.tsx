"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

export type DashboardRow = {
  id: string | number
  patient: string
  owner: string
  type: string
  appointmentAt: string
  status: string
  veterinarian: string
  summary: string
  notes: string
  diagnosis: string
  treatment: string
  tab: "planning" | "aujourdhui" | "attention" | "termine"
}

const tabs: Array<{ value: DashboardRow["tab"]; label: string }> = [
  { value: "planning", label: "Planning" },
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "attention", label: "Attention" },
  { value: "termine", label: "Terminé" },
]

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "Urgence") return "default"
  if (status === "Terminé") return "secondary"
  return "outline"
}

export function DataTable({
  data,
  onCreate,
}: {
  data: DashboardRow[]
  onCreate?: () => void
}) {
  const [query, setQuery] = React.useState("")
  const [view, setView] = React.useState<DashboardRow["tab"]>("planning")

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.filter((row) => {
      const matchesTab = view === "planning" ? true : row.tab === view
      const matchesQuery =
        !needle ||
        [
          row.patient,
          row.owner,
          row.type,
          row.status,
          row.summary,
          row.veterinarian,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle)

      return matchesTab && matchesQuery
    })
  }, [data, query, view])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardDescription>Registre clinique</CardDescription>
        <CardTitle className="text-2xl tracking-[-0.04em]">
          Activité des dossiers
        </CardTitle>
        <CardAction>
          <Button onClick={onCreate}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
            Nouveau rendez-vous
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="flex flex-col gap-4 px-6 pt-4 pb-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as DashboardRow["tab"])}
            >
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un patient, un propriétaire ou un statut..."
              className="w-full xl:max-w-sm"
            />
          </div>
        </div>
        <Separator />
        <div className="px-6 pt-6 pb-6">
          <div className="overflow-hidden rounded-2xl border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%] pl-6">Patient</TableHead>
                  <TableHead className="hidden w-[20%] xl:table-cell">Propriétaire</TableHead>
                  <TableHead className="w-[16%]">Acte</TableHead>
                  <TableHead className="w-[18%]">Créneau</TableHead>
                  <TableHead className="w-[10%]">Statut</TableHead>
                  <TableHead className="w-[12%] pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-6 align-top">
                        <div className="min-w-0 font-medium break-words">{row.patient}</div>
                        <div className="text-sm text-muted-foreground break-words">
                          {row.summary}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground xl:hidden break-words">
                          {row.owner}
                        </div>
                      </TableCell>
                      <TableCell className="hidden align-top xl:table-cell">
                        <div className="min-w-0 font-medium break-words">{row.owner}</div>
                        <div className="text-sm text-muted-foreground break-words">
                          {row.veterinarian}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="break-words">{row.type}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="pr-3 text-sm leading-6 break-words sm:text-base">
                          {row.appointmentAt}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant={statusVariant(row.status)}
                          className="inline-flex max-w-full whitespace-normal break-words px-2 py-0.5 text-center text-xs"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right align-top">
                        <Dialog>
                          <DialogTrigger
                            render={<Button variant="ghost" size="sm" className="h-8 px-2 text-xs sm:px-3 sm:text-sm" />}
                          >
                            Consulter
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{row.patient}</DialogTitle>
                              <DialogDescription>
                                {row.type} · {row.appointmentAt}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2 sm:grid-cols-2">
                              <div className="rounded-xl border p-4">
                                <div className="text-sm font-medium">Propriétaire</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {row.owner}
                                </div>
                              </div>
                              <div className="rounded-xl border p-4">
                                <div className="text-sm font-medium">Vétérinaire</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {row.veterinarian}
                                </div>
                              </div>
                              <div className="rounded-xl border p-4 sm:col-span-2">
                                <div className="text-sm font-medium">Notes</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {row.notes || "Aucune note clinique."}
                                </div>
                              </div>
                              <div className="rounded-xl border p-4">
                                <div className="text-sm font-medium">Diagnostic</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {row.diagnosis || "Non renseigné"}
                                </div>
                              </div>
                              <div className="rounded-xl border p-4">
                                <div className="text-sm font-medium">Traitement</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {row.treatment || "Non renseigné"}
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose render={<Button variant="outline" />}>
                                Fermer
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-sm text-muted-foreground"
                    >
                      Aucun dossier ne correspond aux filtres actifs.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
