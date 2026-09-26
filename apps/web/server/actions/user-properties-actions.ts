'use server';

import {
  userProfileDetailsUpdateInputSchema,
  userSatisfactionInputSchema,
} from '@repo/api-contracts';
import { recordUserSatisfaction, upsertUserProfileDetails } from '@repo/db';
import { revalidatePath } from 'next/cache';
import { errorFormState, type FormState, formStateFromZodError, successFormState } from '../auth/forms';
import { requireCurrentSession } from '../auth/session';

// NOTE: "use server" module — every export MUST be an async function. Helpers
// that are not server actions live in non-'use server' modules or are inlined.

/** Empty form strings represent "cleared" — normalize to null for nullable columns. */
function textOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Checkbox inputs submit 'on' when checked and are absent otherwise. */
function checkboxValue(value: FormDataEntryValue | null): boolean {
  return typeof value === 'string' && (value === 'on' || value === 'true');
}

/** A numeric select/input: empty → null, otherwise a finite number (or null). */
function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * A + G: user-editable extended profile and marketing consent. Zod-validated,
 * user-scoped (never trusts a form-supplied id), persisted via the repository,
 * then the account read models are revalidated.
 */
export async function updateUserProfileDetailsAction(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireCurrentSession('/account/settings');

  const parsed = userProfileDetailsUpdateInputSchema.safeParse({
    jobTitle: textOrNull(formData.get('jobTitle')),
    organization: textOrNull(formData.get('organization')),
    country: textOrNull(formData.get('country')),
    region: textOrNull(formData.get('region')),
    timezone: textOrNull(formData.get('timezone')),
    bio: textOrNull(formData.get('bio')),
    marketingOptIn: checkboxValue(formData.get('marketingOptIn')),
    productUpdatesOptIn: checkboxValue(formData.get('productUpdatesOptIn')),
    researchParticipationOptIn: checkboxValue(formData.get('researchParticipationOptIn')),
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  await upsertUserProfileDetails(auth.user.id, parsed.data);

  revalidatePath('/account');
  revalidatePath('/account/settings');
  return successFormState('Profile details saved.');
}

/**
 * D: a CSAT / NPS satisfaction submission. At least one rating is required
 * (enforced by the contract). The NPS bucket is derived deterministically in the
 * repository — never trusted from the client.
 */
export async function submitUserSatisfactionAction(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireCurrentSession('/account/settings');

  const parsed = userSatisfactionInputSchema.safeParse({
    npsScore: numberOrNull(formData.get('npsScore')),
    csatScore: numberOrNull(formData.get('csatScore')),
    satisfactionNotes: textOrNull(formData.get('satisfactionNotes')),
  });

  if (!parsed.success) {
    return errorFormState('Please provide an NPS or satisfaction rating.', {
      npsScore: parsed.error.issues[0]?.message ?? 'Provide a rating.',
    });
  }

  await recordUserSatisfaction(auth.user.id, parsed.data);

  revalidatePath('/account');
  revalidatePath('/account/settings');
  return successFormState('Thank you — your feedback was recorded.');
}
