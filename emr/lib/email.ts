const FROM = "Relief Motion <info@reliefmotionphysio.com>";

function inviteHtml(setPasswordUrl: string) {
  const href = setPasswordUrl.replace(/&/g, "&amp;");
  return `<div style="margin:0;padding:32px 12px;background:#f0f5f7;font-family:Arial,Helvetica,sans-serif;color:#18324a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#062641;padding:26px 30px;">
      <div style="font-size:25px;font-weight:700;color:#ffffff;">Relief Motion</div>
      <div style="margin-top:5px;font-size:11px;letter-spacing:2px;font-weight:700;color:#45d0d0;">PHYSIOTHERAPY</div>
    </div>

    <div style="padding:34px 30px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#079ca5;">STAFF ACCESS</p>

      <h1 style="margin:0 0 18px;font-size:28px;line-height:1.3;color:#092a4a;">You're invited to join us.</h1>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#526575;">
        You've been invited to access the Relief Motion staff platform.
      </p>

      <p style="margin:0 0 26px;font-size:16px;line-height:1.7;color:#526575;">
        Set up your password to activate your account and access the tools available for your role.
      </p>

      <a href="${href}" style="display:inline-block;background:#079ca5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 24px;border-radius:7px;">
        Set up your account &rarr;
      </a>

      <p style="margin:26px 0 0;font-size:13px;line-height:1.7;color:#71808d;">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </div>

    <div style="border-top:1px solid #e4ebef;padding:22px 30px;text-align:center;background:#f9fbfc;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#092a4a;">Relief Motion Physiotherapy</p>
      <p style="margin:0;font-size:12px;color:#71808d;">Move. Recover. Live Better.</p>
    </div>
  </div>
</div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function assignmentHtml(patientName: string, rmId: string, chartUrl: string) {
  const href = escapeHtml(chartUrl);
  const who = escapeHtml(patientName);
  const id = escapeHtml(rmId);
  return `<div style="margin:0;padding:32px 12px;background:#f0f5f7;font-family:Arial,Helvetica,sans-serif;color:#18324a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#062641;padding:26px 30px;">
      <div style="font-size:25px;font-weight:700;color:#ffffff;">Relief Motion</div>
      <div style="margin-top:5px;font-size:11px;letter-spacing:2px;font-weight:700;color:#45d0d0;">PHYSIOTHERAPY</div>
    </div>
    <div style="padding:34px 30px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#079ca5;">NEW PATIENT</p>
      <h1 style="margin:0 0 18px;font-size:26px;line-height:1.3;color:#092a4a;">A patient was assigned to you.</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#526575;">
        ${who} (${id}) is now on your list. Open the chart to review and log the visit.
      </p>
      <a href="${href}" style="display:inline-block;background:#079ca5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 24px;border-radius:7px;">
        Open patient chart &rarr;
      </a>
    </div>
  </div>
</div>`;
}

async function sendResend(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false as const, error: "Add RESEND_API_KEY to emr/.env.local, then restart the app." };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, error: body?.message || `Resend could not send the email (${response.status}).` };
  }
  return { ok: true as const };
}

export async function sendAssignmentEmail(to: string, patientName: string, rmId: string, chartUrl: string) {
  return sendResend(
    to,
    `${patientName} was assigned to you`,
    assignmentHtml(patientName, rmId, chartUrl)
  );
}

export async function sendStaffInviteEmail(to: string, setPasswordUrl: string) {
  return sendResend(to, "Your Relief Motion staff access", inviteHtml(setPasswordUrl));
}
