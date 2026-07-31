type NexusSpeechRecognitionResultEvent = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type NexusSpeechRecognitionErrorEvent = { error: string };

type NexusSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: NexusSpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: NexusSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type NexusSpeechRecognitionConstructor = new () => NexusSpeechRecognition;

interface Window {
  SpeechRecognition?: NexusSpeechRecognitionConstructor;
  webkitSpeechRecognition?: NexusSpeechRecognitionConstructor;
}
