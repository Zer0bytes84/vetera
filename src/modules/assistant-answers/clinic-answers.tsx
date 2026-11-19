/*
 * The « Données » tab of the assistant panel: questions about the practice's own data, answered from the tables of this machine.
 *
 * Each answer reads, in order: the steps taken (what was understood, what was read), one sentence, the table the figures come
 * from, « Ce que j'ai lu » (table, rows read and kept, filter, time) and, when a write is suggested, a card the vet validates.
 * Nothing streams: the answer is computed in a few milliseconds and appears whole. No model takes part, so none is named.
 * The tab only reads. The one write goes through `saveProposal`, from the card's « Valider », and nowhere else.
 */

import { ArrowUp, Database, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/action-button";
import { AgentComposer } from "@/components/ui/agent-composer";
import { ChatThread, type ThreadMessage } from "@/components/ui/chat-thread";
import {
  ConfirmationCard,
  type ConfirmationStatus,
} from "@/components/ui/confirmation-card";
import {
  DataTable,
  type DataColumn,
  type DataRow,
} from "@/components/ui/data-table";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { SourceList } from "@/components/ui/source-list";
import { StreamingMessage } from "@/components/ui/streaming-message";
import { ToolCallBlock } from "@/components/ui/tool-call-block";
import { UserMessage } from "@/components/ui/user-message";
import { useSQLite } from "@/hooks/useSQLite";
import { guard } from "@/lib/guard";
import { useDashboardFinancials } from "@/modules/dashboard/hooks/use-dashboard-financials";
import { parseDashboardDate } from "@/modules/dashboard/v2/model";
import type {
  Appointment,
  Owner,
  Patient,
  Product,
  Task,
  Transaction,
  Vaccination,
} from "@/types/db";
import { formatDinars, formatNumber } from "@/utils/display-format";
import { answerQuestion, STARTER_QUESTIONS } from "./answer";
import { MAX_QUESTION_LENGTH } from "./language";
import { saveProposal } from "./save-proposal";
import type { Answer, AnswerColumn, CellKind, Proposal } from "./types";

export type Turn = {
  id: string;
  question: string;
  at: string;
  durationMs: number;
  answer: Answer;
};
type CardState = {
  status: ConfirmationStatus | "dismissed";
  error?: string;
  reference?: string;
  doneAt?: string;
};

/**
 * The thread's assistant turns shrink to their content, so a short answer would squeeze its « Ce que j'ai lu » block into a
 * few words. The scroller is a size container; an answer is as wide as the column minus the avatar (2rem) and the gap (0.75rem).
 */
const ANSWER_WIDTH = "w-[calc(100cqw-2.75rem)] max-w-full";

const INTRO =
  "Posez une question sur les données du cabinet. Je lis les tables de cet ordinateur et je montre ce que j’ai lu : aucun chiffre n’est estimé, et je ne calcule aucune dose.";

const dash = <span className="text-muted-foreground">—</span>;
const dateOf = (value: unknown) =>
  typeof value === "string" ? parseDashboardDate(value) : null;
const CELLS: Record<CellKind, (value: unknown) => ReactNode> = {
  text: (value) => (value === null || value === "" ? dash : String(value)),
  number: (value) => formatNumber(Number(value)),
  money: (value) => formatDinars(Number(value) / 100, 2),
  date: (value) =>
    dateOf(value)?.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? dash,
  datetime: (value) =>
    dateOf(value)?.toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) ?? dash,
};
const toColumn = (column: AnswerColumn): DataColumn<DataRow> => ({
  key: column.key,
  label: column.label,
  align: column.kind === "money" || column.kind === "number" ? "right" : "left",
  format: CELLS[column.kind],
  priority: column.priority,
});
const clock = (value: string | Date) =>
  new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

type Props = {
  /** The record open behind the panel: « ce patient » in a question means this one. */
  patientId?: string;
  renderAvatar?: (message: ThreadMessage) => ReactNode;
};

