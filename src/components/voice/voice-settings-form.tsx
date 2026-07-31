"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Mic2, Save, Speaker, Volume2 } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceReader } from "@/components/voice/voice-reader";
import { saveBrowserVoiceSettings } from "@/components/voice/voice-runtime";
import type { VoiceSettingsRecord } from "@/modules/pendings/domain/pending";

export function VoiceSettingsForm({
  action,
  initial,
  error,
  success,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial: VoiceSettingsRecord;
  error?: string;
  success?: string;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [recognitionProvider, setRecognitionProvider] = useState(initial.recognition_provider);
  const [synthesisProvider, setSynthesisProvider] = useState(initial.synthesis_provider);
  const [voiceName, setVoiceName] = useState(initial.voice_name ?? "");
  const [language, setLanguage] = useState(initial.language);
  const [timeZone, setTimeZone] = useState(initial.time_zone);
  const [rate, setRate] = useState(Number(initial.speech_rate));
  const [pitch, setPitch] = useState(Number(initial.speech_pitch));
  const [volume, setVolume] = useState(Number(initial.speech_volume));
  const [autoReadBriefing, setAutoReadBriefing] = useState(initial.auto_read_briefing);
  const [autoReadAssistant, setAutoReadAssistant] = useState(initial.auto_read_assistant);
  const [confirmationsSpoken, setConfirmationsSpoken] = useState(initial.confirmations_spoken);
  const [browserNotifications, setBrowserNotifications] = useState(initial.browser_notifications);
  const [dailyBriefingEnabled, setDailyBriefingEnabled] = useState(initial.daily_briefing_enabled);
  const [dailyBriefingTime, setDailyBriefingTime] = useState(initial.daily_briefing_time.slice(0, 5));

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  useEffect(() => {
    saveBrowserVoiceSettings({
      recognition_provider: recognitionProvider,
      synthesis_provider: synthesisProvider,
      language,
      time_zone: timeZone,
      voice_name: voiceName || null,
      speech_rate: rate,
      speech_pitch: pitch,
      speech_volume: volume,
      auto_read_briefing: autoReadBriefing,
      auto_read_assistant: autoReadAssistant,
      confirmations_spoken: confirmationsSpoken,
      browser_notifications: browserNotifications,
      daily_briefing_enabled: dailyBriefingEnabled,
      daily_briefing_time: dailyBriefingTime,
    });
  }, [recognitionProvider, synthesisProvider, language, timeZone, voiceName, rate, pitch, volume, autoReadBriefing, autoReadAssistant, confirmationsSpoken, browserNotifications, dailyBriefingEnabled, dailyBriefingTime]);

  const filteredVoices = useMemo(() => {
    const prefix = language.slice(0, 2).toLowerCase();
    return voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
  }, [voices, language]);

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setBrowserNotifications(permission === "granted");
  };

  return (
    <form action={action} className="space-y-5">
      <FormMessage error={error} success={success} />
      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-primary/15 bg-primary/8 text-primary"><Mic2 className="size-4" /></div>
          <div><div className="nexus-kicker">Entrada de voz</div><h2 className="mt-2 text-base font-semibold text-foreground">Dictado y comandos</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">El reconocimiento se ejecuta mediante las capacidades disponibles en el navegador. La transcripción puede revisarse antes de confirmar cualquier cambio.</p></div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="recognitionProvider">Proveedor de reconocimiento</Label><select id="recognitionProvider" name="recognitionProvider" value={recognitionProvider} onChange={(event) => setRecognitionProvider(event.target.value as "browser" | "disabled")} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"><option value="browser">Navegador</option><option value="disabled">Desactivado</option></select></div>
          <div className="space-y-2"><Label htmlFor="language">Idioma</Label><select id="language" name="language" value={language} onChange={(event) => setLanguage(event.target.value)} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"><option value="es-MX">Español · México</option><option value="es-ES">Español · España</option><option value="en-US">English · United States</option></select></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="timeZone">Zona horaria</Label><Input id="timeZone" name="timeZone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} maxLength={80} placeholder="America/Mexico_City" /><p className="text-xs text-muted-foreground">Se usa para Hoy, vencimientos y briefing. Puedes usar la zona IANA informada por tu navegador.</p><button type="button" onClick={() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)} className="nexus-focus rounded-md border border-border px-3 py-1.5 text-xs">Usar zona del navegador</button></div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-primary/15 bg-primary/8 text-primary"><Speaker className="size-4" /></div>
          <div><div className="nexus-kicker">Salida de voz</div><h2 className="mt-2 text-base font-semibold text-foreground">Lectura de tareas, pendientes y respuestas</h2></div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="synthesisProvider">Proveedor de síntesis</Label><select id="synthesisProvider" name="synthesisProvider" value={synthesisProvider} onChange={(event) => setSynthesisProvider(event.target.value as "browser" | "disabled")} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"><option value="browser">Navegador</option><option value="disabled">Desactivado</option></select></div>
          <div className="space-y-2"><Label htmlFor="voiceName">Voz</Label><select id="voiceName" name="voiceName" value={voiceName} onChange={(event) => setVoiceName(event.target.value)} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"><option value="">Automática</option>{filteredVoices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="speechRate">Velocidad · {rate.toFixed(1)}</Label><Input id="speechRate" name="speechRate" type="range" min="0.5" max="2" step="0.1" value={rate} onChange={(event) => setRate(Number(event.target.value))} /></div>
          <div className="space-y-2"><Label htmlFor="speechPitch">Tono · {pitch.toFixed(1)}</Label><Input id="speechPitch" name="speechPitch" type="range" min="0" max="2" step="0.1" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} /></div>
          <div className="space-y-2"><Label htmlFor="speechVolume">Volumen · {Math.round(volume * 100)}%</Label><Input id="speechVolume" name="speechVolume" type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></div>
          <div className="flex items-end"><VoiceReader text="Hola. Esta es una prueba de la voz configurada para NEXUS." label="Probar voz" /></div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2"><Volume2 className="size-4 text-primary" /><h2 className="text-base font-semibold">Automatización de audio</h2></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ["autoReadBriefing", "Leer automáticamente el briefing diario", autoReadBriefing, setAutoReadBriefing],
            ["autoReadAssistant", "Leer automáticamente nuevas respuestas", autoReadAssistant, setAutoReadAssistant],
            ["confirmationsSpoken", "Leer confirmaciones de comandos", confirmationsSpoken, setConfirmationsSpoken],
          ].map(([name, label, value, setter]) => (
            <label key={String(name)} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/25 p-4 text-sm"><input type="checkbox" name={String(name)} checked={Boolean(value)} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="size-4 accent-[#55e6c1]" />{String(label)}</label>
          ))}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/25 p-4 text-sm"><input type="checkbox" name="saveTranscripts" defaultChecked={initial.save_transcripts} className="size-4 accent-[#55e6c1]" />Guardar transcripciones</label>
          <label className="flex items-center gap-3 rounded-xl border border-border bg-muted/25 p-4 text-sm text-muted-foreground"><input type="checkbox" name="saveAudio" disabled className="size-4" />No guardar audio original</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/25 p-4 text-sm"><input type="checkbox" name="dailyBriefingEnabled" checked={dailyBriefingEnabled} onChange={(event) => setDailyBriefingEnabled(event.target.checked)} className="size-4 accent-[#55e6c1]" />Briefing diario habilitado</label>
          <div className="space-y-2 rounded-xl border border-border bg-muted/25 p-4"><Label htmlFor="dailyBriefingTime">Hora preferida</Label><Input id="dailyBriefingTime" name="dailyBriefingTime" type="time" value={dailyBriefingTime} onChange={(event) => setDailyBriefingTime(event.target.value)} /></div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><BellRing className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Notificaciones del navegador</h2><p className="mt-1 text-sm text-muted-foreground">Los recordatorios se muestran cuando NEXUS está abierto. El navegador debe conceder permiso.</p></div></div><button type="button" onClick={requestNotifications} className="nexus-focus rounded-lg border border-border px-4 py-2 text-sm">Solicitar permiso</button></div>
        <input type="hidden" name="browserNotifications" value={browserNotifications ? "true" : "false"} />
      </section>

      <div className="flex justify-end"><FormSubmitButton pendingLabel="Guardando..."><Save />Guardar voz y audio</FormSubmitButton></div>
    </form>
  );
}
