import "@/modules/consultations/components/assistant-thinking.css";
import { useState } from "react";
import type { View } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { generateText } from "@/services/localTextService";
interface Props {
  currentView: View;
  onClose?: () => void;
  patientId?: string | null;
  userAvatarUrl?: string | null;
  userDisplayName?: string;
}
export function AIAgentChat({ onClose }: Props) {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    if (!text.trim() || busy) return;
    const input = text;
    setText("");
    setMessages((previous) => [...previous, { role: "user", text: input }]);
    setBusy(true);
    setError(null);
    try {
      const answer = await generateText(input, "", { history: messages });
      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: answer },
      ]);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "La préparation a échoué."
      );
      setText(input);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Assistant</h1>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Pour une note clinique, ouvrez l’assistant depuis la consultation. Rien
        n’est enregistré ici.
      </p>
      {messages.map((message, index) => (
        <Message key={index} align={message.role === "user" ? "end" : "start"}>
          <MessageContent>
            <Bubble variant="secondary">
              <BubbleContent className="whitespace-pre-wrap">
                {message.text}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      ))}
      {busy && (
        <Marker role="status">
          <MarkerContent className="assistant-thinking-text">
            Préparation en cours…
          </MarkerContent>
        </Marker>
      )}
      {error && <p role="alert">{error}</p>}
      <Textarea
        aria-label="Votre message"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={busy}
      />
      <Button onClick={() => void send()} disabled={busy || !text.trim()}>
        Envoyer
      </Button>
    </section>
  );
}
