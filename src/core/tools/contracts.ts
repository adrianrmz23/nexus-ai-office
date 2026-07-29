import type { z } from "zod";

import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";

export type ToolExecutionContext = Pick<
  CurrentWorkspaceContext,
  "supabase" | "user" | "membership"
> & {
  projectId: string;
  conversationId: string | null;
  sourceMessageId: string | null;
  agentId: string | null;
};

export type ToolExecutionResult<TData = Record<string, unknown>> = {
  ok: boolean;
  message: string;
  data: TData;
};

export type NexusTool<TSchema extends z.ZodType> = {
  name: string;
  description: string;
  schema: TSchema;
  requiresHumanConfirmation: boolean;
  execute: (
    input: z.infer<TSchema>,
    context: ToolExecutionContext,
  ) => Promise<ToolExecutionResult>;
};
