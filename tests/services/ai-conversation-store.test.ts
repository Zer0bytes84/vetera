import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadAIAgentState,
  saveAIAgentState,
  type PersistedAIAgentState,
} from "@/services/aiConversationStore";

const STORAGE_KEY = "baitari-ai-agent-state-v1";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
    read: (key: string) => values.get(key) ?? null,
  };
}

function createState(messageCount = 2, content = "Message clinique") : PersistedAIAgentState {
  const messages = Array.from({ length: messageCount }, (_, index) => ({
    content,
    id: `message-${index}`,
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    timestamp: new Date(2026, 7, 6, 9, index).toISOString(),
  }));

  return {
    activeConversationId: "conversation-1",
    conversations: [
      {
        createdAt: new Date(2026, 7, 6, 9).toISOString(),
        id: "conversation-1",
        messages,
        title: "Suivi clinique",
        updatedAt: new Date(2026, 7, 6, 9, 1).toISOString(),
      },
    ],
    isReasoningMode: true,
    selectedModelId: "Qwen3-0.6B-q4f16_1-MLC",
    selectedPatientId: "patient-1",
  };
}

describe("AI conversation store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores a valid conversation and ignores malformed messages", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...createState(),
        conversations: [
          {
            ...createState().conversations[0],
            messages: [
              ...createState().conversations[0].messages,
              { id: "invalid", role: "system", content: "ignore" },
            ],
          },
        ],
      })
    );

    const restored = loadAIAgentState();

    expect(restored?.activeConversationId).toBe("conversation-1");
    expect(restored?.conversations[0].messages).toHaveLength(2);
  });

  it("compacts long histories before persisting them", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    saveAIAgentState(createState(80, "x".repeat(18_000)));

    const raw = storage.read(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(raw!.length).toBeLessThan(1_500_000);

    const restored = loadAIAgentState();
    expect(restored?.conversations[0].messages.length).toBeLessThanOrEqual(40);
    expect(restored?.conversations[0].messages[0].content.length).toBeLessThanOrEqual(8_000);
  });

  it("drops an oversized cache instead of parsing it on startup", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    storage.setItem(STORAGE_KEY, "x".repeat(2_000_001));

    expect(loadAIAgentState()).toBeNull();
    expect(storage.read(STORAGE_KEY)).toBeNull();
  });
});
