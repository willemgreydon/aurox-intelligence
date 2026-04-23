import { verifyEmailInputSchema } from '@repo/api-contracts';
import { NextResponse } from 'next/server';
import { AuthenticationError, verifyEmailWithToken } from '../../../../server/auth/service';

function getTokenFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get('token');
}

async function handleVerification(token: string | null) {
  const parsed = verifyEmailInputSchema.safeParse({ token });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_input',
        message: 'A verification token is required.',
      },
      { status: 400 },
    );
  }

  try {
    const user = await verifyEmailWithToken(parsed.data.token);
    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: 400 },
      );
    }

    throw error;
  }
}

export async function GET(request: Request) {
  return handleVerification(getTokenFromRequest(request));
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  return handleVerification(typeof payload?.token === 'string' ? payload.token : null);
}
