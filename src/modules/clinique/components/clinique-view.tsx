import { openPatientPeek } from "@/modules/patients/pages/patient-peek";
import {
  Activity01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  MoreVerticalCircle01Icon,
  PhoneCheckIcon,
  PillIcon,
  PlayIcon,
  SearchIcon,
  StethoscopeIcon,
  UserGroupIcon,
  WorkHistoryIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";

import Avatar from "@/components/Avatar";

import MotivationalHeader from "@/components/MotivationalHeader";
import { QuickPatientPicker } from "@/components/QuickPatientPicker";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { Input } from "@/components/ui/input";

import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getAppointmentTypeMeta } from "@/config/status-meta";

import { PRE_CONSULTATION_STATUSES } from "@/domain/clinical/scheduling";

import { cn } from "@/lib/utils";
import { AnesthesiaSheet } from "@/modules/anesthesia";
import { ConsultationSessionDrawer } from "@/modules/consultations";
import { HospitalizationSheet } from "@/modules/hospitalizations";
import { PrescriptionSheet } from "@/modules/prescriptions";

import {
  ListTab,
  DetailTab,
  LIST_TABS,
  formatFileSize,
  formatTime,
  formatDateLabel,
  formatShortDate,
  getSpeciesIcon,
  getPatientAge,
  formatOwnerName,
  getPatientStatusMeta,
  AppointmentTypeBadge,
  AppointmentStatusBadge,
  ConsultationSessionDialog,
  BillingDialog,
} from "@/modules/clinique/components/clinique-shared";
import type { CliniqueViewProps } from "../hooks/use-clinique-page-model";

