import { createUuid } from "@/lib/uuid";
import { draftPriceLines, priceInput } from "../lib/draft-prices";
import { getInvoiceSettings } from "@/services/invoiceSettingsService";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { type SectionCardItem } from "@/components/section-cards";

import { useAuth } from "@/contexts/AuthContext";
import { useFocus } from "@/contexts/focus-provider";
import {
  useOwnersRepository,
  usePatientsRepository,
  useTransactionsRepository,
} from "@/data/repositories";

import { type BillingActor, billingService } from "@/services/billingService";
import { isTauriRuntime } from "@/services/browser-store";
import type { View } from "@/types";
import type {
  BillingLineInput,
  Invoice,
  InvoiceDetail,
  Transaction,
  TransactionPaymentMethod,
} from "@/types/db";
import { formatDZD, toCentimes } from "@/utils/currency";
import {
  FinanceTab,
  TransactionFilter,
  InvoiceDocumentFilter,
  InvoiceSettlementFilter,
  TransactionStatusFilter,
  TransactionSourceFilter,
  TransactionSort,
  InvoiceDraft,
  PaymentDraft,
  TransactionDraft,
  PAYMENT_METHOD_LABELS,
  createInvoiceDraft,
  createTransactionDraft,
  isDateInRange,
} from "@/modules/finances/components/finances-shared";

