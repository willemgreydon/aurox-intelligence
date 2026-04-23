import { loginInputSchema } from '@repo/api-contracts';
import { NextResponse } from 'next/server';
import { setSessionCookie } from '../../../../server/auth/cookies';
import { AuthenticationError, loginWithEmailPassword } from '../../../../server/auth/service';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = loginInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_input',
        message: 'Please correct the highlighted fields.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await loginWithEmailPassword(parsed.data, {
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    });

    const response = NextResponse.json({
      user: result.user,
      session: {
        expiresAt: result.sessionExpiresAt.toISOString(),
      },
    });

    await setSessionCookie(response.cookies, result.sessionToken, result.sessionExpiresAt);
    return response;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: error.code === 'account_disabled' ? 403 : 401 },
      );
    }

    throw error;
  }
}