export function ClinicAnswers({ patientId, renderAvatar }: Props) {
  const patients = useSQLite<Patient>("patients");
  const owners = useSQLite<Owner>("owners");
  const appointments = useSQLite<Appointment>("appointments");
  const tasks = useSQLite<Task>("tasks");
  const transactions = useSQLite<Transaction>("transactions");
  const vaccinations = useSQLite<Vaccination>("vaccinations");
  const products = useSQLite<Product>("products");
  // The invoices serve only the dashboard's exclusion of test records: both screens then count the same lines.
  const financials = useDashboardFinancials();

  const stores = [
    patients,
    owners,
    appointments,
    tasks,
    transactions,
    vaccinations,
    products,
  ];
  const loading = stores.some((store) => store.loading) || financials.loading;
  // A table that could not be read is never answered as if it were empty.
  const readError =
    stores.find((store) => store.error)?.error ?? financials.error ?? null;
  const blocked = loading || Boolean(readError);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const saving = useRef(new Set<string>());

  useEffect(() => {
    // The new question goes to the top of the view: the answer is read from its first line, not from its last.
    const questions = scroller.current?.querySelectorAll("[data-question]");
    questions?.[questions.length - 1]?.scrollIntoView({ block: "start" });
  }, [turns.length]);

  const ask = (text: string) => {
    const question = text.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!question || blocked) return;
    const started = performance.now();
    const now = new Date();
    const answer = answerQuestion(
      question,
      {
        patients: patients.data,
        owners: owners.data,
        appointments: appointments.data,
        tasks: tasks.data,
        transactions: transactions.data,
        vaccinations: vaccinations.data,
        products: products.data,
        invoices: financials.invoices,
      },
      { now, patientId }
    );
    const durationMs = Math.max(1, Math.round(performance.now() - started));
    setTurns((current) => [
      ...current,
      {
        id: `${now.getTime()}-${current.length}`,
        question,
        at: now.toISOString(),
        durationMs,
        answer,
      },
    ]);
    setDraft("");
  };

  /** The only write of this tab, and only from the card's « Valider ». */
  const confirm = async (turnId: string, proposal: Proposal) => {
    if (saving.current.has(turnId)) return;
    saving.current.add(turnId);
    setCards((current) => ({ ...current, [turnId]: { status: "confirming" } }));
    await guard(
      async () => {
        const { created, expected } = await saveProposal(
          proposal,
          tasks.data,
          tasks.add
        );
        if (created < expected) {
          setCards((current) => ({
            ...current,
            [turnId]: {
              status: "review",
              error: `${plural(created, "tâche enregistrée", "tâches enregistrées")} sur ${expected}. Validez de nouveau pour le reste : rien ne sera créé en double.`,
            },
          }));
          return;
        }
        setCards((current) => ({
          ...current,
          [turnId]: {
            status: "done",
            reference:
              created === 0
                ? "Ces tâches existaient déjà : rien n’a été ajouté."
                : `${plural(created, "tâche ajoutée", "tâches ajoutées")} aux Rappels`,
            doneAt: clock(new Date()),
          },
        }));
      },
      {
        recover: () => {
          setCards((current) => ({
            ...current,
            [turnId]: {
              status: "review",
              error:
                "L’enregistrement a échoué. Rien n’a été modifié par cette tentative ; vous pouvez réessayer.",
            },
          }));
        },
        cleanup: () => {
          saving.current.delete(turnId);
        },
      }
    );
  };

  const messages: ThreadMessage[] = turns.flatMap((turn) => [
    {
      id: `${turn.id}-q`,
      role: "user" as const,
      at: turn.at,
      plain: true,
      content: (
        <div data-question className="scroll-mt-1">
          <UserMessage data={{ id: `${turn.id}-q`, content: turn.question }} />
        </div>
      ),
    },
    {
      id: `${turn.id}-a`,
      role: "assistant" as const,
      at: turn.at,
      content: (
        <AnswerView
          card={cards[turn.id]}
          onAsk={ask}
          onCancel={() =>
            setCards((current) => ({
              ...current,
              [turn.id]: { status: "dismissed" },
            }))
          }
          onConfirm={(proposal) => void confirm(turn.id, proposal)}
          turn={turn}
        />
      ),
    },
  ]);

  const last = turns.at(-1);
  const followUps = last?.answer.followUps ?? [];
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
      data-clinic-answers
    >
      {/* The thread is a size container: an answer takes the whole column (see `ANSWER_WIDTH`), short or long. */}
      <div
        ref={scroller}
        className="assistant-dictation-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 [container-type:inline-size]"
      >
        {turns.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center gap-3 py-6">
            <StreamingMessage
              className="max-w-none"
              data={{ status: "done", content: INTRO }}
              showActions={false}
              showHeader={false}
            />
            <PromptSuggestions
              data={STARTER_QUESTIONS.map((title) => ({ id: title, title }))}
              heading="Questions fréquentes"
              onSelect={(_, prompt) => ask(prompt)}
              variant="chips"
            />
          </div>
        ) : (
          <ChatThread
            footer={
              followUps.length > 0 ? (
                <PromptSuggestions
                  className="mt-1 pl-11"
                  data={followUps.map((title) => ({ id: title, title }))}
                  onSelect={(_, prompt) => ask(prompt)}
                  variant="chips"
                />
              ) : null
            }
            messages={messages}
            renderAvatar={renderAvatar}
            showNames={false}
            userName="Vous"
          />
        )}
      </div>

      {readError ? (
        <div
          role="alert"
          className="shrink-0 rounded-xl border border-negative/30 bg-negative/10 p-3 t-13 text-foreground"
        >
          Les données du cabinet n’ont pas pu être lues. Je ne réponds pas tant
          que la lecture échoue, pour ne pas afficher de chiffres faux.
          <div className="mt-2">
            <Button
              icon={RotateCcw}
              onClick={() => {
                for (const store of stores) void store.refresh();
                void financials.refresh();
              }}
            >
              Relire les données
            </Button>
          </div>
        </div>
      ) : null}

      <AgentComposer
        className="shrink-0"
        disabled={blocked}
        label="Votre question sur les données du cabinet"
        maxLength={MAX_QUESTION_LENGTH}
        meter={
          <IconButton
            disabled={!draft.trim() || blocked}
            icon={ArrowUp}
            iconWeight="bold"
            label="Envoyer la question"
            onClick={() => ask(draft)}
            tooltip="Envoyer (Entrée)"
            variant="primary"
          />
        }
        onSubmit={() => ask(draft)}
        onValueChange={setDraft}
        placeholder={
          loading
            ? "Lecture des données du cabinet…"
            : "Ex. : recettes de ce mois, absences du mois dernier, rendez-vous de Rex cette semaine"
        }
        submitOnEnter
        toolbar={
          <span className="inline-flex items-center gap-1.5 t-12 text-muted-foreground">
            <Database aria-hidden="true" className="size-3.5" />
            Lecture seule · données de cet ordinateur
          </span>
        }
        value={draft}
      />
    </div>
  );
}

