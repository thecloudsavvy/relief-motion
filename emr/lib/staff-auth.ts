import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export type StaffAuth = {
  email: string | null;
  lastSignInAt: string | null;
};

export type StaffAccess = "active" | "invited" | "disabled";

export async function staffAuthById() {
  const map = new Map<string, StaffAuth>();
  const admin = createAdminClient();
  if (!admin) return map;
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data.users) {
    map.set(user.id, {
      email: user.email || null,
      lastSignInAt: user.last_sign_in_at || null
    });
  }
  return map;
}

export function staffAccess(profile: Profile, auth?: StaffAuth | null): StaffAccess {
  if (profile.status === "disabled") return "disabled";
  if (auth?.lastSignInAt) return "active";
  return "invited";
}
