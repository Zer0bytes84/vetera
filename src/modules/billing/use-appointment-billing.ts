import { useCallback, useState } from "react";
import { toast } from "sonner";
import { formatDinars } from "@/utils/display-format";
import { getInvoiceSettings } from "@/services/invoiceSettingsService";
import { exportInvoicePdf } from "@/lib/invoice-pdf";
import { invoiceDocument } from "@/lib/invoice-document";
import { billingService } from "@/services/billingService";
import { isTauriRuntime } from "@/services/browser-store";
import { toCentimes } from "@/utils/currency";
import { useAudit } from "@/services/use-audit";
import { useAuth } from "@/contexts/AuthContext";
import { VISIT_FLOW_CHANGED } from "@/modules/visit-flow/domain";
import { visitFlowService } from "@/modules/visit-flow/service";
import type { Appointment, Owner, Patient } from "@/types/db";
import { formatOwnerName, type BillingItem } from "@/modules/clinique/components/clinique-shared";
import type { useAppointmentsRepository } from "@/data/repositories";
import type { ExistingInvoice } from "./billing-draft";

/**
 * Billing of a visit, shared by Clinique and Flux so both bill the same way:
 * same invoice, same payment, same receipt and audit. Moved as is from the
 * Clinique page model.
 */
export function useAppointmentBilling({
  completeWithBilling,
  getOwner,
  getPatient,
}: {
  completeWithBilling: ReturnType<typeof useAppointmentsRepository>["completeWithBilling"];
  getOwner: (appointment: Appointment) => Owner | undefined;
  getPatient: (patientId: string) => Patient | undefined;
}) {
  const audit = useAudit();
  const { currentUser } = useAuth();
  const [billingAppointment, setOpenAppointment] =
    useState<Appointment | null>(null);
  const [billingInvoice, setBillingInvoice] = useState<ExistingInvoice | null>(null);

  /**
   * Opens billing for a visit. An invoice already issued and not settled is
   * read first: the dialog then shows its lines and the balance really due,
   * never an assumed amount.
   */
  const setBillingAppointment = useCallback((appointment: Appointment | null) => {
    if (!appointment) {
      setOpenAppointment(null);
      setBillingInvoice(null);
      return;
    }
    const load = isTauriRuntime()
      ? billingService.getInvoice(`appointment-invoice-${appointment.id}`).catch(() => null)
      : Promise.resolve(null);
    void load.then((invoice) => {
      setBillingInvoice(
        invoice && invoice.documentStatus === "issued" && invoice.balanceAmount > 0
          ? {
              balanceDa: invoice.balanceAmount / 100,
              grossDa: invoice.grossAmount / 100,
              lines: invoice.lines.map((line) => ({ amountDa: line.grossAmount / 100, desc: line.description })),
              number: invoice.number ?? null,
            }
          : null
      );
      setOpenAppointment(appointment);
    });
  }, []);

  const handleBillingConfirm = async (
    items: BillingItem[],
    amountReceivedDa: number
  ) => {
    if (!billingAppointment) {
      return;
    }

    try {
      const patient = getPatient(billingAppointment.patientId);
      const owner = getOwner(billingAppointment);

      const { totalAmountDa, invoiceNumber, balanceAmountDa } =
        await completeWithBilling({
          appointmentId: billingAppointment.id,
          items,
          category: "Consultation",
          method: "cash",
          amountReceivedDa,
        });

      // Settlement is complete. Close now: a PDF/save dialog must never keep
      // the payment form busy or invite a second encashment when export fails.
      setBillingAppointment(null);
      if (totalAmountDa === 0) {
        // Nothing billed on purpose: no invoice, so no receipt to export.
        if (isTauriRuntime()) {
          await visitFlowService.markNoCharge(billingAppointment.id, currentUser?.id ?? null);
          window.dispatchEvent(new Event(VISIT_FLOW_CHANGED));
        }
        toast.success("Consultation clôturée sans facture : acte gratuit.");
        void audit
          .log({
            action: "create",
            entity: "billing",
            entityId: billingAppointment.id,
            payload: { patientId: billingAppointment.patientId, itemCount: items.length, totalAmountDa: 0, noCharge: true },
          })
          .catch((error) => console.error("[Billing] Additional audit failed", error));
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(
          `vetera:consultation-start:${billingAppointment.id}`
        );
      }
      toast.success(
        balanceAmountDa > 0
          ? `Facture créée. Solde à recouvrer : ${formatDinars(balanceAmountDa)}.`
          : "Encaissement enregistré."
      );

      const exportReceipt = async () => {
        try {
          const invoice = isTauriRuntime()
            ? await billingService.getInvoice(
                `appointment-invoice-${billingAppointment.id}`
              )
            : null;
          if (isTauriRuntime() && !invoice)
            throw new Error(
              "Facture enregistrée introuvable. Réessayez depuis Finances."
            );
          const document = invoice
            ? invoiceDocument(invoice, patient?.name || "Patient")
            : {
                settings: await getInvoiceSettings(),
                data: {
                  number: invoiceNumber,
                  date: new Date(),
                  patientName: patient?.name || "Patient",
                  ownerName: formatOwnerName(owner),
                  items: items.map((item) => ({
                    description: item.desc,
                    amount: toCentimes(item.amount),
                  })),
                  totalAmount: toCentimes(totalAmountDa),
                  paidAmount: toCentimes(totalAmountDa - balanceAmountDa),
                  balanceAmount: toCentimes(balanceAmountDa),
                },
              };
          const saved = await exportInvoicePdf(
            document.data,
            document.settings
          );
          toast.success(
            saved
              ? "Facture PDF enregistrée, prête à imprimer."
              : "Encaissement conservé. Export PDF annulé."
          );
        } catch (error) {
          console.error(
            "[Billing] Receipt export failed after successful payment",
            error
          );
          toast.error(
            "Facture enregistrée, mais le PDF n’a pas pu être généré.",
            {
              action: {
                label: "Réessayer le PDF",
                onClick: () => {
                  void exportReceipt();
                },
              },
            }
          );
        }
      };
      void exportReceipt();

      void audit
        .log({
          action: "create",
          entity: "billing",
          entityId: billingAppointment.id,
          payload: {
            patientId: billingAppointment.patientId,
            itemCount: items.length,
            totalAmountDa,
            method: "cash",
          },
        })
        .catch((error) =>
          console.error("[Billing] Additional audit failed", error)
        );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de finaliser la facturation."
      );
    }
  };


  return { billingAppointment, billingInvoice, handleBillingConfirm, setBillingAppointment };
}
