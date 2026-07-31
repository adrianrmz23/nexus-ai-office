export type TranscriptionRequest = {
  audio: Blob;
  language?: string;
  signal?: AbortSignal;
};

export type TranscriptionResult = {
  text: string;
  language: string | null;
  durationMs: number | null;
  provider: string;
};

export type SpeechRequest = {
  text: string;
  language?: string;
  voice?: string | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  signal?: AbortSignal;
};

export type SpeechResult = {
  provider: string;
  mimeType: string | null;
  durationMs: number | null;
};

export interface SpeechToTextProvider {
  readonly providerId: string;
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
}

export interface TextToSpeechProvider {
  readonly providerId: string;
  synthesize(request: SpeechRequest): Promise<SpeechResult>;
  stream?(request: SpeechRequest): Promise<ReadableStream<Uint8Array>>;
}
