import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { conversationIdSchema } from "@/modules/conversations/domain/conversation-schema";
import { conversationFileContextSchema } from "@/modules/repositories/domain/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ conversationId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const { conversationId } = await context.params;
  const conversationResult = conversationIdSchema.safeParse(conversationId);
  if (!conversationResult.success) return Response.json({ error: "Conversación no válida." }, { status: 400 });
  const body = await request.json().catch(() => null);
  const parsed = conversationFileContextSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Datos no válidos." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!membership) return Response.json({ error: "No existe un workspace activo." }, { status: 403 });

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, project_id")
    .eq("workspace_id", membership.workspace_id)
    .eq("id", conversationResult.data)
    .eq("status", "active")
    .maybeSingle();
  if (!conversation) return Response.json({ error: "Conversación no disponible." }, { status: 404 });

  const { data: file } = await supabase
    .from("project_files")
    .select("id, project_id, current_version_number, status")
    .eq("workspace_id", membership.workspace_id)
    .eq("id", parsed.data.fileId)
    .maybeSingle();
  if (!file || file.project_id !== conversation.project_id || file.status !== "active") {
    return Response.json({ error: "El archivo no pertenece al proyecto de la conversación." }, { status: 409 });
  }

  if (parsed.data.selected) {
    const { count } = await supabase
      .from("conversation_file_contexts")
      .select("project_file_id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id)
      .eq("conversation_id", conversation.id);
    if ((count ?? 0) >= 8) {
      return Response.json({ error: "Puedes mantener hasta 8 archivos activos por conversación." }, { status: 409 });
    }
    const { error } = await supabase.from("conversation_file_contexts").upsert(
      {
        conversation_id: conversation.id,
        project_file_id: file.id,
        workspace_id: membership.workspace_id,
        project_id: conversation.project_id,
        version_number: file.current_version_number,
        added_by: user.id,
      },
      { onConflict: "conversation_id,project_file_id" },
    );
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("conversation_file_contexts")
      .delete()
      .eq("workspace_id", membership.workspace_id)
      .eq("conversation_id", conversation.id)
      .eq("project_file_id", file.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
