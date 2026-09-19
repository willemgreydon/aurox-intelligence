'use server';

import { setUserRoleInputSchema } from '@repo/api-contracts';
import { updateAuthUserRole } from '@repo/db';
import { revalidatePath } from 'next/cache';
import { requireCurrentSession } from '../auth/session';

// NOTE: This is a "use server" module — every export MUST be an async function.
// Do not export error classes/constants from here, or Next.js drops the action
// export entirely ("export ... was not found"). Authorization and validation
// failures are thrown inline with stable code strings instead.

/**
 * Promotes or demotes a user's role from the admin user-management surface.
 *
 * Fail-closed defense-in-depth on top of the `/admin` layout role guard:
 * - re-verifies the caller is an admin (never trusts the layout alone),
 * - validates input with the shared Zod contract,
 * - refuses self role changes so an admin cannot accidentally lock themselves
 *   (or the last admin) out of the console.
 *
 * The form-action contract requires Promise<void>, so failures throw rather
 * than returning a result object.
 */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const auth = await requireCurrentSession('/admin/users');
  if (auth.user.role !== 'admin') {
    throw new Error('admin_authorization_required: admin role is required to change user roles');
  }

  const parsed = setUserRoleInputSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    throw new Error(
      `invalid_set_user_role_input: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
    );
  }

  if (parsed.data.userId === auth.user.id) {
    throw new Error('self_role_change_forbidden: you cannot change your own role');
  }

  // Actor identity is captured from the verified session (never the form) so
  // the audit record cannot be spoofed by the caller.
  await updateAuthUserRole({
    userId: parsed.data.userId,
    role: parsed.data.role,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
  });
  revalidatePath('/admin/users');
}
