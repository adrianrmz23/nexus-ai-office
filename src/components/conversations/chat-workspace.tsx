"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  BookOpenText,
  CheckCircle2,
  CircleStop,
  Clock3,
  Cpu,
  FileCode2,
  LoaderCircle,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
  Workflow,
  X,
  ListTodo,
  PackagePlus,
  Gavel,
  Bug,
} from "lucide-react";

import { MessageMarkdown } from "@/components/conversations/message-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ChatAttachmentInput,
  ChatStreamEvent,
  ConversationMessageRecord,
  ConversationMode,
  ConversationModel,
} from "@/modules/conversations/domain/conversation";
import type { ProjectAgentOption } from "@/modules/conversations/application/conversation-queries";
import { detectSensitiveAttachment } from "@/modules/conversations/domain/attachment-security";
import {
  MODEL_TASK_LABELS,
  MODEL_TASK_TYPES,
  type ModelTaskType,
} from "@/modules/models/domain/model";

const SUPPORTED_EXTENSIONS = new Set([
  "txt",
  "md",
  "json",
  "sql",
  "ts",
  "tsx",
  "js",
  "jsx",
  "php",
  "liquid",
  "css",
  "scss",
  "html",
  "htm",
  "log",
  "yaml",
  "yml",
  "xml",
  "csv",
  "toml",
  "ini",
  "sh",
  "ps1",
  "py",
  "java",
  "cs",
  "go",
  "rb",
  "vue",
]);

