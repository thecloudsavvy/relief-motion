#!/usr/bin/env node
/**
 * Backend mass invite. Does not touch the website.
 *
 *   node scripts/invite-staff.mjs scripts/staff-invites.csv
 *
 * CSV columns: full_name,email,role
 * role is optional and must be physiotherapist or support (default: physiotherapist).
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/invite-staff.mjs scripts/staff-invites.csv");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const resend = env.RESEND_API_KEY;
if (!url || !service || !resend) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and RESEND_API_KEY in emr/.env.local");
  process.exit(1);
}

const redirectTo = "https://app.reliefmotionphysio.com/auth/callback";
const authHeaders = {
  apikey: service,
  Authorization: `Bearer ${service}`,
  "Content-Type": "application/json"
};

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].toLowerCase();
  const start = header.includes("email") ? 1 : 0;
  const rows = [];
  for (const line of lines.slice(start)) {
    const match = line.match(/^(?:\"([^\"]+)\"|([^,]+))\s*,\s*(?:\"([^\"]+)\"|([^,]+))\s*(?:,\s*(?:\"([^\"]+)\"|([^,]+)))?$/);
    if (!match) continue;
    const full_name = (match[1] || match[2] || "").trim();
    const email = (match[3] || match[4] || "").trim().toLowerCase();
    const roleRaw = (match[5] || match[6] || "physiotherapist").trim().toLowerCase();
    const role = roleRaw === "support" ? "support" : "physiotherapist";
    if (full_name && email.includes("@")) rows.push({ full_name, email, role });
  }
  return rows;
}

function inviteHtml(setPasswordUrl) {
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
    </div>
  </div>
</div>`;
}

async function generateLink(email, full_name) {
  const body = { email, data: { full_name }, redirect_to: redirectTo };
  for (const type of ["invite", "recovery"]) {
    const response = await fetch(`${url}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ ...body, type })
    });
    const data = await response.json();
    const actionLink = data?.properties?.action_link || data?.action_link;
    const userId = data?.user?.id || data?.id;
    if (response.ok && actionLink) return { actionLink, userId };
  }
  return { error: "Could not create invite link" };
}

async function inviteOne(row) {
  const link = await generateLink(row.email, row.full_name);
  if (!link.actionLink) return { ok: false, error: link.error };
  if (link.userId) {
    const profile = await fetch(`${url}/rest/v1/profiles?on_conflict=id`, {
      method: "POST",
      headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: link.userId,
        full_name: row.full_name,
        role: row.role,
        status: "active"
      })
    });
    if (!profile.ok) {
      const text = await profile.text();
      return { ok: false, error: `Profile: ${text || profile.status}` };
    }
  }
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resend}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Relief Motion <info@reliefmotionphysio.com>",
      to: [row.email],
      subject: "Your Relief Motion staff access",
      html: inviteHtml(link.actionLink)
    })
  });
  if (!sent.ok) {
    const body = await sent.json().catch(() => ({}));
    return { ok: false, error: body.message || `Resend ${sent.status}` };
  }
  return { ok: true };
}

const rows = parseCsv(readFileSync(resolve(csvPath), "utf8"));
if (!rows.length) {
  console.error("No valid rows. Use: full_name,email,role");
  process.exit(1);
}

console.log(`Inviting ${rows.length} staff…`);
let ok = 0;
let failed = 0;
for (const row of rows) {
  const result = await inviteOne(row);
  if (result.ok) {
    ok += 1;
    console.log(`ok  ${row.email}  (${row.full_name})`);
  } else {
    failed += 1;
    console.log(`fail ${row.email}  ${result.error}`);
  }
  await new Promise((resolveWait) => setTimeout(resolveWait, 250));
}
console.log(`Done. sent=${ok} failed=${failed}`);
if (failed) process.exit(1);
