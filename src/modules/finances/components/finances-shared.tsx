import { Calendar01Icon } from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { fr } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

import type {
  BillingDocumentStatus,
  Invoice,
  InvoiceSettlementStatus,
  Owner,
  Patient,
  Transaction,
  TransactionPaymentMethod,
} from "@/types/db";

export type FinanceTab = "invoices" | "journal";

export type TransactionFilter = "all" | "income" | "expense";

export type InvoiceDocumentFilter = "all" | BillingDocumentStatus;

export type InvoiceSettlementFilter = "all" | InvoiceSettlementStatus;

export type TransactionStatusFilter = "all" | Transaction["status"];

export type TransactionSourceFilter = "all" | "billing" | "manual";

export type TransactionSort =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc";

export interface InvoiceLineDraft {
  description: string;
  id: string;
  quantity: string;
  unitAmount: string;
}

export interface InvoiceDraft {
  appointmentId?: string;
  createdInvoiceId?: string;
  dueAt: string;
  lines: InvoiceLineDraft[];
  notes: string;
  ownerId: string;
  patientId: string;
}

export interface PaymentDraft {
  amount: string;
  method: TransactionPaymentMethod;
  reference: string;
}

export interface TransactionDraft {
  amount: string;
  category: string;
  date: string;
  description: string;
  method: TransactionPaymentMethod;
  status: Transaction["status"];
  type: Transaction["type"];
}

export const PAYMENT_METHODS: Array<{
  label: string;
  value: TransactionPaymentMethod;
}> = [
  { label: "Espèces", value: "cash" },
  { label: "Carte", value: "card" },
  { label: "Virement", value: "bank_transfer" },
  { label: "Chèque", value: "check" },
  { label: "Autre", value: "other" },
];

export const PAYMENT_METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
) as Record<TransactionPaymentMethod, string>;

export const DOCUMENT_STATUS_META: Record<
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

export const SETTLEMENT_STATUS_META: Record<
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
    className: "bg-frame text-violet-700 dark:text-violet-300",
    label: "Créditée",
  },
};

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function createInvoiceLine(): InvoiceLineDraft {
  return {
    description: "",
    id: crypto.randomUUID(),
    quantity: "1",
    unitAmount: "",
  };
}

export function createInvoiceDraft(): InvoiceDraft {
  return {
    dueAt: todayInputValue(),
    lines: [createInvoiceLine()],
    notes: "",
    ownerId: "",
    patientId: "",
  };
}

export function createTransactionDraft(): TransactionDraft {
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

export function formatDate(value?: string | null) {
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

export function isDateInRange(
  value: string | null | undefined,
  from: string,
  to: string
) {
  if (!value) {
    return false;
  }
  const date = value.slice(0, 10);
  return (!from || date >= from) && (!to || date <= to);
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string) {
  if (!value) {
    return undefined;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  return new Date(year, month - 1, day);
}

export function DateFilter({
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
        <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} />
        {label}
      </span>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              aria-label={label}
              className="list-filter-control h-[30px] w-full justify-between rounded-full bg-background px-2.5 text-xs font-normal"
              variant="outline"
            >
              <span className={cn(!value && "text-muted-foreground")}>
                {value ? formatDate(value) : "Toutes les dates"}
              </span>
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} />
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

export function getInvoiceDisplayName(invoice: Invoice) {
  return invoice.number ?? `Brouillon ${invoice.id.slice(0, 8)}`;
}

export function documentBadge(status: BillingDocumentStatus) {
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

export function settlementBadge(status: InvoiceSettlementStatus | null) {
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

export function getInvoiceOwnerName(invoice: Invoice, owners: Owner[]) {
  if (invoice.ownerSnapshot) {
    return `${invoice.ownerSnapshot.firstName} ${invoice.ownerSnapshot.lastName}`;
  }
  const owner = owners.find((candidate) => candidate.id === invoice.ownerId);
  return owner ? `${owner.firstName} ${owner.lastName}` : "Propriétaire";
}

export function getInvoicePatientName(invoice: Invoice, patients: Patient[]) {
  if (!invoice.patientId) {
    return null;
  }
  return (
    patients.find((patient) => patient.id === invoice.patientId)?.name ??
    "Patient non renseigné"
  );
}

export function getInvoiceDueLabel(invoice: Invoice) {
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
