'use client';

import { useActionState } from 'react';
import type { AccountUserPropertiesViewModel } from '../../server/mappers/user-properties-mapper';
import { updateUserProfileDetailsAction } from '../../server/actions/user-properties-actions';
import { emptyFormState } from '../../server/auth/forms';
import { FormSubmitButton } from '../auth/form-submit-button';

export function UserPropertiesForm({ viewModel }: { viewModel: AccountUserPropertiesViewModel }) {
  const [state, formAction] = useActionState(updateUserProfileDetailsAction, emptyFormState);
  const { profile, consent, insights } = viewModel;

  return (
    <form action={formAction} className="account-form">
      <div className="account-form__header">
        <h2>Profile details</h2>
        <p>Optional context about you and how you want to hear from us. Used for internal product insight only.</p>
      </div>

      {state.message ? (
        <div
          role="alert"
          aria-live="polite"
          className={`form-banner form-banner--${state.status === 'error' ? 'error' : 'success'}`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="form-grid form-grid--two">
        <label className="form-field">
          <span>Job title</span>
          <input
            id="up-job-title"
            name="jobTitle"
            type="text"
            defaultValue={profile.jobTitle}
            maxLength={120}
            aria-invalid={state.fieldErrors.jobTitle ? true : undefined}
          />
          {state.fieldErrors.jobTitle ? <span className="form-field__error">{state.fieldErrors.jobTitle}</span> : null}
        </label>

        <label className="form-field">
          <span>Organization</span>
          <input
            id="up-organization"
            name="organization"
            type="text"
            defaultValue={profile.organization}
            maxLength={120}
            aria-invalid={state.fieldErrors.organization ? true : undefined}
          />
          {state.fieldErrors.organization ? (
            <span className="form-field__error">{state.fieldErrors.organization}</span>
          ) : null}
        </label>

        <label className="form-field">
          <span>Country</span>
          <input id="up-country" name="country" type="text" defaultValue={profile.country} maxLength={80} />
        </label>

        <label className="form-field">
          <span>Region</span>
          <input id="up-region" name="region" type="text" defaultValue={profile.region} maxLength={80} />
        </label>

        <label className="form-field">
          <span>Timezone</span>
          <input
            id="up-timezone"
            name="timezone"
            type="text"
            defaultValue={profile.timezone}
            maxLength={64}
            placeholder="Europe/Vienna"
          />
        </label>
      </div>

      <label className="form-field">
        <span>Bio</span>
        <textarea
          id="up-bio"
          name="bio"
          rows={3}
          defaultValue={profile.bio}
          maxLength={500}
          aria-invalid={state.fieldErrors.bio ? true : undefined}
        />
        {state.fieldErrors.bio ? <span className="form-field__error">{state.fieldErrors.bio}</span> : null}
      </label>

      <fieldset className="form-fieldset">
        <legend>Communication preferences</legend>
        <label className="form-checkbox">
          <input type="checkbox" name="marketingOptIn" defaultChecked={consent.marketingOptIn} />
          <span>Product marketing and announcements</span>
        </label>
        <label className="form-checkbox">
          <input type="checkbox" name="productUpdatesOptIn" defaultChecked={consent.productUpdatesOptIn} />
          <span>Product update digests</span>
        </label>
        <label className="form-checkbox">
          <input
            type="checkbox"
            name="researchParticipationOptIn"
            defaultChecked={consent.researchParticipationOptIn}
          />
          <span>Invitations to research and feedback sessions</span>
        </label>
        {consent.consentUpdatedLabel ? (
          <p className="form-field__hint">Preferences last updated {consent.consentUpdatedLabel}.</p>
        ) : null}
      </fieldset>

      {insights.length > 0 ? (
        <div className="account-panel">
          <div className="account-panel__header">
            <h3 className="account-panel__title">Your platform insights</h3>
            <p className="account-panel__description">Read-only signals derived from your simulation activity.</p>
          </div>
          <dl className="account-metric-grid">
            {insights.map((insight) => (
              <div key={insight.id} className="account-metric">
                <dt className="text-muted">{insight.label}</dt>
                <dd className="tabular-nums">{insight.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <FormSubmitButton label="Save profile details" pendingLabel="Saving..." className="account-form__submit" />
    </form>
  );
}
