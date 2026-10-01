import { beforeEach, describe, expect, it, vi } from "vitest";
const store = vi.hoisted(() => ({ values: new Map<string, string>(), save: vi.fn() }));
vi.mock("@/services/appSettingsService", () => ({ getSetting: async (key: string) => store.values.get(key) ?? null, setSettings: store.save }));
import { DEFAULT_INVOICE_SETTINGS, getInvoiceSettings, saveInvoiceSettings } from "@/services/invoiceSettingsService";
beforeEach(() => { store.values.clear(); store.save.mockReset(); store.save.mockImplementation(async (values: Record<string,string>) => { Object.entries(values).forEach(([key, value]) => store.values.set(key,value)); }); });
describe("cabinet invoice settings", () => {
  it("keeps the existing cabinet identity when no custom model exists", async () => {
    store.values.set("cabinet_name", "Cabinet existant");
    expect((await getInvoiceSettings()).name).toBe("Cabinet existant");
  });
  it("saves the model and all existing cabinet-name keys together", async () => {
    await saveInvoiceSettings({ ...DEFAULT_INVOICE_SETTINGS, name: " Jardin ", address: " Alger ", footer: "", accent: "forest" });
    expect(store.save).toHaveBeenCalledOnce();
    expect(store.values.get("clinic_name")).toBe("Jardin");
    expect(store.values.get("practice_name")).toBe("Jardin");
    expect(await getInvoiceSettings()).toMatchObject({ name: "Jardin", address: "Alger", footer: "", accent: "forest" });
  });
  it("does not overwrite a stored model that could not be read", async () => {
    store.values.set("invoice_settings_v1", "broken json");
    await expect(getInvoiceSettings()).rejects.toThrow();
    expect(store.save).not.toHaveBeenCalled();
    await expect(saveInvoiceSettings(DEFAULT_INVOICE_SETTINGS)).rejects.toThrow("nom du cabinet");
  });
});