export function useFinancesPageModel({
  onNavigate,
}: {
  onNavigate?: (view: View) => void;
}) {
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

  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDetail | null>(
    null
  );
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
  const [editingInvoicePrices, setEditingInvoicePrices] = useState(false);
  const [invoicePrices, setInvoicePrices] = useState<Record<string, string>>({});
  useEffect(() => { if (!selectedInvoice) { setEditingInvoicePrices(false); setInvoicePrices({}); } }, [selectedInvoice]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    amount: "",
    method: "cash",
    reference: "",
  });
  const [paymentOperationId, setPaymentOperationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueConfirmTarget, setIssueConfirmTarget] = useState<Invoice | null>(
    null
  );
  const [voidTarget, setVoidTarget] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [deleteDraftTarget, setDeleteDraftTarget] = useState<Invoice | null>(
    null
  );
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
  const [journalSort, setJournalSort] = useState<TransactionSort>("date-desc");
  const [journalAdvancedOpen, setJournalAdvancedOpen] = useState(false);
  const [journalPage, setJournalPage] = useState(1);
  const pageSize = 10;
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>(
    createTransactionDraft
  );
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

  const {focus, clearFocus} = useFocus();
  useEffect(() => {
    if (focus?.kind !== "invoice") return;
    let alive = true;
    setIsDetailLoading(true);
    void billingService.getInvoice(focus.id).then(invoice => {
      if (!alive) return;
      if (!invoice) {toast.error("Cette facture est introuvable."); return;}
      setActiveTab("invoices"); setEditingInvoicePrices(false); setInvoicePrices({}); setSelectedInvoice(invoice);
    }).catch(() => {if (alive) toast.error("Impossible d’ouvrir cette facture. Réessayez depuis la liste.");})
      .finally(() => {if (alive) {setIsDetailLoading(false); clearFocus();}});
    return () => {alive = false;};
  }, [focus, clearFocus]);

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

  useEffect(() => {
    const consume = () => {
      const raw = sessionStorage.getItem("vetera:pending-invoice");
      if (!raw) return;
      try {
        const context = JSON.parse(raw) as {
          ownerId?: string;
          patientId?: string;
          appointmentId?: string;
        };
        if (context.appointmentId && invoicesLoading) return;
        if (
          !context.ownerId ||
          !owners.some((owner) => owner.id === context.ownerId)
        )
          return;
        sessionStorage.removeItem("vetera:pending-invoice");
        setActiveTab("invoices");
        const existing =
          context.appointmentId &&
          invoices.find(
            (invoice) =>
              invoice.appointmentId === context.appointmentId &&
              invoice.documentStatus !== "void"
          );
        if (existing) {
          void openInvoiceDetail(existing);
          return;
        }
        setInvoiceDraft({
          ...createInvoiceDraft(),
          ownerId: context.ownerId,
          patientId: context.patientId ?? "",
          appointmentId: context.appointmentId,
        });
        setIsInvoiceDialogOpen(true);
      } catch {
        sessionStorage.removeItem("vetera:pending-invoice");
      }
    };
    consume();
    window.addEventListener("vetera:new-invoice", consume);
    return () => window.removeEventListener("vetera:new-invoice", consume);
  }, [owners, invoices, invoicesLoading]);

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

  const financeSectionCards = useMemo<SectionCardItem[]>(() => {
    const recoveryRate =
      invoiceStats.gross > 0
        ? Math.round((invoiceStats.collected / invoiceStats.gross) * 100)
        : 100;
    return [
      {
        title: "Facturé",
        value: formatDZD(invoiceStats.gross),
        change: recoveryRate,
        changeLabel: "% taux de recouvrement",
        trend: "neutral",
        detailRow: `${invoices.length} document${invoices.length > 1 ? "s" : ""} émis · Période en cours`,
        footerTitle: "Montant des factures",
        footerDescription: "Documents émis",
      },
      {
        title: "Encaissé",
        value: formatDZD(invoiceStats.collected),
        change: invoiceStats.collected > 0 ? 100 : 0,
        changeLabel: "recettes confirmées",
        tone: "positive",
        trend: "up",
        detailRow: "Règlements reçus · Reçus sans litige",
        footerTitle: "Paiements reçus",
        footerDescription: "Règlements reçus",
      },
      {
        title: "Solde ouvert",
        value: formatDZD(invoiceStats.balance),
        badge: invoiceStats.balance > 0 ? "À recouvrer" : "Soldé",
        tone: invoiceStats.balance > 0 ? "watch" : "positive",
        trend: invoiceStats.balance > 0 ? "down" : "neutral",
        detailRow:
          invoiceStats.balance > 0
            ? "Créances ouvertes · Règlements attendus"
            : "Toutes les factures sont acquittées",
        footerTitle: "Reste à recouvrer",
        footerDescription: "Créances ouvertes",
      },
      {
        title: "En retard",
        value: formatDZD(invoiceStats.overdue),
        badge: invoiceStats.overdue > 0 ? "Impayés" : "0 retard",
        tone: invoiceStats.overdue > 0 ? "critical" : "positive",
        trend: invoiceStats.overdue > 0 ? "down" : "neutral",
        detailRow:
          invoiceStats.overdue > 0
            ? "Échéances dépassées · Relance propriétaire requise"
            : "Aucun retard de paiement à déplorer",
        footerTitle: "Échéances dépassées",
        footerDescription: "Retards de paiement",
      },
    ];
  }, [invoiceStats, invoices.length]);

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
        if (
          journalCategory !== "all" &&
          transaction.category !== journalCategory
        ) {
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
        if (
          journalMinAmount &&
          (!Number.isFinite(minAmount) || amount < minAmount)
        ) {
          return false;
        }
        if (
          journalMaxAmount &&
          (!Number.isFinite(maxAmount) || amount > maxAmount)
        ) {
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
        return (
          direction *
          (new Date(left.date).getTime() - new Date(right.date).getTime())
        );
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

  const invoicePageCount = Math.max(
    1,
    Math.ceil(filteredInvoices.length / pageSize)
  );
  const journalPageCount = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize)
  );
  const paginatedInvoices = useMemo(
    () =>
      filteredInvoices.slice(
        (invoicePage - 1) * pageSize,
        invoicePage * pageSize
      ),
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

  const openInvoiceDetail = async (invoice: Invoice, editPrices = false) => {
    setEditingInvoicePrices(false);
    setInvoicePrices({});
    setIsDetailLoading(true);
    try {
      const detail = await billingService.getInvoice(invoice.id);
      if (!detail) {
        toast.error("Cette facture est introuvable.");
        return;
      }
      setSelectedInvoice(detail);
      if (editPrices && detail.documentStatus === "draft") {
        setInvoicePrices(Object.fromEntries(detail.lines.map((line) => [line.id, priceInput(line.unitAmount)])));
        setEditingInvoicePrices(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible d’ouvrir cette facture.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const getClinicSnapshot = getInvoiceSettings;

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
            dueAt: invoiceDraft.dueAt ? `${invoiceDraft.dueAt}T23:59:59` : null,
            lines,
            notes: invoiceDraft.notes,
            ownerId: invoiceDraft.ownerId,
            patientId: invoiceDraft.patientId || null,
            appointmentId: invoiceDraft.appointmentId || null,
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

  const startEditingInvoicePrices = () => {
    if (!selectedInvoice || selectedInvoice.documentStatus !== "draft" || isSubmitting) return;
    setInvoicePrices(Object.fromEntries(selectedInvoice.lines.map((line) => [line.id, priceInput(line.unitAmount)])));
    setEditingInvoicePrices(true);
  };
  const saveInvoicePrices = async () => {
    if (!selectedInvoice || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const lines = draftPriceLines(selectedInvoice, invoicePrices);
      const saved = await billingService.updateInvoiceDraft({ invoiceId: selectedInvoice.id, lines, actor });
      setSelectedInvoice((current) => current?.id === saved.id ? saved : current);
      setEditingInvoicePrices(false);
      toast.success("Tarifs enregistrés. Le total de la facture a été recalculé.");
      await loadInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Les tarifs n’ont pas pu être enregistrés.");
    } finally { setIsSubmitting(false); }
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

  /** I1 : l'émission fige la facture et lui attribue un numéro officiel. */
  const requestIssueInvoice = (invoice: Invoice) => {
    if (editingInvoicePrices && selectedInvoice?.id === invoice.id) {
      toast.error("Enregistrez ou annulez vos modifications avant d’émettre la facture.");
      return;
    }
    setIssueConfirmTarget(invoice);
  };
  const confirmIssueInvoice = async () => {
    if (!issueConfirmTarget) {
      return;
    }
    setIssueConfirmTarget(null);
    await issueExistingInvoice(issueConfirmTarget);
  };

  /** B2 : annuler une facture émise par erreur (sans paiements). */
  const requestVoidInvoice = (invoice: Invoice) => {
    setVoidReason("");
    setVoidTarget(invoice);
  };
  const confirmVoidInvoice = async () => {
    if (!voidTarget) {
      return;
    }
    if (!voidReason.trim()) {
      toast.error("Indiquez le motif de l'annulation.");
      return;
    }
    setIsSubmitting(true);
    try {
      await billingService.voidInvoice({
        actor,
        invoiceId: voidTarget.id,
        reason: voidReason.trim(),
      });
      toast.success("Facture annulée.");
      setVoidTarget(null);
      setVoidReason("");
      await loadInvoices();
      if (selectedInvoice?.id === voidTarget.id) {
        const detail = await billingService.getInvoice(voidTarget.id);
        setSelectedInvoice(detail);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d’annuler la facture."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /** I11 : supprimer un brouillon abandonné (jamais émis). */
  const requestDeleteInvoiceDraft = (invoice: Invoice) => {
    setDeleteDraftTarget(invoice);
  };
  const confirmDeleteInvoiceDraft = async () => {
    if (!deleteDraftTarget) {
      return;
    }
    setIsSubmitting(true);
    try {
      await billingService.deleteInvoiceDraft({
        actor,
        invoiceId: deleteDraftTarget.id,
      });
      toast.success("Brouillon de facture supprimé.");
      setDeleteDraftTarget(null);
      await loadInvoices();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le brouillon."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentDialog = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentOperationId(createUuid());
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
  return {
    activeTab,
    editingTransaction,
    filteredInvoices,
    filteredTransactions,
    financeSectionCards,
    invoiceAdvancedOpen,
    invoiceDocumentFilter,
    invoiceDraft,
    invoiceError,
    invoiceFilterCount,
    invoiceFrom,
    invoicePage,
    invoicePageCount,
    invoiceQuery,
    invoiceSettlementFilter,
    invoiceTo,
    invoicesLoading,
    isDetailLoading,
    isInvoiceDialogOpen,
    isSubmitting,
    isTransactionDialogOpen,
    issueConfirmTarget,
    issueExistingInvoice,
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
    paginatedInvoices,
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
    setInvoiceAdvancedOpen,
    setInvoiceDocumentFilter,
    setInvoiceDraft,
    setInvoiceFrom,
    setInvoicePage,
    setInvoiceQuery,
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
  };
}

export type FinancesViewProps = ReturnType<typeof useFinancesPageModel>;
