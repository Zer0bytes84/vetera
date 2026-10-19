import { generateId, runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { createRoomStore } from "./store";

export const roomsService = createRoomStore({ read: runDbRead, transaction: runDbTransaction }, generateId);
