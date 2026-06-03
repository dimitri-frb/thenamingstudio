import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in lib.dom by default).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Push-to-talk dictation. Calls `onText` with the full transcript (committed +
 * interim) so the caller can live-update an input. Auto-detects support.
 */
export function useVoice(onText: (text: string) => void, lang = "en-US") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const committedRef = useRef("");

  useEffect(() => {
    setSupported(!!getRecognition());
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(
    (seed = "") => {
      const rec = getRecognition();
      if (!rec) {
        setSupported(false);
        return;
      }
      setError(null);
      committedRef.current = seed ? seed.trim() + " " : "";
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) committedRef.current += r[0].transcript;
          else interim += r[0].transcript;
        }
        onText((committedRef.current + interim).replace(/\s+/g, " ").trimStart());
      };
      rec.onerror = (ev) => {
        setError(ev.error === "not-allowed" ? "Mic access denied" : ev.error);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    },
    [lang, onText],
  );

  const toggle = useCallback((seed = "") => (listening ? stop() : start(seed)), [listening, start, stop]);

  return { supported, listening, error, start, stop, toggle };
}
