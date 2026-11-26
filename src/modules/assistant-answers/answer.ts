/*
 * The assistant's answers about the practice's own data: a closed catalogue of four subjects.
 *
 *   cash         receipts and expenses      the cash journal
 *   appointments appointments, no-shows     the agenda
 *   tasks        open tasks                 the tasks list
 *   patients     patient records            the records
 *
 * No language model takes part. Every number is computed here, on the rows given, by integer arithmetic (money in centimes),
 * with the same filters as the dashboard and the Finances journal. The sentence is written from the figures; the figures
 * name the source they were read from; `verifyAnswer` then recomputes what it can from the table that is shown, and turns
 * the whole answer into a refusal if anything does not add up. This file is pure and read-only: it imports no store, no
 * repository and no network client. The only way to write is a `Proposal`, shown as a card the vet must validate.
 */

import { dashboardPresentationData } from "@/modules/dashboard/model/premium-analytics";
import { parseDashboardDate, startOfDay } from "@/modules/dashboard/v2/model";
import type { Owner, Patient, Task, Transaction } from "@/types/db";
import { formatDinars, formatNumber } from "@/utils/display-format";
import {
  guardReason,
  has,
  hasUnsupportedPeriod,
  MAX_QUESTION_LENGTH,
  normalize,
} from "./language";
import { inPeriod, lastThirtyDays, parsePeriod } from "./period";
import type {
  Answer,
  AnswerRow,
  AnswerSource,
  AnswerStep,
  AskContext,
  ClinicData,
  Figure,
  Period,
  Proposal,
  RefusalReason,
  TaskDraft,
  Topic,
} from "./types";

const CASH_INCOME_WORDS =
  /\b(recette|recettes|encaisse|encaisses|encaissement|encaissements|chiffre d affaires|revenu|revenus|gagne|rentrees)\b/;
const EXPENSE_WORDS = /\b(depense|depenses|charge|charges)\b/;
const ABSENCE_WORDS = /\b(absence|absences|absent|absents|absente|absentes)\b/;
const OVERDUE_WORDS = /\b(retard|depasse|depasses|depassee|depassees)\b/;
const NEW_PATIENT_WORDS =
  /\b(nouveau|nouveaux|nouvelle|nouvelles|crees|ouverts|inscrits)\b/;
const DIGIT = /\d/;

export const STARTER_QUESTIONS = [
  "Recettes des 30 derniers jours",
  "Rendez-vous d’aujourd’hui",
  "Absences des 30 derniers jours",
  "Tâches en retard",
  "Nouveaux patients ce mois",
];

const MAX_PROPOSED_TASKS = 20;

/** How each guard refuses. None of these texts contains a number. */
const REFUSALS: Record<
  Exclude<RefusalReason, "ambiguous" | "unknown">,
  string
> = {
  empty:
    "Posez une question sur les données du cabinet : recettes, rendez-vous, tâches ou patients.",
  dose: "Je ne calcule et ne propose aucune dose. La posologie se décide dans l’ordonnance, avec le calculateur que vous vérifiez. Je peux en revanche lire les données du cabinet.",
  reminders:
    "Je ne lis pas encore les rappels vaccinaux et médicaux : ils sont dans la page Rappels, à jour. Je préfère ne rien répondre qu’une liste incomplète.",
  write:
    "Je ne modifie rien à partir d’une question : je lis les données du cabinet. Un enregistrement ne se fait que par une carte que vous validez, proposée sous certaines réponses.",
  unverifiable:
    "Je n’affiche pas cette réponse : un de ses chiffres ne se retrouve pas dans ce que j’ai lu. Reformulez la question ou comparez avec la page concernée.",
};

const refuse = (
  reason: RefusalReason,
  text: string,
  followUps = STARTER_QUESTIONS
): Answer => ({ kind: "refusal", reason, text, followUps });

/* ── Subjects ─────────────────────────────────────────────────────────── */

