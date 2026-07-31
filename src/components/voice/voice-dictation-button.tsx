"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { loadBrowserVoiceSettings } from "@/components/voice/voice-runtime";

export function VoiceDictationButton({
  onTranscript,
  disabled = false,
  compact = false,
}: {
  onTranscript: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<NexusSpeechRecognition | null>(null);

  useEffect(() => {
    const capabilityTimer = window.setTimeout(() => {
      const settings = loadBrowserVoiceSettings();
      const hasRecognition = Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

      setSupported(hasRecognition && settings.recognition_provider !== "disabled");
    }, 0);

    return () => {
      window.clearTimeout(capabilityTimer);
      recognitionRef.current?.abort();
    };
  }, []);

  if (!supported) return null;

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const start = () => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const settings = loadBrowserVoiceSettings();
    if (!Constructor || settings.recognition_provider === "disabled") return;
    const recognition = new Constructor();
    recognition.lang = settings.language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let value = "";
      for (let index = 0; index < event.results.length; index += 1) value += `${event.results[index]?.[0]?.transcript ?? ""} `;
      onTranscript(value.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      toast.error(event.error === "not-allowed" ? "El navegador no concedió acceso al micrófono." : "No pudimos reconocer el audio.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "ghost"}
      size={compact ? "icon-sm" : "sm"}
      disabled={disabled}
      onClick={listening ? stop : start}
      title={listening ? "Detener dictado" : "Dictar mensaje"}
    >
      {listening ? <MicOff /> : <Mic />}
      {compact ? <span className="sr-only">{listening ? "Detener dictado" : "Dictar mensaje"}</span> : listening ? "Detener" : "Dictar"}
    </Button>
  );
}
