import { NextRequest, NextResponse } from 'next/server';
import { api, unwrap, type Session } from '@/lib/api';
import { isStaffRole } from '@/lib/api';

const COOKIE_NAME = 'sampark_admin_session';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const result = await api.get<Session>('/auth/me', token);
    const session = unwrap(result);

    if (!isStaffRole(session.user.role) || session.user.status !== 'ACTIVE') {
      const response = NextResponse.json({ user: null });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      user: session.user,
      permissions: session.permissions,
    });
  } catch {
    const response = NextResponse.json({ user: null });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}