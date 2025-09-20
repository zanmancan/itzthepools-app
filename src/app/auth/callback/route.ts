import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/dashboard';
  const redirectTo = new URL(next, url.origin);

  // Prepare a response we can attach auth cookies to
  const res = NextResponse.redirect(redirectTo.toString());

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options, expires: new Date(0) });
        },
      },
    }
  );

  // IMPORTANT: exchange using a string URL
  const { error } = await client.auth.exchangeCodeForSession(req.url);

  if (error) {
    redirectTo.searchParams.set('auth_error', error.message);
    return NextResponse.redirect(redirectTo.toString());
  }

  return res;
}