const TOPIC_NAMES: Record<Topic, string> = {
  cash: "Recettes et dépenses",
  appointments: "Rendez-vous",
  tasks: "Tâches",
  patients: "Patients",
};
const TOPIC_WORDS: { topic: Exclude<Topic, "patients">; pattern: RegExp }[] = [
  {
    topic: "cash",
    pattern:
      /\b(recette|recettes|encaisse|encaisses|encaissement|encaissements|chiffre d affaires|revenu|revenus|tresorerie|caisse|depense|depenses|charge|charges|solde|gagne|rentrees)\b/,
  },
  {
    topic: "appointments",
    pattern:
      /\b(rendez vous|rdv|consultation|consultations|agenda|planning|visite|visites|absence|absences|absent|absents|absente|absentes)\b/,
  },
  { topic: "tasks", pattern: /\b(tache|taches|todo)\b/ },
];
// Looked at only when no other subject is named: « rendez-vous du patient Rex » is about appointments.
const PATIENT_WORDS =
  /\b(patient|patients|dossier|dossiers|animal|animaux|chien|chiens|chat|chats)\b/;
const THIS_PATIENT =
  /\b(ce patient|cet animal|ce dossier|ce chien|ce chat|cette chienne|cette chatte)\b/;

/* ── Reading helpers ──────────────────────────────────────────────────── */

