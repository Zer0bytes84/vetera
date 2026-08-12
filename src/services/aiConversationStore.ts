const STORAGE_KEY = "baitari-ai-agent-state-v1";
const MAX_CONVERSATIONS = 20;
const MAX_MESSAGES_PER_CONVERSATION = 40;
const MAX_MESSAGE_LENGTH = 8_000;
const MAX_STATE_LENGTH = 1_500_000;
const MAX_RAW_STATE_LENGTH = 2_000_000;

export interface PersistedAIMessage {
  actionCard?: unknown;
  content: string;
  id: string;
  isToolCall?: boolean;
  thoughtTimeSeconds?: number;
  timestamp: string;
  toolSteps?: { title: string; type?: string; sources?: string[] }[];
  role: "user" | "assistant";
}

export interface PersistedAIConversation {
  createdAt: string;
  id: string;
  messages: PersistedAIMessage[];
  title: string;
  updatedAt: string;
}

export interface PersistedAIAgentState {
  activeConversationId: string;
  conversations: PersistedAIConversation[];
  isReasoningMode: boolean;
  selectedModelId: string;
  selectedPatientId: string;
}

const getStorage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asDateString = (value: unknown): string => {
  const date = new Date(asString(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const parseMessage = (value: unknown): PersistedAIMessage | null => {
  if (!isRecord(value)) return null;
  const role = value.role === "user" || value.role === "assistant" ? value.role : null;
  const content = asString(value.content);
  if (!role || !asString(value.id) || !content) return null;

  return {
    actionCard: value.actionCard,
    content: content.slice(-MAX_MESSAGE_LENGTH),
    id: asString(value.id),
    isToolCall: value.isToolCall === true,
    thoughtTimeSeconds:
      typeof value.thoughtTimeSeconds === "number" ? value.thoughtTimeSeconds : undefined,
    timestamp: asDateString(value.timestamp),
    toolSteps: Array.isArray(value.toolSteps)
      ? value.toolSteps.filter(isRecord).map((step) => ({
          title: asString(step.title, "Étape clinique"),
          type: asString(step.type) || undefined,
          sources: Array.isArray(step.sources)
            ? step.sources.filter((source): source is string => typeof source === "string")
            : undefined,
        }))
      : undefined,
    role,
  };
};

const parseConversation = (value: unknown): PersistedAIConversation | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  if (!id) return null;

  const messages = Array.isArray(value.messages)
    ? value.messages.map(parseMessage).filter((message): message is PersistedAIMessage => Boolean(message))
    : [];

  return {
    createdAt: asDateString(value.createdAt),
    id,
    messages: messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
    title: asString(value.title, "Nouvelle conversation").slice(0, 120),
    updatedAt: asDateString(value.updatedAt),
  };
};

export function loadAIAgentState(): PersistedAIAgentState | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw.length > MAX_RAW_STATE_LENGTH) {
      // Do not make every app launch parse an oversized or runaway cache.
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.conversations)) return null;

    const conversations = parsed.conversations
      .map(parseConversation)
      .filter((conversation): conversation is PersistedAIConversation => Boolean(conversation))
      .slice(0, MAX_CONVERSATIONS);
    if (conversations.length === 0) return null;

    const requestedActiveId = asString(parsed.activeConversationId);
    const activeConversationId = conversations.some(({ id }) => id === requestedActiveId)
      ? requestedActiveId
      : conversations[0].id;

    return {
      activeConversationId,
      conversations,
      isReasoningMode: parsed.isReasoningMode !== false,
      selectedModelId: asString(parsed.selectedModelId),
      selectedPatientId: asString(parsed.selectedPatientId),
    };
  } catch {
    // A corrupt or unavailable local preference must never block the app.
    return null;
  }
}

export function saveAIAgentState(state: PersistedAIAgentState): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const boundedConversations = state.conversations
      .slice(0, MAX_CONVERSATIONS)
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION).map((message) => ({
          ...message,
          content: message.content.slice(-MAX_MESSAGE_LENGTH),
        })),
      }));

    const createPayload = (conversations: PersistedAIConversation[]) => ({
      ...state,
      conversations,
    });

    const compactConversations = boundedConversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.slice(-24).map((message) => ({
        ...message,
        content: message.content.slice(-2_500),
      })),
    }));

    const payload = createPayload(compactConversations);
    let serialized = JSON.stringify(payload);

    // Keep local persistence small enough not to block a Tauri WebView on startup.
    while (serialized.length > MAX_STATE_LENGTH && payload.conversations.length > 1) {
      let removableIndex = -1;
      for (let index = payload.conversations.length - 1; index >= 0; index -= 1) {
        if (payload.conversations[index].id !== state.activeConversationId) {
          removableIndex = index;
          break;
        }
      }
      if (removableIndex < 0) break;
      payload.conversations.splice(removableIndex, 1);
      serialized = JSON.stringify(payload);
    }

    if (serialized.length > MAX_STATE_LENGTH) {
      payload.conversations = payload.conversations.map((conversation) => ({
        ...conversation,
        messages: conversation.messages.slice(-12).map((message) => ({
          ...message,
          content: message.content.slice(-1_200),
        })),
      }));
      serialized = JSON.stringify(payload);
    }

    storage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Persistence is a convenience; a restricted Tauri WebView can disable it.
  }
}
