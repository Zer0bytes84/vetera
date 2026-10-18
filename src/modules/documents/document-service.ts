import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { generateId, runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { isTauriRuntime, runBrowserTablesTransaction } from "@/services/browser-store";
import { browserDocumentDatabase, createDocumentStore, sqliteDocumentPersistence, type DocumentPersistence } from "./document-store";

const browserOperation: DocumentPersistence["transaction"] = (operation) => runBrowserTablesTransaction((tables) => operation(browserDocumentDatabase(tables)));
const native = sqliteDocumentPersistence({ read: runDbRead, transaction: runDbTransaction });
const persistence: DocumentPersistence = {
  read: (operation) => isTauriRuntime() ? native.read(operation) : browserOperation(operation),
  transaction: (operation) => isTauriRuntime() ? native.transaction(operation) : browserOperation(operation),
};
const store = createDocumentStore(persistence, generateId, () => new Date(), {
  sessionToken: () => typeof window === "undefined" ? null : window.localStorage.getItem("auth_token"),
});

export const MANAGED_DOCUMENTS_CHANGED = "baitari-managed-documents-changed";
function changed() {
  if (typeof window === "undefined") return;
  for (const table of ["documents", "document_templates", "document_events", "document_versions"]) emitSQLiteDataChanged(table);
  window.dispatchEvent(new CustomEvent(MANAGED_DOCUMENTS_CHANGED));
}

/** All storage stays on this device. The store rechecks the session inside each transaction. */
export const documentsService: typeof store = {
  ...store,
  async saveTemplate(...args) { const result = await store.saveTemplate(...args); changed(); return result; },
  async deleteTemplate(...args) { await store.deleteTemplate(...args); changed(); },
  async createDraft(...args) { const result = await store.createDraft(...args); changed(); return result; },
  async updateDraft(...args) { const result = await store.updateDraft(...args); changed(); return result; },
  async finalize(...args) { const result = await store.finalize(...args); changed(); return result; },
  async cancel(...args) { await store.cancel(...args); changed(); },
  async newVersion(...args) { const result = await store.newVersion(...args); changed(); return result; },
  async importAttachment(...args) { const result = await store.importAttachment(...args); changed(); return result; },
};
