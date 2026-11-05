import { NextRequest, NextResponse } from 'next/server';
import { api, unwrap, type Session } from '@/lib/api';
import { isStaffRole } from '@/lib/api';

const COOKIE_NAME = 'sampark_admin_session';
const CSRF_COOKIE = 'sampark_csrf_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });
    }

    const result = await api.post<Session>('/auth/login', { phone, code });
    const session = unwrap(result);

    if (!isStaffRole(session.user.role)) {
      return NextResponse.json({ error: 'Not a staff account' }, { status: 403 });
    }

    if (session.user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account not active' }, { status: 403 });
    }

    const csrfToken = generateCsrfToken();
    const response = NextResponse.json({
      user: session.user,
      permissions: session.permissions,
      accessToken: session.accessToken,
    });

    response.cookies.set(COOKIE_NAME, session.accessToken, COOKIE_OPTIONS);
    response.cookies.set(CSRF_COOKIE, csrfToken, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    );
  }
}