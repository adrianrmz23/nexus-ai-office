export type SecurityCheckStatus = "pass" | "warning" | "fail";

export type SecurityCheck = {
  id: string;
  title: string;
  description: string;
  status: SecurityCheckStatus;
  detail: string;
};

export type SecurityEventRecord = {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "high" | "critical";
  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ProductionReadiness = {
  score: number;
  checks: SecurityCheck[];
  events: SecurityEventRecord[];
  providerSummary: {
    total: number;
    configured: number;
    healthy: number;
    errors: number;
  };
  rateLimitWindows24h: number;
  checkedAt: string;
};
