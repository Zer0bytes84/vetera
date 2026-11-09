# Annexe : exports et types non utilisés (Knip)

Dans des fichiers montés. Informatif, non proposé à la suppression.

| Fichier | Exports non utilisés | Types non utilisés |
|---|---|---|
| `src/App.tsx` | App |  |
| `src/app/config/navigation.ts` | viewTitleKeys |  |
| `src/components/Avatar.tsx` | getDefaultAvatarEmoji | AvatarSize |
| `src/components/Help.tsx` | Help |  |
| `src/components/SlashCommandsExtension.tsx` | getSlashCommandItems |  |
| `src/components/mascot/index.ts` | MascotAvatar, MascotChoices, MascotSettings, SidebarBrand, MASCOT_ANIMALS, MASCOT_ASSETS, MASCOT_CHOICES, LEGACY_VECTOR_MASCOTS, LineMascot | MascotProps, MascotAvatarProps |
| `src/components/mascot/line-mascots.tsx` | FRAME |  |
| `src/components/mascot/mascot-assets.ts` | MASCOT_ANIMALS |  |
| `src/components/mascot/mascot.tsx` | MascotAvatar | MascotMood |
| `src/components/nav-main.tsx` |  | NavSubItem |
| `src/components/reminder-buckets.ts` | BUCKET_LABELS, BUCKET_ORDER |  |
| `src/components/ui/action-button.tsx` |  | ButtonVariant, ButtonSize |
| `src/components/ui/agent-composer.tsx` |  | ComposerSuggestion, ComposerMenu |
| `src/components/ui/agent-question.tsx` |  | QuestionOption, AgentQuestionData |
| `src/components/ui/agent-status.tsx` | formatElapsed | AgentStatusStep, AgentStatusState, AgentStatusData |
| `src/components/ui/alert-dialog.tsx` | AlertDialogMedia, AlertDialogOverlay, AlertDialogPortal, AlertDialogTrigger |  |
| `src/components/ui/avatar.tsx` | AvatarBadge, AvatarGroup, AvatarGroupCount |  |
| `src/components/ui/badge.tsx` | badgeVariants |  |
| `src/components/ui/bubble.tsx` | BubbleGroup, BubbleReactions |  |
| `src/components/ui/calendar.tsx` | CalendarDayButton |  |
| `src/components/ui/chart.tsx` | ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip |  |
| `src/components/ui/choice-controls.tsx` | RadioGroup, Radio | RadioGroupProps, RadioProps |
| `src/components/ui/combobox.tsx` | ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxCollection, ComboboxGroup, ComboboxLabel, ComboboxSeparator, ComboboxTrigger, ComboboxValue, useComboboxAnchor |  |
| `src/components/ui/command.tsx` | CommandShortcut |  |
| `src/components/ui/confirmation-card.tsx` |  | ConfirmationItem, ConfirmationStatus |
| `src/components/ui/context-window-meter.tsx` | formatTokens | ContextSegment |
| `src/components/ui/dialog.tsx` | DialogOverlay, DialogPortal, DialogTrigger |  |
| `src/components/ui/direction.tsx` | useDirection |  |
| `src/components/ui/diverging-bars.tsx` |  | DivergingSeries |
| `src/components/ui/dropdown-menu.tsx` | DropdownMenuCheckboxItem, DropdownMenuPortal |  |
| `src/components/ui/field.tsx` | FieldContent, FieldError, FieldLegend, FieldSeparator, FieldSet, FieldTitle |  |
| `src/components/ui/hex-density.tsx` |  | HexCaption |
| `src/components/ui/input-group.tsx` | InputGroupText, InputGroupTextarea |  |
| `src/components/ui/kbd.tsx` | KbdGroup |  |
| `src/components/ui/loader.tsx` | Thinking | ThinkingProps |
| `src/components/ui/marker.tsx` | markerVariants |  |
| `src/components/ui/message.tsx` | MessageGroup, MessageAvatar, MessageFooter, MessageHeader |  |
| `src/components/ui/native-select.tsx` | NativeSelectOptGroup |  |
| `src/components/ui/pagination.tsx` | PaginationEllipsis |  |
| `src/components/ui/popover.tsx` | PopoverHeader |  |
| `src/components/ui/progress-bar.tsx` |  | BarTone, BarSegment |
| `src/components/ui/progress.tsx` | ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue |  |
| `src/components/ui/scroll-area.tsx` | ScrollBar |  |
| `src/components/ui/segmented-control.tsx` |  | SegmentedOption |
| `src/components/ui/select.tsx` | SelectGroup, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator |  |
| `src/components/ui/sheet.tsx` | SheetFooter, SheetTrigger |  |
| `src/components/ui/sidebar.tsx` | SidebarGroupAction, SidebarInput, SidebarMenuBadge, SidebarMenuSkeleton, SidebarRail, SidebarSeparator |  |
| `src/components/ui/streaming-message.tsx` |  | StreamingMessageData |
| `src/components/ui/table.tsx` | TableCaption, TableFooter |  |
| `src/components/ui/tabs.tsx` | tabsListVariants |  |
| `src/components/ui/toggle.tsx` | Toggle |  |
| `src/components/ui/tool-call-block.tsx` |  | ToolCallStatus, ToolCall |
| `src/components/ui/user-message.tsx` | formatBytes | UserMessageAttachment, UserMessageStatus, UserMessageData |
| `src/config/status-meta.ts` | PRIORITY_META, STOCK_STATUS_META, TRANSACTION_TYPE_META, TRANSACTION_STATUS_META, SPECIES_TONE, getSpeciesTone |  |
| `src/design-system/motion.ts` | rowMotion, reducedRowMotion |  |
| `src/design-system/primitives/index.tsx` | press, Surface |  |
| `src/domain/clinical/reminders.ts` | DEFAULT_APPOINTMENT_REMINDER_OFFSETS |  |
| `src/domain/clinical/scheduling.ts` | APPOINTMENT_STATUSES, canTransitionAppointmentStatus | AppointmentConflictKind |
| `src/domain/stock-alerts.ts` | usableStock |  |
| `src/hooks/useSQLite.ts` |  | SQLiteWriteStatus |
| `src/lib/brand.ts` | APP_TAGLINE |  |
| `src/lib/clinical-alerts.ts` | highestSeverity, CLINICAL_THRESHOLDS | AlertSeverity |
| `src/lib/hugeicons.ts` | Activity02Icon, Activity03Icon, AlertIcon, AnalyticsUpIcon, ArrowDownIcon, ArrowUpIcon, BotIcon, Brain02Icon, Camera01Icon, ChartUpIcon, Chatting01Icon, ChevronDown, CircleIcon, ClipboardIcon, CodeCircleIcon, CpuIcon, DangerIcon, Delete02Icon, Doctor01Icon, Download01Icon, HardDriveIcon, Home04Icon, InformationSquareIcon, LayoutLeftIcon, LeftToRightListBulletIcon, LeftToRightListNumberIcon, Link01Icon, Login02Icon, Logout02Icon, MedicineBottle01Icon, Menu01Icon, Money01Icon, MoneyBag02Icon, MonitorDotIcon, Mic01Icon, AudioWave01Icon, Moon01Icon, MoreHorizontalCircle01Icon, MoreVerticalCircle01Icon, NoteIcon, Notification02Icon, NotificationIcon, PhoneCheckIcon, PlayCircle02Icon, PlayIcon, PlusSignIcon, Share01Icon, Share08Icon, Shield02Icon, StarsIcon, Sun01Icon, Sun02Icon, TelegramIcon, TestTube01Icon, TextAlignLeft01Icon, Time01Icon, UndoIcon, Upload01Icon, UserIcon, UserMultipleIcon, ZapIcon |  |
| `src/lib/icons.tsx` | AlertCircle, ArrowDownIcon, Bandaids, BellRing, BookOpen, Box, Brain, CalendarCheck2, CalendarRange, CalendarX, CalendarX2, ChartNoAxesColumnIncreasing, CheckCircle2, ChevronUp, ChevronsLeft, ChevronsRight, Circle, CircleCheckBig, CircleDashed, Clock, Clock4, Columns2, ContactRound, Database, EllipsisVertical, FilePlus, Flag, Flame, Folder, Grid2X2, GripVertical, HardDrive, Heading2, Landmark, Lightbulb, Loader, MailCheck, Minus, MinusIcon, MonitorSmartphone, MoreVertical, Package2, PieChart, PlayCircle, Pulse, RefreshCcw, Scissors, Shield, ShoppingCart, Sparkle, Timer, TrendingDown, TrendingUp, TriangleAlert, Trophy, UserCircle, UserRoundCog, UsersRound, Wallet, WarningCircle, WarningDiamond, WarningOctagon, Wind, Workflow, Zap | AppIconProps |
| `src/lib/mascot-preferences.ts` | MASCOT_STORAGE_KEY, VALID_ANIMALS, parseMascotPreferences |  |
| `src/lib/metrics.ts` | formatPercent |  |
| `src/lib/motion-tokens.ts` | CSS_EASE_OUT, CSS_EASE_IN_OUT |  |
| `src/lib/sidebar-tone.ts` | SIDEBAR_TONE_EVENT |  |
| `src/lib/species-theme.ts` |  | SpeciesType |
| `src/lib/theme-store.ts` | DEFAULT_CLEAN_FONT, cleanUpRemovedDisplaySettings |  |
| `src/modules/agenda/components/agenda-calendar.tsx` | AgendaLegend |  |
| `src/modules/agenda/components/agenda-shared.tsx` | STEP_MINUTES, timeToMinutes, minutesToTime, HOUR_BLOCKS, CALENDAR_START_MINUTES, CALENDAR_END_MINUTES, WEEK_HOUR_HEIGHT, APPOINTMENT_VERTICAL_GAP, startOfDay, getCurrentLocale, getDateFnsLocale, getMinutesFromDayStart, getAppointmentFrame, appointmentsOverlap, findAvailableColumn, getAvailableColumnSpan, layoutAppointmentGroup, calculateOverlapMap, getCalendarBlockPresentation, CalendarAppointmentContent, CalendarAppointmentBlock, AgendaMonthView | AppointmentLayout |
| `src/modules/agenda/model/agenda-layout.ts` | MAX_LANES |  |
| `src/modules/anesthesia/index.ts` | AnesthesiaDrugLogEntryDialog, AnesthesiaMonitoringEntryDialog, AnesthesiaSheetDialog, AnesthesiaStatusBadge | AnesthesiaStatusFilter |
| `src/modules/care-tasks/care-day.ts` | SOON_HOURS |  |
| `src/modules/care-tasks/care-icons.tsx` | CalendarDays, Clipboard |  |
| `src/modules/care-tasks/domain.ts` |  | CareSuggestionProvider |
| `src/modules/care-tasks/hooks.ts` | onCareTaskCompleted |  |
| `src/modules/clinique/components/clinique-shared.tsx` | MAX_DOCUMENT_SIZE_BYTES, ALLOWED_DOCUMENT_MIME, LIST_TABS, normalizeDate, formatFileSize, isToday, formatTime, formatDateLabel, formatShortDate, formatElapsedDuration, getSpeciesIcon, getPatientAge, getPatientStatusMeta, AppointmentTypeBadge, AppointmentStatusBadge, generatePrescriptionPDF | CliniqueProps, ListTab, DetailTab |
| `src/modules/consultations/hooks/use-local-consultation-ai.ts` | MICROPHONE_HOLD_MS |  |
| `src/modules/consultations/lib/voice-to-soap.ts` | EMPTY_SOAP_DRAFT |  |
| `src/modules/consultations/local-ai/audio-capture.ts` | MAX_RECORDING_SECONDS, MICROPHONE_PERMISSION_TIMEOUT_MS, MICROPHONE_REFUSED, WHISPER_SAMPLE_RATE |  |
| `src/modules/consultations/local-ai/embedding-store.ts` | indexReviewedSource |  |
| `src/modules/consultations/local-ai/generator-choice.ts` | GENERATOR_PREFERENCE_KEY, GENERATOR_FILES |  |
| `src/modules/consultations/local-ai/passage-search.ts` | INDEXED_GENERATIONS, V1_CALIBRATION |  |
| `src/modules/consultations/local-ai/search-generation.ts` | DEFAULT_SEARCH_GENERATION |  |
| `src/modules/consultations/local-ai/soap-layout.ts` | dropSoapHeading |  |
| `src/modules/consultations/local-ai/soap-questionnaire-config.ts` |  | SoapQuestionnaireOption |
| `src/modules/consultations/local-ai/soap-review.ts` | soapMetadata |  |
| `src/modules/consultations/local-ai/treatment-routing.ts` | appendVerbatimPlan | TreatmentKind |
| `src/modules/consultations/off-visit-note.ts` | offVisitTitle |  |
| `src/modules/consultations/services/ai-model-provisioning.ts` | AI_ONBOARDING_DISMISSED_KEY, AI_ONBOARDING_COMPLETED_KEY, NEW_ASSISTANT_DISMISSED_KEY | AIModelProgressState |
| `src/modules/dashboard/components/premium-analytics.tsx` | DeltaBadge, MiniKinds, MiniArea, FactValue |  |
| `src/modules/dashboard/components/widget-units.tsx` | CategoryRows, DayUnits | CategoryRow |
| `src/modules/dashboard/hooks/usePostOpFollowUp.ts` |  | PostOpFilter |
| `src/modules/dashboard/model/alert-bars.ts` | ALERT_DAYS_BACK |  |
| `src/modules/dashboard/model/dashboard-watch.ts` | quantityLabel | WatchTone |
| `src/modules/dashboard/model/dashboard-widgets.ts` | FORECAST_MINIMUM_DAYS, SPECIES_SHOWN, HEATMAP_PERIODS, HEAT_STEPS | HeatMonth, HeatColumn |
| `src/modules/dashboard/model/hex-activity.ts` |  | HexCellData, HexCaption |
| `src/modules/dashboard/model/key-figures.ts` | actionsGoal |  |
| `src/modules/dashboard/v2/financial-model.ts` |  | FinancialCategory, RiskCategoryData |
| `src/modules/dashboard/v2/kpi-period.tsx` | KPI_PERIOD_LABELS, KpiPeriodFilter |  |
| `src/modules/dashboard/v2/model.ts` | isSameDay, buildCashflowSeries, buildCapacitySeries | ScheduleStatus, AlertTone, CashflowPoint, CapacityDay |
| `src/modules/dashboard/v2/settle-widgets.tsx` | SettleSparkLine, SettleStatTile, SettleCard, SettleMetricFooter, SettleQueueItem |  |
| `src/modules/documents/document-migration.ts` | REFERRAL_TEMPLATE |  |
| `src/modules/documents/document-store.ts` |  | DocumentTable |
| `src/modules/documents/lib/document-reading.ts` | MAX_DOCUMENT_BYTES, normalizeExtract | DocumentPage |
| `src/modules/documents/lib/document-templates.ts` | DOCUMENT_KINDS, TEMPLATE_FIELDS, documentTemplateSchema, escapeHtml | ClinicalDocumentKind |
| `src/modules/documents/lib/patient-document-reading.ts` | fileAsDataUrl |  |
| `src/modules/finances/components/finances-shared.tsx` | todayInputValue, formatDateInput, parseDateInput |  |
| `src/modules/finances/invoice-natures.ts` | INVOICE_NATURES |  |
| `src/modules/finances/receivables-aging.ts` | AGING_BUCKETS |  |
| `src/modules/flow-board/flow-board-page.tsx` | FlowBoardPage |  |
| `src/modules/flow-board/model.ts` | matchesQuery | FlowAlertKind |
| `src/modules/hospitalizations/components/hospitalization-print-layout.tsx` | HospitalizationPrintLayout |  |
| `src/modules/hospitalizations/index.ts` | HospitalizationDialog, HospitalizationPrintLayout, HospitalizationStatusBadge, VitalsChart, VitalsEntryDialog | HospitalizationStatusFilter |
| `src/modules/hospitalizations/lib/format.ts` | vitalIsCritical |  |
| `src/modules/hospitalizations/stays/occupancy.ts` |  | OccupancyUnit |
| `src/modules/hospitalizations/stays/vital-alerts.ts` | VITAL_REFERENCE_SOURCE, TEMPERATURE_REFERENCE_SOURCE, SPECIES_VITAL_REFERENCES |  |
| `src/modules/patient-reminders/patient-reminders-panel.tsx` | PatientRemindersPanel |  |
| `src/modules/patient-reminders/use-patient-reminders.ts` | PATIENT_REMINDERS_CHANGED |  |
| `src/modules/patients/components/patients-shared.tsx` | COMMON_SPECIES, DOG_BREEDS, CAT_BREEDS, OWNER_CONTACT_LABELS, formatPatientLongDate, getStatusMeta, getSpeciesIcon, getSpeciesComponent, getBreedSuggestions, validatePatientIdentity, PatientStatusBadge, ReadOnlyDetail, ClinicalNote |  |
| `src/modules/patients/export/patient-record-save.ts` | requirePatientRecordSession |  |
| `src/modules/patients/health-card/health-card-data.ts` | DUE_SOON_DAYS, MAX_VACCINATION_ROWS, MAX_HISTORY_ROWS, MAX_TREATMENT_ROWS, MAX_WEIGHT_POINTS |  |
| `src/modules/patients/lib/age.ts` | formatAge |  |
| `src/modules/patients/lib/index.ts` | formatAge, getNextDueVaccination, getOverallVaccinationStatus |  |
| `src/modules/patients/lib/patient-list.ts` | OVERDUE_VISIT_DAYS, PATIENT_SORT_OPTIONS |  |
| `src/modules/patients/lib/vaccination-status.ts` | getOverallVaccinationStatus |  |
| `src/modules/prescriptions/components/prescription-builder.tsx` | X |  |
| `src/modules/prescriptions/index.ts` | DoseCalculatorCard, MedicationPicker, PrescriptionBuilder, PrescriptionPreview, PrescriptionPrintLayout |  |
| `src/modules/prescriptions/lib/medication-catalog.ts` | listMedications |  |
| `src/modules/prescriptions/lib/prescription-safety.ts` | DEFAULT_TREATMENT_DAYS |  |
| `src/modules/prescriptions/lib/prescription-templates.ts` | toTemplateItem |  |
| `src/modules/rooms/store.ts` | cleanRoomName | RoomStore |
| `src/modules/rooms/use-rooms.ts` | ROOMS_CHANGED |  |
| `src/modules/shell/app-shell.tsx` |  | RouteState |
| `src/modules/shell/window-controls.ts` | windowControlsActive |  |
| `src/modules/stock/components/stock-shared.tsx` | getCategoryIcon |  |
| `src/modules/stock/services/clinical-stock-store.ts` | stockInvoiceLine |  |
| `src/modules/stock/services/purchasing-store.ts` |  | PurchaseReceipt, PurchaseReceiptLine, OrderDraftLine |
| `src/modules/stock/services/stock-operations-store.ts` |  | ProductBarcode, ConsumptionSummary, StockTransfer |
| `src/modules/visit-flow/store.ts` | VisitFlowError | VisitFlowStore |
| `src/services/activationAdminWindowService.ts` | ACTIVATION_ADMIN_ROUTE, ACTIVATION_ADMIN_WINDOW_LABEL |  |
| `src/services/adminAccess.ts` | ACTIVATION_OWNER_EMAIL |  |
| `src/services/aiConversationStore.ts` |  | PersistedAIMessage, PersistedAIConversation |
| `src/services/aiToolProtocol.ts` | toolNeedsConfirmation |  |
| `src/services/backupCrypto.ts` | readMetadata, __test__, _decoderProbe |  |
| `src/services/backupScheduler.ts` | loadSchedulerSettings, saveSchedulerSettings, getCachedSettings, startScheduler, getSchedulerStatus | BackupFrequency, BackupSchedulerSettings, SchedulerStatus |
| `src/services/backupService.ts` | importDatabaseFromFile |  |
| `src/services/billingService.ts` | deleteInvoiceDraft, formatOfficialNumber | CreditNoteLineInput, DeleteInvoiceDraftInput |
| `src/services/geminiService.ts` | sendMessageToGemini |  |
| `src/services/licenseActivationService.ts` | ADMIN_TOKEN_STORAGE_KEY, LICENSE_REQUEST_TIMEOUT_MS | ActivatedLicense |
| `src/services/licenseLease.ts` | CLOCK_TOLERANCE_MS |  |
| `src/services/licenseService.ts` | looksLikeLicenseKey |  |
| `src/services/localDataReset.ts` | resetSqliteSchema |  |
| `src/services/localTextService.ts` | getCurrentProgress |  |
| `src/services/notifications/types.ts` |  | NotificationState, NotificationFilter |
| `src/services/notifications/useNotificationCenter.ts` |  | NotificationCenter, NotificationSeverity, NotificationSource, NotificationTarget |
| `src/services/updateService.ts` | checkForAppUpdates |  |
| `src/services/vetKnowledgeService.ts` | default | MedicationSource, Disease, Species, Emergency, SearchResult |
| `src/types.ts` |  | StatCardProps, DashboardData |
| `src/types/db.ts` |  | StockMovementType, ReminderChannel, ReminderStatus, AuditAction, AuditEntity, BillingPaymentStatus, Payment, PrescriptionStatus |
