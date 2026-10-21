import { describe, expect, it } from "vitest";
import type { Appointment } from "@/types/db";
import { estimateQueue } from "@/modules/dashboard/model/clinical-dashboard";
import type { ScheduleEntry } from "@/modules/dashboard/v2/model";

const at = (time: string) => new Date(`2026-10-21T${time}:00`);
const entry = (id: string, status: Appointment["status"], start: string, end: string): ScheduleEntry => ({
  appointment: { id, status } as Appointment,
  start: at(start),
  end: at(end),
  patientName: id,
  ownerName: "",
  species: "Chien",
});

describe("estimation de la salle d'attente", () => {
  it("fait passer chaque patient après la consultation en cours, à la suite des créneaux", () => {
    const current = entry("Simba", "in_progress", "10:15", "11:00");
    const nala = entry("Nala", "waiting", "10:30", "11:00");
    const rex = entry("Rex", "arrived", "10:45", "11:00");
    const queue = estimateQueue([current, nala, rex], [nala, rex], at("10:40"));
    expect(queue.map((row) => [row.entry.patientName, row.position, row.estimatedAt.toTimeString().slice(0, 5)])).toEqual([
      ["Nala", 1, "11:00"],
      ["Rex", 2, "11:30"],
    ]);
  });

  it("part de maintenant quand personne n'est en consultation ou que le créneau est dépassé", () => {
    const late = entry("Simba", "in_progress", "09:00", "09:30");
    const nala = entry("Nala", "waiting", "10:30", "10:30");
    const queue = estimateQueue([late, nala], [nala], at("10:40"));
    expect(queue[0].estimatedAt.toTimeString().slice(0, 5)).toBe("10:40");
    expect(estimateQueue([], [], at("10:40"))).toEqual([]);
  });

  it("compte au moins cinq minutes pour un créneau sans durée", () => {
    const a = entry("A", "waiting", "10:00", "10:00");
    const b = entry("B", "waiting", "10:05", "10:05");
    const queue = estimateQueue([a, b], [a, b], at("10:40"));
    expect(queue[1].estimatedAt.toTimeString().slice(0, 5)).toBe("10:45");
  });
});
