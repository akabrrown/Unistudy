'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface Options {
  onFinalText: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
  lang?: string;
}

export function useSpeechInput({ onFinalText, onInterim, onError, lang = 'en-US' }: Options) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const handlersRef = useRef({ onFinalText, onInterim, onError });

  useEffect(() => {
    handlersRef.current = { onFinalText, onInterim, onError };
  }, [onFinalText, onInterim, onError]);

  useEffect(() => {
    setIsSupported(getRecognitionCtor() !== null);
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      handlersRef.current.onError?.('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (finalText) handlersRef.current.onFinalText(finalText.trim());
      handlersRef.current.onInterim?.(interim);
    };
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        handlersRef.current.onError?.(
          e.error === 'not-allowed'
            ? 'Microphone permission was blocked. Allow it in your browser settings.'
            : `Voice input error: ${e.error}`
        );
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      handlersRef.current.onInterim?.('');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, isSupported, start, stop, toggle };
}
