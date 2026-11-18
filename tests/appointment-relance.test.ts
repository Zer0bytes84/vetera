import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canRelance,
  canRelanceFromAgenda,
  isMissedRelanceDue,
  isRelanceDue,
  MISSED_RELANCE_DAYS,
  nextRelanceChange,
  RELANCE_MINUTES_BEFORE,
  relanceKind,
} from "../src/lib/appointment-relance";
import {
  appointmentMessage,
  missedAppointmentMessage,
  WHATSAPP_APP_LINK,
  whatsAppLink,
} from "../src/lib/whatsapp";
import type { AppointmentStatus } from "../src/types/db";

// Built from local time, as the Agenda shows it.
const START = new Date(2026, 10, 18, 14, 30);
const at = (minutesFromStart: number, seconds = 0) =>
  new Date(START.getTime() + minutesFromStart * 60_000 + seconds * 1000);
const rex = (status: AppointmentStatus = "scheduled") => ({
  startTime: START.toISOString(),
  status,
});

describe("relance du rendez-vous : elle remonte 1 heure avant et reste jusqu’à l’heure", () => {
  it("une heure exactement", () => {
    expect(RELANCE_MINUTES_BEFORE).toBe(60);
  });

  it.each([
    [-61, 0, false],
    [-60, -1, false],
    [-60, 0, true],
    [-59, 0, true],
    [-30, 0, true],
    [-1, 0, true],
    [0, -1, true],
    [0, 0, false],
    [15, 0, false],
  ])("à %i min %i s de l’heure : %s", (minutes, seconds, due) => {
    expect(isRelanceDue(rex(), at(minutes, seconds))).toBe(due);
  });

  it.each([
    ["scheduled", true],
    ["confirmed", true],
    ["arrived", false],
    ["waiting", false],
    ["in_progress", false],
    ["completed", false],
    ["cancelled", false],
    ["no_show", false],
  ] as const)("statut %s : relance %s", (status, expected) => {
    expect(canRelance(status)).toBe(expected);
    expect(isRelanceDue(rex(status), at(-30))).toBe(expected);
  });

  it("une heure illisible ne remonte jamais", () => {
    expect(
      isRelanceDue({ startTime: "pas une date", status: "scheduled" }, at(-30))
    ).toBe(false);
    expect(
      nextRelanceChange([{ startTime: "", status: "scheduled" }], at(-30))
    ).toBeNull();
  });
});

