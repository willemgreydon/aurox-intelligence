import type { UserProperties, UserPropertiesPublic } from '@repo/api-contracts';

/**
 * Route-specific view model for the account "profile details & insights"
 * surface. Editable groups (A profile, G consent, D satisfaction) are shaped as
 * form defaults; system-populated groups (B lifecycle, C engagement, F behavior)
 * are formatted into read-only display rows. The admin-only (H) block never
 * reaches here — the input type is the public projection.
 */
export type AccountUserPropertiesViewModel = {
  profile: {
    jobTitle: string;
    organization: string;
    country: string;
    region: string;
    timezone: string;
    bio: string;
  };
  consent: {
    marketingOptIn: boolean;
    productUpdatesOptIn: boolean;
    researchParticipationOptIn: boolean;
    consentUpdatedLabel: string | null;
  };
  satisfaction: {
    npsScore: number | null;
    csatScore: number | null;
    npsCategoryLabel: string | null;
    lastSubmittedLabel: string | null;
    notes: string;
  };
  /** Read-only, system-populated insight rows (empty when nothing is populated). */
  insights: Array<{ id: string; label: string; value: string }>;
};

const LIFECYCLE_LABELS: Record<NonNullable<UserProperties['lifecycleStage']>, string> = {
  signed_up: 'Signed up',
  onboarding: 'Onboarding',
  activated: 'Activated',
  engaged: 'Engaged',
  power_user: 'Power user',
  at_risk: 'At risk',
  churned: 'Churned',
  reactivated: 'Reactivated',
};

const MATURITY_LABELS: Record<NonNullable<UserProperties['maturityTier']>, string> = {
  observer: 'Observer',
  simulator: 'Simulator',
  strategist: 'Strategist',
  operator: 'Operator',
};

const RISK_APPETITE_LABELS: Record<NonNullable<UserProperties['riskAppetite']>, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
};

const NPS_CATEGORY_LABELS: Record<NonNullable<UserProperties['npsCategory']>, string> = {
  detractor: 'Detractor',
  passive: 'Passive',
  promoter: 'Promoter',
};

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatCurrency(value: number | null): string | null {
  if (value === null) {
    return null;
  }
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function mapAccountUserProperties(properties: UserPropertiesPublic): AccountUserPropertiesViewModel {
  const insights: AccountUserPropertiesViewModel['insights'] = [];

  if (properties.lifecycleStage) {
    insights.push({ id: 'lifecycle', label: 'Lifecycle stage', value: LIFECYCLE_LABELS[properties.lifecycleStage] });
  }
  if (properties.maturityTier) {
    insights.push({ id: 'maturity', label: 'Maturity tier', value: MATURITY_LABELS[properties.maturityTier] });
  }
  if (properties.totalSimulationOrders > 0) {
    insights.push({
      id: 'orders',
      label: 'Simulation orders',
      value: properties.totalSimulationOrders.toLocaleString('en-US'),
    });
  }
  if (properties.totalActiveDays > 0) {
    insights.push({ id: 'active-days', label: 'Active days', value: properties.totalActiveDays.toLocaleString('en-US') });
  }
  if (properties.streakDays > 0) {
    insights.push({ id: 'streak', label: 'Current streak', value: `${properties.streakDays} day(s)` });
  }
  if (properties.riskAppetite) {
    insights.push({ id: 'risk', label: 'Risk appetite', value: RISK_APPETITE_LABELS[properties.riskAppetite] });
  }
  const avgPosition = formatCurrency(properties.avgPositionSizeUsd);
  if (avgPosition) {
    insights.push({ id: 'avg-position', label: 'Avg. position size', value: avgPosition });
  }

  return {
    profile: {
      jobTitle: properties.jobTitle ?? '',
      organization: properties.organization ?? '',
      country: properties.country ?? '',
      region: properties.region ?? '',
      timezone: properties.timezone ?? '',
      bio: properties.bio ?? '',
    },
    consent: {
      marketingOptIn: properties.marketingOptIn,
      productUpdatesOptIn: properties.productUpdatesOptIn,
      researchParticipationOptIn: properties.researchParticipationOptIn,
      consentUpdatedLabel: formatDate(properties.consentUpdatedAt),
    },
    satisfaction: {
      npsScore: properties.npsScore,
      csatScore: properties.csatScore,
      npsCategoryLabel: properties.npsCategory ? NPS_CATEGORY_LABELS[properties.npsCategory] : null,
      lastSubmittedLabel: formatDate(properties.npsSubmittedAt ?? properties.csatSubmittedAt),
      notes: properties.satisfactionNotes ?? '',
    },
    insights,
  };
}
