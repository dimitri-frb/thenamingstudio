import { useEffect, useRef, useState } from "react";
import { naming, type Brief, type Msg } from "../lib/namingApi";
import { useVoice, speak, stopSpeaking } from "../lib/useVoice";

// Voice-first brief: the AI interviews the founder out loud, fills the brief
// automatically, then hands off to name generation — no visible step forms.

export function Conversation({ voiceFirst, onComplete, onCancel }: {
  voiceFirst: boolean;
  onComplete: (brief: Brief) => void;
  onCancel: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(true);
  const [voice, setVoice] = useState(voiceFirst);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const { supported, listening, start, stop } = useVoice((t) => setDraft(t));

  // Kick off with the AI's first question.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const turn = await naming.interview([]);
        setMessages([{ role: "assistant", text: turn.say }]);
        if (voice) speak(turn.say);
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setThinking(false);
      }
    })();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || thinking) return;
    stopSpeaking();
    const next: Msg[] = [...messages, { role: "user", text: t }];
    setMessages(next);
    setDraft("");
    setThinking(true);
    setError(null);
    try {
      const turn = await naming.interview(next);
      setMessages([...next, { role: "assistant", text: turn.say }]);
      const finish = () => { setFinishing(true); window.setTimeout(() => onComplete(turn.brief!), 900); };
      if (voice) speak(turn.say, turn.done && turn.brief ? finish : undefined);
      else if (turn.done && turn.brief) finish();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setThinking(false);
    }
  }

  function micTap() {
    if (listening) { stop(); if (draft.trim()) send(draft); }
    else { setDraft(""); stopSpeaking(); start(""); }
  }

  return (
    <div className="mx-auto flex min-h-[78vh] max-w-2xl flex-col px-1 pt-6">
      {/* header */}
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-ink/40">
        <button onClick={onCancel} className="hover:text-ink" title="Leave">✕</button>
        <span>The brief</span>
        <button onClick={() => { setVoice((v) => !v); stopSpeaking(); }} className={`text-base ${voice ? "text-accent" : "hover:text-ink"}`} title={voice ? "Voice on — tap to mute" : "Voice off — tap to unmute"}>
          {voice ? "🔊" : "🔇"}
        </button>
      </div>

      {/* transcript */}
      <div ref={scroller} className="mt-6 flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              m.role === "user"
                ? "rounded-br-md bg-accent/10 text-ink"
                : "rounded-bl-md border border-ink/10 bg-[var(--surface-solid)]"
            }`}>
              {m.role === "assistant"
                ? <p className="font-serif text-xl leading-snug">{m.text}</p>
                : <p className="text-[15px] leading-relaxed text-ink/80">{m.text}</p>}
            </div>
          </div>
        ))}

        {listening && draft && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md border border-accent/30 bg-accent/5 px-4 py-3 text-[15px] italic text-ink/60">{draft}…</div>
          </div>
        )}

        {(thinking || finishing) && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-ink/10 bg-[var(--surface-solid)] px-4 py-3">
              <span className="flex gap-1">
                <Dot /> <Dot d="150ms" /> <Dot d="300ms" />
              </span>
            </div>
          </div>
        )}

        {finishing && <p className="text-center font-serif text-lg italic text-ink/50">Finding your names…</p>}
        {error && <p className="rounded-xl border border-red-400/40 bg-red-500/5 p-3 text-sm text-red-500">{error}</p>}
      </div>

      {/* composer */}
      {!finishing && (
        <div className="sticky bottom-0 -mx-1 border-t border-ink/10 bar-bg px-4 py-3 backdrop-blur">
          <div className="flex items-end gap-2">
            {supported && (
              <button
                onClick={micTap}
                title={listening ? "Stop & send" : "Hold the thought — tap to talk"}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition ${
                  listening ? "border-accent bg-accent text-white" : "border-ink/20 text-ink/60 hover:border-ink/40"
                }`}
              >
                {listening ? <Stop /> : <Mic />}
              </button>
            )}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
              placeholder={listening ? "Listening…" : supported ? "Tap the mic, or type your answer…" : "Type your answer…"}
              className="min-w-0 flex-1 rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 outline-none transition placeholder:text-ink/30 focus:border-accent/50"
            />
            <button
              onClick={() => send(draft)}
              disabled={!draft.trim() || thinking}
              className="shrink-0 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-[var(--page)] transition enabled:hover:opacity-90 disabled:opacity-30"
            >
              Send
            </button>
          </div>
          {voice && supported && <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-ink/35">Voice on · I'll read each question aloud</p>}
        </div>
      )}
    </div>
  );
}

function Dot({ d = "0ms" }: { d?: string }) {
  return <span className="h-2 w-2 animate-bounce rounded-full bg-ink/30" style={{ animationDelay: d }} />;
}
function Mic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}
function Stop() {
  return <span className="h-3.5 w-3.5 rounded-[3px] bg-white" />;
}