type Data = ReturnType<typeof dashboardPresentationData>;
interface Scope {
  ids: Set<string> | null;
  label: string;
  missing: boolean;
  names: string[];
}
interface Build {
  data: Data;
  now: Date;
  period: Period | null;
  scope: Scope;
  text: string;
  understood: (periodText: string | null) => AnswerStep;
}

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count > 1 ? many : one}`;
const money = (centimes: number) => formatDinars(centimes / 100, 2);
const written = (figure: Figure) =>
  figure.kind === "money" ? money(figure.value) : formatNumber(figure.value);

/**
 * The sentence is written from a template, never from numbers: « {income} » stands for the figure of that name and
 * « {period} » for the period's wording. A template holds no digit of its own, so no number can be typed into a sentence;
 * `verifyAnswer` checks that, then writes the template again and compares it with the text shown.
 */
const TOKEN = /\{(\w+)\}/g;
const fill = (template: string, values: Record<string, string>) =>
  template.replace(TOKEN, (_, key: string) => {
    if (!(key in values)) {
      throw new Error(`Jeton inconnu : ${key}`);
    }
    return values[key];
  });
/** « {rows} ligne » or « {rows} lignes », by the figure's value. */
const unit = (figure: Figure, one: string, many: string) =>
  `{${figure.id}} ${figure.value > 1 ? many : one}`;
function speaker(figures: Figure[], slots: Record<string, string>) {
  const values: Record<string, string> = {
    ...slots,
    ...Object.fromEntries(
      figures.map((figure) => [figure.id, written(figure)])
    ),
  };
  const templates: string[] = [];
  return {
    templates,
    slots,
    say(template: string) {
      templates.push(template);
      return fill(template, values);
    },
  };
}
const ownerName = (owner?: Owner) =>
  owner ? `${owner.firstName} ${owner.lastName}`.trim() : "";
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortDay = (date: Date) =>
  date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const timeOf = (value: string | undefined | null) =>
  parseDashboardDate(value ?? undefined)?.getTime() ?? 0;
const DEFAULT_PERIOD_NOTE =
  "Période non précisée : j’ai pris les 30 derniers jours, comme le tableau de bord.";

const source = (
  id: string,
  label: string,
  read: number,
  kept: number,
  filter: string
): AnswerSource => ({ id, label, read, kept, filter });
const readStep = (from: AnswerSource): AnswerStep => ({
  id: `read-${from.id}`,
  name: `Lecture : ${from.label.toLowerCase()}`,
  summary: `${plural(from.kept, "ligne retenue", "lignes retenues")} sur ${formatNumber(from.read)}`,
  details: [
    { label: "Filtre", value: from.filter },
    { label: "Lignes lues", value: formatNumber(from.read) },
    { label: "Lignes retenues", value: formatNumber(from.kept) },
  ],
});

/** The patients a question is about: named in it, or the open record for « ce patient ». Several patients can share a name. */
function patientScope(
  text: string,
  patients: Patient[],
  context: AskContext
): Scope {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const patient of patients) {
    const name = normalize(patient.name);
    if (
      name.length < 2 ||
      !new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
        text
      )
    ) {
      continue;
    }
    ids.add(patient.id);
    names.add(name);
  }
  let missing = false;
  if (has(text, THIS_PATIENT)) {
    const open = patients.find((patient) => patient.id === context.patientId);
    if (open) {
      ids.add(open.id);
    } else {
      missing = ids.size === 0;
    }
  }
  if (ids.size === 0) {
    return { ids: null, label: "", names: [], missing };
  }
  const kept = patients.filter((patient) => ids.has(patient.id));
  const label = kept.map((patient) => patient.name).join(", ");
  return {
    ids,
    label: kept.length > 1 ? `${label} (${kept.length} dossiers)` : label,
    names: [...names],
    missing: false,
  };
}

/* ── The answer ───────────────────────────────────────────────────────── */

export function answerQuestion(
  question: string,
  raw: ClinicData,
  context: AskContext
): Answer {
  const clipped = question.slice(0, MAX_QUESTION_LENGTH);
  const text = normalize(clipped);
  if (!text) {
    return refuse("empty", REFUSALS.empty);
  }
  const guard = guardReason(clipped, text);
  if (guard) {
    return refuse(guard, REFUSALS[guard]);
  }

  const data = dashboardPresentationData({
    ...raw,
    vaccinations: raw.vaccinations ?? [],
    products: raw.products ?? [],
    invoices: raw.invoices ?? [],
  });
  const scope = patientScope(text, data.patients, context);
  // The patient's name is not a subject: « rendez-vous de Chat » must not read « chat » as the patients' subject.
  const bare = scope.names.reduce(
    (rest, name) =>
      rest.replace(
        new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"),
        " "
      ),
    text.replace(THIS_PATIENT, " ")
  );
  const named = TOPIC_WORDS.filter((entry) => has(bare, entry.pattern)).map(
    (entry) => entry.topic
  );
  if (named.length > 1) {
    return refuse(
      "ambiguous",
      `Votre question touche à plusieurs sujets (${named.map((topic) => TOPIC_NAMES[topic].toLowerCase()).join(", ")}). Je réponds à un sujet à la fois pour ne rien mélanger : lequel voulez-vous ?`,
      named.map((topic) => TOPIC_NAMES[topic])
    );
  }
  const topic: Topic | null =
    named[0] ?? (has(bare, PATIENT_WORDS) ? "patients" : null);
  if (!topic) {
    return refuse(
      "unknown",
      "Je ne sais pas répondre à cette question. Je réponds aux recettes et dépenses, aux rendez-vous, aux tâches et aux patients, sur une période que vous nommez."
    );
  }
  if (hasUnsupportedPeriod(bare)) {
    return refuse(
      "unknown",
      "Je ne lis pas cette période : je comprends aujourd’hui, hier, demain, cette semaine, le mois, l’année, un mois nommé, une année et « les derniers jours, semaines ou mois ». Je préfère ne pas répondre sur une période voisine."
    );
  }
  if (scope.missing) {
    return refuse(
      "unknown",
      "Aucun dossier n’est ouvert : nommez le patient, ou ouvrez son dossier puis reposez la question."
    );
  }

  const period = parsePeriod(text, context.now);
  const understood = (periodText: string | null): AnswerStep => ({
    id: "understood",
    name: "Question comprise",
    summary: TOPIC_NAMES[topic],
    details: [
      { label: "Sujet", value: TOPIC_NAMES[topic] },
      ...(periodText ? [{ label: "Période", value: periodText }] : []),
      ...(scope.ids ? [{ label: "Patient", value: scope.label }] : []),
    ],
  });
  const answer = { cash, appointments, tasks, patients }[topic]({
    text,
    data,
    now: context.now,
    period,
    scope,
    understood,
  });
  return verifyAnswer(answer);
}

/* ── Cash ─────────────────────────────────────────────────────────────── */

const METHODS: Record<string, string> = {
  cash: "Espèces",
  card: "Carte",
  bank_transfer: "Virement",
  check: "Chèque",
  other: "Autre",
};

function cash({
  text,
  data,
  now,
  period: asked,
  scope,
  understood,
}: Build): Answer {
  const period = asked ?? lastThirtyDays(now);
  const wantsIncome = has(text, CASH_INCOME_WORDS);
  const wantsExpense = has(text, EXPENSE_WORDS);
  const both = wantsIncome === wantsExpense;
  // The rule of the dashboard's « Trésorerie » figure and of the journal: settled lines only, by the date of the line.
  const settled = data.transactions.filter(
    (line) => line.status === "paid" && inPeriod(line.date, period)
  );
  const kept = settled.filter(
    (line) => both || line.type === (wantsIncome ? "income" : "expense")
  );
  const total = (type: Transaction["type"]) =>
    kept
      .filter((line) => line.type === type)
      .reduce((sum, line) => sum + line.amount, 0);
  const pending = data.transactions.filter(
    (line) => line.status !== "paid" && inPeriod(line.date, period)
  ).length;
  const from = source(
    "transactions",
    "Journal de caisse",
    data.transactions.length,
    kept.length,
    `${both ? "Lignes réglées" : wantsIncome ? "Encaissements réglés" : "Dépenses réglées"}, ${period.label}`
  );

  const income: Figure = {
    id: "income",
    label: "Encaissé",
    value: total("income"),
    kind: "money",
    sourceId: from.id,
    tie: "income",
  };
  const expense: Figure = {
    id: "expense",
    label: "Dépensé",
    value: total("expense"),
    kind: "money",
    sourceId: from.id,
    tie: "expense",
  };
  const net: Figure = {
    id: "net",
    label: "Solde net",
    value: income.value - expense.value,
    kind: "money",
    sourceId: from.id,
  };
  const rows: Figure = {
    id: "rows",
    label: "Lignes",
    value: kept.length,
    kind: "count",
    sourceId: from.id,
    tie: "rows",
  };
  const waiting: Figure = {
    id: "pending",
    label: "Lignes en attente",
    value: pending,
    kind: "count",
    sourceId: from.id,
  };
  const figures: Figure[] =
    kept.length === 0
      ? []
      : both
        ? [income, expense, net, rows]
        : [wantsIncome ? income : expense, rows];
  if (pending > 0) {
    figures.push(waiting);
  }
  const say = speaker(figures, { period: period.label });
  const sentence = say.say(
    kept.length === 0
      ? "Aucune ligne réglée dans le journal de caisse {period}."
      : both
        ? "Encaissé {period} : {income}. Dépensé : {expense}. Solde net : {net}."
        : `${wantsIncome ? "Encaissé" : "Dépensé"} {period} : {${wantsIncome ? "income" : "expense"}}, sur ${unit(rows, "ligne", "lignes")}.`
  );
  const notes: string[] = [];
  if (!asked) {
    notes.push(say.say(DEFAULT_PERIOD_NOTE));
  }
  if (pending > 0) {
    notes.push(
      say.say(
        `${unit(waiting, "ligne en attente n’est pas comptée", "lignes en attente ne sont pas comptées")}.`
      )
    );
  }
  if (scope.ids) {
    notes.push(
      say.say(
        "Le journal de caisse ne rattache pas les lignes à un patient : ce sont les chiffres du cabinet."
      )
    );
  }
  const shown = kept.slice().sort((a, b) => timeOf(b.date) - timeOf(a.date));
  return {
    kind: "answer",
    topic: "cash",
    period,
    text: sentence,
    notes,
    figures,
    templates: say.templates,
    slots: say.slots,
    steps: [understood(period.label), readStep(from)],
    sources: [from],
    table:
      kept.length === 0
        ? null
        : {
            title: "Lignes du journal de caisse",
            noun: ["ligne", "lignes"],
            exportName: "journal-de-caisse",
            columns: [
              { key: "date", label: "Date", kind: "date", priority: 1 },
              {
                key: "description",
                label: "Libellé",
                kind: "text",
                priority: 1,
              },
              {
                key: "category",
                label: "Catégorie",
                kind: "text",
                priority: 3,
              },
              { key: "method", label: "Moyen", kind: "text", priority: 3 },
              { key: "amount", label: "Montant", kind: "money", priority: 1 },
            ],
            rows: shown.map(
              (line): AnswerRow => ({
                id: line.id,
                date: line.date,
                description: line.description || "Sans libellé",
                category: line.category || "",
                method: METHODS[line.method] ?? "Autre",
                amount: line.type === "expense" ? -line.amount : line.amount,
              })
            ),
          },
    proposal: null,
    followUps: [
      "Recettes de ce mois",
      "Recettes du mois dernier",
      "Dépenses des 30 derniers jours",
    ],
  };
}

/* ── Appointments ─────────────────────────────────────────────────────── */

const STATUSES: Record<string, string> = {
  scheduled: "Planifié",
  confirmed: "Confirmé",
  arrived: "Arrivé",
  waiting: "En attente",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

function appointments({
  text,
  data,
  now,
  period: asked,
  scope,
  understood,
}: Build): Answer {
  const missedOnly = has(text, ABSENCE_WORDS);
  const period = asked ?? lastThirtyDays(now);
  const patients = new Map(
    data.patients.map((patient) => [patient.id, patient])
  );
  const owners = new Map(data.owners.map((owner) => [owner.id, owner]));
  // The dashboard's rule for « Rendez-vous »: every appointment of a known patient, whatever became of it.
  const kept = data.appointments.filter(
    (row) =>
      patients.has(row.patientId) &&
      inPeriod(row.startTime, period) &&
      (!scope.ids || scope.ids.has(row.patientId)) &&
      (!missedOnly || row.status === "no_show")
  );
  const from = source(
    "appointments",
    "Agenda",
    data.appointments.length,
    kept.length,
    `${missedOnly ? "Rendez-vous marqués absents" : "Rendez-vous"} ${period.label}${scope.ids ? `, ${scope.label}` : ""}`
  );
  const count = (status: string): Figure => ({
    id: status,
    label: STATUSES[status] ?? status,
    value: kept.filter((row) => row.status === status).length,
    kind: "count",
    sourceId: from.id,
  });
  const rows: Figure = {
    id: "rows",
    label: "Rendez-vous",
    value: kept.length,
    kind: "count",
    sourceId: from.id,
    tie: "rows",
  };
  const done = count("completed");
  const cancelled = count("cancelled");
  const missed = count("no_show");
  const figures: Figure[] =
    kept.length === 0
      ? []
      : missedOnly
        ? [rows]
        : [rows, done, cancelled, missed];
  // The patient's name is a slot, never part of a template: a name cannot be read as a token.
  const say = speaker(figures, { period: period.label, scope: scope.label });
  const where = scope.ids ? " pour {scope}" : "";
  const sentence = say.say(
    kept.length === 0
      ? `Aucun${missedOnly ? "e absence à un" : ""} rendez-vous {period}${where}.`
      : missedOnly
        ? `${unit(rows, "absence", "absences")} à un rendez-vous {period}${where}.`
        : `${unit(rows, "rendez-vous", "rendez-vous")} {period}${where} : ${unit(done, "terminé", "terminés")}, ${unit(cancelled, "annulé", "annulés")}, ${unit(missed, "absence", "absences")}.`
  );
  // A missed appointment can be followed by a call: proposed as tasks, saved only if the vet validates the card.
  const drafts: TaskDraft[] = kept
    .filter((row) => row.status === "no_show")
    .map((row) => {
      const patient = patients.get(row.patientId)!;
      const owner = ownerName(owners.get(patient.ownerId));
      const when = parseDashboardDate(row.startTime);
      return {
        key: `no-show:${row.id}`,
        title: `Rappeler ${owner || "le propriétaire"} : absence de ${patient.name}${when ? ` le ${shortDay(when)}` : ""}`,
        description: `Rendez-vous manqué${when ? ` le ${shortDay(when)}` : ""} (${row.type}). Tâche proposée par l’assistant et validée par vous.`,
        patientId: patient.id,
        dueDate: isoDay(now),
      };
    });
  return {
    kind: "answer",
    topic: "appointments",
    period,
    text: sentence,
    notes: asked ? [] : [say.say(DEFAULT_PERIOD_NOTE)],
    figures,
    templates: say.templates,
    slots: say.slots,
    steps: [understood(period.label), readStep(from)],
    sources: [from],
    table:
      kept.length === 0
        ? null
        : {
            title: "Rendez-vous",
            noun: ["rendez-vous", "rendez-vous"],
            exportName: "rendez-vous",
            columns: [
              { key: "start", label: "Date", kind: "datetime", priority: 1 },
              { key: "patient", label: "Patient", kind: "text", priority: 1 },
              {
                key: "owner",
                label: "Propriétaire",
                kind: "text",
                priority: 3,
              },
              { key: "type", label: "Type", kind: "text", priority: 2 },
              { key: "status", label: "État", kind: "text", priority: 1 },
            ],
            rows: kept
              .slice()
              .sort((a, b) => timeOf(a.startTime) - timeOf(b.startTime))
              .map(
                (row): AnswerRow => ({
                  id: row.id,
                  start: row.startTime,
                  patient: patients.get(row.patientId)?.name ?? "",
                  owner: ownerName(owners.get(row.ownerId)),
                  type: row.type,
                  status: STATUSES[row.status] ?? row.status,
                })
              ),
          },
    proposal: proposeTasks(drafts, data.tasks, "rappel téléphonique"),
    followUps: [
      "Rendez-vous d’aujourd’hui",
      "Rendez-vous de cette semaine",
      "Absences des 30 derniers jours",
    ],
  };
}

/** The tasks a card would create: never one already open for the same patient under the same title. */
export function proposeTasks(
  drafts: TaskDraft[],
  existing: Task[],
  purpose = "suivi"
): Proposal | null {
  const open = new Set(
    existing
      .filter((task) => task.status !== "done")
      .map((task) => `${task.patientId ?? ""}|${normalize(task.title)}`)
  );
  const fresh = drafts.filter(
    (draft) => !open.has(`${draft.patientId}|${normalize(draft.title)}`)
  );
  const tasks = fresh.slice(0, MAX_PROPOSED_TASKS);
  if (tasks.length === 0) {
    return null;
  }
  return {
    id: `tasks:${tasks.map((task) => task.key).join(",")}`,
    kind: "tasks",
    title:
      tasks.length > 1
        ? `Créer ${tasks.length} tâches de ${purpose}`
        : `Créer une tâche de ${purpose}`,
    subtitle: "Rien n’est enregistré tant que vous n’avez pas validé.",
    tasks,
    skipped: drafts.length - tasks.length,
  };
}

/* ── Tasks ────────────────────────────────────────────────────────────── */

const PRIORITIES: Record<string, string> = {
  low: "Basse",
  medium: "Normale",
  high: "Haute",
};

function tasks({
  text,
  data,
  now,
  period: asked,
  scope,
  understood,
}: Build): Answer {
  const today = startOfDay(now);
  const lateOnly = has(text, OVERDUE_WORDS);
  const patients = new Map(
    data.patients.map((patient) => [patient.id, patient])
  );
  const kept = data.tasks
    .flatMap((task) => {
      if (task.status === "done") {
        return [];
      }
      if (scope.ids && !(task.patientId && scope.ids.has(task.patientId))) {
        return [];
      }
      const due = parseDashboardDate(task.dueDate);
      const late = Boolean(due && due < today);
      if (lateOnly && !late) {
        return [];
      }
      if (asked && !(due && due >= asked.from && due <= asked.to)) {
        return [];
      }
      return [{ task, due, late }];
    })
    .sort(
      (a, b) =>
        (a.due?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (b.due?.getTime() ?? Number.MAX_SAFE_INTEGER)
    );
  const from = source(
    "tasks",
    "Tâches",
    data.tasks.length,
    kept.length,
    `Tâches non terminées${lateOnly ? ", en retard seulement" : ""}${asked ? `, échéance ${asked.label}` : ""}${scope.ids ? `, ${scope.label}` : ""}`
  );
  const rows: Figure = {
    id: "rows",
    label: "Tâches",
    value: kept.length,
    kind: "count",
    sourceId: from.id,
    tie: "rows",
  };
  const late: Figure = {
    id: "late",
    label: "En retard",
    value: kept.filter((entry) => entry.late).length,
    kind: "count",
    sourceId: from.id,
  };
  const undated: Figure = {
    id: "undated",
    label: "Sans échéance",
    value: kept.filter((entry) => !entry.due).length,
    kind: "count",
    sourceId: from.id,
  };
  const showUndated = undated.value > 0 && !asked;
  const figures: Figure[] = [
    ...(kept.length === 0 ? [] : [rows, late]),
    ...(showUndated ? [undated] : []),
  ];
  const say = speaker(figures, {
    period: asked?.label ?? "",
    scope: scope.label,
  });
  const due = asked ? " avec une échéance {period}" : "";
  const where = scope.ids ? " pour {scope}" : "";
  const sentence = say.say(
    kept.length === 0
      ? `Aucune tâche ${lateOnly ? "en retard" : "ouverte"}${due}${where}.`
      : `${unit(rows, "tâche ouverte", "tâches ouvertes")}${due}${where}, dont ${unit(late, "en retard", "en retard")}.`
  );
  const notes = showUndated
    ? [
        say.say(
          `${unit(undated, "tâche n’a pas d’échéance", "tâches n’ont pas d’échéance")}.`
        ),
      ]
    : [];
  return {
    kind: "answer",
    topic: "tasks",
    period: asked,
    text: sentence,
    notes,
    figures,
    templates: say.templates,
    slots: say.slots,
    steps: [understood(asked ? asked.label : null), readStep(from)],
    sources: [from],
    table:
      kept.length === 0
        ? null
        : {
            title: "Tâches ouvertes",
            noun: ["tâche", "tâches"],
            exportName: "taches",
            columns: [
              { key: "title", label: "Tâche", kind: "text", priority: 1 },
              { key: "patient", label: "Patient", kind: "text", priority: 2 },
              { key: "due", label: "Échéance", kind: "date", priority: 1 },
              { key: "priority", label: "Priorité", kind: "text", priority: 3 },
              { key: "state", label: "État", kind: "text", priority: 1 },
            ],
            rows: kept.map(
              ({ task, due: dueDate, late: isLate }): AnswerRow => ({
                id: task.id,
                title: task.title,
                patient: patients.get(task.patientId ?? "")?.name ?? "",
                due: dueDate ? isoDay(dueDate) : null,
                priority: PRIORITIES[task.priority] ?? "",
                state: isLate
                  ? "En retard"
                  : task.status === "in_progress"
                    ? "En cours"
                    : "À faire",
              })
            ),
          },
    proposal: null,
    followUps: [
      "Tâches en retard",
      "Tâches de cette semaine",
      "Tâches ouvertes",
    ],
  };
}

/* ── Patients ─────────────────────────────────────────────────────────── */

function patients({
  text,
  data,
  now,
  period: asked,
  understood,
}: Build): Answer {
  const fresh = has(text, NEW_PATIENT_WORDS) || asked !== null;
  if (fresh) {
    const period = asked ?? lastThirtyDays(now);
    const owners = new Map(data.owners.map((owner) => [owner.id, owner]));
    const kept = data.patients.filter((patient) =>
      inPeriod(patient.createdAt, period)
    );
    const from = source(
      "patients",
      "Dossiers patients",
      data.patients.length,
      kept.length,
      `Dossiers créés ${period.label}`
    );
    const rows: Figure = {
      id: "rows",
      label: "Dossiers créés",
      value: kept.length,
      kind: "count",
      sourceId: from.id,
      tie: "rows",
    };
    const figures = kept.length === 0 ? [] : [rows];
    const say = speaker(figures, { period: period.label });
    const sentence = say.say(
      kept.length === 0
        ? "Aucun dossier créé {period}."
        : `${unit(rows, "dossier créé", "dossiers créés")} {period}.`
    );
    return {
      kind: "answer",
      topic: "patients",
      period,
      text: sentence,
      notes: asked ? [] : [say.say(DEFAULT_PERIOD_NOTE)],
      figures,
      templates: say.templates,
      slots: say.slots,
      steps: [understood(period.label), readStep(from)],
      sources: [from],
      table:
        kept.length === 0
          ? null
          : {
              title: "Nouveaux dossiers",
              noun: ["dossier", "dossiers"],
              exportName: "nouveaux-dossiers",
              columns: [
                { key: "name", label: "Patient", kind: "text", priority: 1 },
                { key: "species", label: "Espèce", kind: "text", priority: 1 },
                {
                  key: "owner",
                  label: "Propriétaire",
                  kind: "text",
                  priority: 2,
                },
                { key: "created", label: "Créé le", kind: "date", priority: 1 },
              ],
              rows: kept
                .slice()
                .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))
                .map(
                  (patient): AnswerRow => ({
                    id: patient.id,
                    name: patient.name,
                    species: patient.species || "Non renseignée",
                    owner: ownerName(owners.get(patient.ownerId)),
                    created: patient.createdAt,
                  })
                ),
            },
      proposal: null,
      followUps: [
        "Nouveaux patients ce mois",
        "Combien de patients ?",
        "Rendez-vous d’aujourd’hui",
      ],
    };
  }
  // Active records: neither deceased nor archived.
  const active = data.patients.filter(
    (patient) => patient.status !== "decede" && !patient.archivedAt
  );
  const bySpecies = new Map<string, number>();
  for (const patient of active) {
    bySpecies.set(
      patient.species || "Non renseignée",
      (bySpecies.get(patient.species || "Non renseignée") ?? 0) + 1
    );
  }
  const from = source(
    "patients",
    "Dossiers patients",
    data.patients.length,
    active.length,
    "Dossiers d’animaux ni décédés ni archivés"
  );
  const activeFigure: Figure = {
    id: "active",
    label: "Dossiers actifs",
    value: active.length,
    kind: "count",
    sourceId: from.id,
    tie: "sum",
  };
  const totalFigure: Figure = {
    id: "total",
    label: "Dossiers au total",
    value: data.patients.length,
    kind: "count",
    sourceId: from.id,
  };
  const figures = active.length === 0 ? [] : [activeFigure, totalFigure];
  const say = speaker(figures, {});
  return {
    kind: "answer",
    topic: "patients",
    period: null,
    text: say.say(
      active.length === 0
        ? "Aucun dossier patient actif."
        : `${unit(activeFigure, "dossier actif", "dossiers actifs")}, sur ${unit(totalFigure, "dossier", "dossiers")} au total.`
    ),
    notes: [],
    figures,
    templates: say.templates,
    slots: say.slots,
    steps: [understood(null), readStep(from)],
    sources: [from],
    table:
      active.length === 0
        ? null
        : {
            title: "Dossiers actifs par espèce",
            noun: ["espèce", "espèces"],
            exportName: "patients-par-espece",
            columns: [
              { key: "species", label: "Espèce", kind: "text", priority: 1 },
              { key: "count", label: "Dossiers", kind: "number", priority: 1 },
            ],
            rows: [...bySpecies.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(
                ([name, count]): AnswerRow => ({
                  id: name,
                  species: name,
                  count,
                })
              ),
          },
    proposal: null,
    followUps: [
      "Nouveaux patients ce mois",
      "Rendez-vous d’aujourd’hui",
      "Tâches en retard",
    ],
  };
}

/* ── Verification ─────────────────────────────────────────────────────── */

/**
 * The last guard before an answer is shown. An answer is kept only if:
 *  1. every figure names a source that is listed in « Ce que j'ai lu », and is a whole number;
 *  2. the sentence and the notes were written from templates that hold no digit of their own, whose tokens all name a figure
 *     or a slot, and that write again, token for token, into the text shown (so no number was typed or changed afterwards);
 *  3. every figure tied to the table equals what the table, as shown, adds up to.
 * Otherwise it becomes a refusal: a wrong or unsourced number is never displayed.
 */
export function verifyAnswer(answer: Answer): Answer {
  if (answer.kind !== "answer") {
    return answer;
  }
  const fail = () => refuse("unverifiable", REFUSALS.unverifiable);
  const sourceIds = new Set(answer.sources.map((from) => from.id));
  if (
    answer.figures.some(
      (figure) =>
        !(sourceIds.has(figure.sourceId) && Number.isInteger(figure.value))
    )
  ) {
    return fail();
  }

  const values: Record<string, string> = {
    ...answer.slots,
    ...Object.fromEntries(
      answer.figures.map((figure) => [figure.id, written(figure)])
    ),
  };
  const shown = [answer.text, ...answer.notes];
  if (answer.templates.length !== shown.length) {
    return fail();
  }
  for (const [index, template] of answer.templates.entries()) {
    // The default-period note carries « 30 » on purpose: it is a rule of the tab, not a computed figure.
    if (DIGIT.test(template.split(DEFAULT_PERIOD_NOTE).join(""))) {
      return fail();
    }
    let written_: string;
    try {
      written_ = fill(template, values);
    } catch {
      return fail();
    }
    if (written_ !== shown[index]) {
      return fail();
    }
  }

  const table = answer.table;
  for (const figure of answer.figures) {
    if (!figure.tie) {
      continue;
    }
    if (!table) {
      if (figure.value !== 0) {
        return fail();
      }
      continue;
    }
    const amounts = table.rows.map((row) =>
      Number(row.amount ?? row.count ?? 0)
    );
    const expected =
      figure.tie === "rows"
        ? table.rows.length
        : figure.tie === "income"
          ? amounts
              .filter((amount) => amount > 0)
              .reduce((sum, amount) => sum + amount, 0)
          : figure.tie === "expense"
            ? -amounts
                .filter((amount) => amount < 0)
                .reduce((sum, amount) => sum + amount, 0)
            : amounts.reduce((sum, amount) => sum + amount, 0);
    if (expected !== figure.value) {
      return fail();
    }
  }
  const byId = new Map(answer.figures.map((figure) => [figure.id, figure]));
  const [income, expense, net] = [
    byId.get("income"),
    byId.get("expense"),
    byId.get("net"),
  ];
  if (net && income && expense && net.value !== income.value - expense.value) {
    return fail();
  }
  return answer;
}