describe("déclenchement : la page relit l’horloge exactement quand une relance remonte ou s’en va", () => {
  it("attend jusqu’à 1 heure avant, puis jusqu’à l’heure, puis plus rien", () => {
    expect(nextRelanceChange([rex()], at(-90))).toBe(30 * 60_000);
    expect(nextRelanceChange([rex()], at(-60, -1))).toBe(1000);
    expect(nextRelanceChange([rex()], at(-60))).toBe(60 * 60_000);
    expect(nextRelanceChange([rex()], at(-1))).toBe(60_000);
    // From the hour, the next change is the end of the missed-visit week.
    expect(nextRelanceChange([rex()], at(0))).toBe(7 * 24 * 60 * 60_000);
    expect(nextRelanceChange([rex()], at(7 * 24 * 60))).toBeNull();
  });

  it("prend la prochaine échéance de tous les rendez-vous, et ignore ceux qu’on ne relance pas", () => {
    const later = {
      startTime: at(45).toISOString(),
      status: "confirmed" as const,
    };
    const cancelled = {
      startTime: at(-5).toISOString(),
      status: "cancelled" as const,
    };
    // Rex opens at -60, the later one at -15, the cancelled one never.
    expect(nextRelanceChange([later, cancelled, rex()], at(-70))).toBe(
      10 * 60_000
    );
    expect(nextRelanceChange([later, cancelled, rex()], at(-20))).toBe(
      5 * 60_000
    );
  });

  it("en suivant ces attentes depuis 9 h, la relance apparaît à 13 h 30 pile et disparaît à 14 h 30", () => {
    const appointments = [rex()];
    let now = new Date(2026, 10, 18, 9, 0);
    const seen: string[] = [];
    let due = isRelanceDue(appointments[0], now);
    for (let wakes = 0; wakes < 10; wakes++) {
      const wait = nextRelanceChange(appointments, now);
      if (wait === null) {
        break;
      }
      now = new Date(now.getTime() + wait);
      const nowDue = isRelanceDue(appointments[0], now);
      if (nowDue !== due) {
        seen.push(
          `${nowDue ? "apparaît" : "disparaît"} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
        );
        due = nowDue;
      }
    }
    expect(seen).toEqual(["apparaît 13:30:00", "disparaît 14:30:00"]);
  });
});

describe("message de relance : animal, date et heure, ton courtois", () => {
  it("le texte", () => {
    expect(appointmentMessage({ animal: " Rex ", start: START })).toBe(
      "Bonjour,\n\nNous vous rappelons le rendez-vous de Rex le mercredi 18 novembre 2026 à 14 h 30.\nEn cas d’empêchement, merci de nous prévenir.\n\nÀ bientôt."
    );
  });

  it("une heure pile s’écrit « 9 h », le premier du mois « 1er »", () => {
    expect(
      appointmentMessage({ animal: "Zoé", start: new Date(2026, 11, 1, 9, 0) })
    ).toContain("le mardi 1er décembre 2026 à 9 h.");
    expect(
      appointmentMessage({ animal: "Zoé", start: new Date(2026, 11, 11, 8, 5) })
    ).toContain("le vendredi 11 décembre 2026 à 8 h 05.");
  });

  it("dans le lien whatsapp://, encodé, et accepté par les deux gardes", () => {
    const message = appointmentMessage({
      animal: "Zoé l’Écureuil",
      start: START,
    });
    const link = whatsAppLink("0555 12 34 56", message) ?? "";
    expect(link.startsWith("whatsapp://send?phone=213555123456&text=")).toBe(
      true
    );
    expect(new URL(link).searchParams.get("text")).toBe(message);
    expect(link).toMatch(WHATSAPP_APP_LINK);
    const shellOpen = (
      JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
        plugins: { shell: { open: string } };
      }
    ).plugins.shell.open;
    expect(link).toMatch(new RegExp(`^${shellOpen}$`));
  });
});

const DAY = 24 * 60;

describe("rendez-vous manqué : dépassé sans être marqué arrivé, ou marqué absent", () => {
  it("une semaine", () => {
    expect(MISSED_RELANCE_DAYS).toBe(7);
  });

  it.each([
    ["scheduled", -1, "before"],
    ["scheduled", 0, "missed"],
    ["confirmed", 0, "missed"],
    ["scheduled", 90, "missed"],
    ["scheduled", 7 * DAY - 1, "missed"],
    ["scheduled", 7 * DAY, null],
    ["no_show", -120, "missed"],
    ["no_show", 30, "missed"],
    ["no_show", 7 * DAY - 1, "missed"],
    ["no_show", 7 * DAY, null],
    ["arrived", 30, null],
    ["waiting", 30, null],
    ["in_progress", 30, null],
    ["completed", 30, null],
    ["cancelled", 30, null],
  ] as const)("%s à %i min de l’heure : %s", (status, minutes, kind) => {
    expect(relanceKind(rex(status), at(minutes))).toBe(kind);
    expect(isMissedRelanceDue(rex(status), at(minutes))).toBe(
      kind === "missed"
    );
  });

  it("le menu de l’Agenda propose la relance pour un rendez-vous à venir ou absent, pas pour un arrivé ou annulé", () => {
    expect(canRelanceFromAgenda("scheduled")).toBe(true);
    expect(canRelanceFromAgenda("confirmed")).toBe(true);
    expect(canRelanceFromAgenda("no_show")).toBe(true);
    expect(canRelanceFromAgenda("arrived")).toBe(false);
    expect(canRelanceFromAgenda("cancelled")).toBe(false);
    expect(canRelanceFromAgenda("completed")).toBe(false);
  });

  it("en suivant les attentes de la page, Rex passe de « dans l’heure » à « manqué » à 14:30:00 pile", () => {
    let now = new Date(2026, 10, 18, 9, 0);
    let kind = relanceKind(rex(), now);
    const seen: string[] = [];
    for (let wakes = 0; wakes < 10; wakes++) {
      const wait = nextRelanceChange([rex()], now);
      if (wait === null) {
        break;
      }
      now = new Date(now.getTime() + wait);
      const next = relanceKind(rex(), now);
      if (next !== kind) {
        seen.push(
          `${next ?? "rien"} le ${now.getDate()} à ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
        );
        kind = next;
      }
    }
    expect(seen).toEqual([
      "before le 18 à 13:30:00",
      "missed le 18 à 14:30:00",
      "rien le 25 à 14:30:00",
    ]);
  });

  it("le message : l’animal, la date et l’heure, et la proposition d’un nouveau rendez-vous", () => {
    expect(missedAppointmentMessage({ animal: " Rex ", start: START })).toBe(
      "Bonjour,\n\nNous n’avons pas vu Rex au rendez-vous prévu le mercredi 18 novembre 2026 à 14 h 30.\nSouhaitez-vous fixer un nouveau rendez-vous\u00a0?\n\nÀ bientôt."
    );
    const link =
      whatsAppLink(
        "0555 12 34 56",
        missedAppointmentMessage({ animal: "Zoé l’Écureuil", start: START })
      ) ?? "";
    expect(link).toMatch(WHATSAPP_APP_LINK);
    expect(new URL(link).searchParams.get("phone")).toBe("213555123456");
  });
});
