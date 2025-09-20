// src/app/auth/signout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Support both GET and POST so you can call it from a <form> or a link.
async function handle() {
  const jar = cookies();

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return jar.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        jar.set(name, value, options);
      },
      remove(name: string, options: any) {
        jar.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", env.siteUrl));
}

export const GET = handle;
export const POST = handle;
