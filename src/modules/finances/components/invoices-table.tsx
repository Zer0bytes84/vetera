import { ArrowRight, FileText, MoreHorizontal } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataColumn,
  type DataRow,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { IconButton, QuietButton } from "@/components/ui/tuff-controls";
import { formatDZD } from "@/utils/currency";
import type {
  BillingDocumentStatus,
  Invoice,
  InvoiceSettlementStatus,
  Owner,
  Patient,
} from "@/types/db";
import {
  DOCUMENT_STATUS_META,
  SETTLEMENT_STATUS_META,
  formatDate,
  getInvoiceDisplayName,
  getInvoiceDueLabel,
  getInvoiceOwnerName,
  getInvoicePatientName,
} from "@/modules/finances/components/finances-shared";

/**
 * The invoice register as TuffUI's Data Table: sortable columns, the filter field, pages, a selection, a CSV export, the
 * situation as pills (the document, then the settlement). Each row opens the invoice; its main action sits at the end
 * (Émettre, Régler), the others behind the « … » menu.
 */

interface InvoiceRow extends DataRow {
  invoice: string;
  owner: string;
  situation: string;
  due: string;
  amount: number;
  balance: number;
  actions: string;
}

const DOCUMENT_TONE: Record<BillingDocumentStatus, StatusTone> = {
  draft: "neutral",
  issued: "brand",
  void: "negative",
};
const SETTLEMENT_TONE: Record<InvoiceSettlementStatus, StatusTone> = {
  open: "warning",
  partial: "warning",
  paid: "positive",
  overdue: "negative",
  credited: "neutral",
};