function fileExtension(fileName: string): string {
  const normalizedName = fileName.trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === normalizedName.length - 1) {
    return "";
  }

  return normalizedName.slice(lastDotIndex + 1);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} KB`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function formatDuration(value: number | null): string {
  if (value === null) return "";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function formatCost(value: number | null, currency: string): string {
  if (value === null) return "Costo pendiente";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 6,
  }).format(value);
}

type LocalMessage = ConversationMessageRecord & {
  pending?: boolean;
};

type ExecutionUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
  currency: string;
  durationMs: number | null;
};

export function ChatWorkspace({
  conversation,
  initialMessages,
  agents,
  models,
}: {
  conversation: {
    id: string;
    projectId: string;
    title: string;
    mode: ConversationMode;
    selectedAgentId: string | null;
    preferredModelId: string | null;
    projectName: string;
    projectColor: string;
  };
  initialMessages: ConversationMessageRecord[];
  agents: ProjectAgentOption[];
  models: ConversationModel[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachmentInput[]>([]);
  const [mode, setMode] = useState<ConversationMode>(conversation.mode);
  const [agentId, setAgentId] = useState(
    conversation.selectedAgentId ?? agents.find((agent) => agent.isLead)?.id ?? agents[0]?.id ?? "",
  );
  const [modelId, setModelId] = useState(conversation.preferredModelId ?? "");
  const [taskType, setTaskType] = useState<ModelTaskType>("coding");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<ExecutionUsage>({
    inputTokens: null,
    outputTokens: null,
    estimatedCost: null,
    currency: "USD",
    durationMs: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === agentId) ?? null,
    [agents, agentId],
  );
  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId) ?? null,
    [models, modelId],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
  }, [messages, isStreaming]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setError(null);
    const next: ChatAttachmentInput[] = [];
    let totalBytes = attachments.reduce((sum, item) => sum + item.sizeBytes, 0);

    for (const file of files) {
      if (attachments.length + next.length >= 3) {
        setError("Puedes adjuntar hasta 3 archivos por mensaje.");
        break;
      }
      if (file.size > 262_144) {
        setError(`${file.name} supera el límite de 256 KB.`);
        continue;
      }
      if (totalBytes + file.size > 524_288) {
        setError("Los adjuntos no pueden superar 512 KB en total.");
        break;
      }

      const extension = fileExtension(file.name);
      const textual = file.type.startsWith("text/") || SUPPORTED_EXTENSIONS.has(extension);
      if (!textual) {
        setError(`${file.name} no es un archivo de texto o código compatible.`);
        continue;
      }

      const text = await file.text();
      const sensitiveReason = detectSensitiveAttachment({
        fileName: file.name,
        content: text,
      });
      if (sensitiveReason) {
        setError(`${file.name} ${sensitiveReason}. NEXUS bloqueó el adjunto.`);
        continue;
      }

      next.push({
        fileName: file.name,
        mimeType: file.type || "text/plain",
        sizeBytes: file.size,
        language: extension,
        content: text,
      });
      totalBytes += file.size;
    }

    if (next.length) setAttachments((current) => [...current, ...next]);
  }

  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent || isStreaming) return;
    if (!agentId) {
      setError("Selecciona un agente antes de enviar el mensaje.");
      return;
    }

    setError(null);
    setIsStreaming(true);
    setUsage({
      inputTokens: null,
      outputTokens: null,
      estimatedCost: null,
      currency: "USD",
      durationMs: null,
    });

    const optimisticUserId = `user-${crypto.randomUUID()}`;
    const optimisticAssistantId = `assistant-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const sentAttachments = attachments;

    setMessages((current) => [
      ...current,
      {
        id: optimisticUserId,
        conversation_id: conversation.id,
        role: "user",
        status: "completed",
        agent_id: null,
        model_id: null,
        content: cleanContent,
        error_message: null,
        created_at: now,
        completed_at: now,
        agent: null,
        model: null,
        attachments: sentAttachments.map((attachment, index) => ({
          id: `${optimisticUserId}-${index}`,
          file_name: attachment.fileName,
          mime_type: attachment.mimeType,
          size_bytes: attachment.sizeBytes,
          language: attachment.language,
        })),
        retrievalSources: [],
        teamExecution: null,
      },
      {
        id: optimisticAssistantId,
        conversation_id: conversation.id,
        role: "assistant",
        status: "streaming",
        agent_id: agentId,
        model_id: modelId || null,
        content: "",
        error_message: null,
        created_at: now,
        completed_at: null,
        agent: selectedAgent
          ? {
              id: selectedAgent.id,
              name: selectedAgent.name,
              role: selectedAgent.role,
              icon: selectedAgent.icon,
              color: selectedAgent.color,
            }
          : null,
        model: selectedModel
          ? {
              id: selectedModel.id,
              displayName: selectedModel.displayName,
              providerName: selectedModel.providerName,
            }
          : null,
        attachments: [],
        retrievalSources: [],
        teamExecution:
          mode === "team"
            ? {
                id: `team-${optimisticAssistantId}`,
                status: "planning",
                summary: "El orquestador está preparando el plan operativo.",
                generatedBy: null,
                specialistCount: 0,
                totalInputTokens: null,
                totalOutputTokens: null,
                totalEstimatedCost: null,
                currency: "USD",
                durationMs: null,
                handoffs: [],
              }
            : null,
        pending: true,
      },
    ]);
    setContent("");
    setAttachments([]);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantId = optimisticAssistantId;
    let buffer = "";

    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: cleanContent,
          mode,
          agentId: agentId || null,
          modelId: modelId || null,
          taskType,
          attachments: sentAttachments,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No pudimos iniciar la ejecución.");
      }
      if (!response.body) throw new Error("El servidor no devolvió un stream legible.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const processLine = (line: string) => {
        if (!line.trim()) return;
        const streamEvent = JSON.parse(line) as ChatStreamEvent;

        if (streamEvent.type === "meta") {
          assistantId = streamEvent.assistantMessageId;
          setMessages((current) =>
            current.map((message) =>
              message.id === optimisticAssistantId
                ? {
                    ...message,
                    id: streamEvent.assistantMessageId,
                    agent_id: streamEvent.agent.id,
                    model_id: streamEvent.model.id,
                    agent: message.agent
                      ? { ...message.agent, id: streamEvent.agent.id, name: streamEvent.agent.name }
                      : null,
                    model: {
                      id: streamEvent.model.id,
                      displayName: streamEvent.model.name,
                      providerName: streamEvent.model.provider,
                    },
                    retrievalSources: streamEvent.sources,
                  }
                : message,
            ),
          );
          return;
        }

        if (streamEvent.type === "team_plan") {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId || message.id === optimisticAssistantId
                ? {
                    ...message,
                    teamExecution: {
                      id: streamEvent.executionId,
                      status: "delegating",
                      summary: streamEvent.summary,
                      generatedBy: streamEvent.generatedBy,
                      specialistCount: streamEvent.steps.length,
                      totalInputTokens: null,
                      totalOutputTokens: null,
                      totalEstimatedCost: null,
                      currency: "USD",
                      durationMs: null,
                      handoffs: [],
                    },
                  }
                : message,
            ),
          );
          return;
        }

        if (streamEvent.type === "handoff_started") {
          setMessages((current) =>
            current.map((message) => {
              if (message.id !== assistantId && message.id !== optimisticAssistantId) {
                return message;
              }
              const execution = message.teamExecution;
              if (!execution) return message;
              return {
                ...message,
                teamExecution: {
                  ...execution,
                  status: "delegating",
                  handoffs: [
                    ...execution.handoffs.filter(
                      (handoff) => handoff.id !== streamEvent.handoffId,
                    ),
                    {
                      id: streamEvent.handoffId,
                      sequenceNumber: streamEvent.sequenceNumber,
                      status: "running" as const,
                      reason: streamEvent.objective,
                      resultSummary: "",
                      sourceAgent: streamEvent.sourceAgent,
                      targetAgent: streamEvent.targetAgent,
                      model: {
                        id: streamEvent.model.id,
                        displayName: streamEvent.model.displayName,
                        providerName: streamEvent.model.providerName,
                      },
                      inputTokens: null,
                      outputTokens: null,
                      estimatedCost: null,
                      currency: "USD",
                      durationMs: null,
                    },
                  ].sort((left, right) => left.sequenceNumber - right.sequenceNumber),
                },
              };
            }),
          );
          return;
        }

        if (streamEvent.type === "handoff_completed") {
          setMessages((current) =>
            current.map((message) => {
              if (message.id !== assistantId && message.id !== optimisticAssistantId) {
                return message;
              }
              const execution = message.teamExecution;
              if (!execution) return message;
              return {
                ...message,
                teamExecution: {
                  ...execution,
                  handoffs: execution.handoffs.map((handoff) =>
                    handoff.id === streamEvent.handoffId
                      ? {
                          ...handoff,
                          status: "completed",
                          resultSummary: streamEvent.resultSummary,
                          inputTokens: streamEvent.inputTokens,
                          outputTokens: streamEvent.outputTokens,
                          estimatedCost: streamEvent.estimatedCost,
                          currency: streamEvent.currency,
                          durationMs: streamEvent.durationMs,
                        }
                      : handoff,
                  ),
                },
              };
            }),
          );
          return;
        }

        if (streamEvent.type === "handoff_failed") {
          setMessages((current) =>
            current.map((message) => {
              if (message.id !== assistantId && message.id !== optimisticAssistantId) {
                return message;
              }
              const execution = message.teamExecution;
              if (!execution) return message;
              return {
                ...message,
                teamExecution: {
                  ...execution,
                  handoffs: execution.handoffs.map((handoff) =>
                    handoff.id === streamEvent.handoffId
                      ? {
                          ...handoff,
                          status: "failed",
                          resultSummary: streamEvent.message,
                          durationMs: streamEvent.durationMs,
                        }
                      : handoff,
                  ),
                },
              };
            }),
          );
          return;
        }

        if (streamEvent.type === "consolidation_started") {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId || message.id === optimisticAssistantId
                ? {
                    ...message,
                    teamExecution: message.teamExecution
                      ? { ...message.teamExecution, status: "consolidating" }
                      : null,
                  }
                : message,
            ),
          );
          return;
        }

        if (streamEvent.type === "delta") {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId || message.id === optimisticAssistantId
                ? { ...message, content: message.content + streamEvent.text }
                : message,
            ),
          );
          return;
        }

        if (streamEvent.type === "usage") {
          setUsage((current) => ({
            ...current,
            inputTokens: streamEvent.inputTokens,
            outputTokens: streamEvent.outputTokens,
            estimatedCost: streamEvent.estimatedCost,
            currency: streamEvent.currency,
          }));
          setMessages((current) =>
            current.map((message) =>
              (message.id === assistantId || message.id === optimisticAssistantId) &&
              message.teamExecution
                ? {
                    ...message,
                    teamExecution: {
                      ...message.teamExecution,
                      totalInputTokens: streamEvent.inputTokens,
                      totalOutputTokens: streamEvent.outputTokens,
                      totalEstimatedCost: streamEvent.estimatedCost,
                      currency: streamEvent.currency,
                    },
                  }
                : message,
            ),
          );
          return;
        }

        if (streamEvent.type === "completed") {
          setUsage((current) => ({ ...current, durationMs: streamEvent.durationMs }));
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId || message.id === optimisticAssistantId
                ? {
                    ...message,
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    pending: false,
                    teamExecution: message.teamExecution
                      ? {
                          ...message.teamExecution,
                          status: message.teamExecution.handoffs.some(
                            (handoff) => handoff.status === "failed",
                          )
                            ? "partial"
                            : "completed",
                          durationMs: streamEvent.durationMs,
                        }
                      : null,
                  }
                : message,
            ),
          );
          return;
        }

        if (streamEvent.type === "error") {
          throw new Error(streamEvent.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
        if (done) break;
      }
      if (buffer.trim()) processLine(buffer);
      router.refresh();
    } catch (requestError) {
      const cancelled = controller.signal.aborted;
      const message = cancelled
        ? "La ejecución fue detenida por el usuario."
        : requestError instanceof Error
          ? requestError.message
          : "La ejecución terminó con un error.";
      setError(message);
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId || item.id === optimisticAssistantId
            ? {
                ...item,
                status: cancelled ? "cancelled" : "failed",
                error_message: message,
                completed_at: new Date().toISOString(),
                pending: false,
                teamExecution: item.teamExecution
                  ? {
                      ...item.teamExecution,
                      status: cancelled ? "cancelled" : "failed",
                    }
                  : null,
              }
            : item,
        ),
      );
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }

  function cancelExecution() {
    abortRef.current?.abort();
  }

  return (
    <div className="grid min-h-[calc(100vh-9rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <section className="nexus-panel flex min-h-[42rem] min-w-0 flex-col overflow-hidden rounded-2xl">
        <header className="border-b border-white/[0.055] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="nexus-kicker">Conversación activa</div>
              <h1 className="mt-2 truncate text-xl font-semibold text-white">
                {conversation.title}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: conversation.projectColor }}
                />
                {conversation.projectName}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[34rem]">
              <select
                value={mode}
                onChange={(event) => {
                  const nextMode = event.target.value as ConversationMode;
                  setMode(nextMode);
                  if (nextMode === "team") {
                    const leader = agents.find((agent) => agent.isLead);
                    if (leader) setAgentId(leader.id);
                  }
                }}
                disabled={isStreaming}
                className="nexus-focus h-10 rounded-lg border border-input bg-[#0b1219] px-3 text-xs text-foreground"
              >
                <option value="individual">Agente individual</option>
                <option value="team">Equipo coordinado</option>
              </select>
              <select
                value={taskType}
                onChange={(event) => setTaskType(event.target.value as ModelTaskType)}
                disabled={isStreaming}
                className="nexus-focus h-10 rounded-lg border border-input bg-[#0b1219] px-3 text-xs text-foreground"
              >
                {MODEL_TASK_TYPES.map((task) => (
                  <option key={task} value={task}>
                    {MODEL_TASK_LABELS[task]}
                  </option>
                ))}
              </select>
              <select
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                disabled={isStreaming || mode === "team"}
                className="nexus-focus h-10 rounded-lg border border-input bg-[#0b1219] px-3 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}{agent.isLead ? " · Líder" : ""}
                  </option>
                ))}
              </select>
              <select
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                disabled={isStreaming}
                className="nexus-focus h-10 rounded-lg border border-input bg-[#0b1219] px-3 text-xs text-foreground"
              >
                <option value="">Selección automática</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.providerName} — {model.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === "team" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/10 bg-primary/[0.035] px-3 py-2 text-[0.68rem] leading-5 text-primary/65">
              <Users className="mt-0.5 size-3.5 shrink-0" />
              El líder creará un plan, delegará hasta tres subtareas reales y consolidará los resultados. Cada handoff quedará visible y registrado.
            </div>
          )}
        </header>

        <div className="nexus-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {!messages.length && (
            <div className="grid min-h-80 place-items-center text-center">
              <div>
                <Sparkles className="mx-auto size-7 text-primary/45" />
                <h2 className="mt-4 text-base font-semibold text-slate-200">
                  Inicia una sesión de trabajo
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  NEXUS incorporará las instrucciones, reglas, stack y equipo del proyecto en cada ejecución.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const userMessage = message.role === "user";
            return (
              <article
                key={message.id}
                className={cn("flex gap-3", userMessage ? "justify-end" : "justify-start")}
              >
                {!userMessage && (
                  <div
                    className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg border"
                    style={{
                      borderColor: `${message.agent?.color ?? "#55e6c1"}30`,
                      backgroundColor: `${message.agent?.color ?? "#55e6c1"}10`,
                      color: message.agent?.color ?? "#55e6c1",
                    }}
                  >
                    <Bot className="size-4" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl border px-4 py-3 sm:max-w-[82%]",
                    userMessage
                      ? "border-primary/10 bg-primary/[0.07] text-slate-200"
                      : "border-white/[0.06] bg-black/15 text-slate-300",
                  )}
                >
                  {!userMessage && (
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.65rem] text-slate-600">
                      <span className="font-medium text-slate-400">
                        {message.agent?.name ?? "Agente NEXUS"}
                      </span>
                      {message.model && (
                        <span>
                          {message.model.providerName} · {message.model.displayName}
                        </span>
                      )}
                      {message.status === "streaming" && (
                        <LoaderCircle className="size-3 animate-spin text-primary" />
                      )}
                    </div>
                  )}
                  {userMessage ? (
                    <div className="whitespace-pre-wrap break-words text-sm leading-7">
                      {message.content || "Sin contenido"}
                    </div>
                  ) : (
                    <MessageMarkdown
                      content={
                        message.content ||
                        (message.status === "streaming" ? "Preparando respuesta..." : "Sin contenido")
                      }
                    />
                  )}
                  {message.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        <span
                          key={attachment.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-black/15 px-2.5 py-1.5 text-[0.65rem] text-slate-500"
                        >
                          <FileCode2 className="size-3" />
                          {attachment.file_name} · {formatBytes(attachment.size_bytes)}
                        </span>
                      ))}
                    </div>
                  )}
                  {message.retrievalSources.length > 0 && (
                    <details className="mt-3 rounded-xl border border-primary/10 bg-primary/[0.025] px-3 py-2.5">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-primary/70">
                        <BookOpenText className="size-3.5" />
                        {message.retrievalSources.length} {message.retrievalSources.length === 1 ? "fuente utilizada" : "fuentes utilizadas"}
                      </summary>
                      <div className="mt-3 space-y-2">
                        {message.retrievalSources.map((source) => (
                          <div
                            key={`${source.sourceType}-${source.sourceId}`}
                            className="rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2 text-xs"
                          >
                            <div className="font-medium text-slate-300">{source.title}</div>
                            <div className="mt-1 text-[0.62rem] text-slate-600">
                              {source.fileName ?? (source.sourceType === "memory" ? "Memoria estructurada" : "Documento")}
                              {source.chunkIndex !== null ? ` · fragmento ${source.chunkIndex + 1}` : ""}
                              {` · ${Math.round(source.score * 100)}%`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  {message.teamExecution && (
                    <details
                      className="mt-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.025] px-3 py-2.5"
                      open={message.pending ? true : undefined}
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-cyan-200/75">
                        <span className="flex items-center gap-2">
                          <Workflow className="size-3.5" />
                          {message.teamExecution.status === "planning"
                            ? "Orquestador preparando el plan"
                            : message.teamExecution.status === "delegating"
                              ? "Handoffs del equipo en curso"
                              : message.teamExecution.status === "consolidating"
                                ? "El líder está consolidando"
                                : `${message.teamExecution.handoffs.length} handoff${message.teamExecution.handoffs.length === 1 ? "" : "s"} registrado${message.teamExecution.handoffs.length === 1 ? "" : "s"}`}
                        </span>
                        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-slate-600">
                          {message.teamExecution.status}
                        </span>
                      </summary>

                      <div className="mt-3 space-y-3">
                        <div className="rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2 text-xs leading-5 text-slate-500">
                          <div className="font-medium text-slate-300">Plan operativo</div>
                          <div className="mt-1">{message.teamExecution.summary}</div>
                          {message.teamExecution.generatedBy && (
                            <div className="mt-1 text-[0.6rem] text-slate-700">
                              {message.teamExecution.generatedBy === "orchestrator"
                                ? "Plan generado por el orquestador"
                                : "Plan determinista de respaldo"}
                            </div>
                          )}
                        </div>

                        {message.teamExecution.handoffs.map((handoff) => (
                          <div
                            key={handoff.id}
                            className="rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2.5"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-medium text-slate-400">
                                {handoff.sourceAgent?.name ?? "Orquestador"}
                              </span>
                              <ArrowRight className="size-3 text-slate-700" />
                              <span
                                className="font-medium"
                                style={{ color: handoff.targetAgent?.color ?? "#55e6c1" }}
                              >
                                {handoff.targetAgent?.name ?? "Especialista"}
                              </span>
                              {handoff.status === "running" && (
                                <LoaderCircle className="size-3 animate-spin text-primary" />
                              )}
                              {handoff.status === "completed" && (
                                <CheckCircle2 className="size-3 text-emerald-300/70" />
                              )}
                              {handoff.status === "failed" && (
                                <TriangleAlert className="size-3 text-rose-300/70" />
                              )}
                            </div>
                            <div className="mt-1.5 text-[0.68rem] leading-5 text-slate-600">
                              {handoff.reason}
                            </div>
                            {handoff.resultSummary && (
                              <div className="mt-2 rounded-md border border-white/[0.04] bg-black/10 px-2.5 py-2 text-slate-500">
                                <MessageMarkdown content={handoff.resultSummary} compact />
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.58rem] text-slate-700">
                              {handoff.model && (
                                <span>
                                  {handoff.model.providerName} · {handoff.model.displayName}
                                </span>
                              )}
                              {handoff.durationMs !== null && (
                                <span>{formatDuration(handoff.durationMs)}</span>
                              )}
                              {handoff.estimatedCost !== null && (
                                <span>{formatCost(handoff.estimatedCost, handoff.currency)}</span>
                              )}
                            </div>
                          </div>
                        ))}

                        {(message.teamExecution.totalInputTokens !== null ||
                          message.teamExecution.durationMs !== null) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.05] pt-2 text-[0.62rem] text-slate-600">
                            <span>
                              Entrada total: {message.teamExecution.totalInputTokens ?? "—"}
                            </span>
                            <span>
                              Salida total: {message.teamExecution.totalOutputTokens ?? "—"}
                            </span>
                            <span>
                              {formatCost(
                                message.teamExecution.totalEstimatedCost,
                                message.teamExecution.currency,
                              )}
                            </span>
                            <span>{formatDuration(message.teamExecution.durationMs)}</span>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                  {message.error_message && (
                    <div className="mt-3 rounded-lg border border-rose-400/15 bg-rose-400/[0.04] px-3 py-2 text-xs leading-5 text-rose-200/70">
                      {message.error_message}
                    </div>
                  )}
                  {!userMessage && message.status === "completed" && message.content && !message.id.startsWith("assistant-") ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.05] pt-3">
                      <Link
                        href={`/app/tareas/nueva?project=${conversation.projectId}&conversation=${conversation.id}&message=${message.id}`}
                        className="nexus-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 text-[0.65rem] font-medium text-slate-400 hover:border-primary/20 hover:text-primary"
                      >
                        <ListTodo className="size-3.5" /> Crear tarea
                      </Link>
                      <Link
                        href={`/app/artefactos/nuevo?project=${conversation.projectId}&conversation=${conversation.id}&message=${message.id}`}
                        className="nexus-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 text-[0.65rem] font-medium text-slate-400 hover:border-primary/20 hover:text-primary"
                      >
                        <PackagePlus className="size-3.5" /> Guardar artefacto
                      </Link>
                      <Link
                        href={`/app/proyectos/${conversation.projectId}/registro?conversation=${conversation.id}&message=${message.id}&agent=${message.agent_id ?? ""}`}
                        className="nexus-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 text-[0.65rem] font-medium text-slate-400 hover:border-violet-400/20 hover:text-violet-300"
                      >
                        <Gavel className="size-3.5" /> Registrar decisión
                      </Link>
                      <Link
                        href={`/app/proyectos/${conversation.projectId}/registro?conversation=${conversation.id}&message=${message.id}&agent=${message.agent_id ?? ""}#errores`}
                        className="nexus-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 text-[0.65rem] font-medium text-slate-400 hover:border-rose-400/20 hover:text-rose-300"
                      >
                        <Bug className="size-3.5" /> Error y solución
                      </Link>
                    </div>
                  ) : null}
                  <div className="mt-2 text-right text-[0.58rem] text-slate-700">
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </article>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-white/[0.055] p-4 sm:p-5">
          {error && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] px-3.5 py-3 text-xs leading-5 text-rose-200/75">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Cerrar error">
                <X className="size-4" />
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div
                  key={`${attachment.fileName}-${index}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/[0.035] px-2.5 py-1.5 text-[0.67rem] text-primary/70"
                >
                  <FileCode2 className="size-3.5" />
                  <span className="max-w-48 truncate">{attachment.fileName}</span>
                  <span className="text-slate-600">{formatBytes(attachment.sizeBytes)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    aria-label={`Quitar ${attachment.fileName}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-2 focus-within:border-primary/25">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={isStreaming}
              rows={4}
              maxLength={100_000}
              placeholder="Describe la tarea, pega el error o adjunta archivos de texto y código..."
              className="nexus-scrollbar min-h-24 w-full resize-y bg-transparent px-2 py-2 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-700"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] px-1 pt-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.json,.sql,.ts,.tsx,.js,.jsx,.php,.liquid,.css,.scss,.html,.log,.yaml,.yml,.xml,.csv,.toml,.ini,.sh,.ps1,.py,.java,.cs,.go,.rb,.vue,text/*"
                  className="hidden"
                  onChange={handleFiles}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isStreaming || attachments.length >= 3}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip /> Adjuntar
                </Button>
                <span className="hidden text-[0.62rem] text-slate-700 sm:inline">
                  Texto/código · 256 KB por archivo
                </span>
              </div>

              {isStreaming ? (
                <Button type="button" variant="destructive" onClick={cancelExecution}>
                  <CircleStop /> Detener
                </Button>
              ) : (
                <Button type="submit" disabled={!content.trim() || !agentId || !models.length}>
                  <Send /> Enviar
                </Button>
              )}
            </div>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <section className="nexus-panel rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary/70" />
            <div className="nexus-kicker">Agente activo</div>
          </div>
          <div className="mt-4 text-sm font-semibold text-slate-200">
            {selectedAgent?.name ?? "Sin agente"}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {selectedAgent?.role ?? "Selecciona un especialista"}
          </div>
        </section>

        <section className="nexus-panel rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-primary/70" />
            <div className="nexus-kicker">Modelo</div>
          </div>
          <div className="mt-4 text-sm font-semibold text-slate-200">
            {selectedModel?.displayName ?? "Selección automática"}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {selectedModel?.providerName ?? "El recomendador resolverá el modelo"}
          </div>
        </section>

        <section className="nexus-panel rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-primary/70" />
            <div className="nexus-kicker">Última ejecución</div>
          </div>
          <dl className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Entrada</dt>
              <dd className="text-slate-300">{usage.inputTokens ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Salida</dt>
              <dd className="text-slate-300">{usage.outputTokens ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Costo</dt>
              <dd className="text-slate-300">
                {formatCost(usage.estimatedCost, usage.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Duración</dt>
              <dd className="text-slate-300">{formatDuration(usage.durationMs) || "—"}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}