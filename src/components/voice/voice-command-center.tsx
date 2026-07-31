"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, LoaderCircle, Mic, MicOff, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadBrowserVoiceSettings, speakText } from "@/components/voice/voice-runtime";
import { cn } from "@/lib/utils";

type ProposedAction = {
  kind: "create" | "complete" | "start" | "postpone";
  pendingId?: string;
  title?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
};

type CommandResponse = {
  ok: boolean;
  message: string;
  requiresConfirmation?: boolean;
  action?: ProposedAction;
  mutated?: boolean;
};

export function VoiceCommandCenter({ compact = false }: { compact?: boolean }) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CommandResponse | null>(null);
  const [supported, setSupported] = useState(false);
  const [recognitionEnabled, setRecognitionEnabled] = useState(true);
  const recognitionRef = useRef<NexusSpeechRecognition | null>(null);

  useEffect(() => {
    const capabilityTimer = window.setTimeout(() => {
      const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      const settings = loadBrowserVoiceSettings();

      setRecognitionEnabled(settings.recognition_provider !== "disabled");
      setSupported(Boolean(Constructor));
    }, 0);

    return () => {
      window.clearTimeout(capabilityTimer);
      recognitionRef.current?.abort();
    };
  }, []);

  const examples = useMemo(() => [
    "Agrega como pendiente enviar el reporte mañana a las diez, prioridad alta.",
    "¿Qué pendientes urgentes tengo esta semana?",
    "Marca como completado pagar internet.",
    "Pospón preparar la junta para el viernes.",
  ], []);

  const speakResponse = (message: string) => {
    const settings = loadBrowserVoiceSettings();
    if (settings.confirmations_spoken) speakText(message, settings);
  };

  const submit = async (action?: ProposedAction) => {
    const content = transcript.trim();
    if (!content && !action) return;
    setLoading(true);
    setResponse(null);
    try {
      const result = await fetch("/api/voice/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: content,
          confirm: Boolean(action),
          action,
          localDate: new Date().toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const payload = (await result.json()) as CommandResponse;
      setResponse(payload);
      if (payload.message) speakResponse(payload.message);
      if (payload.ok && payload.mutated) {
        window.setTimeout(() => window.location.reload(), 500);
      }
    } catch {
      setResponse({ ok: false, message: "No pudimos procesar el comando de voz." });
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const currentSettings = loadBrowserVoiceSettings();
    if (!Constructor || currentSettings.recognition_provider === "disabled") return;
    const recognition = new Constructor();
    const settings = loadBrowserVoiceSettings();
    recognition.lang = settings.language;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let value = "";
      for (let index = 0; index < event.results.length; index += 1) {
        value += event.results[index]?.[0]?.transcript ?? "";
      }
      setTranscript(value.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      setResponse({ ok: false, message: event.error === "not-allowed" ? "El navegador no concedió acceso al micrófono." : "No pudimos reconocer el audio." });
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setResponse(null);
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <section id="voz" className={cn("nexus-panel rounded-2xl", compact ? "p-4" : "p-5 sm:p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/8 text-primary"><Sparkles className="size-4" /></div>
          <div><div className="nexus-kicker">Asistente de voz</div><h2 className="mt-2 text-base font-semibold text-foreground">Pregunta o administra tus pendientes</h2>{!compact ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">NEXUS transcribe el comando, muestra una vista previa y solicita confirmación antes de crear, completar o posponer un pendiente.</p> : null}</div>
        </div>
        {supported && recognitionEnabled ? (
          <Button type="button" variant={listening ? "destructive" : "outline"} size="icon" onClick={listening ? stopListening : startListening} title={listening ? "Detener escucha" : "Hablar con NEXUS"}>
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2">
        <Textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} className={compact ? "min-h-24" : "min-h-28"} placeholder="Ej. Agrega como pendiente preparar la junta mañana a las 10, prioridad alta." />
        <Button type="button" onClick={() => submit()} disabled={loading || !transcript.trim()} className="self-end" title="Procesar comando">
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          <span className="sr-only">Procesar</span>
        </Button>
      </div>

      {!compact ? <div className="mt-3 flex flex-wrap gap-2">{examples.map((example) => <button key={example} type="button" onClick={() => setTranscript(example)} className="nexus-focus rounded-full border border-border bg-muted/25 px-3 py-1.5 text-[0.68rem] text-muted-foreground hover:text-primary">{example}</button>)}</div> : null}

      {response ? (
        <div className={cn("mt-4 rounded-xl border p-4 text-sm", response.ok ? "border-primary/15 bg-primary/[0.035]" : "border-rose-400/20 bg-rose-400/[0.04]") }>
          <div className="flex items-start gap-2">{response.ok ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : <X className="mt-0.5 size-4 shrink-0 text-rose-500" />}<span className="leading-6">{response.message}</span></div>
          {response.requiresConfirmation && response.action ? (
            <div className="mt-4 flex flex-wrap gap-2"><Button type="button" onClick={() => submit(response.action)} disabled={loading}><Check />Confirmar acción</Button><Button type="button" variant="ghost" onClick={() => setResponse(null)}><X />Cancelar</Button></div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
