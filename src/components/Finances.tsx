import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CreditCardIcon,
  Edit01Icon,
  File01Icon,
  FilterIcon,
  LockIcon,
  ReceiptTextIcon,
  Refresh01Icon,
  SearchIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { fr } from "date-fns/locale";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import MotivationalHeader from "@/components/MotivationalHeader";
import { type SectionCardItem, SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  useOwnersRepository,
  usePatientsRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import { getSetting } from "@/services/appSettingsService";
import { type BillingActor, billingService } from "@/services/billingService";
import { isTauriRuntime } from "@/services/browser-store";
import type { View } from "@/types";
import type {
  BillingDocumentStatus,
  BillingLineInput,
  Invoice,
  InvoiceDetail,
  InvoiceSettlementStatus,
  Owner,
  Patient,
  Transaction,
  TransactionPaymentMethod,
} from "@/types/db";
import { formatDZD, toCentimes } from "@/utils/currency";

type FinanceTab = "invoices" | "journal";
type TransactionFilter = "all" | "income" | "expense";
type InvoiceDocumentFilter = "all" | BillingDocumentStatus;
type InvoiceSettlementFilter = "all" | InvoiceSettlementStatus;
type TransactionStatusFilter = "all" | Transaction["status"];
type TransactionSourceFilter = "all" | "billing" | "manual";
type TransactionSort =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc";
interface InvoiceLineDraft {
  description: string;
  id: string;
  quantity: string;
  unitAmount: string;
}

interface InvoiceDraft {
  createdInvoiceId?: string;
  dueAt: string;
  lines: InvoiceLineDraft[];
  notes: string;
  ownerId: string;
  patientId: string;
}

interface PaymentDraft {
  amount: string;
  method: TransactionPaymentMethod;
  reference: string;
}

interface TransactionDraft {
  amount: string;
  category: string;
  date: string;
  description: string;
  method: TransactionPaymentMethod;
  status: Transaction["status"];
  type: Transaction["type"];
}

const PAYMENT_METHODS: Array<{
  label: string;
  value: TransactionPaymentMethod;
}> = [
  { label: "Espèces", value: "cash" },
  { label: "Carte", value: "card" },
  { label: "Virement", value: "bank_transfer" },
  { label: "Chèque", value: "check" },
  { label: "Autre", value: "other" },
];

const PAYMENT_METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
) as Record<TransactionPaymentMethod, string>;

const DOCUMENT_STATUS_META: Record<
  BillingDocumentStatus,
  { className: string; label: string }
> = {
  draft: {
    className: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    label: "Brouillon",
  },
  issued: {
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    label: "Émise",
  },
  void: {
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    label: "Annulée",
  },
};

const SETTLEMENT_STATUS_META: Record<
  InvoiceSettlementStatus,
  { className: string; label: string }
