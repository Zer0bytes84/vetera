import { describe, expect, it, vi } from "vitest";
vi.mock("../../src/hooks/useSQLite", () => ({
  useSQLite: () => ({
    data: [],
    loading: false,
    isRefreshing: false,
    error: null,
    add: async () => null,
    update: async () => true,
    remove: async () => true,
    set: async () => undefined,
    refresh: async () => undefined,
  }),
}));
import * as repositories from "../../src/data/repositories";

describe("repository public contracts", () => {
  for (const [name, factory] of Object.entries(repositories)) {
    if (!name.startsWith("use") || typeof factory !== "function") continue;
    it(`${name} preserves its common store API`, () => {
      const result = (factory as () => Record<string, unknown>)();
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.loading).toBe("boolean");
      expect(typeof result.isRefreshing).toBe("boolean");
      for (const method of ["add", "update", "remove", "set", "refresh"])
        expect(typeof result[method], `${name}.${method}`).toBe("function");
    });
  }
  it("retains domain workflow methods", () => {
    expect(
      typeof repositories.useAppointmentsRepository().transitionStatus
    ).toBe("function");
    expect(
      typeof repositories.useAppointmentsRepository().completeWithBilling
    ).toBe("function");
    expect(typeof repositories.usePatientsRepository().createWithOwner).toBe(
      "function"
    );
    expect(typeof repositories.useProductsRepository().restockProduct).toBe(
      "function"
    );
    expect(typeof repositories.useTransactionsRepository().recordIncome).toBe(
      "function"
    );
  });
});