export function AnswerView({
  turn,
  card,
  onConfirm,
  onCancel,
  onAsk,
}: {
  turn: Turn;
  card?: CardState;
  onConfirm: (proposal: Proposal) => void;
  onCancel: () => void;
  onAsk: (question: string) => void;
}) {
  const { answer } = turn;
  if (answer.kind === "refusal") {
    return (
      <div className="flex w-full flex-col gap-3">
        <StreamingMessage
          bubble
          className="max-w-none"
          data={{ status: "done", content: answer.text }}
          showActions={false}
          showHeader={false}
        />
        {answer.reason === "ambiguous" ? (
          <PromptSuggestions
            data={answer.followUps.map((title) => ({ id: title, title }))}
            onSelect={(_, prompt) => onAsk(prompt)}
            variant="chips"
          />
        ) : null}
      </div>
    );
  }
  const { table, proposal } = answer;
  return (
    <div className={`flex min-w-0 flex-col gap-3 ${ANSWER_WIDTH}`}>
      {answer.steps.map((step, index) => (
        <ToolCallBlock
          key={step.id}
          data={{
            id: `${turn.id}-${step.id}`,
            name: step.name,
            summary: step.summary,
            status: "success",
            durationMs:
              index === answer.steps.length - 1 ? turn.durationMs : undefined,
            details: step.details,
          }}
        />
      ))}
      <StreamingMessage
        bubble
        className="max-w-none"
        data={{
          status: "done",
          content: [answer.text, ...answer.notes].join("\n\n"),
        }}
        showActions={false}
        showHeader={false}
      />
      {table ? (
        <DataTable
          columns={table.columns.map(toColumn)}
          data={table.rows}
          exportName={table.exportName}
          noun={table.noun}
          pageSize={8}
          searchable={table.rows.length > 8}
          title={table.title}
        />
      ) : null}
      <SourceList
        heading="Ce que j’ai lu"
        sources={answer.sources.map((from) => ({
          id: `${turn.id}-${from.id}`,
          group: "Données du cabinet, sur cet ordinateur",
          icon: Database,
          title: from.label,
          tag: `${formatNumber(from.kept)} sur ${formatNumber(from.read)}`,
          date: clock(turn.at),
          passage: from.filter,
        }))}
      />
      {proposal && card?.status !== "dismissed" ? (
        <ProposalCard
          card={card}
          onCancel={onCancel}
          onConfirm={() => onConfirm(proposal)}
          proposal={proposal}
        />
      ) : null}
    </div>
  );
}

function ProposalCard({
  proposal,
  card,
  onConfirm,
  onCancel,
}: {
  proposal: Proposal;
  card?: CardState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const skipped = proposal.skipped;
  const warnings = card?.error
    ? [card.error]
    : skipped > 0
      ? [
          `${plural(skipped, "autre rappel déjà couvert", "autres rappels déjà couverts")} par une tâche ouverte, ou au-delà de la limite d’une carte.`,
        ]
      : undefined;
  return (
    <ConfirmationCard
      cancelLabel="Ne rien créer"
      confirmLabel={
        proposal.tasks.length > 1
          ? `Valider et créer ${proposal.tasks.length} tâches`
          : "Valider et créer la tâche"
      }
      data={{
        title: proposal.title,
        subtitle: proposal.subtitle,
        items: proposal.tasks.map((task) => ({
          id: task.key,
          label: task.title,
          detail: task.description,
          filled: true,
        })),
        warnings,
        reference: card?.reference,
        doneAt: card?.doneAt,
      }}
      doneLabel="Enregistré"
      onCancel={onCancel}
      onConfirm={onConfirm}
      status={
        card?.status === "confirming" || card?.status === "done"
          ? card.status
          : "review"
      }
    />
  );
}