export function InvoicesTable({
  invoices,
  owners,
  patients,
  filters,
  toolbar,
  busy,
  detailLoading,
  listRef,
  onOpen,
  onEditPrices,
  onIssue,
  onDeleteDraft,
  onPay,
  onVoid,
}: {
  invoices: Invoice[];
  owners: Owner[];
  patients: Patient[];
  filters: ReactNode;
  toolbar?: ReactNode;
  busy: boolean;
  detailLoading: boolean;
  listRef: Ref<HTMLDivElement>;
  onOpen: (invoice: Invoice) => void;
  onEditPrices: (invoice: Invoice) => void;
  onIssue: (invoice: Invoice) => void;
  onDeleteDraft: (invoice: Invoice) => void;
  onPay: (invoice: Invoice) => void;
  onVoid: (invoice: Invoice) => void;
}) {
  const byId = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const rows: InvoiceRow[] = invoices.map((invoice) => ({
    id: invoice.id,
    invoice: getInvoiceDisplayName(invoice),
    owner: getInvoiceOwnerName(invoice, owners),
    situation: [
      DOCUMENT_STATUS_META[invoice.documentStatus].label,
      invoice.settlementStatus
        ? SETTLEMENT_STATUS_META[invoice.settlementStatus].label
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
    due: getInvoiceDueLabel(invoice),
    amount: invoice.grossAmount,
    balance: invoice.balanceAmount,
    actions: "",
  }));

  const columns: DataColumn<InvoiceRow>[] = [
    {
      key: "invoice",
      label: "Facture",
      sortable: true,
      format: (_, row) => {
        const invoice = byId.get(row.id)!;
        return (
          <span className="block">
            <span className="block text-sm font-medium tabular-nums">
              {row.invoice}
            </span>
            <span className="block text-[0.8125rem] text-muted-foreground">
              {formatDate(invoice.issuedAt ?? invoice.createdAt)}
            </span>
          </span>
        );
      },
    },
    {
      key: "owner",
      label: "Dossier",
      sortable: true,
      format: (_, row) => {
        const patientName = getInvoicePatientName(byId.get(row.id)!, patients);
        return (
          <span className="block max-w-56">
            <span className="block truncate text-sm">{row.owner}</span>
            {patientName ? (
              <span className="block truncate text-[0.8125rem] text-muted-foreground">
                Patient · {patientName}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "situation",
      label: "Situation",
      sortable: true,
      priority: 1,
      format: (_, row) => {
        const invoice = byId.get(row.id)!;
        return (
          <span className="flex flex-wrap gap-1">
            <StatusPill size="sm" tone={DOCUMENT_TONE[invoice.documentStatus]}>
              {DOCUMENT_STATUS_META[invoice.documentStatus].label}
            </StatusPill>
            {invoice.settlementStatus && (
              <StatusPill
                size="sm"
                tone={SETTLEMENT_TONE[invoice.settlementStatus]}
              >
                {SETTLEMENT_STATUS_META[invoice.settlementStatus].label}
              </StatusPill>
            )}
          </span>
        );
      },
    },
    {
      key: "due",
      label: "Échéance",
      priority: 2,
      format: (value, row) => (
        <span
          className={
            byId.get(row.id)!.settlementStatus === "overdue"
              ? "font-medium text-negative"
              : "text-muted-foreground"
          }
        >
          {String(value)}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Montant",
      align: "right",
      sortable: true,
      priority: 2,
      format: (value) => (
        <span className="font-sans text-[0.8125rem] font-medium">
          {formatDZD(Number(value))}
        </span>
      ),
    },
    {
      key: "balance",
      label: "À recouvrer",
      align: "right",
      sortable: true,
      priority: 1,
      format: (value, row) => {
        const invoice = byId.get(row.id)!;
        return (
          <span
            className={`font-sans text-[0.8125rem] font-medium ${Number(value) > 0 ? (invoice.settlementStatus === "overdue" ? "text-negative" : "text-warning") : "text-positive"}`}
          >
            {Number(value) > 0 ? formatDZD(Number(value)) : "Soldé"}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      hideLabel: true,
      noExport: true,
      priority: 1,
      format: (_, row) => {
        const invoice = byId.get(row.id)!;
        const draft = invoice.documentStatus === "draft";
        const issued = invoice.documentStatus === "issued";
        return (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            {draft && (
              <QuietButton disabled={busy} onClick={() => onIssue(invoice)}>
                Émettre
              </QuietButton>
            )}
            {issued && invoice.balanceAmount > 0 && (
              <Button
                className="rounded-full px-4"
                onClick={() => onPay(invoice)}
                size="sm"
              >
                Régler
              </Button>
            )}
            {(draft || issued) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      aria-label="Autres actions"
                      className="rounded-full"
                      size="icon-sm"
                      variant="ghost"
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {draft && (
                    <DropdownMenuItem
                      disabled={busy}
                      onClick={() => onEditPrices(invoice)}
                    >
                      Modifier les tarifs
                    </DropdownMenuItem>
                  )}
                  {draft && (
                    <DropdownMenuItem
                      disabled={busy}
                      onClick={() => onDeleteDraft(invoice)}
                      variant="destructive"
                    >
                      Supprimer le brouillon
                    </DropdownMenuItem>
                  )}
                  {issued && (
                    <DropdownMenuItem
                      disabled={busy}
                      onClick={() => onVoid(invoice)}
                      variant="destructive"
                    >
                      Annuler la facture
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <IconButton
              disabled={detailLoading}
              icon={ArrowRight}
              label={`Voir ${row.invoice}`}
              onClick={() => onOpen(invoice)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      containerRef={listRef}
      data={rows}
      emptyDescription="Créez un premier brouillon puis émettez-le lorsque son contenu est validé."
      emptyTitle="Aucune facture"
      exportName="factures"
      filters={filters}
      toolbar={toolbar}
      icon={FileText}
      noun={["facture", "factures"]}
      onRowClick={(row) => onOpen(byId.get(row.id)!)}
      pageSize={10}
      rowProps={(row) => ({
        tabIndex: 0,
        ...({ "data-list-row": "", "data-row-id": row.id } as object),
      })}
      searchPlaceholder="Numéro ou propriétaire"
      selectable
      title="Registre des factures"
    />
  );
}
