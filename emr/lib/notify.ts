import webpush from "web-push";
import { sendAssignmentEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

function vapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

export async function notifyClinicianAssigned(input: {
  clinicianId: string | null;
  actorId: string;
  patientId: string;
  rmId: string;
  patientName: string;
  appUrl: string;
}) {
  const clinicianId = input.clinicianId;
  if (!clinicianId || clinicianId === input.actorId) return;

  const admin = createAdminClient();
  if (!admin) return;

  try {

  const chartUrl = `${input.appUrl}/patients/${input.patientId}`;
  const title = "Patient assigned to you";
  const body = `${input.patientName} · ${input.rmId}`;

  const { data: userData } = await admin.auth.admin.getUserById(clinicianId);
  const email = userData.user?.email;
  if (email) {
    await sendAssignmentEmail(email, input.patientName, input.rmId, chartUrl);
  }

  const keys = vapid();
  if (!keys) return;

  webpush.setVapidDetails("mailto:info@reliefmotionphysio.com", keys.publicKey, keys.privateKey);
  const { data: rows } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", clinicianId);
  for (const row of rows || []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth }
        },
        JSON.stringify({ title, body, url: chartUrl })
      );
    } catch (error) {
      const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", row.id);
      }
    }
  }
  } catch {
    /* assignment should still succeed if mail or push is down */
  }
}
