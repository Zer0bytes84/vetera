/*
 * The « Données » tab of the assistant panel: questions about the practice's own data, answered from the tables of this machine.
 *
 * Each answer reads, in order: the steps taken (what was understood, what was read), one sentence, the table the figures come
 * from, « Ce que j'ai lu » (table, rows read and kept, filter, time) and, when a write is suggested, a card the vet validates.
 * Nothing streams: the answer is computed in a few milliseconds and appears whole. No model takes part, so none is named.
 * The tab only reads, and only through the read port carried over from the agent harness (clinic-reads.ts): each
 * question reads every table it may answer from in one snapshot, SELECT statements only, counted, with SQLite's own
 * count of changes taken before and after (it must not move). The receipt is shown under the answer.
 * The one write goes through `saveProposal`, from the card's « Valider », and nowhere else.
 *
 * The card comes last in a long answer, often a thousand pixels under the question the thread scrolls to (measured on
 * 24 November 2026: 1519 px of answer in a 450 px thread). While it waits and is out of sight, a short version of it is
 * pinned at the foot of the panel, above the composer: its title, « Voir la carte » and the same « Valider ». The whole
 * card stays in the answer, unchanged.
 */

import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Database,
  RotateCcw,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/action-button";
import { AgentComposer } from "@/components/ui/agent-composer";
import { ChatThread, type ThreadMessage } from "@/components/ui/chat-thread";
import { ConfirmationCard } from "@/components/ui/confirmation-card";
import {
  type DataColumn,
  type DataRow,
  DataTable,
} from "@/components/ui/data-table";
import { MessageSkeleton } from "@/components/ui/loading-skeleton";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { SourceList } from "@/components/ui/source-list";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { StreamingMessage } from "@/components/ui/streaming-message";
import { Panel, Shell } from "@/components/ui/surface";
import { ToolCallBlock } from "@/components/ui/tool-call-block";
import { UserMessage } from "@/components/ui/user-message";
import { useSQLite } from "@/hooks/useSQLite";
import { announce } from "@/lib/announce";
import { guard } from "@/lib/guard";
import { splitUnit } from "@/modules/dashboard/components/chart-path";
import { parseDashboardDate } from "@/modules/dashboard/v2/model";
import type { Task } from "@/types/db";
import { formatDinars, formatNumber } from "@/utils/display-format";
import { answerQuestion, STARTER_QUESTIONS } from "./answer";
import { AnswerChart } from "./answer-chart";
import { type ReadReceipt, readClinicData } from "./clinic-reads";
import { MAX_QUESTION_LENGTH } from "./language";
import { type CardState, pendingProposal } from "./pending-proposal";
import { saveProposal } from "./save-proposal";
import type { Answer, AnswerColumn, CellKind, Proposal } from "./types";

export type Turn = {
  id: string;
  question: string;
  at: string;
  durationMs: number;
  answer: Answer;
  receipt?: ReadReceipt;
  tasksRead?: Task[];
};

