import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { ManagedDocumentTemplate } from "@/modules/documents/document-domain";

const harness = vi.hoisted(() => ({
  role: "admin",
  templates: [] as ManagedDocumentTemplate[],
  loading: false,
  error: null as string | null,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: { id: "vet", role: harness.role } }),
}));
vi.mock("@/modules/documents/hooks/use-managed-documents", () => ({
  useManagedTemplates: () => ({ templates: harness.templates, loading: harness.loading, error: harness.error, refresh: async () => {} }),
}));
vi.mock("@/modules/documents/document-service", () => ({ documentsService: {} }));

import DocumentTemplateManager from "@/modules/documents/components/document-template-manager";

const template = (id: string, usageCount = 0): ManagedDocumentTemplate => ({
  id, name: id, body: "Patient : {{patient.nom}}", kind: "report", active: true,
  createdAt: "2026-10-17T12:00:00.000Z", updatedAt: "2026-10-17T12:00:00.000Z",
  createdBy: "vet", usageCount,
});
const render = () => renderToStaticMarkup(<DocumentTemplateManager />);

beforeEach(() => {
  harness.role = "admin";
  harness.templates = [template("Compte-rendu existant", 2), { ...template("Lettre de référence"), kind: "referral" }];
  harness.loading = false;
  harness.error = null;
});

it("préserve les modèles existants et expose la lettre de référence dans la liste administrable", () => {
  const html = render();
  expect(html).toContain("Compte-rendu existant");
  expect(html).toContain("Lettre de référence");
  expect(html).toContain("Nouveau modèle");
  expect(html).toContain('aria-label="Dupliquer Compte-rendu existant"');
  expect(html).toContain("Utilisé pour 2 documents");
});

it("bloque la suppression d’un modèle utilisé tout en laissant sa désactivation disponible", () => {
  const html = render();
  const usedDelete = html.match(/<button\b[^>]*aria-label="Supprimer Compte-rendu existant"[^>]*>/)?.[0];
  const unusedDelete = html.match(/<button\b[^>]*aria-label="Supprimer Lettre de référence"[^>]*>/)?.[0];
  expect(usedDelete).toContain(' disabled=""');
  expect(unusedDelete).toBeDefined();
  expect(unusedDelete).not.toContain(' disabled=""');
  expect(html).toContain('aria-label="Désactiver Compte-rendu existant"');
});

it("laisse la consultation des modèles accessible sans exposer les actions administrateur aux autres rôles", () => {
  harness.role = "vet_adjoint";
  const html = render();
  expect(html).toContain('aria-label="Consulter Compte-rendu existant"');
  expect(html).not.toContain("Nouveau modèle");
  expect(html).not.toContain('aria-label="Dupliquer');
  expect(html).not.toContain('aria-label="Supprimer');
  expect(html).not.toContain('aria-label="Désactiver');
  expect(html).toContain("Leur gestion est réservée à l’administrateur du cabinet.");
});

it("signale un échec de chargement avec une action de reprise au lieu d’afficher une liste vide trompeuse", () => {
  harness.templates = [];
  harness.error = "Base indisponible";
  const html = render();
  expect(html).toContain('role="alert"');
  expect(html).toContain("Les modèles n’ont pas pu être chargés.");
  expect(html).toContain("Réessayer");
  expect(html).not.toContain("Aucun modèle disponible.");
});

it("annonce le chargement et empêche de créer avant la disponibilité des modèles", () => {
  harness.loading = true;
  const html = render();
  expect(html).toContain("Chargement des modèles…");
  expect(html).toContain('role="status"');
  const createButton = html.match(/<button\b[^>]*>[\s\S]*?Nouveau modèle<\/button>/)?.[0];
  expect(createButton).toContain(' disabled=""');
});
