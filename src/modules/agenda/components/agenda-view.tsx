import { openPatientPeek } from "@/modules/patients/pages/patient-peek";
import {
  Add01Icon,
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  MoreVerticalCircle01Icon,
  SearchIcon,
  StethoscopeIcon,
  UserCircle02Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { fr } from "date-fns/locale";

import { AgendaListView } from "@/components/AgendaListView";
import MotivationalHeader from "@/components/MotivationalHeader";
import { SectionCards } from "@/components/section-cards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENT_STATUS_META,
  getAppointmentTypeMeta,
} from "@/config/status-meta";

import { cn } from "@/lib/utils";

import type { RecurrenceFrequency } from "@/types/db";
import {
  APPOINTMENT_TYPES,
  AppointmentTimePicker,
  DURATION_OPTIONS,
  APPOINTMENT_ROOMS,
  RECURRENCE_FREQUENCIES,
  DAY_OF_WEEK_LABELS,
  TABLE_TABS,
  ViewMode,
  TableTab,
  normalizeDate,
  formatDateInput,
  parseDateInput,
  isSameDay,
  getDateFnsLocale,
  formatTime,
  formatTimeCompact,
  formatDateLabel,
  formatDuration,
  formatOwnerName,
  getPatientProfile,
  normalizeEntityId,
  getAgeLabel,
  AppointmentTypeBadge,
  AppointmentStatusBadge,
  AgendaDayView,
  AgendaWeekView,
  AgendaMonthView,
} from "@/modules/agenda/components/agenda-shared";
import type { AgendaViewProps } from "../hooks/use-agenda-page-model";

