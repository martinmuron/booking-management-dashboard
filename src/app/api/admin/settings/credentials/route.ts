import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminCredential, updateAdminCredential } from '@/services/admin-credentials.service';

const payloadSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .optional()
    .transform(value => (value && value.trim().length > 0 ? value : undefined))
    .refine(value => value === undefined || value.length >= 6, {
      message: 'Password must be at least 6 characters long',
    }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const credential = await updateAdminCredential(email, password);

    return NextResponse.json({
      success: true,
      data: {
        email: credential.email,
        hasPassword: true,
      },
      message: password ? 'Credentials updated' : 'Email updated',
    });
  } catch (error) {
    console.error('Failed to update admin credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update credentials' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const credential = await getAdminCredential();

    return NextResponse.json({
      success: true,
      data: {
        email: credential.email,
        hasPassword: Boolean(credential.passwordHash),
      },
    });
  } catch (error) {
    console.error('Failed to fetch admin credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load credentials' },
      { status: 500 }
    );
  }
}
