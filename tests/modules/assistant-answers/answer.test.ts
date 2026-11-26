import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  answerQuestion,
  proposeTasks,
  verifyAnswer,
} from "@/modules/assistant-answers/answer";
import { saveProposal } from "@/modules/assistant-answers/save-proposal";
import type { Answer } from "@/modules/assistant-answers/types";
import {
  buildPremiumAnalytics,
  dashboardPresentationData,
} from "@/modules/dashboard/model/premium-analytics";
import {
  formatDateInput,
  isDateInRange,
} from "@/modules/finances/components/finances-shared";
import { formatDinars } from "@/utils/display-format";
import { appointment, clinic, line, NOW, patient, task } from "./fixtures";

const ask = (question: string, extra = {}, patientId?: string) =>
  answerQuestion(question, clinic(extra), { now: NOW, patientId });
const money = (centimes: number) => formatDinars(centimes / 100, 2);
const asAnswer = (answer: Answer) => {
  if (answer.kind !== "answer")
    throw new Error(`refus inattendu : ${answer.text}`);
  return answer;
};

describe("catalogue fermé : quatre sujets, chiffres calculés", () => {
  it("recettes et dépenses : lignes réglées seulement, au centime, avec solde net", () => {
    const answer = asAnswer(ask("Recettes et dépenses des 30 derniers jours"));
    const figure = (id: string) =>
      answer.figures.find((entry) => entry.id === id)?.value;
    expect(figure("income")).toBe(1_950_050);
    expect(figure("expense")).toBe(312_575);
    expect(figure("net")).toBe(1_637_475);
    expect(answer.text).toContain(money(1_950_050));
    expect(answer.notes.join(" ")).toMatch(
      /1 ligne en attente n’est pas comptée/
    );
    expect(answer.table?.rows).toHaveLength(3);
  });

  it("rendez-vous : tous les rendez-vous d'un patient connu, quel que soit leur état", () => {
    const answer = asAnswer(ask("Rendez-vous de cette semaine"));
    expect(answer.figures.find((entry) => entry.id === "rows")?.value).toBe(3);
    expect(answer.text).toMatch(/1 terminé, 0 annulé, 1 absence/);
  });

  it("absences : une carte propose une tâche par absence, rien n'est écrit", () => {
    const answer = asAnswer(ask("Absences des 30 derniers jours"));
    expect(answer.proposal?.tasks).toHaveLength(1);
    expect(answer.proposal?.tasks[0].title).toContain("Rex");
    expect(answer.proposal?.subtitle).toMatch(/Rien n’est enregistré/);
  });

  it("tâches : non terminées, avec celles en retard et sans échéance", () => {
    const answer = asAnswer(ask("Tâches ouvertes"));
    expect(answer.figures.find((entry) => entry.id === "rows")?.value).toBe(3);
    expect(answer.figures.find((entry) => entry.id === "late")?.value).toBe(1);
    expect(
      asAnswer(ask("Tâches en retard")).table?.rows.map((row) => row.id)
    ).toEqual(["t1"]);
  });

  it("patients : dossiers actifs par espèce, ni décédés ni archivés", () => {
    const answer = asAnswer(
      ask("Combien de patients ?", {
        patients: [
          patient("p1", "Rex"),
          patient("p2", "Mila", "o1", { species: "Chat" }),
          patient("p3", "Nova", "o1", { status: "decede" }),
          patient("p4", "Zoé", "o1", { archivedAt: "2026-10-01T00:00:00" }),
        ],
      })
    );
    expect(answer.figures.find((entry) => entry.id === "active")?.value).toBe(
      2
    );
    expect(answer.figures.find((entry) => entry.id === "total")?.value).toBe(4);
  });

  it("la période est toujours dite, y compris par défaut", () => {
    expect(asAnswer(ask("Recettes")).notes.join(" ")).toMatch(
      /Période non précisée/
    );
    expect(asAnswer(ask("Recettes de ce mois")).notes.join(" ")).not.toMatch(
      /Période non précisée/
    );
  });
});

