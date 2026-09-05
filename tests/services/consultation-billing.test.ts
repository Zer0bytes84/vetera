import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  payments: [] as Array<Record<string, unknown>>,
  add: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/hooks/useSQLite", () => ({
  useSQLite: (table: string) => ({
    data: table === "appointments" ? [{ id: "visit-1", patientId: "p1", title: "Consultation", status: "completed" }] : [],
    update: state.update,
    add: state.add,
  }),
}));
vi.mock("@/services/browser-store", () => ({
  isTauriRuntime: () => false,
  getBrowserTable: () => state.payments,
}));
import { useAppointmentsRepository } from "@/data/repositories";

beforeEach(() => {
  state.payments = [];
  state.update.mockReset().mockResolvedValue(true);
  state.add.mockReset().mockImplementation(async (payment) => {
    state.payments.push(payment);
    return payment;
  });
});

describe("consultation payment retries", () => {
  const input = { appointmentId: "visit-1", items: [{ desc: "Consultation", amount: 4200 }] };
  it("records one payment even when the same confirmation is retried", async () => {
    const repository = useAppointmentsRepository();
    const first = await repository.completeWithBilling(input);
    const retry = await repository.completeWithBilling(input);
    expect(state.add).toHaveBeenCalledTimes(1);
    expect(first.totalAmount).toBe(420000);
    expect(retry.invoiceNumber).toBe(first.invoiceNumber);
  });
  it("does not report success when recording the payment fails", async () => {
    state.add.mockRejectedValueOnce(new Error("Écriture impossible"));
    await expect(useAppointmentsRepository().completeWithBilling(input)).rejects.toThrow("Écriture impossible");
    expect(state.payments).toHaveLength(0);
  });
  it("rejects a changed amount after payment instead of charging again", async () => {
    const repository = useAppointmentsRepository();
    await repository.completeWithBilling(input);
    await expect(repository.completeWithBilling({ ...input, items: [{ desc: "Consultation", amount: 4500 }] })).rejects.toThrow("autre montant");
    expect(state.add).toHaveBeenCalledTimes(1);
  });
});
