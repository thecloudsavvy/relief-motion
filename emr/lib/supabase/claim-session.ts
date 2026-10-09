import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";

const OTP_TYPES: EmailOtpType[] = ["invite", "recovery", "email", "magiclink", "signup", "email_change"];

export function authParamsFromHref(href: string) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const query = url.searchParams;
  const type = hash.get("type") || query.get("type") || "";
  return {
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    code: query.get("code"),
    tokenHash: query.get("token_hash") || query.get("token"),
    type,
    isPasswordFlow: type === "invite" || type === "recovery" || query.get("set") === "1"
  };
}

export async function claimAuthFromHref(supabase: SupabaseClient, href: string) {
  const { accessToken, refreshToken, code, tokenHash, type } = authParamsFromHref(href);

  if (accessToken && refreshToken) {
    return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
  if (code) {
    return supabase.auth.exchangeCodeForSession(code);
  }
  if (tokenHash && OTP_TYPES.includes(type as EmailOtpType)) {
    return supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType
    });
  }
  return { data: { session: null, user: null }, error: null };
}
