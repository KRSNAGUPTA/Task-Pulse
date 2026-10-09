// app/api/auth/refresh/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('RefreshToken');

  if (!refreshToken) {
    return NextResponse.json({ message: 'Refresh token missing' }, { status: 401 });
  }

  const baseUrl = process.env.API_GATEWAY || process.env.NEXT_PUBLIC_GATEWAY_URL;

  try {
    const gatewayRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `RefreshToken=${refreshToken.value}`,
      },
      cache: 'no-store'
    });

    const data = await gatewayRes.json();

    return NextResponse.json(data, { status: gatewayRes.status });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error during refresh' }, { status: 500 });
  }
}