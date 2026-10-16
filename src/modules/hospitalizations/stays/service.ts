import { generateId, runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { createStayStore } from "./store";
export const staysService = createStayStore({ read: runDbRead, transaction: runDbTransaction }, generateId);
