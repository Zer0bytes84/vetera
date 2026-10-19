import { runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { createVisitFlowStore } from "./store";

export const visitFlowService = createVisitFlowStore({ read: runDbRead, transaction: runDbTransaction });
