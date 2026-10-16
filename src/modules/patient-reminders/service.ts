import { generateId, runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { createPatientReminderStore } from "./store";
export const patientRemindersService = createPatientReminderStore({read: runDbRead, transaction: runDbTransaction},generateId);
