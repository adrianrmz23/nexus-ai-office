import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { formatPendingDate } from "@/lib/pending-date";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ reminders: [] }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ reminders: [] });
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("global_pendings")
    .select("id, title, due_date, due_time, reminder_at, last_reminded_at")
    .eq("workspace_id", membership.workspace_id)
    .eq("owner_user_id", user.id)
    .in("status", ["inbox", "pending", "in_progress", "waiting"])
    .lte("reminder_at", now)
    .is("last_reminded_at", null)
    .order("reminder_at")
    .limit(10);
  if (error || !data?.length) return NextResponse.json({ reminders: [] });
  const reminders = data as Array<{ id: string; title: string; due_date: string | null; due_time: string | null; reminder_at: string | null; last_reminded_at: string | null }>;
  await supabase
    .from("global_pendings")
    .update({ last_reminded_at: now, updated_by: user.id })
    .eq("workspace_id", membership.workspace_id)
    .eq("owner_user_id", user.id)
    .in("id", reminders.map((item) => item.id));
  return NextResponse.json({ reminders: reminders.map((item) => ({ id: item.id, title: item.title, dueLabel: `Entrega: ${formatPendingDate(item.due_date, item.due_time)}` })) });
}
