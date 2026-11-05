import { NextResponse } from 'next/server';

const COOKIE_NAME = 'sampark_admin_session';
const CSRF_COOKIE = 'sampark_csrf_token';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  response.cookies.delete(CSRF_COOKIE);
  return response;
}