/** Un jeu de lignes déterministe : dates locales, montants entiers en centimes, trois statuts, deux types. */
function ledger(count: number) {
  let seed = 20261112;
  const next = () =>
    (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: count }, (_, index) => {
    const day = Math.floor(next() * 80) - 60; // de -60 à +19 jours autour de NOW
    const date = new Date(
      NOW.getFullYear(),
      NOW.getMonth(),
      NOW.getDate() + day,
      Math.floor(next() * 24),
      Math.floor(next() * 60)
    );
    const local = `${formatDateInput(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;
    return line(
      `g${index}`,
      next() < 0.35 ? "expense" : "income",
      100 + Math.floor(next() * 5_000_000),
      index % 5 === 0 ? formatDateInput(date) : local,
      { status: next() < 0.15 ? "pending" : "paid" }
    );
  });
}

describe("rapprochement au centime : l'assistant, le tableau de bord et le journal de Finances", () => {
  const transactions = ledger(400);
  const data = clinic({ transactions });
  const dashboard = buildPremiumAnalytics(
    {
      ...dashboardPresentationData({
        ...data,
        vaccinations: [],
        products: [],
        invoices: [],
      }),
      vaccinations: [],
      alerts: [],
    },
    "30d",
    NOW
  );
  const answer = asAnswer(
    answerQuestion("Recettes et dépenses des 30 derniers jours", data, {
      now: NOW,
    })
  );
  const figure = (id: string) =>
    answer.figures.find((entry) => entry.id === id)!.value;

  it("égale la carte Trésorerie du tableau de bord (recettes, dépenses, solde)", () => {
    expect(figure("income")).toBe(dashboard.cash.income);
    expect(figure("expense")).toBe(dashboard.cash.expense);
    expect(figure("net")).toBe(dashboard.cash.net);
    expect(figure("income")).toBeGreaterThan(0);
  });

  it("égale le journal de Finances : mêmes lignes réglées, filtre de dates d'`isDateInRange`", () => {
    const from = formatDateInput(answer.period!.from);
    const to = formatDateInput(answer.period!.to);
    const sum = (type: "income" | "expense") =>
      transactions
        .filter(
          (row) =>
            row.status === "paid" &&
            row.type === type &&
            isDateInRange(row.date, from, to)
        )
        .reduce((total, row) => total + row.amount, 0);
    expect(figure("income")).toBe(sum("income"));
    expect(figure("expense")).toBe(sum("expense"));
  });

  it("le tableau affiché redonne les chiffres de la phrase", () => {
    const amounts = answer.table!.rows.map((row) => Number(row.amount));
    expect(
      amounts.filter((value) => value > 0).reduce((a, b) => a + b, 0)
    ).toBe(figure("income"));
    expect(
      -amounts.filter((value) => value < 0).reduce((a, b) => a + b, 0)
    ).toBe(figure("expense"));
  });

  it("les rendez-vous et les dossiers créés égalent ceux du tableau de bord", () => {
    const a = asAnswer(
      answerQuestion("Rendez-vous des 30 derniers jours", data, { now: NOW })
    );
    expect(a.figures.find((entry) => entry.id === "rows")?.value).toBe(
      dashboard.appointments.count
    );
    expect(a.figures.find((entry) => entry.id === "completed")?.value).toBe(
      dashboard.appointments.honored
    );
    expect(a.figures.find((entry) => entry.id === "no_show")?.value).toBe(
      dashboard.appointments.missed
    );
    const p = asAnswer(
      answerQuestion("Nouveaux patients des 30 derniers jours", data, {
        now: NOW,
      })
    );
    expect(p.figures.find((entry) => entry.id === "rows")?.value ?? 0).toBe(
      dashboard.patients.newRecords
    );
  });
});

describe("garde des doses : refusée avant toute lecture", () => {
  const phrasings = [
    "Quelle dose de Rimadyl pour Rex ?",
    "dose",
    "posologie amoxicilline",
    "combien de mg de méloxicam",
    "5mg/kg pour un chien de 20 kg",
    "0,2 ml par kilo",
    "DOSE D’ANTIBIOTIQUE",
    "quel dosage de kétamine",
    "Dose ? et recettes du mois",
    "Recettes de ce mois, et la dose de Rex",
    "combien de comprimés donner",
    "à injecter combien de ml",
    "surdosage possible ?",
    "administrer 10 mg",
    "prescrire du tramadol",
    "débit de perfusion",
    "2 gouttes par jour",
    "mcg par kg",
    "µg/kg",
    "1 cp matin et soir",
    "quelle quantité d’ampoules",
    "la doses recommandée",
    "mg",
    "tâches en retard et dose de Rex",
    "rendez-vous demain, posologie de la prednisolone",
  ];
  it.each(phrasings)("« %s » est refusée comme une dose", (question) => {
    const answer = ask(question);
    expect(answer.kind).toBe("refusal");
    expect(answer.kind === "refusal" && answer.reason).toBe("dose");
  });

  it("le refus ne contient aucun chiffre et ne lit rien : même avec des données piégées", () => {
    const poison = clinic({
      transactions: new Proxy([], {
        get() {
          throw new Error("lecture interdite");
        },
      }) as never,
    });
    const answer = answerQuestion("quelle dose de rimadyl", poison, {
      now: NOW,
    });
    expect(answer.kind).toBe("refusal");
    expect(answer.text).not.toMatch(/\d/);
  });

  it("ne refuse pas à tort les questions de lecture", () => {
    for (const question of [
      "Tâches en retard",
      "Recettes de ce mois",
      "Rendez-vous de Rex",
      "Patients de l’agenda de demain",
    ]) {
      expect(ask(question).kind, question).toBe("answer");
    }
    // Priority is not a filter the engine applies (since 19 November 2026 a word it cannot apply is refused, not ignored):
    // « importantes » is not understood, and it is not taken for a dose either.
    const important = ask("Tâches importantes");
    expect(important.kind === "refusal" && important.reason).toBe("unknown");
  });
});

describe("autres refus et attaques", () => {
  it("une question qui demande de modifier est refusée ; « annulés » reste une lecture", () => {
    for (const question of [
      "Supprime les tâches",
      "annule le rendez-vous de Rex",
      "Peux-tu ajouter une tâche ?",
      "marque Rex absent",
      "DROP TABLE patients",
      "update tasks set status = 'done'",
    ]) {
      const answer = ask(question);
      expect(answer.kind === "refusal" && answer.reason, question).toBe(
        "write"
      );
    }
    expect(ask("Rendez-vous annulés ce mois").kind).toBe("answer");
  });

  it("vaccins et rappels : refusés, car leur source n'est pas lue ici", () => {
    for (const question of [
      "Vaccins en retard",
      "rappels de vaccination",
      "vermifuge à faire",
    ]) {
      const answer = ask(question);
      expect(answer.kind === "refusal" && answer.reason, question).toBe(
        "reminders"
      );
    }
  });

  it("deux sujets : l'assistant demande lequel, il ne devine pas", () => {
    const answer = ask("recettes et rendez-vous");
    expect(answer.kind === "refusal" && answer.reason).toBe("ambiguous");
  });

  it("hors catalogue, vide, « ça va ? », SQL : aucun chiffre, aucune écriture", () => {
    for (const question of [
      "",
      "   ",
      "ça va ?",
      "meilleur film de 2019",
      "'; DROP TABLE patients; --",
      "SELECT * FROM transactions",
    ]) {
      const answer = ask(question);
      expect(answer.kind, question).toBe("refusal");
      expect(answer.text).not.toMatch(/\d/);
    }
  });

  it("un patient nommé Chat, « .* » ou « ( » ne détourne pas le sujet et ne casse rien", () => {
    for (const name of ["Chat", ".*", "("]) {
      const answer = answerQuestion(
        `rendez-vous de ${name} ce mois`,
        clinic({ patients: [patient("p1", name)] }),
        { now: NOW }
      );
      expect(["answer", "refusal"]).toContain(answer.kind);
    }
    const named = ask("rendez-vous de Chat", {
      patients: [patient("p1", "Chat")],
      appointments: [],
    });
    expect(named.kind === "answer" && named.topic).toBe("appointments");
  });

  it("une question de 400 000 caractères est coupée et répond vite ; le HTML n'est jamais repris", () => {
    const started = performance.now();
    const answer = ask(
      `<img src=x onerror=alert(1)> recettes ${"a".repeat(400_000)}`
    );
    expect(performance.now() - started).toBeLessThan(1000);
    expect(JSON.stringify(answer)).not.toContain("onerror");
  });

  it("une base vide ne produit ni tableau, ni carte, ni exception", () => {
    for (const question of [
      "Recettes",
      "Rendez-vous",
      "Tâches",
      "Patients",
      "Absences",
    ]) {
      const answer = asAnswer(
        answerQuestion(
          question,
          {
            patients: [],
            owners: [],
            appointments: [],
            tasks: [],
            transactions: [],
          },
          { now: NOW }
        )
      );
      expect(answer.table, question).toBeNull();
      expect(answer.proposal).toBeNull();
    }
  });

  it("dates illisibles et montants absurdes : lignes ignorées, totaux inchangés", () => {
    const base = asAnswer(ask("Recettes de ce mois"));
    const dirty = asAnswer(
      ask("Recettes de ce mois", {
        transactions: [
          ...clinic().transactions,
          line("x1", "income", 999, "pas une date"),
          line("x2", "income", 5, "2026-02-31"),
        ],
      })
    );
    expect(dirty.figures.find((entry) => entry.id === "income")?.value).toBe(
      base.figures.find((entry) => entry.id === "income")?.value
    );
  });

  it("les objets de test « TEST ZO » sont exclus, comme sur le tableau de bord", () => {
    const answer = asAnswer(
      ask("Recettes de ce mois", {
        transactions: [
          ...clinic().transactions,
          line("z1", "income", 777_777, "2026-11-10T10:00:00", {
            description: "TEST ZO paiement",
          }),
        ],
      })
    );
    expect(answer.figures.find((entry) => entry.id === "income")?.value).toBe(
      1_950_050
    );
  });

  it("bornes de période : le premier jour compte, la veille non ; 999 jours sont ramenés à 731", () => {
    const edge = clinic({
      transactions: [
        line("e1", "income", 100, "2026-11-01T00:00:00"),
        line("e2", "income", 200, "2026-10-31T23:59:59"),
      ],
    });
    const answer = asAnswer(
      answerQuestion("Recettes du 30 derniers jours", edge, { now: NOW })
    );
    expect(answer.period?.from.getDate()).toBe(14);
    const long = asAnswer(
      answerQuestion("Recettes des 999 derniers jours", edge, { now: NOW })
    );
    expect(
      Math.round(
        (long.period!.to.getTime() - long.period!.from.getTime()) / 86_400_000
      )
    ).toBeLessThanOrEqual(731);
  });
});

describe("chaque chiffre a sa provenance", () => {
  const base = asAnswer(ask("Recettes de ce mois"));

  it("une réponse honnête passe", () => {
    expect(verifyAnswer(base).kind).toBe("answer");
  });

  it("un chiffre sans source listée est rejeté", () => {
    const orphan = {
      ...base,
      figures: base.figures.map((entry, index) =>
        index === 0 ? { ...entry, sourceId: "nulle-part" } : entry
      ),
    };
    const answer = verifyAnswer(orphan);
    expect(answer.kind === "refusal" && answer.reason).toBe("unverifiable");
  });

  it("un nombre écrit dans la phrase sans figure derrière est rejeté", () => {
    const answer = verifyAnswer({
      ...base,
      text: `${base.text} Soit 12 345 clients de plus.`,
    });
    expect(answer.kind === "refusal" && answer.reason).toBe("unverifiable");
  });

  it("une figure qui ne se retrouve pas dans le tableau affiché est rejetée", () => {
    const answer = verifyAnswer({
      ...base,
      figures: base.figures.map((entry) =>
        entry.id === "income" ? { ...entry, value: entry.value + 1 } : entry
      ),
    });
    expect(answer.kind === "refusal" && answer.reason).toBe("unverifiable");
  });

  it("un solde net qui n'est pas recettes moins dépenses est rejeté", () => {
    const both = asAnswer(ask("Recettes et dépenses de ce mois"));
    const answer = verifyAnswer({
      ...both,
      figures: both.figures.map((entry) =>
        entry.id === "net" ? { ...entry, value: entry.value + 100 } : entry
      ),
    });
    expect(answer.kind === "refusal" && answer.reason).toBe("unverifiable");
  });

  it("le moteur est en lecture seule par construction : ses imports sont ceux-ci et pas d'autres", () => {
    const imports = (file: string) =>
      [
        ...readFileSync(
          `src/modules/assistant-answers/${file}`,
          "utf8"
        ).matchAll(/from "([^"]+)"/g),
      ].map((match) => match[1]);
    const allowed = new Set([
      "@/modules/dashboard/model/premium-analytics",
      "@/modules/dashboard/v2/model",
      "@/utils/display-format",
      "@/types/db",
      "./language",
      "./period",
      "./types",
      "./vocabulary",
      "./presentation",
    ]);
    for (const file of [
      "answer.ts",
      "language.ts",
      "period.ts",
      "types.ts",
      "vocabulary.ts",
      "presentation.ts",
    ]) {
      for (const source of imports(file))
        expect(allowed.has(source), `${file} importe ${source}`).toBe(true);
    }
  });
});

describe("équipe rouge : afficher un chiffre faux ou sans source malgré les gardes", () => {
  it("un nom de patient qui ressemble à un jeton ou porte des chiffres reste du texte : rien n'est substitué", () => {
    const hostile = [patient("p1", "{income} 99"), patient("p2", "{period}")];
    const appointments = [
      appointment("h1", "p1", "2026-11-10T09:00:00", "completed"),
      appointment("h2", "p2", "2026-11-11T09:00:00", "no_show"),
    ];
    for (const name of ["{income} 99", "{period}"]) {
      const answer = asAnswer(
        answerQuestion(
          `rendez-vous de ${name} ce mois`,
          clinic({ patients: hostile, appointments }),
          { now: NOW }
        )
      );
      expect(answer.text).toContain(name);
      expect(answer.text).not.toContain("19 500");
    }
  });

  it("un montant à virgule ou illisible ne produit pas une somme fausse : la réponse est refusée, pas arrondie", () => {
    for (const amount of [12.5, Number.NaN, Number("12 DA")]) {
      const answer = ask("Recettes de ce mois", {
        transactions: [
          ...clinic().transactions,
          line("f1", "income", amount, "2026-11-10T10:00:00"),
        ],
      });
      expect(answer.kind === "refusal" && answer.reason, String(amount)).toBe(
        "unverifiable"
      );
      expect(answer.text).not.toMatch(/\d/);
    }
  });

  it("un tableau amputé d'une ligne ne se retrouve plus dans les chiffres : rejeté", () => {
    const base = asAnswer(ask("Recettes de ce mois"));
    const cut = verifyAnswer({
      ...base,
      table: { ...base.table!, rows: base.table!.rows.slice(1) },
    });
    expect(cut.kind === "refusal" && cut.reason).toBe("unverifiable");
  });

  it("une phrase retouchée après coup, même d'un seul chiffre, est rejetée", () => {
    const base = asAnswer(ask("Recettes de ce mois"));
    const changed = base.text.replace(/\d/, (digit) =>
      String((Number(digit) + 1) % 10)
    );
    expect(changed).not.toBe(base.text);
    const tampered = verifyAnswer({ ...base, text: changed });
    expect(tampered.kind === "refusal" && tampered.reason).toBe("unverifiable");
  });

  it("un modèle de phrase qui porte un chiffre en dur, ou un jeton inconnu, est rejeté", () => {
    const base = asAnswer(ask("Recettes de ce mois"));
    expect(
      verifyAnswer({
        ...base,
        templates: ["Encaissé : 5 DA.", ...base.templates.slice(1)],
        text: "Encaissé : 5 DA.",
      }).kind
    ).toBe("refusal");
    expect(
      verifyAnswer({
        ...base,
        templates: ["{inconnu}", ...base.templates.slice(1)],
      }).kind
    ).toBe("refusal");
  });

  it("toute réponse produite par le moteur passe sa propre vérification, sur un large balayage de questions", () => {
    const questions = [
      "Recettes",
      "Dépenses",
      "Recettes et dépenses",
      "Recettes de ce mois",
      "Recettes du mois dernier",
      "Recettes en 2026",
      "Recettes de janvier",
      "Rendez-vous",
      "Rendez-vous demain",
      "Absences",
      "Absences de la semaine dernière",
      "Tâches",
      "Tâches en retard",
      "Tâches de cette semaine",
      "Patients",
      "Combien de patients ?",
      "Nouveaux patients",
      "Nouveaux patients des 90 derniers jours",
      "rendez-vous de Rex",
      "tâches de ce patient",
      "rendez-vous des 3 prochains jours",
    ];
    for (const question of questions) {
      const answer = ask(question, {}, "p1");
      if (answer.kind === "answer")
        expect(verifyAnswer(answer), question).toBe(answer);
      else expect(answer.reason, question).not.toBe("unverifiable");
    }
  });
});

describe("une période que le catalogue ne lit pas est refusée, pas approchée", () => {
  it.each([
    "Recettes du 1er au 15 novembre",
    "Recettes du 3 au 9 novembre",
    "Rendez-vous de jeudi",
    "Recettes entre le 5 et le 10",
    "Recettes du 2e trimestre",
    "Dépenses depuis le début",
    "recettes du 15 octobre",
    "tâches de lundi",
  ])("« %s »", (question) => {
    const answer = ask(question);
    expect(answer.kind, question).toBe("refusal");
    expect(answer.kind === "refusal" && answer.text).toMatch(
      /Je ne lis pas cette période/
    );
  });

  it("un nom de patient qui ressemble à un jour ne refuse pas à tort", () => {
    const answer = answerQuestion(
      "rendez-vous de Lundi ce mois",
      clinic({ patients: [patient("p1", "Lundi")] }),
      { now: NOW }
    );
    expect(answer.kind).toBe("answer");
  });

  it("les périodes lues restent lues", () => {
    for (const question of [
      "Recettes de ce mois",
      "Recettes de novembre",
      "Recettes en 2026",
      "Recettes des 30 derniers jours",
      "Recettes du mois dernier",
      "Rendez-vous demain",
    ]) {
      expect(ask(question).kind, question).toBe("answer");
    }
  });
});

describe("la seule écriture : la carte validée", () => {
  const drafts = asAnswer(ask("Absences des 30 derniers jours")).proposal!;

  it("écrit les tâches proposées, une fois", async () => {
    const saved: string[] = [];
    const add = async (row: { title: string }) => {
      saved.push(row.title);
      return { id: `n${saved.length}`, ...row } as never;
    };
    const first = await saveProposal(drafts, clinic().tasks, add);
    expect(first).toEqual({ created: 1, expected: 1 });
    expect(saved[0]).toContain("Rappeler");
    // La deuxième validation voit la tâche déjà ouverte : rien en double.
    const existing = [
      ...clinic().tasks,
      task("n1", saved[0], "2026-11-12", { patientId: "p1" }),
    ];
    expect((await saveProposal(drafts, existing, add)).created).toBe(0);
  });

  it("une écriture refusée est comptée, pas cachée", async () => {
    expect(await saveProposal(drafts, [], async () => null)).toEqual({
      created: 0,
      expected: 1,
    });
  });

  it("aucune proposition quand la tâche existe déjà", () => {
    expect(
      proposeTasks(drafts.tasks, [
        task("n1", drafts.tasks[0].title, "2026-11-12", {
          patientId: drafts.tasks[0].patientId,
        }),
      ])
    ).toBeNull();
  });
});
