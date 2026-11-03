"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export async function reopenWhatsAppChat(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/inbox");
  await supabase
    .from("wa_conversations")
    .update({
      status: "open",
      handed_over_at: null,
      handover_reason: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  revalidatePath("/inbox");
  revalidatePath(`/inbox/${id}`);
  redirect("/inbox");
}
