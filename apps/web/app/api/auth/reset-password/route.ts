import { resetPasswordInputSchema } from '@repo/api-contracts';
import { NextResponse } from 'next/server';
import { AuthenticationError, resetPasswordWithToken } from '../../../../server/auth/service';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = resetPasswordInputSchema.safeParse(payload);

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
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully.',
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