> = {
  open: {
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    label: "À régler",
  },
  partial: {
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    label: "Partielle",
  },
  paid: {
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    label: "Payée",
  },
  overdue: {
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    label: "En retard",
  },
  credited: {
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    label: "Créditée",
  },
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInvoiceLine(): InvoiceLineDraft {
  return {
    description: "",
    id: crypto.randomUUID(),
    quantity: "1",
    unitAmount: "",
  };
}

function createInvoiceDraft(): InvoiceDraft {
  return {
    dueAt: todayInputValue(),
    lines: [createInvoiceLine()],
    notes: "",
    ownerId: "",
    patientId: "",
  };
}

function createTransactionDraft(): TransactionDraft {
  return {
    amount: "",
    category: "Achats",
    date: todayInputValue(),
    description: "",
    method: "cash",
    status: "paid",
    type: "expense",
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Non définie";
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseDateInput(value)
    : new Date(value);
  if (!date) {
    return "Date invalide";
  }
  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isDateInRange(value: string | null | undefined, from: string, to: string) {
  if (!value) {
    return false;
  }
  const date = value.slice(0, 10);
  return (!from || date >= from) && (!to || date <= to);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  if (!value) {
    return undefined;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  return new Date(year, month - 1, day);
}

function DateFilter({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.6} />
        {label}
      </span>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              aria-label={label}
              className="h-9 w-full justify-between rounded-xl bg-background px-3 font-normal"
              variant="outline"
            >
              <span className={cn(!value && "text-muted-foreground")}>
                {value ? formatDate(value) : "Toutes les dates"}
              </span>
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.6} />
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
            locale={fr}
            mode="single"
            onSelect={(date) => onChange(date ? formatDateInput(date) : "")}
            selected={parseDateInput(value)}
          />
          {value ? (
            <Button
              className="w-full rounded-xl"
              onClick={() => onChange("")}
              size="sm"
              variant="ghost"
            >
              Effacer la date
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function getInvoiceDisplayName(invoice: Invoice) {
  return invoice.number ?? `Brouillon ${invoice.id.slice(0, 8)}`;
}

function documentBadge(status: BillingDocumentStatus) {
  const meta = DOCUMENT_STATUS_META[status];
  return (
    <Badge
      className={cn("border-transparent font-medium", meta.className)}
      variant="secondary"
    >
      {meta.label}
    </Badge>
  );
}

function settlementBadge(status: InvoiceSettlementStatus | null) {
  if (!status) {
    return null;
  }
  const meta = SETTLEMENT_STATUS_META[status];
  return (
    <Badge
      className={cn("border-transparent font-medium", meta.className)}
      variant="secondary"
    >
      {meta.label}
    </Badge>
  );
}

function getInvoiceOwnerName(invoice: Invoice, owners: Owner[]) {
  if (invoice.ownerSnapshot) {
    return `${invoice.ownerSnapshot.firstName} ${invoice.ownerSnapshot.lastName}`;
  }
  const owner = owners.find((candidate) => candidate.id === invoice.ownerId);
  return owner ? `${owner.firstName} ${owner.lastName}` : "Propriétaire";
}

function getInvoicePatientName(invoice: Invoice, patients: Patient[]) {
  if (!invoice.patientId) {
    return null;
  }
  return (
    patients.find((patient) => patient.id === invoice.patientId)?.name ??
    "Patient non renseigné"
  );
}

function getInvoiceDueLabel(invoice: Invoice) {
  if (invoice.documentStatus === "draft") {
    return "À émettre";
  }
  if (invoice.settlementStatus === "paid") {
    return "Réglée";
  }
  if (!invoice.dueAt) {
    return "Sans échéance";
  }
  return `${invoice.settlementStatus === "overdue" ? "Échue" : "Échéance"} ${formatDate(invoice.dueAt)}`;
}

const Finances: React.FC<{ onNavigate?: (view: View) => void }> = ({
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const { data: owners } = useOwnersRepository();
  const { data: patients } = usePatientsRepository();
  const {
    data: transactions,
    loading: transactionsLoading,
    recordExpense,
    recordIncome,
    update: updateTransaction,
  } = useTransactionsRepository();

  const [activeTab, setActiveTab] = useState<FinanceTab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [invoiceDraft, setInvoiceDraft] =
    useState<InvoiceDraft>(createInvoiceDraft);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(
    null
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    amount: "",
    method: "cash",
    reference: "",
  });
  const [paymentOperationId, setPaymentOperationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journalQuery, setJournalQuery] = useState("");
  const [journalFilter, setJournalFilter] = useState<TransactionFilter>("all");
  const [invoiceFrom, setInvoiceFrom] = useState("");
  const [invoiceTo, setInvoiceTo] = useState("");
  const [invoiceDocumentFilter, setInvoiceDocumentFilter] =
    useState<InvoiceDocumentFilter>("all");
  const [invoiceSettlementFilter, setInvoiceSettlementFilter] =
    useState<InvoiceSettlementFilter>("all");
  const [invoiceAdvancedOpen, setInvoiceAdvancedOpen] = useState(false);
  const [invoicePage, setInvoicePage] = useState(1);
  const [journalFrom, setJournalFrom] = useState("");
  const [journalTo, setJournalTo] = useState("");
  const [journalCategory, setJournalCategory] = useState("all");
  const [journalMethod, setJournalMethod] = useState<
    TransactionPaymentMethod | "all"
  >("all");
  const [journalStatus, setJournalStatus] =
    useState<TransactionStatusFilter>("all");
  const [journalSource, setJournalSource] =
    useState<TransactionSourceFilter>("all");
  const [journalMinAmount, setJournalMinAmount] = useState("");
  const [journalMaxAmount, setJournalMaxAmount] = useState("");
  const [journalSort, setJournalSort] =
    useState<TransactionSort>("date-desc");
  const [journalAdvancedOpen, setJournalAdvancedOpen] = useState(false);
  const [journalPage, setJournalPage] = useState(1);
  const pageSize = 10;
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>(
    createTransactionDraft
  );
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

  const actor = useMemo<BillingActor>(
    () => ({
      userDisplayName: currentUser?.displayName ?? currentUser?.email ?? null,
      userId: currentUser?.id ?? null,
    }),
    [currentUser]
  );

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    setInvoiceError(null);
    if (!isTauriRuntime()) {
      setInvoices([]);
      setInvoiceError(
        "La facturation officielle est disponible dans l’application de bureau."
      );
      setInvoicesLoading(false);
      return;
    }

    try {
      setInvoices(await billingService.listInvoices());
    } catch (error) {
      console.error("[Finances] Unable to load invoices", error);
      setInvoiceError("Impossible de charger les factures locales.");
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const invoiceStats = useMemo(() => {
    return invoices.reduce(
      (stats, invoice) => {
        if (invoice.documentStatus !== "issued") {
          return stats;
        }
        stats.gross += invoice.grossAmount;
        stats.collected +=
          invoice.completedPaymentAmount - invoice.completedRefundAmount;
        stats.balance += invoice.balanceAmount;
        if (invoice.settlementStatus === "overdue") {
          stats.overdue += invoice.balanceAmount;
        }
        return stats;
      },
      { balance: 0, collected: 0, gross: 0, overdue: 0 }
    );
  }, [invoices]);

  const financeSectionCards = useMemo<SectionCardItem[]>(
    () => [
      {
        title: "Facturé",
        value: formatDZD(invoiceStats.gross),
        badge: "documents émis",
        trend: "neutral",
        footerTitle: "Montant facturé",
        footerDescription: "Documents émis",
      },
      {
        title: "Encaissé",
        value: formatDZD(invoiceStats.collected),
        badge: "confirmé",
        trend: "up",
        footerTitle: "Paiements confirmés",
        footerDescription: "Règlements reçus",
      },
      {
        title: "Solde ouvert",
        value: formatDZD(invoiceStats.balance),
        badge: invoiceStats.balance > 0 ? "à recouvrer" : "soldé",
        tone: invoiceStats.balance > 0 ? "watch" : "quiet",
        trend: invoiceStats.balance > 0 ? "down" : "neutral",
        footerTitle: "Reste à recouvrer",
        footerDescription: "Créances ouvertes",
      },
      {
        title: "En retard",
        value: formatDZD(invoiceStats.overdue),
        badge: invoiceStats.overdue > 0 ? "à traiter" : "aucune",
        tone: invoiceStats.overdue > 0 ? "critical" : "quiet",
        trend: invoiceStats.overdue > 0 ? "down" : "neutral",
        footerTitle: "Échéances dépassées",
        footerDescription: "Retards de paiement",
      },
    ],
    [invoiceStats]
  );

  const filteredInvoices = useMemo(() => {
    const query = invoiceQuery.trim().toLocaleLowerCase("fr");
    return invoices.filter((invoice) => {
      const invoiceDate = invoice.issuedAt ?? invoice.createdAt;
      if (!isDateInRange(invoiceDate, invoiceFrom, invoiceTo)) {
        return false;
      }
      if (
        invoiceDocumentFilter !== "all" &&
        invoice.documentStatus !== invoiceDocumentFilter
      ) {
        return false;
      }
      if (
        invoiceSettlementFilter !== "all" &&
        invoice.settlementStatus !== invoiceSettlementFilter
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      const ownerName = invoice.ownerSnapshot
        ? `${invoice.ownerSnapshot.firstName} ${invoice.ownerSnapshot.lastName}`
        : owners
            .filter((owner) => owner.id === invoice.ownerId)
            .map((owner) => `${owner.firstName} ${owner.lastName}`)
            .join(" ");
      return [invoice.number, invoice.id, ownerName]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(query);
    });
  }, [
    invoiceDocumentFilter,
    invoiceFrom,
    invoiceQuery,
    invoiceSettlementFilter,
    invoiceTo,
    invoices,
    owners,
  ]);

  const ownerPatients = useMemo(
    () =>
      patients.filter(
        (patient) =>
          !invoiceDraft.ownerId || patient.ownerId === invoiceDraft.ownerId
      ),
    [invoiceDraft.ownerId, patients]
  );

  const transactionCategories = useMemo(
    () =>
      [...new Set(transactions.map((transaction) => transaction.category))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "fr")),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    const query = journalQuery.trim().toLocaleLowerCase("fr");
    return [...transactions]
      .filter(
        (transaction) =>
          journalFilter === "all" || transaction.type === journalFilter
      )
      .filter((transaction) => {
        if (!isDateInRange(transaction.date, journalFrom, journalTo)) {
          return false;
        }
        if (journalCategory !== "all" && transaction.category !== journalCategory) {
          return false;
        }
        if (journalMethod !== "all" && transaction.method !== journalMethod) {
          return false;
        }
        if (journalStatus !== "all" && transaction.status !== journalStatus) {
          return false;
        }
        if (
          journalSource !== "all" &&
          (journalSource === "billing") !== Boolean(transaction.isLocked)
        ) {
          return false;
        }
        const amount = transaction.amount / 100;
        const minAmount = Number(journalMinAmount);
        const maxAmount = Number(journalMaxAmount);
        if (journalMinAmount && (!Number.isFinite(minAmount) || amount < minAmount)) {
          return false;
        }
        if (journalMaxAmount && (!Number.isFinite(maxAmount) || amount > maxAmount)) {
          return false;
        }
        if (!query) {
          return true;
        }
        return [
          transaction.description,
          transaction.category,
          PAYMENT_METHOD_LABELS[transaction.method],
          transaction.referenceId,
          transaction.sourceId,
        ]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(query);
      })
      .sort((left, right) => {
        if (journalSort === "amount-desc") {
          return right.amount - left.amount;
        }
        if (journalSort === "amount-asc") {
          return left.amount - right.amount;
        }
        const direction = journalSort === "date-asc" ? 1 : -1;
        return direction * (new Date(left.date).getTime() - new Date(right.date).getTime());
      });
  }, [
    journalCategory,
    journalFilter,
    journalFrom,
    journalMaxAmount,
    journalMethod,
    journalMinAmount,
    journalQuery,
    journalSort,
    journalSource,
    journalStatus,
    journalTo,
    transactions,
  ]);

  const invoicePageCount = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const journalPageCount = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize)
  );
  const paginatedInvoices = useMemo(
    () => filteredInvoices.slice((invoicePage - 1) * pageSize, invoicePage * pageSize),
    [filteredInvoices, invoicePage]
  );
  const paginatedTransactions = useMemo(
    () =>
      filteredTransactions.slice(
        (journalPage - 1) * pageSize,
        journalPage * pageSize
      ),
    [filteredTransactions, journalPage]
  );

  const invoiceFilterCount =
    Number(Boolean(invoiceFrom)) +
    Number(Boolean(invoiceTo)) +
    Number(invoiceDocumentFilter !== "all") +
    Number(invoiceSettlementFilter !== "all");
  const journalFilterCount =
    Number(Boolean(journalFrom)) +
    Number(Boolean(journalTo)) +
    Number(journalCategory !== "all") +
    Number(journalMethod !== "all") +
    Number(journalStatus !== "all") +
    Number(journalSource !== "all") +
    Number(Boolean(journalMinAmount)) +
    Number(Boolean(journalMaxAmount)) +
    Number(journalSort !== "date-desc");

  const resetInvoiceFilters = () => {
    setInvoiceQuery("");
    setInvoiceFrom("");
    setInvoiceTo("");
    setInvoiceDocumentFilter("all");
    setInvoiceSettlementFilter("all");
    setInvoicePage(1);
  };

  const resetJournalFilters = () => {
    setJournalQuery("");
    setJournalFilter("all");
    setJournalFrom("");
    setJournalTo("");
    setJournalCategory("all");
    setJournalMethod("all");
    setJournalStatus("all");
    setJournalSource("all");
    setJournalMinAmount("");
    setJournalMaxAmount("");
    setJournalSort("date-desc");
    setJournalPage(1);
  };

  useEffect(() => {
    setInvoicePage((page) => Math.min(page, invoicePageCount));
  }, [invoicePageCount]);

  useEffect(() => {
    setJournalPage((page) => Math.min(page, journalPageCount));
  }, [journalPageCount]);

  const openInvoiceDetail = async (invoice: Invoice) => {
    setIsDetailLoading(true);
    try {
      const detail = await billingService.getInvoice(invoice.id);
      if (!detail) {
        toast.error("Cette facture est introuvable.");
        return;
      }
      setSelectedInvoice(detail);
    } catch (error) {
      console.error(error);
      toast.error("Impossible d’ouvrir cette facture.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const getClinicSnapshot = async () => {
    const name =
      (await getSetting("clinic_name")) ||
      (await getSetting("cabinet_name")) ||
      (await getSetting("practice_name")) ||
      "Baitari";
    return { name };
  };

  const normalizeInvoiceLines = (): BillingLineInput[] | null => {
    const normalized: BillingLineInput[] = [];
    for (const line of invoiceDraft.lines) {
      const description = line.description.trim();
      const quantity = Number(line.quantity);
      const unitAmount = Number(line.unitAmount);
      if (
        !description ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitAmount) ||
        unitAmount <= 0
      ) {
        toast.error(
          "Chaque ligne doit contenir une description, une quantité et un montant valides."
        );
        return null;
      }
      normalized.push({
        description,
        quantityMilli: Math.round(quantity * 1000),
        unitAmount: toCentimes(unitAmount),
      });
    }
    return normalized;
  };

  const submitInvoice = async (action: "draft" | "issue") => {
    if (!isTauriRuntime()) {
      toast.info("Créez les factures depuis l’application de bureau.");
      return;
    }
    if (!invoiceDraft.ownerId) {
      toast.error("Sélectionnez un propriétaire.");
      return;
    }
    const lines = normalizeInvoiceLines();
    if (!lines) {
      return;
    }

    let persistedDraftId = invoiceDraft.createdInvoiceId;
    setIsSubmitting(true);
    try {
      const invoiceId = invoiceDraft.createdInvoiceId;
      const created = invoiceId
        ? await billingService.getInvoice(invoiceId)
        : await billingService.createInvoiceDraft({
            actor,
            dueAt: invoiceDraft.dueAt
              ? `${invoiceDraft.dueAt}T23:59:59`
              : null,
            lines,
            notes: invoiceDraft.notes,
            ownerId: invoiceDraft.ownerId,
            patientId: invoiceDraft.patientId || null,
          });

      if (!created) {
        throw new Error("Le brouillon de facture est introuvable.");
      }

      if (!invoiceDraft.createdInvoiceId) {
        persistedDraftId = created.id;
        setInvoiceDraft((current) => ({
          ...current,
          createdInvoiceId: created.id,
        }));
      }

      if (action === "issue") {
        await billingService.issueInvoice({
          actor,
          clinicSnapshot: await getClinicSnapshot(),
          idempotencyKey: `finance-ui:invoice:${created.id}:issue`,
          invoiceId: created.id,
        });
      }

      toast.success(
        action === "issue"
          ? "Facture émise et figée avec succès."
          : "Brouillon de facture enregistré."
      );
      setIsInvoiceDialogOpen(false);
      setInvoiceDraft(createInvoiceDraft());
      await loadInvoices();
    } catch (error) {
      console.error(error);
      if (action === "issue" && persistedDraftId) {
        toast.warning(
          "L’émission a échoué, mais le brouillon a été conservé. Vous pourrez l’émettre depuis le registre."
        );
        setIsInvoiceDialogOpen(false);
        setInvoiceDraft(createInvoiceDraft());
        await loadInvoices();
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer la facture."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const issueExistingInvoice = async (invoice: Invoice) => {
    setIsSubmitting(true);
    try {
      await billingService.issueInvoice({
        actor,
        clinicSnapshot: await getClinicSnapshot(),
        idempotencyKey: `finance-ui:invoice:${invoice.id}:issue`,
        invoiceId: invoice.id,
      });
      toast.success("Facture émise. Son contenu est désormais immuable.");
      await loadInvoices();
      if (selectedInvoice?.id === invoice.id) {
        const detail = await billingService.getInvoice(invoice.id);
        setSelectedInvoice(detail);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d’émettre la facture."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentDialog = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentOperationId(crypto.randomUUID());
    setPaymentDraft({
      amount: (invoice.balanceAmount / 100).toFixed(2),
      method: "cash",
      reference: "",
    });
  };

  const submitPayment = async () => {
    if (!paymentInvoice) {
      return;
    }
    const amount = Number(paymentDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Saisissez un montant de règlement valide.");
      return;
    }
    const amountCentimes = toCentimes(amount);
    setIsSubmitting(true);
    try {
      await billingService.recordPayment({
        actor,
        amount: amountCentimes,
        idempotencyKey: [
          "finance-ui",
          "payment",
          paymentInvoice.id,
          paymentOperationId,
        ].join(":"),
        invoiceId: paymentInvoice.id,
        method: paymentDraft.method,
        reference: paymentDraft.reference,
      });
      toast.success("Règlement enregistré dans la facture et le journal.");
      setPaymentInvoice(null);
      await loadInvoices();
      if (selectedInvoice?.id === paymentInvoice.id) {
        setSelectedInvoice(await billingService.getInvoice(paymentInvoice.id));
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer le règlement."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTransactionEditor = (transaction?: Transaction) => {
    if (transaction?.isLocked) {
      toast.info(
        "Cette écriture provient de la facturation et ne peut pas être modifiée."
      );
      return;
    }
    setEditingTransaction(transaction ?? null);
    setTransactionDraft(
      transaction
        ? {
            amount: String(transaction.amount / 100),
            category: transaction.category,
            date: transaction.date.slice(0, 10),
            description: transaction.description,
            method: transaction.method,
            status: transaction.status,
            type: transaction.type,
          }
        : createTransactionDraft()
    );
    setIsTransactionDialogOpen(true);
  };

  const submitTransaction = async () => {
    const amount = Number(transactionDraft.amount);
    if (
      !transactionDraft.description.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error("Ajoutez une description et un montant valide.");
      return;
    }
    if (editingTransaction?.isLocked) {
      toast.error("Une écriture comptable générée ne peut pas être modifiée.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        amount: toCentimes(amount),
        category: transactionDraft.category.trim() || "Autre",
        date: new Date(`${transactionDraft.date}T12:00:00`).toISOString(),
        description: transactionDraft.description.trim(),
        method: transactionDraft.method,
        status: transactionDraft.status,
      };
      if (editingTransaction) {
        const updated = await updateTransaction(editingTransaction.id, {
          ...payload,
          type: transactionDraft.type,
        });
        if (!updated) {
          throw new Error("La base locale a refusé la modification.");
        }
      } else if (transactionDraft.type === "income") {
        await recordIncome(payload);
      } else {
        await recordExpense(payload);
      }
      toast.success(
        editingTransaction
          ? "Écriture mise à jour."
          : "Écriture ajoutée au journal."
      );
      setIsTransactionDialogOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error(error);
      toast.error("Impossible d’enregistrer cette écriture.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTransactionStatus = async (transaction: Transaction) => {
    if (transaction.isLocked) {
      toast.info("Le statut d’une écriture générée est verrouillé.");
      return;
    }
    try {
      const updated = await updateTransaction(transaction.id, {
        status: transaction.status === "paid" ? "pending" : "paid",
      });
      if (!updated) {
        throw new Error("La base locale a refusé la modification du statut.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de modifier le statut.");
    }
  };

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-4 px-4 pb-8 lg:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <MotivationalHeader section="finances" />
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 md:w-auto">
          <Button
            className="h-10 min-w-24 whitespace-nowrap rounded-full px-5"
            onClick={() => onNavigate?.("finances_analytics")}
            variant="outline"
          >
            <HugeiconsIcon
              className="size-4"
              icon={ArrowRight01Icon}
              strokeWidth={1.5}
            />
            Analyse
          </Button>
          <Button
            className="h-10 min-w-36 whitespace-nowrap rounded-full px-5"
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
              strokeWidth={1.8}
            />
            {activeTab === "invoices"
              ? "Nouvelle facture"
              : "Nouvelle écriture"}
          </Button>
        </div>
      </div>

      <SectionCards items={financeSectionCards} />

      <Tabs
        onValueChange={(value) => setActiveTab(value as FinanceTab)}
        value={activeTab}
      >
        <TabsList className="h-10 rounded-xl" variant="default">
          <TabsTrigger className="px-4" value="invoices">
            <HugeiconsIcon icon={File01Icon} strokeWidth={1.7} />
            Factures
          </TabsTrigger>
          <TabsTrigger className="px-4" value="journal">
            <HugeiconsIcon icon={ReceiptTextIcon} strokeWidth={1.7} />
            Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-5" value="invoices">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-none">
            <CardHeader className="border-b px-5 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-[22px] tracking-[-0.025em]">
                    Registre des factures
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Suivez l’émission, l’échéance et le recouvrement de chaque
                    dossier.
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <div className="relative w-full sm:w-72">
                    <HugeiconsIcon
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      icon={SearchIcon}
                      strokeWidth={1.5}
                    />
                    <Input
                      className="h-10 rounded-xl pl-9"
                      onChange={(event) => setInvoiceQuery(event.target.value)}
                      placeholder="Numéro ou propriétaire..."
                      value={invoiceQuery}
                    />
                  </div>
                  <Button
                    aria-expanded={invoiceAdvancedOpen}
                    className="h-10 rounded-xl"
                    onClick={() => setInvoiceAdvancedOpen((open) => !open)}
                    variant="outline"
                  >
                    <HugeiconsIcon icon={FilterIcon} strokeWidth={1.7} />
                    Filtrer
                    {invoiceFilterCount > 0 ? (
                      <Badge className="ml-1 size-5 justify-center rounded-full px-0" variant="secondary">
                        {invoiceFilterCount}
                      </Badge>
                    ) : null}
                  </Button>
                </div>
              </div>
              {invoiceAdvancedOpen ? (
                <div className="grid gap-3 rounded-2xl bg-muted/35 p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DateFilter label="Du" onChange={setInvoiceFrom} value={invoiceFrom} />
                  <DateFilter label="Au" onChange={setInvoiceTo} value={invoiceTo} />
                  <NativeSelect
                    aria-label="Statut du document"
                    className="h-9 rounded-xl bg-background"
                    onChange={(event) =>
                      setInvoiceDocumentFilter(
                        event.target.value as InvoiceDocumentFilter
                      )
                    }
                    value={invoiceDocumentFilter}
                  >
                    <NativeSelectOption value="all">
                      Tous les documents
                    </NativeSelectOption>
                    <NativeSelectOption value="draft">Brouillons</NativeSelectOption>
                    <NativeSelectOption value="issued">Émises</NativeSelectOption>
                    <NativeSelectOption value="void">Annulées</NativeSelectOption>
                  </NativeSelect>
                  <NativeSelect
                    aria-label="Statut du règlement"
                    className="h-9 rounded-xl bg-background"
                    onChange={(event) =>
                      setInvoiceSettlementFilter(
                        event.target.value as InvoiceSettlementFilter
                      )
                    }
                    value={invoiceSettlementFilter}
                  >
                    <NativeSelectOption value="all">
                      Tous les règlements
                    </NativeSelectOption>
                    <NativeSelectOption value="open">À régler</NativeSelectOption>
                    <NativeSelectOption value="partial">Partielles</NativeSelectOption>
                    <NativeSelectOption value="paid">Payées</NativeSelectOption>
                    <NativeSelectOption value="overdue">En retard</NativeSelectOption>
                    <NativeSelectOption value="credited">Créditées</NativeSelectOption>
                  </NativeSelect>
                  <div className="flex items-end sm:col-span-2 lg:col-span-4">
                    <Button
                      className="h-9 rounded-xl"
                      disabled={invoiceFilterCount === 0 && !invoiceQuery}
                      onClick={resetInvoiceFilters}
                      size="sm"
                      variant="ghost"
                    >
                      <HugeiconsIcon icon={Refresh01Icon} strokeWidth={1.7} />
                      Réinitialiser les filtres
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="flex min-h-56 items-center justify-center">
                  <Spinner className="size-6 text-muted-foreground" />
                </div>
              ) : invoiceError ? (
                <Empty className="min-h-56 py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={File01Icon} strokeWidth={1.7} />
                    </EmptyMedia>
                    <EmptyTitle>Facturation indisponible</EmptyTitle>
                    <EmptyDescription>{invoiceError}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : filteredInvoices.length === 0 ? (
                <Empty className="min-h-56 py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={File01Icon} strokeWidth={1.7} />
                    </EmptyMedia>
                    <EmptyTitle>Aucune facture</EmptyTitle>
                    <EmptyDescription>
                      Créez un premier brouillon puis émettez-le lorsque son
                      contenu est validé.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                <div className="hidden lg:block">
                  <Table className="min-w-[980px]">
                    <TableHeader className="bg-muted/25">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-11 pl-5 text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
                          Facture
                        </TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
                          Dossier
                        </TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
                          Situation
                        </TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
                          Échéance
                        </TableHead>
                        <TableHead className="text-right text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
                          Montant
                        </TableHead>
                        <TableHead className="text-right text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
                          À recouvrer
                        </TableHead>
                        <TableHead className="w-[1%] pr-5">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const ownerName = getInvoiceOwnerName(invoice, owners);
                      const patientName = getInvoicePatientName(
                        invoice,
                        patients
                      );
                      const needsAttention =
                        invoice.settlementStatus === "overdue";
                      return (
                        <TableRow
                          className={cn(
                            "group h-[76px]",
                            needsAttention && "bg-rose-500/[0.025]"
                          )}
                          key={invoice.id}
                        >
                          <TableCell className="pl-5">
                            <button
                              className="rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              onClick={() => void openInvoiceDetail(invoice)}
                              type="button"
                            >
                              <span className="block font-semibold text-foreground tabular-nums">
                                {getInvoiceDisplayName(invoice)}
                              </span>
                              <span className="mt-1 block text-muted-foreground text-xs">
                                {formatDate(
                                  invoice.issuedAt ?? invoice.createdAt
                                )}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <span className="block font-medium text-foreground">
                              {ownerName}
                            </span>
                            {patientName ? (
                              <span className="mt-1 block text-muted-foreground text-xs">
                                Patient · {patientName}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <div className="flex flex-wrap gap-1.5">
                              {documentBadge(invoice.documentStatus)}
                              {settlementBadge(invoice.settlementStatus)}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "whitespace-normal text-xs",
                              needsAttention
                                ? "font-semibold text-rose-700 dark:text-rose-300"
                                : "text-muted-foreground"
                            )}
                          >
                            {getInvoiceDueLabel(invoice)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground tabular-nums">
                            {formatDZD(invoice.grossAmount)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold tabular-nums",
                              invoice.balanceAmount > 0
                                ? needsAttention
                                  ? "text-rose-700 dark:text-rose-300"
                                  : "text-amber-700 dark:text-amber-300"
                                : "text-emerald-700 dark:text-emerald-300"
                            )}
                          >
                            {invoice.balanceAmount > 0
                              ? formatDZD(invoice.balanceAmount)
                              : "Soldé"}
                          </TableCell>
                          <TableCell className="pr-5">
                            <div className="flex min-w-[142px] justify-end gap-1.5">
                              {invoice.documentStatus === "draft" ? (
                                <Button
                                  disabled={isSubmitting}
                                  onClick={() =>
                                    void issueExistingInvoice(invoice)
                                  }
                                  className="rounded-lg"
                                  size="sm"
                                  variant="outline"
                                >
                                  Émettre
                                </Button>
                              ) : null}
                              {invoice.documentStatus === "issued" &&
                              invoice.balanceAmount > 0 ? (
                                <Button
                                  onClick={() => openPaymentDialog(invoice)}
                                  className="rounded-lg"
                                  size="sm"
                                >
                                  Régler
                                </Button>
                              ) : null}
                              <Button
                                aria-label={`Voir ${getInvoiceDisplayName(invoice)}`}
                                disabled={isDetailLoading}
                                onClick={() => void openInvoiceDetail(invoice)}
                                size="icon-sm"
                                variant="ghost"
                              >
                                <HugeiconsIcon
                                  icon={ArrowRight01Icon}
                                  strokeWidth={1.7}
                                />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </div>

                <div className="divide-y lg:hidden">
                  {paginatedInvoices.map((invoice) => {
                    const ownerName = getInvoiceOwnerName(invoice, owners);
                    const patientName = getInvoicePatientName(
                      invoice,
                      patients
                    );
                    const needsAttention =
                      invoice.settlementStatus === "overdue";
                    return (
                      <article
                        className={cn(
                          "space-y-4 px-4 py-5",
                          needsAttention && "bg-rose-500/[0.025]"
                        )}
                        key={invoice.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            className="min-w-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => void openInvoiceDetail(invoice)}
                            type="button"
                          >
                            <span className="block truncate font-semibold tabular-nums">
                              {getInvoiceDisplayName(invoice)}
                            </span>
                            <span className="mt-1 block text-muted-foreground text-xs">
                              {ownerName}
                              {patientName ? ` · ${patientName}` : ""}
                            </span>
                          </button>
                          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                            {documentBadge(invoice.documentStatus)}
                            {settlementBadge(invoice.settlementStatus)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3">
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              Total
                            </p>
                            <p className="mt-1 font-medium text-sm tabular-nums">
                              {formatDZD(invoice.grossAmount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-muted-foreground">
                              À recouvrer
                            </p>
                            <p
                              className={cn(
                                "mt-1 font-semibold text-sm tabular-nums",
                                invoice.balanceAmount > 0
                                  ? needsAttention
                                    ? "text-rose-700 dark:text-rose-300"
                                    : "text-amber-700 dark:text-amber-300"
                                  : "text-emerald-700 dark:text-emerald-300"
                              )}
                            >
                              {invoice.balanceAmount > 0
                                ? formatDZD(invoice.balanceAmount)
                                : "Soldé"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p
                            className={cn(
                              "text-xs",
                              needsAttention
                                ? "font-semibold text-rose-700 dark:text-rose-300"
                                : "text-muted-foreground"
                            )}
                          >
                            {getInvoiceDueLabel(invoice)}
                          </p>
                          <div className="flex gap-2">
                            {invoice.documentStatus === "draft" ? (
                              <Button
                                disabled={isSubmitting}
                                onClick={() =>
                                  void issueExistingInvoice(invoice)
                                }
                                size="sm"
                                variant="outline"
                              >
                                Émettre
                              </Button>
                            ) : null}
                            {invoice.documentStatus === "issued" &&
                            invoice.balanceAmount > 0 ? (
                              <Button
                                onClick={() => openPaymentDialog(invoice)}
                                size="sm"
                              >
                                Régler
                              </Button>
                            ) : null}
                            <Button
                              aria-label={`Voir ${getInvoiceDisplayName(invoice)}`}
                              disabled={isDetailLoading}
                              onClick={() => void openInvoiceDetail(invoice)}
                              size="icon-sm"
                              variant="ghost"
                            >
                              <HugeiconsIcon
                                icon={ArrowRight01Icon}
                                strokeWidth={1.7}
                              />
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {invoicePageCount > 1 ? (
                  <div className="flex items-center justify-between border-t px-5 py-3">
                    <p className="text-muted-foreground text-xs">
                      {filteredInvoices.length} facture{filteredInvoices.length > 1 ? "s" : ""}
                    </p>
                    <Pagination className="mx-0 w-auto justify-end">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            aria-disabled={invoicePage === 1}
                            className={cn(invoicePage === 1 && "pointer-events-none opacity-40")}
                            onClick={(event) => {
                              event.preventDefault();
                              setInvoicePage((page) => Math.max(1, page - 1));
                            }}
                            text="Précédent"
                          />
                        </PaginationItem>
                        {Array.from({ length: invoicePageCount }, (_, index) => index + 1).map(
                          (page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                aria-label={`Aller à la page ${page}`}
                                href={`#finances-page-${page}`}
                                isActive={invoicePage === page}
                                onClick={(event) => {
                                  event.preventDefault();
                                  setInvoicePage(page);
                                }}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem>
                          <PaginationNext
                            aria-disabled={invoicePage === invoicePageCount}
                            className={cn(
                              invoicePage === invoicePageCount &&
                                "pointer-events-none opacity-40"
                            )}
                            onClick={(event) => {
                              event.preventDefault();
                              setInvoicePage((page) =>
                                Math.min(invoicePageCount, page + 1)
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

        <TabsContent className="space-y-5" value="journal">
          <Card className="overflow-hidden rounded-[24px] border-border/80 shadow-none">
            <CardHeader className="border-b px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-xl tracking-[-0.03em]">
                    Journal de trésorerie
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Les lignes issues des règlements sont verrouillées
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative sm:w-64">
                    <HugeiconsIcon
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      icon={SearchIcon}
                      strokeWidth={1.5}
                    />
                    <Input
                      className="h-9 rounded-xl pl-9"
                      onChange={(event) => setJournalQuery(event.target.value)}
                      placeholder="Rechercher une écriture..."
                      value={journalQuery}
                    />
                  </div>
                  <ToggleGroup
                    multiple={false}
                    onValueChange={(value) =>
                      setJournalFilter(
                        (value[0] as TransactionFilter | undefined) ?? "all"
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
                    className="h-9 rounded-xl"
                    onClick={() => setJournalAdvancedOpen((open) => !open)}
                    variant="outline"
                  >
                    <HugeiconsIcon icon={FilterIcon} strokeWidth={1.7} />
                    Avancé
                    {journalFilterCount > 0 ? (
                      <Badge className="ml-1 size-5 justify-center rounded-full px-0" variant="secondary">
                        {journalFilterCount}
                      </Badge>
                    ) : null}
                  </Button>
                </div>
              </div>
              {journalAdvancedOpen ? (
                <div className="grid gap-3 rounded-2xl bg-muted/35 p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DateFilter label="Du" onChange={setJournalFrom} value={journalFrom} />
                  <DateFilter label="Au" onChange={setJournalTo} value={journalTo} />
                  <NativeSelect
                    aria-label="Catégorie de l’écriture"
                    className="h-9 rounded-xl bg-background"
                    onChange={(event) => setJournalCategory(event.target.value)}
                    value={journalCategory}
                  >
                    <NativeSelectOption value="all">Toutes les catégories</NativeSelectOption>
                    {transactionCategories.map((category) => (
                      <NativeSelectOption key={category} value={category}>
                        {category}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    aria-label="Moyen de paiement"
                    className="h-9 rounded-xl bg-background"
                    onChange={(event) =>
                      setJournalMethod(
                        event.target.value as TransactionPaymentMethod | "all"
                      )
                    }
                    value={journalMethod}
                  >
                    <NativeSelectOption value="all">Tous les moyens</NativeSelectOption>
                    {PAYMENT_METHODS.map((method) => (
                      <NativeSelectOption key={method.value} value={method.value}>
                        {method.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    aria-label="Statut de l’écriture"
                    className="h-9 rounded-xl bg-background"
                    onChange={(event) =>
                      setJournalStatus(event.target.value as TransactionStatusFilter)
                    }
                    value={journalStatus}
                  >
                    <NativeSelectOption value="all">Tous les statuts</NativeSelectOption>
                    <NativeSelectOption value="paid">Payées</NativeSelectOption>
                    <NativeSelectOption value="pending">En attente</NativeSelectOption>
                  </NativeSelect>
                  <NativeSelect
                    aria-label="Origine de l’écriture"
                    className="h-9 rounded-xl bg-background"
                    onChange={(event) =>
                      setJournalSource(event.target.value as TransactionSourceFilter)
                    }
                    value={journalSource}
                  >
                    <NativeSelectOption value="all">Toutes les origines</NativeSelectOption>
                    <NativeSelectOption value="manual">Saisie manuelle</NativeSelectOption>
                    <NativeSelectOption value="billing">Facturation</NativeSelectOption>
                  </NativeSelect>
                  <Input
                    aria-label="Montant minimum"
                    className="h-9 rounded-xl bg-background"
                    min="0"
                    onChange={(event) => setJournalMinAmount(event.target.value)}
                    placeholder="Montant min. (DA)"
                    step="0.01"
                    type="number"
                    value={journalMinAmount}
                  />
                  <Input
                    aria-label="Montant maximum"
                    className="h-9 rounded-xl bg-background"
                    min="0"
                    onChange={(event) => setJournalMaxAmount(event.target.value)}
                    placeholder="Montant max. (DA)"
                    step="0.01"
                    type="number"
                    value={journalMaxAmount}
                  />
                  <NativeSelect
                    aria-label="Trier les écritures"
                    className="h-9 rounded-xl bg-background"
                    onChange={(event) =>
                      setJournalSort(event.target.value as TransactionSort)
                    }
                    value={journalSort}
                  >
                    <NativeSelectOption value="date-desc">Plus récentes</NativeSelectOption>
                    <NativeSelectOption value="date-asc">Plus anciennes</NativeSelectOption>
                    <NativeSelectOption value="amount-desc">Montant décroissant</NativeSelectOption>
                    <NativeSelectOption value="amount-asc">Montant croissant</NativeSelectOption>
                  </NativeSelect>
                  <div className="flex items-end sm:col-span-2 lg:col-span-4">
                    <Button
                      className="h-9 rounded-xl"
                      disabled={journalFilterCount === 0 && !journalQuery && journalFilter === "all"}
                      onClick={resetJournalFilters}
                      size="sm"
                      variant="ghost"
                    >
                      <HugeiconsIcon icon={Refresh01Icon} strokeWidth={1.7} />
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
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={ReceiptTextIcon} strokeWidth={1.7} />
                    </EmptyMedia>
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
                                    : "bg-rose-500/10 text-rose-600"
                                )}
                              >
                                <HugeiconsIcon
                                  icon={
                                    isIncome ? ArrowUp01Icon : ArrowDown01Icon
                                  }
                                  strokeWidth={1.8}
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
                                  strokeWidth={1.8}
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
                                : "text-rose-600 dark:text-rose-400"
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
                                  strokeWidth={1.8}
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
                                  strokeWidth={1.8}
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
                      {filteredTransactions.length} écriture{filteredTransactions.length > 1 ? "s" : ""}
                    </p>
                    <Pagination className="mx-0 w-auto justify-end">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            aria-disabled={journalPage === 1}
                            className={cn(journalPage === 1 && "pointer-events-none opacity-40")}
                            onClick={(event) => {
                              event.preventDefault();
                              setJournalPage((page) => Math.max(1, page - 1));
                            }}
                            text="Précédent"
                          />
                        </PaginationItem>
                        {Array.from({ length: journalPageCount }, (_, index) => index + 1).map(
                          (page) => (
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
                          )
                        )}
                        <PaginationItem>
                          <PaginationNext
                            aria-disabled={journalPage === journalPageCount}
                            className={cn(
                              journalPage === journalPageCount &&
                                "pointer-events-none opacity-40"
                            )}
                            onClick={(event) => {
                              event.preventDefault();
                              setJournalPage((page) =>
                                Math.min(journalPageCount, page + 1)
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle facture</DialogTitle>
            <DialogDescription>
              Préparez les prestations, puis enregistrez ou émettez le document.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="invoice-owner">Propriétaire</FieldLabel>
                <NativeSelect
                  id="invoice-owner"
                  onChange={(event) =>
                    setInvoiceDraft((current) => ({
                      ...current,
                      ownerId: event.target.value,
                      patientId: "",
                    }))
                  }
                  value={invoiceDraft.ownerId}
                >
                  <NativeSelectOption value="">Sélectionner</NativeSelectOption>
                  {owners.map((owner) => (
                    <NativeSelectOption key={owner.id} value={owner.id}>
                      {owner.firstName} {owner.lastName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
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
                  <NativeSelectOption value="">Sans patient</NativeSelectOption>
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
              <Input
                id="invoice-due-at"
                onChange={(event) =>
                  setInvoiceDraft((current) => ({
                    ...current,
                    dueAt: event.target.value,
                  }))
                }
                type="date"
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
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} />
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
                            ? { ...candidate, description: event.target.value }
                            : candidate
                        ),
                      }))
                    }
                    placeholder="Consultation, vaccin..."
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
                            : candidate
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
                            : candidate
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
                          (candidate) => candidate.id !== line.id
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
                placeholder="Contexte ou précision utile..."
                value={invoiceDraft.notes}
              />
              <FieldDescription>
                Une facture émise est figée. Utilisez un avoir pour la corriger.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
        open={Boolean(selectedInvoice)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto">
          {selectedInvoice ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>
                    {getInvoiceDisplayName(selectedInvoice)}
                  </DialogTitle>
                  {documentBadge(selectedInvoice.documentStatus)}
                  {settlementBadge(selectedInvoice.settlementStatus)}
                </div>
                <DialogDescription>
                  Émise le {formatDate(selectedInvoice.issuedAt)} · échéance{" "}
                  {formatDate(selectedInvoice.dueAt)}
                </DialogDescription>
              </DialogHeader>
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
                          {formatDZD(line.unitAmount)}
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
                            "text-muted-foreground line-through"
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
                            creditNote.issuedAt ?? creditNote.createdAt
                          )}
                          {creditNote.reason ? ` · ${creditNote.reason}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold text-violet-600 tabular-nums dark:text-violet-300">
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
                            "text-muted-foreground line-through dark:text-muted-foreground"
                        )}
                      >
                        -{formatDZD(refund.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <DialogFooter>
                {selectedInvoice.documentStatus === "draft" ? (
                  <Button
                    disabled={isSubmitting}
                    onClick={() => void issueExistingInvoice(selectedInvoice)}
                  >
                    Émettre
                  </Button>
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
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setPaymentInvoice(null)}
        open={Boolean(paymentInvoice)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un règlement</DialogTitle>
            <DialogDescription>
              {paymentInvoice
                ? `${getInvoiceDisplayName(paymentInvoice)} · solde ${formatDZD(
                    paymentInvoice.balanceAmount
                  )}`
                : null}
            </DialogDescription>
          </DialogHeader>
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
                placeholder="N° de chèque, terminal, virement..."
                value={paymentDraft.reference}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setIsTransactionDialogOpen(false)}
        open={isTransactionDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Modifier l’écriture" : "Nouvelle écriture"}
            </DialogTitle>
            <DialogDescription>
              Les mouvements manuels restent modifiables. Les règlements générés
              sont protégés.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <ToggleGroup
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
                <Input
                  id="transaction-date"
                  onChange={(event) =>
                    setTransactionDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  type="date"
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
                    <NativeSelectOption key={method.value} value={method.value}>
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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(Finances);
