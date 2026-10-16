import React from "react";
import { renderToReadableStream } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/modules/dashboard/dashboard-orbit-page", () => ({ DashboardOrbitPage: () => null }));
vi.mock("@/modules/clinique/pages/clinical-workspace", () => ({
  default: ({ initialTab = "consultations", onNavigateToPatient }: { initialTab?: string; onNavigateToPatient?: unknown }) => (
    <section data-workspace="clinical" data-tab={initialTab} data-patient-navigation={typeof onNavigateToPatient} />
  ),
}));

import { renderView } from "../../../src/app/config/view-registry";

it.each(["clinique", "soins"] as const)("la route %s ouvre l’espace clinique complet et conserve la navigation patient", async (view) => {
  const stream = await renderToReadableStream(renderView(view, {
    currentTheme: "light",
    onNavigate: vi.fn(),
    onNavigateToPatient: vi.fn(),
    onThemeChange: vi.fn(),
  }));
  await stream.allReady;
  const html = await new Response(stream).text();
  expect(html).toContain('data-workspace="clinical"');
  expect(html).toContain(`data-tab="${view === "soins" ? "soins" : "consultations"}"`);
  expect(html).toContain('data-patient-navigation="function"');
});