const confirmLabelOf = (proposal: Proposal) =>
  proposal.tasks.length > 1
    ? `Valider et créer ${proposal.tasks.length} tâches`
    : "Valider et créer la tâche";

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
  // Tranche 1: every column of an answer's table sorts (descending, ascending, then as read); dates by their time, an
  // empty date last whatever the direction would put it first.
  sortable: true,
  sortValue:
    column.kind === "date" || column.kind === "datetime"
      ? (value) => dateOf(value)?.getTime() ?? Number.MAX_SAFE_INTEGER
      : undefined,
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
  // The tasks store serves only the card's write (and its check for tasks already open); answers never read from it.
  const tasks = useSQLite<Task>("tasks");
  const [loading, setLoading] = useState(false);
  // A table that could not be read is never answered as if it were empty.
  const [readError, setReadError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  // The Message skeleton shows only for a read that lasts: a fast answer would make it flash.
  const [slow, setSlow] = useState(false);
  const slowRef = useRef(false);
  useEffect(() => {
    if (!loading) {
      return;
    }
    const timer = setTimeout(() => {
      slowRef.current = true;
      setSlow(true);
      // The skeleton comes after the thread: the thread scrolls to it.
      requestAnimationFrame(() => {
        const list = scroller.current;
        const pending = list?.querySelector<HTMLElement>(".answer-pending");
        if (list && pending) {
          list.scrollTo({
            top:
              list.scrollTop +
              pending.getBoundingClientRect().top -
              list.getBoundingClientRect().top,
          });
        }
      });
    }, 120);
    return () => {
      clearTimeout(timer);
      slowRef.current = false;
      setSlow(false);
    };
  }, [loading]);
  const blocked = loading;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const saving = useRef(new Set<string>());
  // A question already being read: a second Entrée before the answer is ignored.
  const asking = useRef(false);

  useEffect(() => {
    // The new question goes to the top of the view: the answer is read from its first line, not from its last. Only the
    // thread scrolls: `scrollIntoView` also scrolled the panel's own containers, which pushed the panel's header out of
    // the window (measured on 19 November 2026: -121 px after one question).
    const list = scroller.current;
    const questions = list?.querySelectorAll<HTMLElement>("[data-question]");
    const last = questions?.[questions.length - 1];
    if (list && last) {
      list.scrollTo({
        top:
          list.scrollTop +
          last.getBoundingClientRect().top -
          list.getBoundingClientRect().top,
      });
    }
  }, [turns.length]);

  const ask = async (text: string) => {
    const question = text.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!question || blocked || asking.current) {
      return;
    }
    asking.current = true;
    const started = performance.now();
    const now = new Date();
    setLoading(true);
    setLastQuestion(question);
    await guard(
      async () => {
        // One guarded snapshot per question: the answer is computed on what was read for it, and nothing else.
        const { data, receipt } = await readClinicData({ now });
        const answer = answerQuestion(question, data, { now, patientId });
        const durationMs = Math.max(1, Math.round(performance.now() - started));
        setReadError(null);
        setTurns((current) => [
          ...current,
          {
            id: `${now.getTime()}-${current.length}`,
            question,
            at: now.toISOString(),
            durationMs,
            answer,
            receipt,
            tasksRead: data.tasks,
          },
        ]);
        // The skeleton leaves with the answer: when it was shown, the end of the wait is said once.
        if (slowRef.current) {
          announce("Réponse affichée");
        }
        setDraft("");
      },
      {
        recover: (error) => {
          setReadError(
            error instanceof Error ? error.message : "Lecture impossible"
          );
        },
        cleanup: () => {
          asking.current = false;
          setLoading(false);
          // The composer was disabled during the read: the keyboard goes back to it for the next question.
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLTextAreaElement>(
                "[data-clinic-answers] textarea"
              )
              ?.focus()
          );
        },
      }
    );
  };

  /** The only write of this tab, and only from the card's « Valider ». */
  const confirm = async (
    turnId: string,
    proposal: Proposal,
    tasksRead: Task[] = []
  ) => {
    if (saving.current.has(turnId)) {
      return;
    }
    saving.current.add(turnId);
    setCards((current) => ({ ...current, [turnId]: { status: "confirming" } }));
    await guard(
      async () => {
        // Tasks already open, as the store holds them and as the answer read them: none is created twice.
        const known = [
          ...tasks.data,
          ...tasksRead.filter(
            (read) => !tasks.data.some((held) => held.id === read.id)
          ),
        ];
        const { created, expected } = await saveProposal(
          proposal,
          known,
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
        <div className="scroll-mt-1" data-question>
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
          onConfirm={(proposal) =>
            void confirm(turn.id, proposal, turn.tasksRead)
          }
          turn={turn}
        />
      ),
    },
  ]);

  const waiting = pendingProposal(turns, cards);
  const waitingId = waiting?.turnId ?? null;
  // Whether the whole card is in sight in the thread: the short version shows only while it is not.
  // Kept per card: a new card is out of sight until the observer says otherwise.
  const [sighted, setSighted] = useState<string | null>(null);
  const cardInSight = waitingId !== null && sighted === waitingId;
  useEffect(() => {
    const list = scroller.current;
    const target = waitingId
      ? list?.querySelector<HTMLElement>(
          `[data-proposal-card="${CSS.escape(waitingId)}"]`
        )
      : null;
    if (!(list && target) || typeof IntersectionObserver === "undefined") {
      return;
    }
    // Most of the card in the thread's visible part counts as seen: its buttons are then on screen.
    const observer = new IntersectionObserver(
      ([entry]) =>
        setSighted(entry.intersectionRatio >= 0.6 ? waitingId : null),
      { root: list, threshold: [0, 0.6, 1] }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [waitingId]);
  const showCard = () => {
    const list = scroller.current;
    const target = waitingId
      ? list?.querySelector<HTMLElement>(
          `[data-proposal-card="${CSS.escape(waitingId)}"]`
        )
      : null;
    // Only the thread scrolls (see the effect above): `scrollIntoView` would also move the panel's own containers.
    if (list && target) {
      list.scrollTo({
        top:
          list.scrollTop +
          target.getBoundingClientRect().bottom -
          list.getBoundingClientRect().bottom,
        behavior: "smooth",
      });
    }
  };
  const turnOf = (id: string) => turns.find((turn) => turn.id === id);

  const last = turns.at(-1);
  const followUps = last?.answer.followUps ?? [];
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
      data-clinic-answers
    >
      {/* The thread is a size container: an answer takes the whole column (see `ANSWER_WIDTH`), short or long. */}
      <div
        className="assistant-dictation-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 [container-type:inline-size]"
        ref={scroller}
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
        {loading && slow ? (
          <MessageSkeleton
            className="answer-pending"
            label="Lecture des données du cabinet…"
          />
        ) : null}
      </div>

      {waiting && !cardInSight ? (
        <ProposalDock
          card={waiting.card}
          // The outcome (tasks added, or what failed) is written on the whole card: the thread goes to it once saved.
          onConfirm={() =>
            void confirm(
              waiting.turnId,
              waiting.proposal,
              turnOf(waiting.turnId)?.tasksRead
            ).then(showCard)
          }
          onShow={showCard}
          proposal={waiting.proposal}
        />
      ) : null}

      {readError ? (
        <div
          className="t-13 shrink-0 rounded-[var(--radius-panel)] bg-negative/10 p-3 text-foreground"
          role="alert"
        >
          Les données du cabinet n’ont pas pu être lues : {readError} Je ne
          réponds pas tant que la lecture échoue, pour ne pas afficher de
          chiffres faux.
          <div className="mt-2">
            <Button
              icon={RotateCcw}
              onClick={() => lastQuestion && void ask(lastQuestion)}
            >
              Relire et répondre
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
          <span className="t-12 inline-flex items-center gap-1.5 text-muted-foreground">
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
          data={{
            id: `${turn.id}-${step.id}`,
            name: step.name,
            summary: step.summary,
            status: "success",
            durationMs:
              index === answer.steps.length - 1 ? turn.durationMs : undefined,
            details: step.details,
          }}
          key={step.id}
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
      {answer.cards.length > 0 ? (
        <Shell className="answer-cards">
          <StatCardGrid count={answer.cards.length}>
            {answer.cards.map((card) => {
              const figure = answer.figures.find(
                (item) => item.id === card.figure
              )!;
              const [value, unit] =
                figure.kind === "money"
                  ? splitUnit(formatDinars(figure.value / 100, 2))
                  : [formatNumber(figure.value), ""];
              return (
                <StatCard
                  key={card.figure}
                  label={figure.label}
                  tone={card.tone}
                  unit={unit || undefined}
                  value={value}
                />
              );
            })}
          </StatCardGrid>
        </Shell>
      ) : null}
      {answer.chart ? (
        <Shell>
          <Panel className="p-4">
            <AnswerChart chart={answer.chart} />
          </Panel>
        </Shell>
      ) : null}
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
        sources={[
          ...answer.sources.map((from) => ({
            id: `${turn.id}-${from.id}`,
            group: "Données du cabinet, sur cet ordinateur",
            icon: Database,
            title: from.label,
            tag: `${formatNumber(from.kept)} sur ${formatNumber(from.read)}`,
            date: clock(turn.at),
            passage: from.filter,
          })),
          // How it was read: the port, the statements that went through it, and the changes counted by SQLite (always 0).
          ...(turn.receipt
            ? [
                {
                  id: `${turn.id}-port`,
                  group: "Lecture seule, vérifiée",
                  icon: Database,
                  title:
                    turn.receipt.via === "sqlite"
                      ? "Porte de lecture du harnais"
                      : "Copie du navigateur",
                  tag:
                    turn.receipt.via === "sqlite"
                      ? `${plural(turn.receipt.statements, "requête", "requêtes")} · ${plural(turn.receipt.changes, "écriture", "écritures")}`
                      : "aucune écriture possible",
                  date: clock(turn.receipt.at),
                  passage:
                    turn.receipt.via === "sqlite"
                      ? `Un seul instantané, instructions SELECT seulement ; modifications comptées par SQLite avant et après : ${formatNumber(turn.receipt.changes)}.`
                      : "Dans le navigateur, les tables sont des copies : rien de ce qui écrit n’est atteint.",
                },
              ]
            : []),
        ]}
      />
      {proposal && card?.status !== "dismissed" ? (
        <div className="scroll-mt-1" data-proposal-card={turn.id}>
          <ProposalCard
            card={card}
            onCancel={onCancel}
            onConfirm={() => onConfirm(proposal)}
            proposal={proposal}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The short version of a waiting card, pinned at the foot of the panel while the whole card is out of sight. Same title,
 * same « Valider » (it calls the same `confirm`, which checks again against the tasks already open): nothing is written
 * from here that the card would not write.
 */
export function ProposalDock({
  proposal,
  card,
  onShow,
  onConfirm,
}: {
  proposal: Proposal;
  card?: CardState;
  onShow: () => void;
  onConfirm: () => void;
}) {
  const confirming = card?.status === "confirming";
  return (
    <Shell
      aria-label={`${proposal.title} (version courte)`}
      className="answer-proposal-dock shrink-0"
      data-proposal-dock
    >
      {/* The panel is narrow (about 440 px): the title gets its own line, the buttons the next one. */}
      <Panel className="flex flex-col gap-1.5 border border-border px-3 py-2">
        <div className="flex min-w-0 items-start gap-2">
          <BadgeCheck
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0 flex-1">
            <p className="t-13 font-medium text-foreground">{proposal.title}</p>
            <p className="t-12 text-muted-foreground">
              {card?.error ?? "Rien n’est enregistré sans votre validation."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button icon={ArrowDown} onClick={onShow} size="sm" variant="quiet">
            Voir la carte
          </Button>
          <Button
            loading={confirming}
            onClick={onConfirm}
            size="sm"
            variant="primary"
          >
            {confirming ? "Enregistrement…" : confirmLabelOf(proposal)}
          </Button>
        </div>
      </Panel>
    </Shell>
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
      confirmLabel={confirmLabelOf(proposal)}
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
