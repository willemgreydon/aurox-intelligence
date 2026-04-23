import { registerInputSchema } from '@repo/api-contracts';
import { EmailAlreadyInUseError } from '@repo/db';
import { NextResponse } from 'next/server';
import { setSessionCookie } from '../../../../server/auth/cookies';
import { registerWithEmailPassword } from '../../../../server/auth/service';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = registerInputSchema.safeParse(payload);

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
    const result = await registerWithEmailPassword(
      {
        email: parsed.data.email,
        name: parsed.data.name,
        password: parsed.data.password,
      },
      {
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      },
    );

    const response = NextResponse.json(
      {
        user: result.user,
        session: {
          expiresAt: result.sessionExpiresAt.toISOString(),
        },
      },
      { status: 201 },
    );

    await setSessionCookie(response.cookies, result.sessionToken, result.sessionExpiresAt);
    return response;
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      return NextResponse.json(
        {
          error: 'email_in_use',
          message: 'That email is already registered.',
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
