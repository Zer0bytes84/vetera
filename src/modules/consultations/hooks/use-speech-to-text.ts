import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useSpeechToText — wrapper minimaliste autour de la Web Speech API
 * (Chrome / Edge / Safari, pas Firefox). Reconnaissance continue FR par défaut,
 * résultats intermédiaires visibles pendant la dictée.
 *
 * L'API n'est pas idempotente : on doit pouvoir appeler start()/stop() à volonté
 * depuis l'UI, et l'objet SpeechRecognition ne survit pas aux remounts.
 */

type SpeechRecognitionAlternative = {
  confidence: number;
  transcript: string;
};

type SpeechRecognitionResultItem = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
  message?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export type SpeechToTextState = {
  error: string | null;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  transcript: string;
};

export interface UseSpeechToTextOptions {
  lang?: string;
  onError?: (message: string) => void;
  onFinalResult?: (transcript: string) => void;
}

export function useSpeechToText(
  options: UseSpeechToTextOptions = {}
): SpeechToTextState {
  const { lang = "fr-FR", onError, onFinalResult } = options;

  const [isSupported] = useState<boolean>(() => {
    return getSpeechRecognitionCtor() !== null;
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinalResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onFinalRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      const msg = "SpeechRecognition not supported";
      setError(msg);
      onErrorRef.current?.(msg);
      return;
    }
    // Si une session est déjà active, on l'arrête avant d'en démarrer une nouvelle
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setError(null);
    setInterimTranscript("");
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.onstart = () => {
      setIsListening(true);
    };
    recognition.onerror = (event) => {
      const message = event.error || "speech_recognition_error";
      setError(message);
      setIsListening(false);
      onErrorRef.current?.(message);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alt = result[0];
        if (!alt) {
          continue;
        }
        if (result.isFinal) {
          final += alt.transcript;
        } else {
          interim += alt.transcript;
        }
      }
      if (final) {
        setTranscript((previous) => {
          const next = previous
            ? `${previous} ${final}`.trim()
            : final.trim();
          onFinalRef.current?.(next);
          return next;
        });
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "speech_start_failed";
      setError(message);
      onErrorRef.current?.(message);
    }
  }, [lang]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setInterimTranscript("");
  }, []);

  useEffect(
    () => () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    },
    []
  );

  return {
    error,
    interimTranscript,
    isListening,
    isSupported,
    start,
    stop,
    transcript,
  };
}
