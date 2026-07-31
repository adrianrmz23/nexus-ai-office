"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadBrowserVoiceSettings, speakText } from "@/components/voice/voice-runtime";

export function VoiceReader({
  text,
  label = "Escuchar",
  compact = false,
  className,
}: {
  text: string;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const capabilityTimer = window.setTimeout(() => {
      const settings = loadBrowserVoiceSettings();
      const hasSynthesis = "speechSynthesis" in window;

      setSupported(hasSynthesis && settings.synthesis_provider !== "disabled");
    }, 0);

    return () => {
      window.clearTimeout(capabilityTimer);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  const start = () => {
    const utterance = speakText(text);
    if (!utterance) return;
    setSpeaking(true);
    setPaused(false);
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
  };

  const togglePause = () => {
    if (!window.speechSynthesis.speaking) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {!speaking ? (
        <Button type="button" variant="outline" size={compact ? "icon-sm" : "sm"} onClick={start} title={label}>
          <Play className="size-3.5" />
          {compact ? <span className="sr-only">{label}</span> : label}
        </Button>
      ) : (
        <>
          <Button type="button" variant="outline" size={compact ? "icon-sm" : "sm"} onClick={togglePause} title={paused ? "Reanudar" : "Pausar"}>
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {compact ? <span className="sr-only">{paused ? "Reanudar" : "Pausar"}</span> : paused ? "Reanudar" : "Pausar"}
          </Button>
          <Button type="button" variant="ghost" size={compact ? "icon-sm" : "sm"} onClick={stop} title="Detener audio">
            <Square className="size-3.5" />
            {compact ? <span className="sr-only">Detener</span> : "Detener"}
          </Button>
        </>
      )}
    </div>
  );
}
