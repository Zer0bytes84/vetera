import { SearchableSelect } from "@/components/ui/searchable-select";
import { Receipt } from "lucide-react";
import { ListFilter, ListSearch } from "@/components/ui/list-controls";
import { invoiceDocument } from "@/lib/invoice-document";
import { InvoicePdfPreview } from "@/modules/invoices/components/invoice-pdf-preview";
import { FinancialPeriodFilter } from "@/components/financial-period-filter";
import {
  Add01Icon,
  ArrowDown01Icon,
  ChartLineData01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CreditCardIcon,
  Edit01Icon,
  File01Icon,
  FilterIcon,
  LockIcon,
  ReceiptTextIcon,
  Refresh01Icon,
  Wallet01Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";

import MotivationalHeader from "@/components/MotivationalHeader";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
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
import {
  Empty,
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

import { Spinner } from "@/components/ui/spinner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { cn } from "@/lib/utils";

import type { Transaction, TransactionPaymentMethod } from "@/types/db";
import { formatDZD } from "@/utils/currency";
import {
  FinanceTab,
  TransactionFilter,
  InvoiceDocumentFilter,
  InvoiceSettlementFilter,
  TransactionStatusFilter,
  TransactionSourceFilter,
  TransactionSort,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  createInvoiceLine,
  createInvoiceDraft,
  formatDate,
  DateFilter,
  getInvoiceDisplayName,
  documentBadge,
  settlementBadge,
  getInvoicePatientName,
} from "@/modules/finances/components/finances-shared";
import type { FinancesViewProps } from "../hooks/use-finances-page-model";
import { useIsPremium } from "@/modules/dashboard/v2/use-is-premium";
import "../finances-premium.css";
import { DatePicker } from "@/components/ui/date-picker";
import { useListCursor } from "@/hooks/useListCursor";
import { InvoicesTable } from "./invoices-table";
import { QuietButton } from "@/components/ui/tuff-controls";
import { EmptyMascot } from "@/components/mascot/empty-mascot";
import { patientDocumentName } from "@/modules/patients/reference/reference";

export function FinancesView(props: FinancesViewProps) {
  const isPremium = useIsPremium();
  const invoicesRef = useListCursor({ storageKey: "invoices" });
  const {
    activeTab,
    editingTransaction,
    filteredInvoices,
    filteredTransactions,
    financeSectionCards,
    invoiceDocumentFilter,
    invoiceDraft,
    invoiceError,
    invoiceFilterCount,
    invoiceFrom,
    invoiceSettlementFilter,
    invoiceTo,
    invoicesLoading,
    isDetailLoading,
    isInvoiceDialogOpen,
    isSubmitting,
    isTransactionDialogOpen,
    issueConfirmTarget,
    confirmDeleteInvoiceDraft,
    confirmIssueInvoice,
    confirmVoidInvoice,
    deleteDraftTarget,
    requestDeleteInvoiceDraft,
    requestIssueInvoice,
    requestVoidInvoice,
    setDeleteDraftTarget,
    setIssueConfirmTarget,
    setVoidReason,
    setVoidTarget,
    voidReason,
    voidTarget,
    journalAdvancedOpen,
    journalCategory,
    journalFilter,
    journalFilterCount,
    journalFrom,
    journalMaxAmount,
    journalMethod,
    journalMinAmount,
    journalPage,
    journalPageCount,
    journalQuery,
    journalSort,
    journalSource,
    journalStatus,
    journalTo,
    onNavigate,
    openInvoiceDetail,
    openPaymentDialog,
    openTransactionEditor,
    ownerPatients,
    owners,
    paginatedTransactions,
    patients,
    paymentDraft,
    paymentInvoice,
    previewInvoice,
    resetInvoiceFilters,
    resetJournalFilters,
    selectedInvoice,
    editingInvoicePrices,
    invoicePrices,
    setInvoicePrices,
    setEditingInvoicePrices,
    startEditingInvoicePrices,
    saveInvoicePrices,
    setActiveTab,
    setInvoiceDocumentFilter,
    setInvoiceDraft,
    setInvoiceFrom,
    setInvoicePage,
    setInvoiceSettlementFilter,
    setInvoiceTo,
    setIsInvoiceDialogOpen,
    setIsTransactionDialogOpen,
    setJournalAdvancedOpen,
    setJournalCategory,
    setJournalFilter,
    setJournalFrom,
    setJournalMaxAmount,
    setJournalMethod,
    setJournalMinAmount,
    setJournalPage,
    setJournalQuery,
    setJournalSort,
    setJournalSource,
    setJournalStatus,
    setJournalTo,
    setPaymentDraft,
    setPaymentInvoice,
    setPreviewInvoice,
    setSelectedInvoice,
    setTransactionDraft,
    submitInvoice,
    submitPayment,
    submitTransaction,
    toggleTransactionStatus,
    transactionCategories,
    transactionDraft,
    transactionsLoading,
  } = props;
  const viewToggle = (
    <TabsList
      aria-label="Vue des finances"
      className={cn(isPremium && "ml-auto shrink-0")}
      tabsStyle="segmented"
    >
      <TabsTrigger className="px-4" value="invoices">
        <HugeiconsIcon icon={File01Icon} strokeWidth={1.5} />
        Factures
      </TabsTrigger>
      <TabsTrigger className="px-4" value="journal">
        <HugeiconsIcon icon={ReceiptTextIcon} strokeWidth={1.5} />
        Journal
      </TabsTrigger>
    </TabsList>
  );

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-8 pb-8 lg:px-6">
      <MotivationalHeader
        section="finances"
        actions={
          <>
            <Button
              className="h-9 min-w-24 whitespace-nowrap px-4"
              onClick={() => onNavigate?.("finances_analytics")}
              variant="outline"
            >
              <HugeiconsIcon
                className="size-4"
                icon={ChartLineData01Icon}
                strokeWidth={1.5}
              />
              Analyse
            </Button>
            <Button
              className="h-9 min-w-36 whitespace-nowrap px-4"
              onClick={() =>
                activeTab === "invoices"
                  ? (setInvoiceDraft(createInvoiceDraft()),
                    setIsInvoiceDialogOpen(true))
                  : openTransactionEditor()
              }
            >
              <HugeiconsIcon
                className="size-4"
                icon={Add01Icon}
                strokeWidth={1.5}
              />
              {activeTab === "invoices"
                ? "Nouvelle facture"
                : "Nouvelle écriture"}
            </Button>
          </>
        }
      />

      <SectionCards
        icon={Receipt}
        items={financeSectionCards}
        subtitle="Facturation et règlements"
      />

      <Tabs
        className="finance-register"
        onValueChange={(value) => setActiveTab(value as FinanceTab)}
        value={activeTab}
      >
        {/* One title, the band's. On the invoices tab the switch lives in the table's band; the journal keeps it above its card. */}
        {activeTab === "journal" ? (
          <div className="flex justify-end">{viewToggle}</div>
        ) : null}

        <TabsContent className="space-y-5" value="invoices">
          {invoicesLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : invoiceError ? (
            <Empty className="min-h-56 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={File01Icon} strokeWidth={1.5} />
                </EmptyMedia>
                <EmptyTitle>Facturation indisponible</EmptyTitle>
                <EmptyDescription>{invoiceError}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <InvoicesTable
              toolbar={viewToggle}
              busy={isSubmitting}
              detailLoading={isDetailLoading}
              filters={
                <>
                  <FinancialPeriodFilter
                    from={invoiceFrom}
                    to={invoiceTo}
                    onChange={(from, to) => {
                      setInvoiceFrom(from);
                      setInvoiceTo(to);
                      setInvoicePage(1);
                    }}
                  />
                  <ListFilter
                    label="Document"
                    value={invoiceDocumentFilter}
                    onValueChange={(value) =>
                      setInvoiceDocumentFilter(value as InvoiceDocumentFilter)
                    }
                    options={[
                      { value: "all", label: "Tous les documents" },
                      { value: "draft", label: "Brouillons" },
                      { value: "issued", label: "Émises" },
                      { value: "void", label: "Annulées" },
                    ]}
                  />
                  <ListFilter
                    label="Règlement"
                    value={invoiceSettlementFilter}
                    onValueChange={(value) =>
                      setInvoiceSettlementFilter(
                        value as InvoiceSettlementFilter,
                      )
                    }
                    options={[
                      { value: "all", label: "Tous les règlements" },
                      { value: "open", label: "À régler" },
                      { value: "partial", label: "Partielles" },
                      { value: "paid", label: "Payées" },
                      { value: "overdue", label: "En retard" },
                      { value: "credited", label: "Créditées" },
                    ]}
                  />
                  {(invoiceFilterCount > 0 || invoiceFrom || invoiceTo) && (
                    <QuietButton onClick={resetInvoiceFilters}>
                      Réinitialiser
                    </QuietButton>
                  )}
                </>
              }
              invoices={filteredInvoices}
              listRef={invoicesRef}
              onDeleteDraft={requestDeleteInvoiceDraft}
              onEditPrices={(invoice) => void openInvoiceDetail(invoice, true)}
              onIssue={requestIssueInvoice}
              onOpen={(invoice) => void openInvoiceDetail(invoice)}
              onPay={openPaymentDialog}
              onVoid={requestVoidInvoice}
              owners={owners}
              patients={patients}
            />
          )}
        </TabsContent>

        <TabsContent className="space-y-5" value="journal">
          <Card className="overflow-hidden rounded-panel border-border/80 shadow-none">
            <CardHeader className="border-b px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {!isPremium && (
                  <div>
                    <CardTitle className="t-18 tracking-[-0.03em]">
                      Journal de trésorerie
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Les lignes issues des règlements sont verrouillées
                    </CardDescription>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <ListSearch
                    className="w-full sm:w-64"
                    label="Rechercher le journal"
                    placeholder="Rechercher une écriture…"
                    value={journalQuery}
                    onValueChange={setJournalQuery}
                  />
                  <ToggleGroup
                    data-tabs-style="segmented"
                    multiple={false}
                    onValueChange={(value) =>
                      setJournalFilter(
                        (value[0] as TransactionFilter | undefined) ?? "all",
                      )
                    }
                    size="sm"
                    spacing={0}
                    value={[journalFilter]}
                    variant="outline"
                  >
                    <ToggleGroupItem value="all">Toutes</ToggleGroupItem>
                    <ToggleGroupItem value="income">Entrées</ToggleGroupItem>
                    <ToggleGroupItem value="expense">Sorties</ToggleGroupItem>
                  </ToggleGroup>
                  <Button
                    aria-expanded={journalAdvancedOpen}
                    className="list-filter-control h-[30px] rounded-full text-xs"
                    onClick={() => setJournalAdvancedOpen((open) => !open)}
                    variant="outline"
                  >
                    <HugeiconsIcon icon={FilterIcon} strokeWidth={1.5} />
                    Avancé
                    {journalFilterCount > 0 ? (
                      <Badge
                        className="ml-1 size-5 justify-center rounded-full px-0"
                        variant="secondary"
                      >
                        {journalFilterCount}
                      </Badge>
                    ) : null}
                  </Button>
                </div>
              </div>
              <FinancialPeriodFilter
                from={journalFrom}
                to={journalTo}
                onChange={(from, to) => {
                  setJournalFrom(from);
                  setJournalTo(to);
                  setJournalPage(1);
                }}
              />
              {journalAdvancedOpen ? (
                <div className="flex flex-wrap items-end gap-2 rounded-xl bg-muted/35 p-3">
                  <DateFilter
                    label="Du"
                    onChange={setJournalFrom}
                    value={journalFrom}
                  />
                  <DateFilter
                    label="Au"
                    onChange={setJournalTo}
                    value={journalTo}
                  />
                  <ListFilter
                    label="Catégorie"
                    value={journalCategory}
                    onValueChange={(value) => setJournalCategory(value)}
                    options={[
                      { value: "all", label: "Toutes les catégories" },
                      ...transactionCategories.map((value) => ({
                        value,
                        label: value,
                      })),
                    ]}
                  />
                  <ListFilter
                    label="Paiement"
                    value={journalMethod}
                    onValueChange={(value) =>
                      setJournalMethod(
                        value as TransactionPaymentMethod | "all",
                      )
                    }
                    options={[
                      { value: "all", label: "Tous les moyens" },
                      ...PAYMENT_METHODS.map((method) => ({
                        value: method.value,
                        label: method.label,
                      })),
                    ]}
                  />
                  <ListFilter
                    label="Statut"
                    value={journalStatus}
                    onValueChange={(value) =>
                      setJournalStatus(value as TransactionStatusFilter)
                    }
                    options={[
                      { value: "all", label: "Tous les statuts" },
                      { value: "paid", label: "Payées" },
                      { value: "pending", label: "En attente" },
                    ]}
                  />
                  <ListFilter
                    label="Origine"
                    value={journalSource}
                    onValueChange={(value) =>
                      setJournalSource(value as TransactionSourceFilter)
                    }
                    options={[
                      { value: "all", label: "Toutes les origines" },
                      { value: "manual", label: "Saisie manuelle" },
                      { value: "billing", label: "Facturation" },
                    ]}
                  />
                  <Input
                    aria-label="Montant minimum"
                    className="h-[30px] w-36 rounded-full bg-background text-xs md:text-xs"
                    min="0"
                    onChange={(event) =>
                      setJournalMinAmount(event.target.value)
                    }
                    placeholder="Montant min. (DA)"
                    step="0.01"
                    type="number"
                    value={journalMinAmount}
                  />
                  <Input
                    aria-label="Montant maximum"
                    className="h-[30px] w-36 rounded-full bg-background text-xs md:text-xs"
                    min="0"
                    onChange={(event) =>
                      setJournalMaxAmount(event.target.value)
                    }
                    placeholder="Montant max. (DA)"
                    step="0.01"
                    type="number"
                    value={journalMaxAmount}
                  />
                  <ListFilter
                    label="Trier"
                    value={journalSort}
                    onValueChange={(value) =>
                      setJournalSort(value as TransactionSort)
                    }
                    options={[
                      { value: "date-desc", label: "Plus récentes" },
                      { value: "date-asc", label: "Plus anciennes" },
                      { value: "amount-desc", label: "Montant décroissant" },
                      { value: "amount-asc", label: "Montant croissant" },
                    ]}
                  />
                  <div className="flex items-end">
                    <Button
                      className="h-9 rounded-xl"
                      disabled={
                        journalFilterCount === 0 &&
                        !journalQuery &&
                        journalFilter === "all"
                      }
                      onClick={resetJournalFilters}
                      size="sm"
                      variant="ghost"
                    >
                      <HugeiconsIcon icon={Refresh01Icon} strokeWidth={1.5} />
                      Réinitialiser les filtres
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="flex min-h-56 items-center justify-center">
                  <Spinner className="size-6 text-muted-foreground" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <Empty className="min-h-56 py-10">
                  <EmptyHeader>
                    <EmptyMascot
                      icon={
                        <HugeiconsIcon
                          icon={ReceiptTextIcon}
                          strokeWidth={1.5}
                        />
                      }
                    />
                    <EmptyTitle>Aucune écriture</EmptyTitle>
                    <EmptyDescription>
                      Les règlements et mouvements manuels apparaîtront ici.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Opération</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Origine</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="w-[1%]">
                          <span className="sr-only">Action</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((transaction) => {
                        const isIncome = transaction.type === "income";
                        const locked = Boolean(transaction.isLocked);
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "flex size-9 items-center justify-center rounded-xl",
                                    isIncome
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-rose-500/10 text-rose-600",
                                  )}
                                >
                                  <HugeiconsIcon
                                    icon={
                                      isIncome ? ArrowUp01Icon : ArrowDown01Icon
                                    }
                                    strokeWidth={1.5}
                                  />
                                </span>
                                <div>
                                  <p className="font-medium">
                                    {transaction.description}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatDate(transaction.date)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {transaction.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {PAYMENT_METHOD_LABELS[transaction.method]}
                            </TableCell>
                            <TableCell>
                              {locked ? (
                                <Badge className="gap-1" variant="secondary">
                                  <HugeiconsIcon
                                    icon={LockIcon}
                                    strokeWidth={1.5}
                                  />
                                  Facturation
                                </Badge>
                              ) : (
                                <Badge variant="outline">Manuelle</Badge>
                              )}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-semibold tabular-nums",
                                isIncome
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400",
                              )}
                            >
                              {isIncome ? "+" : "-"}
                              {formatDZD(transaction.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  aria-label="Changer le statut"
                                  disabled={locked}
                                  onClick={() =>
                                    void toggleTransactionStatus(transaction)
                                  }
                                  size="icon-sm"
                                  variant="ghost"
                                >
                                  <HugeiconsIcon
                                    icon={
                                      transaction.status === "paid"
                                        ? CheckmarkCircle02Icon
                                        : Clock01Icon
                                    }
                                    strokeWidth={1.5}
                                  />
                                </Button>
                                <Button
                                  aria-label="Modifier l’écriture"
                                  disabled={locked}
                                  onClick={() =>
                                    openTransactionEditor(transaction)
                                  }
                                  size="icon-sm"
                                  variant="ghost"
                                >
                                  <HugeiconsIcon
                                    icon={Edit01Icon}
                                    strokeWidth={1.5}
                                  />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {journalPageCount > 1 ? (
                    <div className="flex items-center justify-between border-t px-5 py-3">
                      <p className="text-muted-foreground text-xs">
                        {filteredTransactions.length} écriture
                        {filteredTransactions.length > 1 ? "s" : ""}
                      </p>
                      <Pagination className="mx-0 w-auto justify-end">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              aria-disabled={journalPage === 1}
                              className={cn(
                                journalPage === 1 &&
                                  "pointer-events-none opacity-40",
                              )}
                              onClick={(event) => {
                                event.preventDefault();
                                setJournalPage((page) => Math.max(1, page - 1));
                              }}
                              text="Précédent"
                            />
                          </PaginationItem>
                          {Array.from(
                            { length: journalPageCount },
                            (_, index) => index + 1,
                          ).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                aria-label={`Aller à la page ${page}`}
                                href={`#journal-page-${page}`}
                                isActive={journalPage === page}
                                onClick={(event) => {
                                  event.preventDefault();
                                  setJournalPage(page);
                                }}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              aria-disabled={journalPage === journalPageCount}
                              className={cn(
                                journalPage === journalPageCount &&
                                  "pointer-events-none opacity-40",
                              )}
                              onClick={(event) => {
                                event.preventDefault();
                                setJournalPage((page) =>
                                  Math.min(journalPageCount, page + 1),
                                );
                              }}
                              text="Suivant"
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog onOpenChange={setIsInvoiceDialogOpen} open={isInvoiceDialogOpen}>
        <FormDialogContent size="md">
          <FormDialogHeader
            artwork="invoice"
            description="Patient, prestations et règlement."
            icon={<HugeiconsIcon icon={ReceiptTextIcon} strokeWidth={1.5} />}
            title="Nouvelle facture"
            tone="violet"
          />
          <FormDialogBody>
            <FieldGroup className="gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="invoice-owner">Propriétaire</FieldLabel>
                  <SearchableSelect
                    id="invoice-owner"
                    label="Propriétaire de la facture"
                    placeholder="Rechercher un propriétaire…"
                    value={invoiceDraft.ownerId}
                    options={owners.map((owner) => ({
                      value: owner.id,
                      label: `${owner.firstName} ${owner.lastName}`,
                      keywords: owner.phone,
                    }))}
                    onValueChange={(ownerId) =>
                      setInvoiceDraft((current) => ({
                        ...current,
                        ownerId,
                        patientId: "",
                      }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="invoice-patient">Patient</FieldLabel>
                  <NativeSelect
                    id="invoice-patient"
                    onChange={(event) =>
                      setInvoiceDraft((current) => ({
                        ...current,
                        patientId: event.target.value,
                      }))
                    }
                    value={invoiceDraft.patientId}
                  >
                    <NativeSelectOption value="">
                      Sans patient
                    </NativeSelectOption>
                    {ownerPatients.map((patient) => (
                      <NativeSelectOption key={patient.id} value={patient.id}>
                        {patient.name} · {patient.species}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="invoice-due-at">Échéance</FieldLabel>
                <DatePicker
                  clearable
                  id="invoice-due-at"
                  onChange={(value) =>
                    setInvoiceDraft((current) => ({
                      ...current,
                      dueAt: value,
                    }))
                  }
                  value={invoiceDraft.dueAt}
                />
              </Field>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Prestations</p>
                    <p className="text-muted-foreground text-xs">
                      Montants exprimés en dinars
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      setInvoiceDraft((current) => ({
                        ...current,
                        lines: [...current.lines, createInvoiceLine()],
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={1.5} />
                    Ajouter
                  </Button>
                </div>
                {invoiceDraft.lines.map((line, index) => (
                  <div
                    className="grid gap-2 rounded-xl border bg-muted/20 p-3 sm:grid-cols-[1fr_90px_130px_auto]"
                    key={line.id}
                  >
                    <Input
                      aria-label="Description de la prestation"
                      onChange={(event) =>
                        setInvoiceDraft((current) => ({
                          ...current,
                          lines: current.lines.map((candidate) =>
                            candidate.id === line.id
                              ? {
                                  ...candidate,
                                  description: event.target.value,
                                }
                              : candidate,
                          ),
                        }))
                      }
                      placeholder="Consultation, vaccin…"
                      value={line.description}
                    />
                    <Input
                      aria-label="Quantité"
                      min="0.001"
                      onChange={(event) =>
                        setInvoiceDraft((current) => ({
                          ...current,
                          lines: current.lines.map((candidate) =>
                            candidate.id === line.id
                              ? { ...candidate, quantity: event.target.value }
                              : candidate,
                          ),
                        }))
                      }
                      step="0.001"
                      type="number"
                      value={line.quantity}
                    />
                    <Input
                      aria-label="Prix unitaire en dinars"
                      min="0"
                      onChange={(event) =>
                        setInvoiceDraft((current) => ({
                          ...current,
                          lines: current.lines.map((candidate) =>
                            candidate.id === line.id
                              ? { ...candidate, unitAmount: event.target.value }
                              : candidate,
                          ),
                        }))
                      }
                      placeholder="Montant DA"
                      step="0.01"
                      type="number"
                      value={line.unitAmount}
                    />
                    <Button
                      aria-label={`Supprimer la ligne ${index + 1}`}
                      disabled={invoiceDraft.lines.length === 1}
                      onClick={() =>
                        setInvoiceDraft((current) => ({
                          ...current,
                          lines: current.lines.filter(
                            (candidate) => candidate.id !== line.id,
                          ),
                        }))
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
              <Field>
                <FieldLabel htmlFor="invoice-notes">Note interne</FieldLabel>
                <Textarea
                  id="invoice-notes"
                  onChange={(event) =>
                    setInvoiceDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Contexte ou précision utile…"
                  value={invoiceDraft.notes}
                />
                <FieldDescription>
                  Une facture émise est figée. Utilisez un avoir pour la
                  corriger.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FormDialogBody>
          <FormDialogFooter>
            <Button
              onClick={() => setIsInvoiceDialogOpen(false)}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={() => void submitInvoice("draft")}
              variant="outline"
            >
              Enregistrer brouillon
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={() => void submitInvoice("issue")}
            >
              {isSubmitting ? <Spinner className="size-4" /> : null}
              Émettre la facture
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
        open={Boolean(selectedInvoice)}
      >
        <FormDialogContent size="md">
          {selectedInvoice ? (
            <>
              <FormDialogHeader
                compact
                artwork="invoice-detail"
                title={getInvoiceDisplayName(selectedInvoice)}
                description={`Émise le ${formatDate(selectedInvoice.issuedAt)} · échéance ${formatDate(selectedInvoice.dueAt)}`}
                icon={
                  <HugeiconsIcon icon={ReceiptTextIcon} strokeWidth={1.5} />
                }
                aside={
                  <div className="flex flex-wrap justify-center gap-2">
                    {documentBadge(selectedInvoice.documentStatus)}
                    {settlementBadge(selectedInvoice.settlementStatus)}
                  </div>
                }
              />
              <FormDialogBody className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="mt-1 font-semibold text-lg tabular-nums">
                      {formatDZD(selectedInvoice.grossAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-muted-foreground text-xs">Encaissé</p>
                    <p className="mt-1 font-semibold text-lg tabular-nums">
                      {formatDZD(selectedInvoice.completedPaymentAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-muted-foreground text-xs">Solde</p>
                    <p className="mt-1 font-semibold text-lg tabular-nums">
                      {formatDZD(selectedInvoice.balanceAmount)}
                    </p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prestation</TableHead>
                        <TableHead className="text-right">Qté</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {line.quantityMilli / 1000}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {editingInvoicePrices &&
                            selectedInvoice.documentStatus === "draft" ? (
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  aria-label={`Prix unitaire en DA : ${line.description}`}
                                  className="w-32 text-right tabular-nums"
                                  inputMode="decimal"
                                  disabled={isSubmitting}
                                  value={invoicePrices[line.id] ?? ""}
                                  onChange={(event) =>
                                    setInvoicePrices((current) => ({
                                      ...current,
                                      [line.id]: event.target.value,
                                    }))
                                  }
                                />
                                <span className="text-xs text-muted-foreground">
                                  DA
                                </span>
                              </div>
                            ) : (
                              formatDZD(line.unitAmount)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatDZD(line.grossAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {selectedInvoice.payments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Règlements</p>
                    {selectedInvoice.payments.map((payment) => (
                      <div
                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                        key={payment.id}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {PAYMENT_METHOD_LABELS[payment.method]}
                            </p>
                            {payment.status === "void" ? (
                              <Badge variant="outline">Annulé</Badge>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(payment.paidAt)}
                            {payment.reference ? ` · ${payment.reference}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "font-semibold tabular-nums",
                            payment.status === "void" &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {formatDZD(payment.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {selectedInvoice.creditNotes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Avoirs</p>
                    {selectedInvoice.creditNotes.map((creditNote) => (
                      <div
                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                        key={creditNote.id}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {creditNote.number ?? "Avoir brouillon"}
                            </p>
                            {documentBadge(creditNote.documentStatus)}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(
                              creditNote.issuedAt ?? creditNote.createdAt,
                            )}
                            {creditNote.reason ? ` · ${creditNote.reason}` : ""}
                          </p>
                        </div>
                        <p className="font-semibold text-ink-muted tabular-nums dark:text-violet-300">
                          -{formatDZD(creditNote.grossAmount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {selectedInvoice.refunds.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Remboursements</p>
                    {selectedInvoice.refunds.map((refund) => (
                      <div
                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                        key={refund.id}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {PAYMENT_METHOD_LABELS[refund.method]}
                            </p>
                            {refund.status === "void" ? (
                              <Badge variant="outline">Annulé</Badge>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(refund.refundedAt)}
                            {refund.reason ? ` · ${refund.reason}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "font-semibold text-rose-600 tabular-nums dark:text-rose-300",
                            refund.status === "void" &&
                              "text-muted-foreground line-through dark:text-muted-foreground",
                          )}
                        >
                          -{formatDZD(refund.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </FormDialogBody>
              <FormDialogFooter className="empty:hidden">
                {selectedInvoice.documentStatus === "issued" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewInvoice(selectedInvoice);
                      setSelectedInvoice(null);
                    }}
                  >
                    Aperçu / PDF
                  </Button>
                )}
                {selectedInvoice.documentStatus === "draft" ? (
                  editingInvoicePrices ? (
                    <>
                      <Button
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => setEditingInvoicePrices(false)}
                      >
                        Annuler les modifications
                      </Button>
                      <Button
                        disabled={isSubmitting}
                        onClick={() => void saveInvoicePrices()}
                      >
                        Enregistrer les tarifs
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={startEditingInvoicePrices}
                      >
                        Modifier les tarifs
                      </Button>
                      <Button
                        disabled={isSubmitting}
                        onClick={() =>
                          void requestIssueInvoice(selectedInvoice)
                        }
                      >
                        Émettre
                      </Button>
                    </>
                  )
                ) : null}
                {selectedInvoice.documentStatus === "issued" &&
                selectedInvoice.balanceAmount > 0 ? (
                  <Button
                    onClick={() => {
                      openPaymentDialog(selectedInvoice);
                      setSelectedInvoice(null);
                    }}
                  >
                    Enregistrer un règlement
                  </Button>
                ) : null}
              </FormDialogFooter>
            </>
          ) : null}
        </FormDialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setPaymentInvoice(null)}
        open={Boolean(paymentInvoice)}
      >
        <FormDialogContent size="sm">
          <FormDialogHeader
            artwork="payment"
            description={
              paymentInvoice
                ? `${getInvoiceDisplayName(paymentInvoice)} · solde ${formatDZD(
                    paymentInvoice.balanceAmount,
                  )}`
                : "Facture sélectionnée"
            }
            icon={<HugeiconsIcon icon={CreditCardIcon} strokeWidth={1.5} />}
            title="Enregistrer un règlement"
            tone="teal"
          />
          <FormDialogBody>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="payment-amount">Montant (DA)</FieldLabel>
                <Input
                  id="payment-amount"
                  min="0"
                  onChange={(event) =>
                    setPaymentDraft((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  step="0.01"
                  type="number"
                  value={paymentDraft.amount}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="payment-method">Mode</FieldLabel>
                <NativeSelect
                  id="payment-method"
                  onChange={(event) =>
                    setPaymentDraft((current) => ({
                      ...current,
                      method: event.target.value as TransactionPaymentMethod,
                    }))
                  }
                  value={paymentDraft.method}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <NativeSelectOption key={method.value} value={method.value}>
                      {method.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="payment-reference">
                  Référence facultative
                </FieldLabel>
                <Input
                  id="payment-reference"
                  onChange={(event) =>
                    setPaymentDraft((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="N° de chèque, terminal, virement…"
                  value={paymentDraft.reference}
                />
              </Field>
            </FieldGroup>
          </FormDialogBody>
          <FormDialogFooter>
            <Button onClick={() => setPaymentInvoice(null)} variant="outline">
              Annuler
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={() => void submitPayment()}
            >
              {isSubmitting ? <Spinner className="size-4" /> : null}
              Confirmer
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>

      {previewInvoice &&
        (() => {
          const invoicePatient = patients.find(
            (patient) => patient.id === previewInvoice.patientId,
          );
          const document = invoiceDocument(
            previewInvoice,
            invoicePatient
              ? patientDocumentName(invoicePatient)
              : getInvoicePatientName(previewInvoice, patients) ||
                  "Patient non renseigné",
          );
          return (
            <InvoicePdfPreview
              data={document.data}
              settings={document.settings}
              onClose={() => setPreviewInvoice(null)}
            />
          );
        })()}

      <Dialog
        onOpenChange={(open) => !open && setIsTransactionDialogOpen(false)}
        open={isTransactionDialogOpen}
      >
        <FormDialogContent size="sm">
          <FormDialogHeader
            artwork="transaction"
            description="Détail du mouvement comptable."
            icon={<HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.5} />}
            title={
              editingTransaction ? "Modifier l’écriture" : "Nouvelle écriture"
            }
            tone="amber"
          />
          <FormDialogBody>
            <FieldGroup>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <ToggleGroup
                  data-tabs-style="segmented"
                  multiple={false}
                  onValueChange={(value) => {
                    const type = value[0] as Transaction["type"] | undefined;
                    if (type) {
                      setTransactionDraft((current) => ({ ...current, type }));
                    }
                  }}
                  value={[transactionDraft.type]}
                  variant="outline"
                >
                  <ToggleGroupItem value="expense">Dépense</ToggleGroupItem>
                  <ToggleGroupItem value="income">Revenu</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="transaction-description">
                  Description
                </FieldLabel>
                <Input
                  id="transaction-description"
                  onChange={(event) =>
                    setTransactionDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  value={transactionDraft.description}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="transaction-amount">
                    Montant (DA)
                  </FieldLabel>
                  <Input
                    id="transaction-amount"
                    min="0"
                    onChange={(event) =>
                      setTransactionDraft((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={transactionDraft.amount}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="transaction-date">Date</FieldLabel>
                  <DatePicker
                    id="transaction-date"
                    onChange={(value) =>
                      setTransactionDraft((current) => ({
                        ...current,
                        date: value,
                      }))
                    }
                    value={transactionDraft.date}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="transaction-category">
                    Catégorie
                  </FieldLabel>
                  <Input
                    id="transaction-category"
                    onChange={(event) =>
                      setTransactionDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    value={transactionDraft.category}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="transaction-method">Mode</FieldLabel>
                  <NativeSelect
                    id="transaction-method"
                    onChange={(event) =>
                      setTransactionDraft((current) => ({
                        ...current,
                        method: event.target.value as TransactionPaymentMethod,
                      }))
                    }
                    value={transactionDraft.method}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <NativeSelectOption
                        key={method.value}
                        value={method.value}
                      >
                        {method.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="transaction-status">Statut</FieldLabel>
                <NativeSelect
                  id="transaction-status"
                  onChange={(event) =>
                    setTransactionDraft((current) => ({
                      ...current,
                      status: event.target.value as Transaction["status"],
                    }))
                  }
                  value={transactionDraft.status}
                >
                  <NativeSelectOption value="paid">Payé</NativeSelectOption>
                  <NativeSelectOption value="pending">
                    En attente
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
            </FieldGroup>
          </FormDialogBody>
          <FormDialogFooter>
            <Button
              onClick={() => setIsTransactionDialogOpen(false)}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={() => void submitTransaction()}
            >
              {isSubmitting ? <Spinner className="size-4" /> : null}
              Enregistrer
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>

      {/* I1 : confirmation avant émission (fige la facture). */}
      <AlertDialog
        onOpenChange={(open) => !open && setIssueConfirmTarget(null)}
        open={Boolean(issueConfirmTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Émettre la facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              {issueConfirmTarget
                ? `La facture ${getInvoiceDisplayName(issueConfirmTarget)} sera figée et recevra son numéro officiel. Son contenu deviendra immuable.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={() => void confirmIssueInvoice()}
            >
              Émettre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* B2 : annulation d'une facture émise par erreur. */}
      <AlertDialog
        onOpenChange={(open) => !open && setVoidTarget(null)}
        open={Boolean(voidTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              {voidTarget
                ? `La facture ${getInvoiceDisplayName(voidTarget)} sera annulée. Impossible si des paiements, remboursements ou avoirs y sont liés : utilisez alors un avoir.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Field>
              <FieldLabel htmlFor="void-reason">
                Motif <span className="modal-required">requis</span>
              </FieldLabel>
              <Input
                id="void-reason"
                onChange={(event) => setVoidReason(event.target.value)}
                placeholder="Erreur de saisie, doublon…"
                value={voidReason}
              />
            </Field>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting || !voidReason.trim()}
              onClick={() => void confirmVoidInvoice()}
            >
              Annuler la facture
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* I11 : suppression d'un brouillon abandonné. */}
      <AlertDialog
        onOpenChange={(open) => !open && setDeleteDraftTarget(null)}
        open={Boolean(deleteDraftTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDraftTarget
                ? `Le brouillon ${getInvoiceDisplayName(deleteDraftTarget)} sera définitivement supprimé. Cette action est irréversible.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
              onClick={() => void confirmDeleteInvoiceDraft()}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
