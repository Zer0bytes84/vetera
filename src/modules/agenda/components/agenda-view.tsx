import { useState } from "react";
import { AgendaStays } from "@/modules/hospitalizations/stays/agenda-stays";
import { PatientDossierSearch } from "./patient-dossier-search";
import { formatPersonName } from "@/utils/display-format";
import {
  Add01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  SearchIcon,
  StethoscopeIcon,
  UserCircle02Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { fr } from "date-fns/locale";

import { AgendaListView } from "@/components/AgendaListView";
import { AgendaCalendar, type CalendarView } from "@/modules/agenda/components/agenda-calendar";
import { AgendaDayLoadCard } from "@/modules/agenda/components/agenda-day-load";
import { findNextAppointmentAfter } from "@/modules/agenda/components/agenda-day-load-model";
import MotivationalHeader from "@/components/MotivationalHeader";
import { SectionCards } from "@/components/section-cards";
import { isActiveBooking } from "./agenda-slots";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { APPOINTMENT_STATUS_META } from "@/config/status-meta";


import type { RecurrenceFrequency } from "@/types/db";
import {
  APPOINTMENT_TYPES,
  AppointmentTimePicker,
  DURATION_OPTIONS,
  RECURRENCE_FREQUENCIES,
  DAY_OF_WEEK_LABELS,
  TABLE_SCOPES,
  TABLE_TABS,
  ViewMode,
  TableTab,
  normalizeDate,
  formatDateInput,
  parseDateInput,
  isSameDay,
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
} from "@/modules/agenda/components/agenda-shared";
import type { AgendaViewProps } from "../hooks/use-agenda-page-model";
import { DatePicker } from "@/components/ui/date-picker";

export function AgendaView(props: AgendaViewProps) {
  const {
    appointmentPendingDelete,
    appointments,
    appointmentsByVet,
    closeDialog,
    currentTime,
    currentTimePosition,
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
    roomOptions,
    timeBusySlots,
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
    openAppointmentInFlux,
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
    weekDays,
  } = props;
  // The day in close-up opens first: a busy day reads at a glance before anything else.
  const [calendarView, setCalendarView] = useState<CalendarView>("day");
  const isDayScope = tableTab === "selection";
  const displayMode: ViewMode = viewMode === "month" ? "list" : viewMode;
  const showsList = !isDayScope || displayMode === "list";
  const hasActiveFilters =
    searchTerm.trim() !== "" || vetFilter !== "all" || statusFilter !== "all";
  const resetFilters = () => {
    setSearchTerm("");
    setVetFilter("all");
    setStatusFilter("all");
  };
  const dayRows = tableRowsByTab.selection;
  const dayCompleted = dayRows.filter(
    (row) => row.appointment.status === "completed"
  ).length;
  const dayUrgent = dayRows.filter(
    (row) => row.appointment.type === "Urgence"
  ).length;
  const daySummaryLabel =
    dayRows.length === 0
      ? "Aucun rendez-vous"
      : [
          `${dayRows.length} rendez-vous`,
          dayCompleted > 0
            ? `${dayCompleted} terminé${dayCompleted > 1 ? "s" : ""}`
            : null,
          dayRows.length - dayCompleted > 0
            ? `${dayRows.length - dayCompleted} à suivre`
            : null,
          dayUrgent > 0 ? `${dayUrgent} urgence${dayUrgent > 1 ? "s" : ""}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
  // Suite proposée par le panneau de charge quand la journée est libre.
  const nextAppointmentAfterDay = findNextAppointmentAfter(appointments, selectedDate);
  const selectedAppointmentDate = selectedAppointment
    ? normalizeDate(selectedAppointment.startTime)
    : null;
  return (
    <div className="agenda-workspace dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-8 pb-8 lg:px-6">
      <MotivationalHeader section="agenda"
        actions={<>
          <Button
            className="h-9 px-4"
            onClick={() => handleOpenCreate()}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Add01Icon}
              strokeWidth={1.5}
            />
            {t("agenda.newAppointment")}
          </Button>
        </>}
      />

      <SectionCards items={sectionCards} />

      <AgendaCalendar
        getAppointmentsForDate={getAppointmentsForDate}
        getPatientName={getPatientName}
        monthDays={monthDays}
        onCreateAt={(date, time) => handleOpenCreate(date, time)}
        onSelectAppointment={(appointment) => {
          selectAppointment(appointment, true);
          // The detail card sits under the calendar: bring it into view.
          window.requestAnimationFrame(() =>
            document.getElementById("agenda-detail")?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
              block: "nearest",
            })
          );
        }}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setTableTab("selection");
        }}
        onViewChange={setCalendarView}
        selectedAppointmentId={selectedAppointmentId}
        selectedDate={selectedDate}
        view={calendarView}
        weekDays={weekDays}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_336px] xl:items-start">
        <Card className="agenda-day-panel surface-card min-h-[420px] min-w-0 overflow-clip border-0">
          <CardHeader className="agenda-day-heading gap-1.5 border-border border-b px-5 pt-6 pb-5 sm:px-6">
            <CardTitle className="font-medium text-[18px] tracking-[-0.02em]">
              {isDayScope
                ? periodLabel
                : TABLE_TABS.find((tab) => tab.value === tableTab)?.label}
            </CardTitle>
            <CardDescription className="text-sm">
              {!isDayScope
                ? TABLE_SCOPES(formatDateLabel(selectedDate))[tableTab]
                : displayMode === "day"
                  ? `${daySummaryLabel}${dayRows.length > 0 ? ", répartis par vétérinaire" : ""}`
                  : displayMode === "week"
                    ? "Rendez-vous de la semaine du jour choisi, jour par jour"
                    : daySummaryLabel}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
            <Tabs
              className="min-w-0 gap-0"
              onValueChange={(value) => setTableTab(value as TableTab)}
              value={tableTab}
            >
              <div className="agenda-day-toolbar flex flex-col gap-3 border-border border-b px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TabsList aria-label="Rendez-vous à afficher" tabsStyle="segmented">
                    {TABLE_TABS.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                        <span className="tabCount">
                          {tableRowsByTab[tab.value].length}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {isDayScope ? (
                    <Tabs
                      onValueChange={(value) => setViewMode(value as ViewMode)}
                      value={displayMode}
                    >
                      <TabsList aria-label="Affichage de la journée" tabsStyle="segmented">
                        <TabsTrigger value="list">Liste</TabsTrigger>
                        <TabsTrigger value="day">Par vétérinaire</TabsTrigger>
                        <TabsTrigger value="week">Semaine</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  ) : null}
                </div>

                {showsList ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px] flex-1">
                      <HugeiconsIcon
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        icon={SearchIcon}
                        strokeWidth={1.5}
                      />
                      <Input
                        aria-label="Rechercher un rendez-vous"
                        className="pl-9"
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Rechercher un patient, un propriétaire, un motif…"
                        value={searchTerm}
                      />
                    </div>
                    <NativeSelect
                      aria-label="Vétérinaire"
                      className="w-full sm:w-48"
                      onChange={(event) => setVetFilter(event.target.value)}
                      value={vetFilter}
                    >
                      <NativeSelectOption value="all">
                        Tous les vétérinaires
                      </NativeSelectOption>
                      {vets.map((vet) => (
                        <NativeSelectOption key={vet.id} value={vet.id}>
                          {formatPersonName(vet.displayName)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <NativeSelect
                      aria-label="Statut"
                      className="w-full sm:w-44"
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
                    {hasActiveFilters ? (
                      <Button onClick={resetFilters} variant="ghost">
                        Réinitialiser les filtres
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {isDayScope ? (
                <AgendaStays
                  mode={displayMode}
                  patientName={getPatientName}
                  selectedDate={selectedDate}
                  weekDays={weekDays}
                />
              ) : null}

              {loadingAppointments ? (
                <div className="flex items-center justify-center p-6">
                  <Spinner />
                </div>
              ) : displayMode === "day" && isDayScope ? (
                <div className="min-w-0 overflow-x-auto pt-4">
                  <AgendaDayView
                    appointmentsByVet={appointmentsByVet}
                    currentTimeLabel={formatTime(currentTime)}
                    currentTimePosition={currentTimePosition}
                    getPatientName={getPatientName}
                    onCreateAt={(vetId, time) => handleOpenCreate(selectedDate, time, vetId)}
                    onSelectAppointment={selectAppointment}
                    selectedAppointmentId={selectedAppointmentId}
                    selectedDate={selectedDate}
                    vets={vets}
                  />
                </div>
              ) : displayMode === "week" && isDayScope ? (
                <div className="min-w-0 overflow-x-auto pt-4">
                  <AgendaWeekView
                    getAppointmentsForDate={getAppointmentsForDate}
                    getPatientName={getPatientName}
                    onSelectAppointment={selectAppointment}
                    selectedAppointmentId={selectedAppointmentId}
                    weekDays={weekDays}
                  />
                </div>
              ) : (
                <AgendaListView
                  emptyState={
                    <Empty className="m-5 border border-border/80 border-dashed bg-muted/20 sm:m-6">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <HugeiconsIcon
                            icon={tableTab === "attention" ? Alert02Icon : Calendar01Icon}
                            strokeWidth={1.5}
                          />
                        </EmptyMedia>
                        <EmptyTitle>
                          {hasActiveFilters
                            ? "Aucun rendez-vous ne correspond aux filtres"
                            : isDayScope
                              ? "Journée libre"
                              : "Aucun rendez-vous dans cette liste"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {hasActiveFilters
                            ? "Modifiez la recherche ou réinitialisez les filtres."
                            : isDayScope
                              ? "Aucun rendez-vous ce jour-là. Choisissez un autre jour dans le calendrier ou ajoutez un rendez-vous."
                              : "Rien à afficher pour le moment."}
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent className="sm:flex-row">
                        {hasActiveFilters ? (
                          <Button onClick={resetFilters} variant="outline">
                            Réinitialiser les filtres
                          </Button>
                        ) : null}
                        <Button
                          onClick={() => handleOpenCreate(selectedDate)}
                          variant="outline"
                        >
                          <HugeiconsIcon
                            data-icon="inline-start"
                            icon={Add01Icon}
                            strokeWidth={1.5}
                          />
                          Nouveau rendez-vous
                        </Button>
                      </EmptyContent>
                    </Empty>
                  }
                  formatTime={formatTime}
                  onDeleteAppointment={deleteAppointment}
                  onEditAppointment={handleOpenEdit}
                  onOpenAppointment={openAppointmentInFlux}
                  onSelectAppointment={(appointment) => selectAppointment(appointment)}
                  onTransitionStatus={handleAppointmentStatusTransition}
                  resetKey={`${tableTab}:${selectedDate.toDateString()}:${searchTerm}:${vetFilter}:${statusFilter}`}
                  rows={tableRowsByTab[tableTab]}
                  selectedAppointmentId={selectedAppointmentId}
                  showDate={!isDayScope}
                />
              )}
            </Tabs>
          </CardContent>
        </Card>

        <aside className="grid min-w-0 gap-6" aria-label="Détail et charge de la journée">
          {selectedAppointment ? (
            <Card className="agenda-side-panel board-frame" id="agenda-detail">
              <CardHeader className="border-border border-b px-5 py-4">
                <CardDescription>Rendez-vous sélectionné</CardDescription>
                <CardTitle className="font-medium text-[18px] tracking-[-0.02em]">
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

              <CardContent className="grid gap-4 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-sm">Acte</span>
                  <AppointmentTypeBadge type={selectedAppointment.type} />
                </div>

                <div className="grid gap-2.5 border-border/60 border-t pt-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Créneau</span>
                    <span className="text-right font-medium text-foreground tabular-nums">
                      {formatTimeCompact(selectedAppointment.startTime)} à{" "}
                      {formatTimeCompact(selectedAppointment.endTime)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-right font-medium text-foreground">
                      {formatDateLabel(selectedAppointmentDate ?? selectedDate, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Vétérinaire</span>
                    <span className="text-right font-medium text-foreground">
                      {formatPersonName(selectedVet?.displayName) || "Vétérinaire local"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Propriétaire</span>
                    <span className="text-right font-medium text-foreground">
                      {formatOwnerName(selectedOwner)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-1 border-border/60 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      className="size-4 text-muted-foreground"
                      icon={StethoscopeIcon}
                      strokeWidth={1.5}
                    />
                    <p className="font-medium text-foreground text-sm">
                      {selectedPatient?.name || "Patient local"}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {getPatientProfile(selectedPatient)} ·{" "}
                    {getAgeLabel(selectedPatient?.dateOfBirth)}
                  </p>
                  <p className="mt-1 text-muted-foreground text-sm leading-6">
                    {selectedAppointment.reason ||
                      "Aucun motif détaillé n'a encore été saisi."}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex-wrap gap-2 border-t px-5 py-4">
                <Button
                  className="flex-1"
                  onClick={() => handleOpenEdit(selectedAppointment)}
                  variant="outline"
                >
                  Modifier
                </Button>
                {selectedAppointmentDate &&
                !isSameDay(selectedAppointmentDate, selectedDate) ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setSelectedDate(selectedAppointmentDate);
                      setTableTab("selection");
                    }}
                    variant="outline"
                  >
                    Voir la journée
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    onClick={() => handleOpenCreate(selectedDate)}
                    variant="outline"
                  >
                    Nouveau RDV ce jour
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : (
            <div className="agenda-side-panel agenda-side-empty board-frame rounded-panel border border-border/80 border-dashed">
              <HugeiconsIcon
                className="mb-3 size-6 text-muted-foreground"
                icon={Calendar01Icon}
                strokeWidth={1.5}
              />
              <p className="font-medium text-foreground text-sm">
                Aucun rendez-vous sélectionné
              </p>
              <p className="mt-1 max-w-xs text-muted-foreground text-sm leading-6">
                Cliquez sur un rendez-vous de la liste pour afficher son détail.
              </p>
            </div>
          )}

          <AgendaDayLoadCard
            dayLoadSummary={dayLoadSummary}
            engagedVetsCount={engagedVetsCount}
            getAppointmentCount={(date) => getAppointmentsForDate(date).filter(isActiveBooking).length}
            nextAppointment={
              nextAppointmentAfterDay
                ? {
                    appointment: nextAppointmentAfterDay,
                    patientName:
                      patientsById.get(nextAppointmentAfterDay.patientId)?.name ||
                      nextAppointmentAfterDay.title,
                  }
                : null
            }
            onCreateAppointment={() => handleOpenCreate(selectedDate)}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setTableTab("selection");
            }}
            selectedDate={selectedDate}
            totalPlannedMinutes={totalPlannedMinutes}
            typeSummary={typeSummary}
            urgentOpenCount={urgentOpenCount}
            weekDays={weekDays}
          />
        </aside>
      </div>

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
                <PatientDossierSearch
                  className="lg:col-span-2"
                  matches={unifiedAppointmentMatches}
                  onChange={setPersonSearchTerm}
                  onSelect={handlePatientSelect}
                  selectedPatientId={selectedPatientId}
                  value={personSearchTerm}
                />

                {/* Second path, folded: pick the owner first, then one of their dossiers. */}
                <Collapsible className="lg:col-span-2" key={isDialogOpen ? "open" : "closed"}>
                  <CollapsibleTrigger
                    className="group/owner-path inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 t-13 font-medium text-[color:var(--ink-soft,#5d5d5d)] outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="transition-transform group-data-[panel-open]/owner-path:rotate-180"
                      icon={ArrowDown01Icon}
                      size={16}
                      strokeWidth={1.5}
                    />
                    Rechercher par propriétaire
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid gap-5 lg:grid-cols-2">
                    <Field className="lg:col-span-2">
                      <FieldLabel>Client existant</FieldLabel>
                      <Input
                        onChange={(event) => {
                          setOwnerSearchTerm(event.target.value);
                          if (!event.target.value.trim()) {
                            setSelectedOwnerId("");
                          }
                        }}
                        placeholder="Rechercher un propriétaire par nom, téléphone ou email…"
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

                    <Field className="lg:col-span-2">
                      <FieldLabel>Patient</FieldLabel>
                      <Input
                        onChange={(event) =>
                          setPatientSearchTerm(event.target.value)
                        }
                        placeholder="Rechercher un patient par nom, espèce ou propriétaire…"
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
                    </div>
                  </CollapsibleContent>
                </Collapsible>

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
                        {formatPersonName(vet.displayName)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    Laissez vide pour utiliser le vétérinaire local disponible
                    par défaut.
                  </FieldDescription>
                </Field>

                {/* A clinic with a single room has nothing to choose. */}
                {roomOptions.length > 1 && (
                  <Field>
                    <FieldLabel>
                      {t("scheduling.room", { defaultValue: "Salle" })}
                    </FieldLabel>
                    <NativeSelect
                      className="w-full cursor-pointer"
                      onChange={(event) => setFormRoom(event.target.value)}
                      value={formRoom}
                    >
                      {roomOptions.map((room) => (
                        <NativeSelectOption key={room.value} value={room.value}>
                          {room.archived ? `${room.label} (archivée)` : room.label}
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
                )}
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
                        <DatePicker clearable
                          onChange={(value) =>
                            setRecurrenceEndDate(value)
                          }
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
                          className="w-full justify-between font-normal"
                          data-field="date"
                          variant="outline"
                        />
                      }
                    >
                      <span className="tabular-nums">{formDate.split("-").reverse().join("/")}</span>
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
                    Choisissez le jour dans le calendrier.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Heure</FieldLabel>
                  <AppointmentTimePicker
                    busy={timeBusySlots}
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
                  <kbd className="hidden rounded bg-primary-foreground/20 px-1.5 py-0.5 font-mono t-12 sm:inline-block">
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
