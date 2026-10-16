import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "admin" as string | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: state.role ? { id: "user", role: state.role } : null }) }));
vi.mock("@/services/localDataReset", () => ({ RESET_CONFIRMATION: "RÉINITIALISER", resetLocalData: vi.fn() }));
import { LocalDataResetSettings } from "@/components/local-data-reset-settings";
describe("reset settings visibility", () => {
  it("exposes a clearly named reset section for administrators", () => { state.role = "admin"; const html = renderToStaticMarkup(createElement(LocalDataResetSettings)); expect(html).toContain('aria-label="Réinitialisation"'); expect(html).toContain("Réinitialiser"); });
  it.each([null, "vet_adjoint", "vet_principal", "assistant", "stagiaire"])("hides reset controls for %s", role => { state.role = role; expect(renderToStaticMarkup(createElement(LocalDataResetSettings))).toBe(""); });
});
