import type { AgentRole } from "@/modules/agents/domain/agent";

export type RecordAgent = {
  id: string;
  name: string;
  role: AgentRole;
  icon: string;
  color: string;
};

export type ProjectDecisionRecord = {
  id: string;
  project_id: string;
  conversation_id: string | null;
  source_message_id: string | null;
  decided_by_agent_id: string | null;
  title: string;
  context: string;
  decision: string;
  consequences: string;
  status: "proposed" | "accepted" | "superseded" | "rejected";
  created_at: string;
  updated_at: string;
  agent?: RecordAgent | null;
};

export type ErrorSolutionRecord = {
  id: string;
  project_id: string;
  conversation_id: string | null;
  source_message_id: string | null;
  discovered_by_agent_id: string | null;
  title: string;
  error_signature: string;
  symptoms: string;
  root_cause: string;
  solution: string;
  validation_steps: string;
  status: "open" | "resolved" | "verified" | "archived";
  created_at: string;
  updated_at: string;
  agent?: RecordAgent | null;
};
