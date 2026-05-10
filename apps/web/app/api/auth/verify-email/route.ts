import { verifyEmailInputSchema } from '@repo/api-contracts';
import { NextResponse } from 'next/server';
import { AuthenticationError, verifyEmailWithToken } from '../../../../server/auth/service';
import { checkRateLimit } from '../../../../server/lib/rate-limit';

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
    const { id, email, name, role, avatarUrl, createdAt, updatedAt } = user;
    return NextResponse.json({
      success: true,
      user: { id, email, name, role, avatarUrl, createdAt, updatedAt },
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
  const limited = await checkRateLimit(request, 'auth:verify-email', { max: 20, windowMs: 60_000 });
  if (limited) return limited;
  return handleVerification(getTokenFromRequest(request));
}

export async function POST(request: Request) {
  const limited = await checkRateLimit(request, 'auth:verify-email', { max: 20, windowMs: 60_000 });
  if (limited) return limited;
  const payload = await request.json().catch(() => null);
  return handleVerification(typeof payload?.token === 'string' ? payload.token : null);
}