export function AgendaView(props: AgendaViewProps) {
  const {
    appointmentPendingDelete,
    appointments,
    appointmentsByVet,
    closeDialog,
    currentTime,
    currentTimePosition,
    dailyAppointments,
    dayLoadSummary,
    deleteAppointment,
    duration,
    editingAppointmentId,
    engagedVetsCount,
    filteredOwners,
    filteredPatientsForForm,
    formDate,
    formError,
    formRoom,
    formTime,
    getAppointmentsForDate,
    getPatientName,
    handleAppointmentStatusTransition,
    handleOpenCreate,
    handleOpenEdit,
    handleOwnerSelect,
    handlePatientSelect,
    handleSave,
    isDialogOpen,
    isSubmitting,
    loadingAppointments,
    monthDays,
    ownerSearchTerm,
    ownersById,
    patientSearchTerm,
    patientsById,
    performAppointmentDelete,
    periodLabel,
    personSearchTerm,
    reason,
    recurrenceDaysOfWeek,
    recurrenceEnabled,
    recurrenceEndDate,
    recurrenceFrequency,
    recurrenceMaxOccurrences,
    resetForm,
    searchTerm,
    sectionCards,
    selectAppointment,
    selectedAppointment,
    selectedAppointmentId,
    selectedDate,
    selectedOwner,
    selectedOwnerId,
    selectedPatient,
    selectedPatientId,
    selectedType,
    selectedVet,
    selectedVetId,
    setAppointmentPendingDelete,
    setDuration,
    setFormDate,
    setFormRoom,
    setFormTime,
    setIsDialogOpen,
    setOwnerSearchTerm,
    setPatientSearchTerm,
    setPersonSearchTerm,
    setReason,
    setRecurrenceDaysOfWeek,
    setRecurrenceEnabled,
    setRecurrenceEndDate,
    setRecurrenceFrequency,
    setRecurrenceMaxOccurrences,
    setSearchTerm,
    setSelectedDate,
    setSelectedOwnerId,
    setSelectedType,
    setSelectedVetId,
    setStatusFilter,
    setTableTab,
    setVetFilter,
    setViewMode,
    shiftPeriod,
    statusFilter,
    t,
    tableRowsByTab,
    tableTab,
    totalPlannedMinutes,
    typeSummary,
    unifiedAppointmentMatches,
    urgentOpenCount,
    vetFilter,
    vets,
    viewMode,
    visibleRowsCount,
    weekDays,
  } = props;
  return (
    <div className="agenda-workspace dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-8 pb-8 lg:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <MotivationalHeader section="agenda" />
        <div data-slot="page-header-actions" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            className="h-10 rounded-full px-5 text-sm"
            onClick={() => setSelectedDate(new Date())}
            variant="outline"
          >
            {t("agenda.today")}
          </Button>
          <Button
            className="h-10 rounded-full px-5 text-sm"
            onClick={() => handleOpenCreate()}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Add01Icon}
              strokeWidth={1.5}
            />
            {t("agenda.newAppointment")}
          </Button>
        </div>
      </div>

      <SectionCards items={sectionCards} />

      <div className="grid gap-4">
        <Card className="agenda-planner surface-card min-h-[480px] border-0">
          <CardHeader className="agenda-planner-heading border-border border-b px-5 py-5 sm:px-6">
            <CardTitle className="font-semibold text-[22px] tracking-[-0.03em]">
              {t("agenda.consultationsAgenda")}
            </CardTitle>
            <CardAction>
              <Badge className="rounded-full px-3 py-1" variant="outline">
                {t("agenda.slot", { count: dailyAppointments.length })}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
            <Tabs
              className="flex min-h-0 flex-1 gap-0"
              onValueChange={(value) => setViewMode(value as ViewMode)}
              value={viewMode}
            >
              <div className="agenda-toolbar flex flex-col gap-3 border-border border-b px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
                    <Button
                      aria-label="Période précédente"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => shiftPeriod(-1)}
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} />
                    </Button>
                    <Button
                      aria-label="Période suivante"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => shiftPeriod(1)}
                    >
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        strokeWidth={1.5}
                      />
                    </Button>
                  </div>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          className="h-10 gap-2 rounded-xl"
                          variant="outline"
                        >
                          <HugeiconsIcon
                            icon={Calendar01Icon}
                            strokeWidth={1.5}
                          />
                          {periodLabel}
                        </Button>
                      }
                    />
                    <PopoverContent
                      align="start"
                      className="w-auto rounded-[1.75rem] p-2"
                      sideOffset={10}
                    >
                      <Calendar
                        className="rounded-[1.4rem]"
                        locale={getDateFnsLocale()}
                        mode="single"
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                          }
                        }}
                        selected={selectedDate}
                      />
                    </PopoverContent>
                  </Popover>

                  {isSameDay(selectedDate, new Date()) ? (
                    <Badge
                      className="rounded-full border-transparent bg-primary/10 text-primary"
                      variant="outline"
                    >
                      {t("agenda.today")}
                    </Badge>
                  ) : null}
                </div>

                <TabsList className="h-10 w-full justify-start rounded-xl p-1 sm:w-auto">
                  <TabsTrigger className="flex-1 rounded-lg" value="list">
                    {t("agenda.list", { defaultValue: "Vue liste" })}
                  </TabsTrigger>
                  <TabsTrigger value="day">{t("agenda.day")}</TabsTrigger>
                  <TabsTrigger value="week">{t("agenda.week")}</TabsTrigger>
                  <TabsTrigger value="month">{t("agenda.month")}</TabsTrigger>
                </TabsList>
              </div>

              {loadingAppointments ? (
                <div className="flex items-center justify-center p-6">
                  <Spinner />
                </div>
              ) : (
                <>
                  <TabsContent className="min-h-0 flex-1" value="list">
                    <AgendaListView
                      formatTime={formatTime}
                      getAppointmentsForDate={getAppointmentsForDate}
                      getOwnerName={(ownerId) =>
                        ownerId ? ownersById.get(ownerId)?.lastName || "" : ""
                      }
                      getPatient={(id) => patientsById.get(id)}
                      getPatientName={getPatientName}
                      isSameDay={isSameDay}
                      monthDays={monthDays}
                      onDateClick={(date) => setSelectedDate(date)}
                      onSelectAppointment={selectAppointment}
                      onTransitionStatus={handleAppointmentStatusTransition}
                      selectedAppointmentId={selectedAppointmentId}
                      selectedDate={selectedDate}
                    />
                  </TabsContent>

                  <TabsContent className="min-h-0 flex-1" value="day">
                    <AgendaDayView
                      appointmentsByVet={appointmentsByVet}
                      currentTimeLabel={formatTime(currentTime)}
                      currentTimePosition={currentTimePosition}
                      getPatientName={getPatientName}
                      onSelectAppointment={selectAppointment}
                      selectedAppointmentId={selectedAppointmentId}
                      selectedDate={selectedDate}
                      vets={vets}
                    />
                  </TabsContent>

                  <TabsContent className="min-h-0 flex-1" value="week">
                    <AgendaWeekView
                      getAppointmentsForDate={getAppointmentsForDate}
                      getPatientName={getPatientName}
                      onSelectAppointment={selectAppointment}
                      selectedAppointmentId={selectedAppointmentId}
                      weekDays={weekDays}
                    />
                  </TabsContent>

                  <TabsContent className="min-h-0 flex-1" value="month">
                    <AgendaMonthView
                      getAppointmentsForDate={getAppointmentsForDate}
                      getPatientName={getPatientName}
                      monthDays={monthDays}
                      onPickDate={(date) => {
                        setSelectedDate(date);
                        setViewMode("day");
                      }}
                      selectedDate={selectedDate}
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
          {selectedAppointment ? (
            <Card className="min-h-[420px]">
              <CardHeader className="border-border border-b px-6 py-5">
                <CardDescription>Détail de la sélection</CardDescription>
                <CardTitle className="text-xl tracking-[-0.04em]">
                  {patientsById.get(selectedAppointment.patientId)?.name ||
                    selectedAppointment.title}
                </CardTitle>
                <CardAction>
                  <AppointmentStatusBadge
                    appointment={selectedAppointment}
                    patient={selectedPatient}
                  />
                </CardAction>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
                <div
                  className={cn(
                    "rounded-2xl border p-4",
                    getAppointmentTypeMeta(selectedAppointment.type)
                      .surfaceClassName
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Acte clinique
                      </p>
                      <p className="mt-1 font-medium text-foreground text-lg">
                        {selectedAppointment.type}
                      </p>
                    </div>
                    <AppointmentTypeBadge type={selectedAppointment.type} />
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/10 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Créneau</span>
                    <span className="text-right font-medium text-foreground">
                      {formatTimeCompact(selectedAppointment.startTime)} -{" "}
                      {formatTimeCompact(selectedAppointment.endTime)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-right font-medium text-foreground">
                      {formatDateLabel(
                        normalizeDate(selectedAppointment.startTime) ??
                          selectedDate,
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Vétérinaire</span>
                    <span className="text-right font-medium text-foreground">
                      {selectedVet?.displayName || "Vétérinaire local"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Propriétaire</span>
                    <span className="text-right font-medium text-foreground">
                      {formatOwnerName(selectedOwner)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out hover:border-border/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      className="size-4 text-muted-foreground"
                      icon={StethoscopeIcon}
                      strokeWidth={1.5}
                    />
                    <p className="font-medium text-foreground">Patient</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="font-medium text-foreground">
                      {selectedPatient?.name || "Patient local"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {getPatientProfile(selectedPatient)} ·{" "}
                      {getAgeLabel(selectedPatient?.dateOfBirth)}
                    </p>
                  </div>
                  {selectedAppointment.reason ? (
                    <p className="text-muted-foreground text-sm leading-6">
                      {selectedAppointment.reason}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Aucun motif détaillé n&apos;a encore été saisi.
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="gap-2 border-t px-6 py-4">
                <Button
                  className="h-10 flex-1 rounded-xl"
                  onClick={() => handleOpenEdit(selectedAppointment)}
                  variant="outline"
                >
                  Modifier
                </Button>
                <Button
                  className="h-10 flex-1 rounded-xl"
                  onClick={() => handleOpenCreate(selectedDate)}
                >
                  Nouveau RDV
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-panel border border-border/80 border-dashed bg-muted/5 p-8 text-center shadow-none transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150">
              <div className="mb-4 flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-900/5 ring-1 ring-zinc-900/10 dark:bg-white/5 dark:ring-white/10">
                <HugeiconsIcon
                  className="size-6 text-muted-foreground opacity-80"
                  icon={Calendar01Icon}
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-medium text-foreground text-lg tracking-tight">
                Aucun rendez-vous sélectionné
              </h3>
              <p className="mt-2 max-w-sm text-muted-foreground text-sm leading-6">
                Cliquez sur un créneau dans le planning ou dans le tableau
                ci-dessous pour afficher les détails contextuels.
              </p>
              <Button
                className="mt-6 h-10 gap-2 rounded-full px-5"
                onClick={() => handleOpenCreate()}
              >
                <HugeiconsIcon
                  className="size-4"
                  data-icon="inline-start"
                  icon={Add01Icon}
                  strokeWidth={1.5}
                />
                Nouveau rendez-vous
              </Button>
            </div>
          )}

          <Card className="flex h-full flex-col justify-between rounded-panel border border-border bg-card shadow-none">
            <div>
              <CardHeader className="border-border border-b px-6 py-5">
                <CardDescription>Cadence de la journée</CardDescription>
                <CardTitle className="font-normal text-[22px] tracking-[-0.04em]">
                  {formatDateLabel(selectedDate)}
                </CardTitle>
              </CardHeader>

              <CardContent className="grid gap-4 px-6 py-5">
                <div className="grid gap-2">
                  {typeSummary.length > 0 ? (
                    typeSummary.map((entry) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl bg-muted/30 px-4 py-3 text-sm"
                        key={entry.type}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              getAppointmentTypeMeta(entry.type).dotClassName
                            )}
                          />
                          <span className="font-medium text-foreground">
                            {entry.type}
                          </span>
                        </div>
                        <Badge className="rounded-lg" variant="outline">
                          {entry.count}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                      <HugeiconsIcon
                        className="mb-2 size-8 opacity-30"
                        icon={Calendar01Icon}
                        strokeWidth={1.5}
                      />
                      <p className="text-sm">
                        Aucun rendez-vous programmé aujourd'hui
                      </p>
                    </div>
                  )}
                </div>

                {dayLoadSummary.length > 0 ? (
                  <div className="grid gap-2 border-border/40 border-t pt-4">
                    {dayLoadSummary.map((entry) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl bg-muted/20 px-4 py-2.5 text-sm"
                        key={entry.vet.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {entry.vet.displayName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {entry.vet.specialty || "Consultation générale"}
                          </p>
                        </div>
                        <Badge className="rounded-lg" variant="outline">
                          {entry.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </div>

            <CardContent className="mt-auto px-6 pt-0 pb-5">
              <div className="grid grid-cols-3 gap-3 border-border/40 border-t pt-5">
                <div className="text-center">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Charge
                  </p>
                  <p className="mt-1 font-semibold text-base text-foreground tracking-tight">
                    {formatDuration(totalPlannedMinutes)}
                  </p>
                </div>
                <div className="border-border/40 border-x px-1 text-center">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Urgences
                  </p>
                  <p className="mt-1 font-semibold text-base text-foreground">
                    {urgentOpenCount}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Mobilisés
                  </p>
                  <p className="mt-1 font-semibold text-base text-foreground">
                    {engagedVetsCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
        <CardHeader className="gap-1 border-b border-border/50 px-6 py-5">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Planning des rendez-vous
          </CardTitle>
          <CardDescription className="text-sm">
            Patients, créneaux et suivi des visites.
          </CardDescription>
          <CardAction>
            <Badge
              className="rounded-full border-transparent bg-frame px-3 py-1 text-violet-700 dark:text-violet-300"
              variant="outline"
            >
              {visibleRowsCount} rendez-vous
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
          <Tabs
            className="gap-0"
            onValueChange={(value) => setTableTab(value as TableTab)}
            value={tableTab}
          >
            <div className="flex flex-col gap-3 border-b px-6 py-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <TabsList className="group-data-horizontal/tabs:!h-9 rounded-xl">
                {TABLE_TABS.map((tab) => (
                  <TabsTrigger
                    className="rounded-lg"
                    key={tab.value}
                    value={tab.value}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="grid w-full gap-3 lg:grid-cols-[minmax(200px,1fr)_190px_190px] 2xl:ml-auto 2xl:max-w-4xl 2xl:flex-1">
                <div className="relative">
                  <HugeiconsIcon
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                    icon={SearchIcon}
                    strokeWidth={1.5}
                  />
                  <Input
                    className="h-9 rounded-xl border-border/60 bg-muted/40 pl-10 text-sm focus-visible:border-ring focus-visible:ring-ring/20"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Rechercher un patient, un motif..."
                    value={searchTerm}
                  />
                </div>

                <NativeSelect
                  className="w-full [&>select]:border-border/60 [&>select]:bg-muted/40 [&>select]:focus-visible:border-ring [&>select]:focus-visible:ring-ring/20"
                  onChange={(event) => setVetFilter(event.target.value)}
                  value={vetFilter}
                >
                  <NativeSelectOption value="all">
                    Tous les vétérinaires
                  </NativeSelectOption>
                  {vets.map((vet) => (
                    <NativeSelectOption key={vet.id} value={vet.id}>
                      {vet.displayName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>

                <NativeSelect
                  className="w-full [&>select]:border-border/60 [&>select]:bg-muted/40 [&>select]:focus-visible:border-ring [&>select]:focus-visible:ring-ring/20"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <NativeSelectOption value="all">
                    Tous les statuts
                  </NativeSelectOption>
                  {Object.entries(APPOINTMENT_STATUS_META).map(
                    ([status, meta]) => (
                      <NativeSelectOption key={status} value={status}>
                        {meta.label}
                      </NativeSelectOption>
                    )
                  )}
                </NativeSelect>
              </div>
            </div>

            {TABLE_TABS.map((tab) => {
              const rows = tableRowsByTab[tab.value];

              return (
                <TabsContent
                  className="px-0 pb-6"
                  key={tab.value}
                  value={tab.value}
                >
                  {rows.length === 0 ? (
                    <Empty className="mx-6 border border-border/80 border-dashed bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          {tab.value === "attention" ? (
                            <HugeiconsIcon
                              icon={Alert02Icon}
                              strokeWidth={1.5}
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={Calendar01Icon}
                              strokeWidth={1.5}
                            />
                          )}
                        </EmptyMedia>
                        <EmptyTitle>
                          Aucun rendez-vous dans cette vue
                        </EmptyTitle>
                        <EmptyDescription>
                          Ajustez les filtres ou créez un nouveau créneau pour
                          enrichir le planning.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent className="sm:flex-row">
                        <Button
                          onClick={() => {
                            setSearchTerm("");
                            setVetFilter("all");
                            setStatusFilter("all");
                          }}
                          variant="outline"
                        >
                          Réinitialiser
                        </Button>
                        <Button onClick={() => handleOpenCreate()}>
                          <HugeiconsIcon
                            data-icon="inline-start"
                            icon={Add01Icon}
                            strokeWidth={1.5}
                          />
                          Nouveau rendez-vous
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <Table className="min-w-[900px]">
                      <TableHeader className="bg-[#edf3ef] dark:bg-[#25332d] [&_th]:h-12 [&_th]:whitespace-nowrap [&_th]:text-[13px] [&_th]:font-semibold [&_th]:tracking-normal [&_th]:text-[#456152] dark:[&_th]:text-[#c0d4c7]">
                        <TableRow className="border-b border-[#dce7df] hover:bg-transparent dark:border-[#35473d]">
                          <TableHead className="w-[22%] min-w-[130px] py-3.5 pl-6 font-medium text-xs text-muted-foreground">
                            Dossier
                          </TableHead>
                          <TableHead className="w-[18%] min-w-[110px] py-3.5 font-medium text-xs text-muted-foreground">
                            Propriétaire
                          </TableHead>
                          <TableHead className="w-[12%] min-w-[80px] py-3.5 font-medium text-xs text-muted-foreground">
                            Acte
                          </TableHead>
                          <TableHead className="w-[20%] min-w-[130px] py-3.5 font-medium text-xs text-muted-foreground">
                            Créneau
                          </TableHead>
                          <TableHead className="w-[12%] min-w-[80px] py-3.5 font-medium text-xs text-muted-foreground">
                            Statut
                          </TableHead>
                          <TableHead className="w-[12%] min-w-[100px] py-3.5 font-medium text-xs text-muted-foreground">
                            Vétérinaire
                          </TableHead>
                          <TableHead className="w-[4%] min-w-[40px] py-3.5 pr-6 text-right font-medium text-xs text-muted-foreground">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const timePart = row.appointmentAt.includes(" · ")
                            ? row.appointmentAt.split(" · ")[1]
                            : row.appointmentAt;
                          const datePart = row.appointmentAt.includes(" · ")
                            ? row.appointmentAt.split(" · ")[0]
                            : "";
                          return (
                            <TableRow
                              className="cursor-pointer border-border/50 transition-colors hover:bg-muted/35 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 [&>td]:py-4"
                              data-row-id={row.appointment.id}
                              key={row.appointment.id}
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (
                                  event.target === event.currentTarget &&
                                  (event.key === "Enter" || event.key === " ")
                                ) {
                                  event.preventDefault();
                                  selectAppointment(row.appointment, true);
                                }
                              }}
                              onClick={() =>
                                selectAppointment(row.appointment, true)
                              }
                            >
                              <TableCell className="w-[22%] min-w-[130px] pl-6">
                                <div className="flex items-center gap-3.5">
                                  <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-frame font-semibold text-violet-700 text-sm ring-1 ring-violet-500/10 dark:text-violet-300">
                                    {(row.patientName || "?")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      className="max-w-full truncate rounded text-left font-semibold text-ink text-sm tracking-tight hover:text-primary"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openPatientPeek(
                                          row.appointment.patientId
                                        );
                                      }}
                                    >
                                      {row.patientName}
                                    </button>
                                    <p className="mt-0.5 truncate font-medium text-muted-foreground text-xs">
                                      {getPatientProfile(row.patient)}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="w-[18%] min-w-[110px]">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-foreground text-sm tracking-tight">
                                    {row.ownerName}
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1 truncate font-medium text-muted-foreground text-xs">
                                    <span className="text-[10px] opacity-60">
                                      📞
                                    </span>{" "}
                                    {row.owner?.phone || "Non renseigné"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell className="w-[12%] min-w-[80px]">
                                <div className="flex items-center">
                                  <AppointmentTypeBadge
                                    className="rounded-lg border px-2.5 py-0.5 font-semibold text-xs tracking-tight"
                                    type={row.appointment.type}
                                  />
                                </div>
                              </TableCell>

                              <TableCell className="w-[20%] min-w-[130px]">
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 truncate font-semibold text-foreground text-sm tracking-tight">
                                    <span className="font-semibold tabular-nums text-foreground">
                                      {timePart}
                                    </span>
                                    {datePart && (
                                      <>
                                        <span className="text-muted-foreground/40 text-xs">
                                          |
                                        </span>
                                        <span className="font-normal text-muted-foreground/80 text-xs">
                                          {datePart}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                  <p className="mt-0.5 truncate font-medium font-serif text-muted-foreground/80 text-xs italic">
                                    {row.appointment.reason ||
                                      "Motif non renseigné"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell className="w-[12%] min-w-[80px]">
                                <div className="flex items-center">
                                  <AppointmentStatusBadge
                                    appointment={row.appointment}
                                    patient={row.patient}
                                  />
                                </div>
                              </TableCell>

                              <TableCell className="w-[12%] min-w-[100px]">
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 truncate font-semibold text-foreground text-sm tracking-tight">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[10px] text-muted-foreground">
                                      {row.vetName
                                        .split(" ")
                                        .pop()
                                        ?.slice(0, 1)
                                        .toUpperCase() || "V"}
                                    </span>
                                    {row.vetName}
                                  </p>
                                  <p className="mt-0.5 truncate pl-[26px] font-medium text-muted-foreground text-xs">
                                    {row.vet?.specialty || "Pratique générale"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell
                                className="w-[4%] min-w-[40px] pr-6 text-right"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        className="ml-auto"
                                        size="icon-sm"
                                        variant="ghost"
                                      />
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={MoreVerticalCircle01Icon}
                                      strokeWidth={1.5}
                                    />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-44"
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        selectAppointment(row.appointment, true)
                                      }
                                    >
                                      Ouvrir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleOpenEdit(row.appointment)
                                      }
                                    >
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        deleteAppointment(row.appointment)
                                      }
                                      variant="destructive"
                                    >
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm(selectedDate);
          }
        }}
        open={isDialogOpen}
      >
        <FormDialogContent
          className="modal-medical-shell"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              if (!isSubmitting && selectedPatientId) {
                void handleSave();
              }
            }
          }}
          size="lg"
        >
          <FormDialogHeader
            artwork="appointment"
            description="Patient, créneau et motif de consultation."
            icon={<HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} />}
            title={
              editingAppointmentId
                ? "Modifier le rendez-vous"
                : "Nouveau rendez-vous"
            }
            tone="sky"
          />

          <FormDialogBody>
            <FieldGroup className="grid gap-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <Field className="lg:col-span-2">
                  <FieldLabel>
                    Recherche rapide patient / propriétaire
                  </FieldLabel>
                  <Input
                    onChange={(event) =>
                      setPersonSearchTerm(event.target.value)
                    }
                    placeholder="Tapez Lisa, Hadji, un téléphone, une espèce..."
                    value={personSearchTerm}
                  />
                  <FieldDescription>
                    Sélectionnez directement le bon dossier. Le propriétaire et
                    le patient seront remplis ensemble.
                  </FieldDescription>
                  {personSearchTerm.trim() ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {unifiedAppointmentMatches.length > 0 ? (
                        unifiedAppointmentMatches.map(({ owner, patient }) => (
                          <button
                            className={cn(
                              "cursor-pointer rounded-2xl border px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                              selectedPatientId === patient.id
                                ? "border-primary bg-primary/10"
                                : "border-border/80 bg-background/70"
                            )}
                            key={patient.id}
                            onClick={() => handlePatientSelect(patient.id)}
                            type="button"
                          >
                            <span className="block font-medium text-foreground">
                              {patient.name}
                            </span>
                            <span className="mt-1 block text-muted-foreground text-sm">
                              {patient.species}
                              {patient.breed ? ` · ${patient.breed}` : ""} ·{" "}
                              {formatOwnerName(owner)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed p-4 text-muted-foreground text-sm sm:col-span-2">
                          Aucun dossier trouvé. Créez d’abord le patient dans le
                          module Patients, puis revenez ici.
                        </div>
                      )}
                    </div>
                  ) : null}
                </Field>

                <Field className="lg:col-span-2">
                  <FieldLabel>Client existant</FieldLabel>
                  <Input
                    onChange={(event) => {
                      setOwnerSearchTerm(event.target.value);
                      if (!event.target.value.trim()) {
                        setSelectedOwnerId("");
                      }
                    }}
                    placeholder="Rechercher un propriétaire par nom, téléphone ou email..."
                    value={ownerSearchTerm}
                  />
                  <FieldDescription>
                    Sélectionnez d’abord le client pour filtrer automatiquement
                    ses dossiers patients.
                  </FieldDescription>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filteredOwners.length > 0 ? (
                      filteredOwners.map((owner) => (
                        <Button
                          key={owner.id}
                          onClick={() => handleOwnerSelect(owner.id)}
                          size="sm"
                          type="button"
                          variant={
                            normalizeEntityId(selectedOwnerId) ===
                            normalizeEntityId(owner.id)
                              ? "default"
                              : "outline"
                          }
                        >
                          {formatOwnerName(owner)}
                        </Button>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        Aucun client existant ne correspond à cette recherche.
                      </div>
                    )}
                  </div>
                </Field>

                <Field>
                  <FieldLabel>Patient</FieldLabel>
                  <Input
                    onChange={(event) =>
                      setPatientSearchTerm(event.target.value)
                    }
                    placeholder="Rechercher un patient par nom, espèce ou propriétaire..."
                    value={patientSearchTerm}
                  />
                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(event) =>
                      handlePatientSelect(event.target.value)
                    }
                    value={selectedPatientId}
                  >
                    <NativeSelectOption disabled value="">
                      {selectedOwnerId
                        ? "Sélectionner un dossier du client"
                        : "Sélectionner un dossier"}
                    </NativeSelectOption>
                    {filteredPatientsForForm.map((patient) => {
                      const owner = ownersById.get(patient.ownerId);
                      return (
                        <NativeSelectOption key={patient.id} value={patient.id}>
                          {patient.name} · {patient.species} ·{" "}
                          {formatOwnerName(owner)}
                        </NativeSelectOption>
                      );
                    })}
                  </NativeSelect>
                  <FieldDescription>
                    {selectedOwnerId
                      ? "Seuls les patients liés au client choisi sont affichés."
                      : "Le propriétaire sera lié automatiquement depuis le dossier choisi."}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Vétérinaire</FieldLabel>
                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(event) => setSelectedVetId(event.target.value)}
                    value={selectedVetId}
                  >
                    <NativeSelectOption value="">
                      Affectation automatique
                    </NativeSelectOption>
                    {vets.map((vet) => (
                      <NativeSelectOption key={vet.id} value={vet.id}>
                        {vet.displayName}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    Laissez vide pour utiliser le vétérinaire local disponible
                    par défaut.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>
                    {t("scheduling.room", { defaultValue: "Salle" })}
                  </FieldLabel>
                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(event) => setFormRoom(event.target.value)}
                    value={formRoom}
                  >
                    {APPOINTMENT_ROOMS.map((room) => (
                      <NativeSelectOption key={room.value} value={room.value}>
                        {t(room.i18nKey)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    {t("scheduling.roomDescription", {
                      defaultValue:
                        "Salles physiques de la clinique. Un conflit de salle empêchera l'enregistrement.",
                    })}
                  </FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel>Type d&apos;acte</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {APPOINTMENT_TYPES.map((type) => (
                    <Button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      size="sm"
                      type="button"
                      variant={selectedType === type ? "default" : "outline"}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </Field>

              <div className="space-y-4 rounded-xl border border-zinc-150/70 bg-zinc-50/30 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/10">
                <Field className="items-center gap-3" orientation="horizontal">
                  <Checkbox
                    checked={recurrenceEnabled}
                    disabled={!!editingAppointmentId}
                    id="recurrence-enabled"
                    onCheckedChange={(value) =>
                      setRecurrenceEnabled(value === true)
                    }
                  />
                  <div className="space-y-0.5 leading-none">
                    <FieldLabel htmlFor="recurrence-enabled">
                      {t("scheduling.recurrence.enable", {
                        defaultValue: "Rendez-vous récurrent",
                      })}
                    </FieldLabel>
                    <FieldDescription>
                      {t("scheduling.recurrence.enableDescription", {
                        defaultValue:
                          "Crée automatiquement la suite de rendez-vous (hebdomadaire, bimensuel, mensuel ou annuel).",
                      })}
                    </FieldDescription>
                  </div>
                </Field>

                {recurrenceEnabled ? (
                  <>
                    <Field>
                      <FieldLabel>
                        {t("scheduling.recurrence.frequency", {
                          defaultValue: "Fréquence",
                        })}
                      </FieldLabel>
                      <RadioGroup
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                        onValueChange={(value) =>
                          setRecurrenceFrequency(value as RecurrenceFrequency)
                        }
                        value={recurrenceFrequency}
                      >
                        {RECURRENCE_FREQUENCIES.map((freq) => (
                          <label
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-muted/40"
                            key={freq.value}
                          >
                            <RadioGroupItem
                              id={`freq-${freq.value}`}
                              value={freq.value}
                            />
                            <span>
                              {t(
                                `scheduling.recurrence.frequencies.${freq.value}`
                              )}
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    </Field>

                    {recurrenceFrequency === "weekly" ? (
                      <Field>
                        <FieldLabel>
                          {t("scheduling.recurrence.daysOfWeek", {
                            defaultValue: "Jours de la semaine",
                          })}
                        </FieldLabel>
                        <div className="flex flex-wrap gap-2">
                          {DAY_OF_WEEK_LABELS.map((day) => {
                            const checked = recurrenceDaysOfWeek.includes(
                              day.value
                            );
                            return (
                              <Button
                                key={day.value}
                                onClick={() => {
                                  setRecurrenceDaysOfWeek((current) =>
                                    checked
                                      ? current.filter((d) => d !== day.value)
                                      : [...current, day.value].sort()
                                  );
                                }}
                                size="sm"
                                type="button"
                                variant={checked ? "default" : "outline"}
                              >
                                {t(day.i18nKey)}
                              </Button>
                            );
                          })}
                        </div>
                      </Field>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>
                          {t("scheduling.recurrence.endDate", {
                            defaultValue: "Date de fin (optionnelle)",
                          })}
                        </FieldLabel>
                        <Input
                          onChange={(event) =>
                            setRecurrenceEndDate(event.target.value)
                          }
                          type="date"
                          value={recurrenceEndDate}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>
                          {t("scheduling.recurrence.maxOccurrences", {
                            defaultValue: "Nombre max d'occurrences",
                          })}
                        </FieldLabel>
                        <Input
                          min={1}
                          onChange={(event) => {
                            const raw = event.target.value.trim();
                            setRecurrenceMaxOccurrences(
                              raw === "" ? null : Math.max(1, Number(raw))
                            );
                          }}
                          type="number"
                          value={recurrenceMaxOccurrences ?? ""}
                        />
                        <FieldDescription>
                          {t(
                            "scheduling.recurrence.maxOccurrencesDescription",
                            {
                              defaultValue:
                                "Laissez vide pour une récurrence sans limite (jusqu'à la date de fin).",
                            }
                          )}
                        </FieldDescription>
                      </Field>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_1fr_200px]">
                <Field>
                  <FieldLabel>Date</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          className="w-full justify-between"
                          variant="outline"
                        />
                      }
                    >
                      <span>{formDate.split("-").reverse().join("/")}</span>
                      <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-auto rounded-[1.75rem] p-2"
                      sideOffset={10}
                    >
                      <Calendar
                        className="rounded-[1.4rem]"
                        locale={fr}
                        mode="single"
                        onSelect={(date) => {
                          if (date) {
                            setFormDate(formatDateInput(date));
                          }
                        }}
                        selected={parseDateInput(formDate) ?? new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>
                    Format français : JJ/MM/AAAA.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Heure</FieldLabel>
                  <AppointmentTimePicker
                    durationMinutes={duration}
                    onChange={setFormTime}
                    value={formTime}
                  />
                </Field>

                <Field>
                  <FieldLabel>Durée</FieldLabel>
                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(event) =>
                      setDuration(Number(event.target.value))
                    }
                    value={String(duration)}
                  >
                    {DURATION_OPTIONS.map((value) => (
                      <NativeSelectOption key={value} value={String(value)}>
                        {formatDuration(value)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              <Field>
                <FieldLabel>Motif clinique</FieldLabel>
                <Textarea
                  className="min-h-28"
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Décrivez la demande, les signes cliniques ou le contexte du rendez-vous."
                  value={reason}
                />
                <FieldDescription>
                  Ce texte alimente aussi la lecture rapide dans le tableau du
                  planning.
                </FieldDescription>
              </Field>

              <div className="rounded-xl border border-zinc-150/70 bg-zinc-50/30 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-10 items-center justify-center rounded-xl border border-zinc-100 bg-background text-foreground shadow-3xs dark:border-zinc-900">
                    <HugeiconsIcon icon={UserCircle02Icon} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {selectedPatientId
                        ? patientsById.get(selectedPatientId)?.name ||
                          "Patient local"
                        : "Sélectionnez un dossier patient"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {selectedPatientId
                        ? getPatientProfile(patientsById.get(selectedPatientId))
                        : "Le résumé patient et propriétaire s’actualise ici pendant la saisie."}
                    </p>
                  </div>
                </div>
              </div>
            </FieldGroup>
          </FormDialogBody>

          <FormDialogFooter className="flex-col sm:flex-row sm:justify-between">
            <div className="flex min-h-11 items-center">
              {editingAppointmentId ? (
                <Button
                  className="h-11 min-w-[120px] justify-center"
                  onClick={() => {
                    const current = appointments.find(
                      (appointment) => appointment.id === editingAppointmentId
                    );
                    if (current) {
                      void deleteAppointment(current);
                    }
                  }}
                  variant="destructive"
                >
                  Supprimer
                </Button>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:items-end">
              {formError ? (
                <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm sm:max-w-[360px]">
                  {formError}
                </div>
              ) : null}
              <div className="modal-medical-actions w-full flex-col-reverse sm:w-auto sm:flex-row">
                <Button
                  className="h-11 min-w-[132px] justify-center"
                  onClick={closeDialog}
                  variant="outline"
                >
                  Annuler
                </Button>
                <Button
                  className="h-11 min-w-[200px] justify-center shadow-sm"
                  disabled={isSubmitting || !selectedPatientId}
                  onClick={handleSave}
                >
                  {isSubmitting ? null : (
                    <HugeiconsIcon
                      data-icon="inline-start"
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={1.5}
                    />
                  )}
                  {isSubmitting ? <Spinner className="size-4" /> : null}
                  <span>
                    {editingAppointmentId
                      ? "Enregistrer"
                      : "Ajouter au planning"}
                  </span>
                  <kbd className="hidden rounded bg-primary-foreground/20 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
                    ⌘↵
                  </kbd>
                </Button>
              </div>
            </div>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setAppointmentPendingDelete(null);
          }
        }}
        open={Boolean(appointmentPendingDelete)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce rendez-vous ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le rendez-vous sera retiré du planning immédiatement. Cette action
              est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (appointmentPendingDelete) {
                  void performAppointmentDelete(appointmentPendingDelete);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