export function CliniqueView(props: CliniqueViewProps) {
  const {
    SelectedSpeciesIcon,
    activeConsultation,
    activeConsultationDocuments,
    activeConsultationHistory,
    activeConsultationOwner,
    activeConsultationPatient,
    anesthesiaOpen,
    billingAppointment,
    currentUser,
    detailTab,
    effectiveAppointmentId,
    effectiveSheetPatient,
    filteredAppointments,
    getOwner,
    getPatient,
    handleBillingConfirm,
    handleCallOwner,
    handleConsultationComplete,
    handleConsultationDocumentDelete,
    handleConsultationDocumentUpload,
    handleConsultationSaveDraft,
    handlePalettePatientPicked,
    handlePrescription,
    handleStatusAction,
    hospitalizationOpen,
    listTab,
    loadingAppointments,
    onNavigate,
    palettePickerAction,
    palettePickerOpen,
    patientHistory,
    patientsById,
    prescriptionOpen,
    searchQuery,
    sectionCards,
    selectedAppointment,
    selectedAppointmentId,
    selectedOwner,
    selectedPatient,
    selectedPatientDocuments,
    setActiveConsultation,
    setAnesthesiaOpen,
    setBillingAppointment,
    setDetailTab,
    setHospitalizationOpen,
    setListTab,
    setPalettePatient,
    setPalettePickerAction,
    setPalettePickerOpen,
    setPrescriptionOpen,
    setSearchQuery,
    setSelectedAppointmentId,
    setSoapOpen,
    soapOpen,
    stats,
    t,
    visibleCount,
  } = props;
  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-8 pb-8 lg:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <MotivationalHeader section="clinique" />
        <div data-slot="page-header-actions" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            className="h-10 rounded-full px-5"
            onClick={() => onNavigate?.("agenda")}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Calendar01Icon}
              strokeWidth={1.5}
            />
            Ouvrir l&apos;agenda
          </Button>
          {selectedAppointment ? (
            <Button
              className="h-10 rounded-full px-5"
              disabled={selectedAppointment.status === "completed"}
              onClick={() => handleStatusAction(selectedAppointment)}
            >
              {PRE_CONSULTATION_STATUSES.includes(
                selectedAppointment.status
              ) ? (
                <>
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={PlayIcon}
                    strokeWidth={1.5}
                  />
                  Démarrer
                </>
              ) : selectedAppointment.status === "in_progress" ? (
                <>
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={StethoscopeIcon}
                    strokeWidth={1.5}
                  />
                  Reprendre
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={1.5}
                  />
                  Terminé
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <SectionCards items={sectionCards} />

      <div className="grid gap-4">
        <Card className="surface-card relative min-h-[480px] overflow-hidden border-0">
          <CardHeader className="relative border-border border-b bg-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-frame">
                <HugeiconsIcon
                  className="h-5 w-5 text-ink-muted"
                  icon={WorkHistoryIcon}
                  strokeWidth={1.5}
                />
              </div>
              <div className="grid flex-1 gap-0.5">
                <CardTitle className="font-normal text-[22px] tracking-[-0.04em]">
                  Activité des dossiers
                </CardTitle>
              </div>
            </div>
            <CardAction>
              <Badge
                className="rounded-full bg-background/80 px-3 py-1"
                variant="outline"
              >
                {visibleCount} consultation{visibleCount > 1 ? "s" : ""}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
            <div className="flex flex-col gap-3 px-6 pt-1 pb-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex-1" />
              <Tabs
                className="gap-3"
                onValueChange={(value) => setListTab(value as ListTab)}
                value={listTab}
              >
                <TabsList className="bg-muted/50 p-1">
                  {LIST_TABS.map((tab) => {
                    const count =
                      tab.value === "all"
                        ? filteredAppointments.length
                        : tab.value === "scheduled"
                          ? stats.pending
                          : tab.value === "in_progress"
                            ? stats.inProgress
                            : stats.completed;
                    return (
                      <TabsTrigger
                        className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        key={tab.value}
                        value={tab.value}
                      >
                        <HugeiconsIcon
                          className="h-4 w-4"
                          icon={tab.icon}
                          strokeWidth={1.5}
                        />
                        <span>{tab.label}</span>
                        <Badge
                          className="ml-1 h-5 min-w-5 px-1 text-xs"
                          variant="secondary"
                        >
                          {count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              <div className="relative w-full xl:max-w-[440px] xl:flex-1">
                <HugeiconsIcon
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                  icon={SearchIcon}
                  strokeWidth={1.5}
                />
                <Input
                  className="h-11 rounded-body bg-input/50 pl-11"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher un patient, un motif ou un type d’acte..."
                  value={searchQuery}
                />
              </div>
            </div>

            <Separator />

            {loadingAppointments ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : visibleCount === 0 ? (
              <div className="flex flex-1 px-6 pb-6">
                <Empty className="border border-border/80 border-dashed bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={1.5} />
                    </EmptyMedia>
                    <EmptyTitle>Aucune consultation dans cette vue</EmptyTitle>
                    <EmptyDescription>
                      Ajustez la recherche ou revenez à l’agenda pour planifier
                      de nouveaux créneaux.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent className="justify-center sm:flex-row">
                    <Button
                      onClick={() => {
                        setSearchQuery("");
                        setListTab("all");
                      }}
                      variant="outline"
                    >
                      Réinitialiser
                    </Button>
                    <Button onClick={() => onNavigate?.("agenda")}>
                      <HugeiconsIcon
                        data-icon="inline-start"
                        icon={Calendar01Icon}
                        strokeWidth={1.5}
                      />
                      Voir l&apos;agenda
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="px-6 pt-5 pb-6">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[34%] pl-4">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={StethoscopeIcon}
                              strokeWidth={1.5}
                            />
                            <span className="font-semibold">Patient</span>
                          </div>
                        </TableHead>
                        <TableHead className="hidden w-[20%] xl:table-cell">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={UserGroupIcon}
                              strokeWidth={1.5}
                            />
                            <span className="font-semibold">Propriétaire</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-[20%]">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={Clock01Icon}
                              strokeWidth={1.5}
                            />
                            <span className="font-semibold">Horaire</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-[12%]">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={Activity01Icon}
                              strokeWidth={1.5}
                            />
                            <span className="font-semibold">Type</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-[14%]">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={CheckmarkCircle01Icon}
                              strokeWidth={1.5}
                            />
                            <span className="font-semibold">État</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-[20%]">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={ArrowRight01Icon}
                              strokeWidth={1.5}
                            />
                            <span className="font-semibold">Action</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => {
                        const patient = getPatient(appointment.patientId);
                        const owner = getOwner(appointment);
                        const SpeciesIcon = getSpeciesIcon(patient?.species);

                        return (
                          <TableRow
                            aria-label={`Sélectionner la consultation de ${patient?.name || "ce patient"}`}
                            aria-selected={
                              selectedAppointmentId === appointment.id
                            }
                            className={cn(
                              "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                              selectedAppointmentId === appointment.id
                                ? "!bg-primary/5 hover:!bg-primary/6"
                                : ""
                            )}
                            data-state={
                              selectedAppointmentId === appointment.id
                                ? "selected"
                                : undefined
                            }
                            data-row-id={appointment.id}
                            key={appointment.id}
                            onClick={() => {
                              setSelectedAppointmentId(appointment.id);
                              setDetailTab("overview");
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedAppointmentId(appointment.id);
                                setDetailTab("overview");
                              }
                            }}
                            tabIndex={0}
                          >
                            <TableCell className="whitespace-normal pl-10">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex size-10 items-center justify-center rounded-body bg-frame text-ink-muted"
                                  )}
                                >
                                  <HugeiconsIcon
                                    className="size-4"
                                    icon={SpeciesIcon}
                                    strokeWidth={1.5}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    className="rounded text-left font-medium text-ink hover:text-primary"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openPatientPeek(appointment.patientId);
                                    }}
                                  >
                                    {patient?.name || "Patient local"}
                                  </button>
                                  <p className="break-words text-muted-foreground text-sm">
                                    {patient?.species || "Espèce"}
                                    {patient?.breed
                                      ? ` · ${patient.breed}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden whitespace-normal xl:table-cell">
                              <div className="min-w-0">
                                <p className="break-words font-medium text-foreground">
                                  {formatOwnerName(owner)}
                                </p>
                                <p className="break-words text-muted-foreground text-sm">
                                  {owner?.phone || "Téléphone non renseigné"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">
                                  {formatTime(appointment.startTime)}
                                </p>
                                <p className="break-words text-muted-foreground text-sm">
                                  {appointment.reason || "Motif non renseigné"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <AppointmentTypeBadge type={appointment.type} />
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <AppointmentStatusBadge
                                status={appointment.status}
                              />
                            </TableCell>

                            <TableCell
                              className="whitespace-normal pl-6 text-left"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                {PRE_CONSULTATION_STATUSES.includes(
                                  appointment.status
                                ) ? (
                                  <Button
                                    className="min-w-[118px] rounded-body"
                                    onClick={() =>
                                      handleStatusAction(appointment)
                                    }
                                    size="xs"
                                  >
                                    <HugeiconsIcon
                                      data-icon="inline-start"
                                      icon={PlayIcon}
                                      strokeWidth={1.5}
                                    />
                                    <span>Démarrer</span>
                                  </Button>
                                ) : appointment.status === "in_progress" ? (
                                  <Button
                                    className="min-w-[118px] rounded-body"
                                    onClick={() =>
                                      handleStatusAction(appointment)
                                    }
                                    size="xs"
                                  >
                                    <HugeiconsIcon
                                      data-icon="inline-start"
                                      icon={StethoscopeIcon}
                                      strokeWidth={1.5}
                                    />
                                    <span>Ouvrir</span>
                                  </Button>
                                ) : (
                                  <Button
                                    className="rounded-body bg-muted/40 text-muted-foreground"
                                    disabled
                                    size="xs"
                                    variant="outline"
                                  >
                                    <HugeiconsIcon
                                      data-icon="inline-start"
                                      icon={CheckmarkCircle02Icon}
                                      strokeWidth={1.5}
                                    />
                                    <span>Facturé</span>
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button size="icon-xs" variant="ghost" />
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={MoreVerticalCircle01Icon}
                                      strokeWidth={1.5}
                                    />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedAppointmentId(
                                          appointment.id
                                        );
                                        setDetailTab("overview");
                                      }}
                                    >
                                      Ouvrir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => onNavigate?.("patients")}
                                    >
                                      Dossier patient
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleCallOwner(owner)}
                                    >
                                      Appeler le propriétaire
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card relative overflow-hidden">
          <CardHeader className="relative border-border/35 border-b bg-transparent">
            <CardDescription>Dossier sélectionné</CardDescription>
            <CardTitle className="text-xl tracking-[-0.04em]">
              {selectedPatient?.name || "Sélectionnez une consultation"}
            </CardTitle>
            {selectedAppointment ? (
              <CardAction>
                <AppointmentStatusBadge status={selectedAppointment.status} />
              </CardAction>
            ) : null}
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            {selectedAppointment && selectedPatient ? (
              <Tabs
                className="flex min-h-0 flex-1 flex-col gap-4"
                onValueChange={(value) => setDetailTab(value as DetailTab)}
                value={detailTab}
              >
                <div
                  className={cn(
                    "rounded-panel border p-5",
                    getAppointmentTypeMeta(selectedAppointment.type)
                      .surfaceClassName
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-16 items-center justify-center rounded-body bg-background shadow-sm">
                      <HugeiconsIcon
                        className="size-7 text-foreground"
                        icon={SelectedSpeciesIcon}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-foreground text-xl tracking-[-0.04em]">
                          {selectedPatient.name}
                        </p>
                        <AppointmentTypeBadge type={selectedAppointment.type} />
                      </div>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {selectedPatient.species}
                        {selectedPatient.breed
                          ? ` · ${selectedPatient.breed}`
                          : ""}
                        {" · "}
                        {getPatientAge(selectedPatient.dateOfBirth)}
                      </p>
                      <p className="mt-2 text-muted-foreground text-sm">
                        Créneau du jour ·{" "}
                        {formatTime(selectedAppointment.startTime)} ·{" "}
                        {formatDateLabel(selectedAppointment.startTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <TabsList
                  className="w-full justify-start rounded-none p-0"
                  variant="line"
                >
                  <TabsTrigger value="overview">Dossier</TabsTrigger>
                  <TabsTrigger value="history">Historique</TabsTrigger>
                </TabsList>

                <TabsContent className="min-h-0 flex-1" value="overview">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    <Card size="sm">
                      <CardHeader>
                        <CardTitle>Repères du dossier</CardTitle>
                        <CardDescription>
                          L’essentiel du patient regroupé dans un seul bloc.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">
                            Espèce
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.species}
                          </p>
                        </div>
                        <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">Race</p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.breed || "Non renseignée"}
                          </p>
                        </div>
                        <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">Âge</p>
                          <p className="mt-1 font-medium text-foreground">
                            {getPatientAge(selectedPatient.dateOfBirth)}
                          </p>
                        </div>
                        <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">
                            Statut
                          </p>
                          <div className="mt-1">
                            <Badge
                              className={cn(
                                "border-transparent",
                                getPatientStatusMeta(selectedPatient.status)
                                  .className
                              )}
                              variant="outline"
                            >
                              {
                                getPatientStatusMeta(selectedPatient.status)
                                  .label
                              }
                            </Badge>
                          </div>
                        </div>
                        <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">
                            Dernière visite
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.lastVisit
                              ? formatShortDate(selectedPatient.lastVisit)
                              : "Non renseignée"}
                          </p>
                        </div>
                        <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">
                            Acte du jour
                          </p>
                          <div className="mt-1">
                            <AppointmentTypeBadge
                              type={selectedAppointment.type}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card size="sm">
                      <CardHeader>
                        <CardTitle>Coordination clinique</CardTitle>
                        <CardDescription>
                          Contact propriétaire et éléments à traiter pour la
                          consultation active.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={formatOwnerName(selectedOwner)}
                            size="md"
                            src={
                              selectedOwner?.email
                                ? undefined
                                : "gradient:from-blue-500 to-cyan-500"
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">
                              {formatOwnerName(selectedOwner)}
                            </p>
                            <p className="truncate text-muted-foreground text-sm">
                              {selectedOwner?.email || "Email non renseigné"}
                            </p>
                          </div>
                          <AppointmentStatusBadge
                            status={selectedAppointment.status}
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Téléphone
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedOwner?.phone || "Non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Ville
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedOwner?.city || "Non renseignée"}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-3">
                          <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Motif
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedAppointment.reason ||
                                "Motif non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Diagnostic
                            </p>
                            <p className="mt-1 text-foreground">
                              {selectedAppointment.diagnosis ||
                                "Diagnostic à compléter"}
                            </p>
                          </div>
                          <div className="rounded-body bg-muted/30 px-4 py-3 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Traitement
                            </p>
                            <p className="mt-1 text-foreground">
                              {selectedAppointment.treatment ||
                                "Traitement à compléter"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="rounded-body"
                            onClick={handlePrescription}
                            variant="outline"
                          >
                            <HugeiconsIcon
                              data-icon="inline-start"
                              icon={PillIcon}
                              strokeWidth={1.5}
                            />
                            Ordonnance
                          </Button>
                          <Button
                            className="rounded-body"
                            onClick={() => handleCallOwner(selectedOwner)}
                            variant="outline"
                          >
                            <HugeiconsIcon
                              data-icon="inline-start"
                              icon={PhoneCheckIcon}
                              strokeWidth={1.5}
                            />
                            Appeler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent className="min-h-0 flex-1" value="history">
                  {patientHistory.length > 0 ||
                  selectedPatientDocuments.length > 0 ? (
                    <div className="grid gap-4">
                      {patientHistory.length > 0 ? (
                        <div className="grid gap-3">
                          {patientHistory.map((appointment) => (
                            <Card
                              data-row-id={appointment.id}
                              key={appointment.id}
                              size="sm"
                            >
                              <CardHeader>
                                <CardTitle className="text-base">
                                  {appointment.type}
                                </CardTitle>
                                <CardDescription>
                                  {formatShortDate(appointment.startTime)} ·{" "}
                                  {formatTime(appointment.startTime)}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="grid gap-3">
                                <div>
                                  <p className="text-muted-foreground text-sm">
                                    Diagnostic
                                  </p>
                                  <p className="mt-1 text-foreground">
                                    {appointment.diagnosis || "Non renseigné"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-sm">
                                    Traitement
                                  </p>
                                  <p className="mt-1 text-foreground">
                                    {appointment.treatment || "Non renseigné"}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : null}

                      {selectedPatientDocuments.length > 0 ? (
                        <Card size="sm">
                          <CardHeader>
                            <CardTitle className="text-base">
                              Documents archivés
                            </CardTitle>
                            <CardDescription>
                              PDF et images importés pendant les consultations.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-2">
                            {selectedPatientDocuments.map((document) => (
                              <div
                                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2"
                                key={document.id}
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-sm">
                                    {document.fileName}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatShortDate(document.createdAt)} ·{" "}
                                    {formatFileSize(Number(document.sizeBytes))}
                                    {document.description
                                      ? ` · ${document.description}`
                                      : ""}
                                  </p>
                                </div>
                                <Button
                                  onClick={() =>
                                    window.open(document.dataUrl, "_blank")
                                  }
                                  size="xs"
                                  type="button"
                                  variant="outline"
                                >
                                  Ouvrir
                                </Button>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                  ) : (
                    <Empty className="border border-border/80 border-dashed bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <HugeiconsIcon
                            className="size-5"
                            icon={WorkHistoryIcon}
                            strokeWidth={1.5}
                          />
                        </EmptyMedia>
                        <EmptyTitle>Aucun historique récent</EmptyTitle>
                        <EmptyDescription>
                          Ce dossier n&apos;a pas encore de consultation
                          archivée.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <Empty className="border border-border/80 border-dashed bg-muted/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={1.5} />
                  </EmptyMedia>
                  <EmptyTitle>Sélectionnez une consultation</EmptyTitle>
                  <EmptyDescription>
                    Sélectionnez une consultation pour afficher la synthèse du
                    dossier et le suivi clinique.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      {activeConsultation && activeConsultationPatient ? (
        <ConsultationSessionDialog
          appointment={activeConsultation}
          documents={activeConsultationDocuments}
          historyAppointments={activeConsultationHistory}
          onClose={() => setActiveConsultation(null)}
          onComplete={handleConsultationComplete}
          onDeleteDocument={handleConsultationDocumentDelete}
          onOpenAnesthesia={() => setAnesthesiaOpen(true)}
          onOpenHospitalization={() => setHospitalizationOpen(true)}
          onOpenPrescription={() => setPrescriptionOpen(true)}
          onOpenSoap={() => setSoapOpen(true)}
          onSaveDraft={handleConsultationSaveDraft}
          onUploadDocument={handleConsultationDocumentUpload}
          owner={activeConsultationOwner}
          patient={activeConsultationPatient}
          patientName={
            patientsById.get(activeConsultation.patientId)?.name ||
            "Patient local"
          }
        />
      ) : null}

      {billingAppointment ? (
        <BillingDialog
          appointment={billingAppointment}
          onClose={() => setBillingAppointment(null)}
          onConfirm={handleBillingConfirm}
          ownerEmail={getOwner(billingAppointment)?.email}
          ownerName={formatOwnerName(getOwner(billingAppointment))}
          patientName={
            patientsById.get(billingAppointment.patientId)?.name ||
            "Patient local"
          }
        />
      ) : null}

      <ConsultationSessionDrawer
        appointmentId={activeConsultation?.id ?? ""}
        onOpenChange={(next) => {
          setSoapOpen(next);
        }}
        open={soapOpen && Boolean(activeConsultation)}
        patientId={activeConsultation?.patientId ?? ""}
        patientName={
          activeConsultation
            ? (patientsById.get(activeConsultation.patientId)?.name ??
              undefined)
            : undefined
        }
      />

      {effectiveSheetPatient ? (
        <PrescriptionSheet
          appointmentId={effectiveAppointmentId}
          onOpenChange={(open) => {
            setPrescriptionOpen(open);
            if (!open) {
              setPalettePatient(null);
            }
          }}
          open={prescriptionOpen}
          patient={effectiveSheetPatient}
          vet={currentUser}
        />
      ) : null}

      {effectiveSheetPatient ? (
        <HospitalizationSheet
          onOpenChange={(open) => {
            setHospitalizationOpen(open);
            if (!open) {
              setPalettePatient(null);
            }
          }}
          open={hospitalizationOpen}
          patient={effectiveSheetPatient}
        />
      ) : null}

      {effectiveSheetPatient ? (
        <AnesthesiaSheet
          onOpenChange={(open) => {
            setAnesthesiaOpen(open);
            if (!open) {
              setPalettePatient(null);
            }
          }}
          open={anesthesiaOpen}
          patient={effectiveSheetPatient}
        />
      ) : null}

      <QuickPatientPicker
        description={
          palettePickerAction === "prescription"
            ? t("quickPatientPicker.descPrescription", {
                defaultValue:
                  "Choisissez le patient pour qui créer une ordonnance.",
              })
            : palettePickerAction === "hospitalization"
              ? t("quickPatientPicker.descHospitalization", {
                  defaultValue: "Choisissez le patient à hospitaliser.",
                })
              : t("quickPatientPicker.descAnesthesia", {
                  defaultValue:
                    "Choisissez le patient pour la feuille d'anesthésie.",
                })
        }
        onOpenChange={(open) => {
          setPalettePickerOpen(open);
          if (!open) {
            setPalettePickerAction(null);
          }
        }}
        onSelect={handlePalettePatientPicked}
        open={palettePickerOpen}
        title={t("quickPatientPicker.title", {
          defaultValue: "Sélectionner un patient",
        })}
      />
    </div>
  );
}
