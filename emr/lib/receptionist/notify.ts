export async function sendResendAlert(subject: string, html: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false as const };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Relief Motion <info@reliefmotionphysio.com>",
      to: ["info@reliefmotionphysio.com"],
      subject,
      html: `<div style="font-family:Arial,sans-serif;color:#18324a;line-height:1.6">${html}</div>`
    })
  });
  return { ok: response.ok as boolean };
}
