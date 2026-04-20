import type { ChatMessage } from "../types"

import { APP_NAME } from "@/lib/brand"
import {
  generateText,
  getLocalModelId,
  initializeWebLLM,
  isWebLLMReady,
  type LocalChatTurn,
} from "./webLLMService"

const ASSISTANT_SYSTEM_PROMPT = `Tu es l'assistant officiel de ${APP_NAME}, logiciel de clinique veterinaire.
Tu aides l'equipe sur l'organisation, les dossiers patients, les notes cliniques et les actions quotidiennes.

Contraintes:
- Toujours repondre en francais.
- Reponses courtes et precises.
- Si risque clinique: proposer verification veterinaire avant action.`

const NOTE_ASSISTANT_PROMPT = `Tu es un assistant de redaction clinique.
Ton objectif: produire un texte professionnel, lisible et exploitable en consultation.
- Style direct.
- Pas de blabla.
- Utilise des puces si utile.`

const convertMarkdownToHTML = (text: string): string => {
  let html = text

  html = html
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")

  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)

  const lines = html.split("\n")
  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return ""
      if (trimmed.startsWith("<")) return trimmed
      return `<p>${trimmed}</p>`
    })
    .filter(Boolean)
    .join("\n")
}

const NOTE_PROMPTS: Record<string, (text: string) => string> = {
  "Corrige l'orthographe et la grammaire": (text) =>
    `Corrige uniquement orthographe et grammaire, sans commentaire.\n\nTexte:\n${text}`,
  "Reformule de manière professionnelle": (text) =>
    `Reformule ce texte en style professionnel et clair (max 200 mots).\n\nTexte:\n${text}`,
  "Résume en points clés": (text) =>
    `Resumer en 3 a 6 points cles, format puces.\n\nTexte:\n${text}`,
}

const isWriteInstruction = (instruction: string): boolean => {
  const normalized = instruction.toLowerCase()
  return (
    normalized.includes("redige") ||
    normalized.includes("ecris") ||
    normalized.includes("genere")
  )
}

const toLocalHistory = (history: ChatMessage[]): LocalChatTurn[] =>
  history.slice(-8).map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    text: message.text,
  }))

export const sendMessageToGemini = async (
  history: ChatMessage[],
  newMessage: string
): Promise<string> => {
  try {
    if (!isWebLLMReady()) {
      await initializeWebLLM()
    }

    const response = await generateText(newMessage, "", {
      history: toLocalHistory(history),
      systemPrompt: ASSISTANT_SYSTEM_PROMPT,
      temperature: 0.25,
      maxTokens: 900,
    })

    if (!response) {
      return "Je n'ai pas pu generer une reponse utile. Peux-tu reformuler ?"
    }

    return response
  } catch (error) {
    console.error("[LocalAI] Erreur assistant:", error)
    return `Une erreur s'est produite avec le modele local (${getLocalModelId()}).`
  }
}

export const assistWithNote = async (
  content: string,
  instruction: string
): Promise<string> => {
  if (!isWebLLMReady()) {
    await initializeWebLLM()
  }

  const promptFn = NOTE_PROMPTS[instruction]

  let prompt = ""
  if (promptFn) {
    prompt = promptFn(content)
  } else if (isWriteInstruction(instruction)) {
    prompt = `${instruction}\n\nContraintes:\n- Texte court et clair\n- Structure avec titres/puces\n- Ton professionnel`
  } else {
    prompt = `${instruction}\n\nTexte:\n${content}`
  }

  const generated = await generateText(prompt, "", {
    systemPrompt: NOTE_ASSISTANT_PROMPT,
    temperature: 0.3,
    maxTokens: 1100,
  })

  return convertMarkdownToHTML(generated)
}
