import { NextRequest, NextResponse } from 'next/server';
import { api, unwrap } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const { phone, purpose } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    const result = await api.post<{ devCode?: string; resendAfterSeconds: number }>(
      '/auth/otp/request',
      { phone, purpose: purpose || 'LOGIN' }
    );

    return NextResponse.json(unwrap(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send OTP' },
      { status: 400 }
    );
  }
}