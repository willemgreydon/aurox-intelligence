'use server';

import {
  forceLogoutUserInputSchema,
  setUserRoleInputSchema,
  setUserStatusInputSchema,
} from '@repo/api-contracts';
import { adminRevokeUserSessions, adminSetUserStatus, updateAuthUserRole } from '@repo/db';
import { revalidatePath } from 'next/cache';
import { requireCapability } from '../auth/session';

// NOTE: This is a "use server" module — every export MUST be an async function.
// Do not export error classes/constants from here, or Next.js drops the action
// export entirely ("export ... was not found"). Authorization and validation
// failures are thrown inline with stable code strings instead.

/**
 * Promotes or demotes a user's role from the admin user-management surface.
 *
 * Fail-closed defense-in-depth on top of the `/admin` layout role guard:
 * - re-verifies the caller is an admin (`requireAdmin`, never trusts the layout),
 * - validates input with the shared Zod contract,
 * - refuses self role changes so an admin cannot accidentally lock themselves
 *   (or the last admin) out of the console.
 *
 * The form-action contract requires Promise<void>, so failures throw rather
 * than returning a result object.
 */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const auth = await requireCapability('manage_users', '/admin/users');

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

/**
 * Sets a user account status. Activating a pending account clears the
 * "pending verification" state and stamps it verified; activating a disabled
 * account reactivates it. Disabling also revokes all of the user's live sessions
 * (in the same DB transaction), immediately cutting access.
 * Admin-gated, Zod-validated, self-protected, and audited.
 */
export async function setUserStatusAction(formData: FormData): Promise<void> {
  const auth = await requireCapability('manage_users', '/admin/users');

  const parsed = setUserStatusInputSchema.safeParse({
    userId: formData.get('userId'),
    status: formData.get('status'),
  });
  if (!parsed.success) {
    throw new Error(
      `invalid_set_user_status_input: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
    );
  }

  // Only self-DISABLE is forbidden (an admin must not lock themselves out).
  // Self-activation (clearing your own pending state) is safe and allowed.
  if (parsed.data.userId === auth.user.id && parsed.data.status === 'disabled') {
    throw new Error('self_status_change_forbidden: you cannot disable your own account');
  }

  await adminSetUserStatus({
    userId: parsed.data.userId,
    status: parsed.data.status,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
  });
  revalidatePath('/admin/users');
}

/**
 * Force-logout: revokes every live session for a user (e.g. after a suspected
 * compromise). Admin-gated, Zod-validated, self-protected, and audited.
 */
export async function forceLogoutUserAction(formData: FormData): Promise<void> {
  const auth = await requireCapability('manage_users', '/admin/users');

  const parsed = forceLogoutUserInputSchema.safeParse({
    userId: formData.get('userId'),
  });
  if (!parsed.success) {
    throw new Error(
      `invalid_force_logout_input: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
    );
  }

  if (parsed.data.userId === auth.user.id) {
    throw new Error('self_force_logout_forbidden: use sign out to end your own session');
  }

  await adminRevokeUserSessions({
    userId: parsed.data.userId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
  });
  revalidatePath('/admin/users');
}
