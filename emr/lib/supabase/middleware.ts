import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });

  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (/\.(?:png|jpe?g|gif|webp|svg|ico)$/i.test(path)) {
    return response;
  }

  const isPublic = path === "/login" || path.startsWith("/auth/");
  let disabled = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
    disabled = profile?.status === "disabled";
    if (disabled) {
      await supabase.auth.signOut();
      if (!isPublic) {
        const redirect = request.nextUrl.clone();
        redirect.pathname = "/login";
        redirect.search = "error=" + encodeURIComponent("This staff account has been disabled.");
        return NextResponse.redirect(redirect);
      }
      return response;
    }
  }

  if (!user && !isPublic) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    return NextResponse.redirect(redirect);
  }

  return response;
}
