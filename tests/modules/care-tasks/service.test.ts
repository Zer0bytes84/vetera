import { beforeEach, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  select: vi.fn(),
  bill: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/services/sqlite/database", () => ({
  generateId: () => "unused",
  runDbRead: (operation: (db: { select: typeof harness.select }) => unknown) =>
    operation({ select: harness.select }),
  runDbTransaction: vi.fn(),
}));
vi.mock("@/services/billingService", () => ({
  billCompletedCareTask: harness.bill,
}));
vi.mock("sonner", () => ({ toast: { error: harness.toast } }));

import { careTasksService } from "../../../src/modules/care-tasks/service";

const savedRows = [
  { id: "done", statut: "fait", heure_prevue: "2026-10-13T12:00:00Z" },
  { id: "todo", statut: "a_faire", heure_prevue: "2026-10-13T15:00:00Z" },
];
const start = new Date("2026-10-13T00:00:00Z");
const end = new Date("2026-10-14T00:00:00Z");
beforeEach(() => {
  vi.clearAllMocks();
  harness.select.mockImplementation((sql: string) =>
    Promise.resolve(sql.includes("LEFT JOIN invoices") ? [{ id: "done" }] : savedRows),
  );
  harness.bill.mockResolvedValue({ id: "care-invoice:done" });
});

it("récupère la facturation en attente sans modifier les soins affichés", async () => {
  expect(await careTasksService.list(start, end)).toEqual(savedRows);
  expect(harness.bill).toHaveBeenCalledExactlyOnceWith("done");
  expect(harness.toast).not.toHaveBeenCalled();
});

it("garde tous les soins visibles si leur facturation échoue puis retente à la lecture suivante", async () => {
  harness.bill.mockRejectedValueOnce(new Error("Facturation indisponible"));
  await expect(careTasksService.list(start, end)).resolves.toEqual(savedRows);
  expect(harness.toast).toHaveBeenCalledTimes(1);
  expect(await careTasksService.list(start, end)).toEqual(savedRows);
  expect(harness.bill).toHaveBeenCalledTimes(2);
});

it("la panne d’un soin n’empêche pas la reprise des autres facturations", async () => {
  harness.select.mockImplementation((sql: string) =>
    Promise.resolve(sql.includes("LEFT JOIN invoices") ? [{ id: "done" }, { id: "another" }] : savedRows),
  );
  harness.bill.mockRejectedValueOnce(new Error("Échec du premier soin"));
  await expect(careTasksService.list(start, end)).resolves.toEqual(savedRows);
  expect(harness.bill.mock.calls).toEqual([["done"], ["another"]]);
});
