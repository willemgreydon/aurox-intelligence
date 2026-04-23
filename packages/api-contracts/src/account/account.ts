import { z } from 'zod';
import {
  brokerAssetScopeSchema,
  brokerModeSchema,
  chartTypeSchema,
  dashboardModuleIdSchema,
  dashboardPresetSchema,
  localeSchema,
  timePeriodSchema,
} from '../workspace/preferences';

export const userRoleSchema = z.enum(['member', 'admin']);

export const normalizedEmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name must be 80 characters or fewer.');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.');

export const optionalAvatarUrlSchema = z
  .string()
  .trim()
  .max(512, 'Avatar URL must be 512 characters or fewer.')
  .transform((value) => (value.length === 0 ? null : value))
  .refine((value) => value === null || z.url().safeParse(value).success, 'Enter a valid avatar URL.');

export const accountUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: userRoleSchema,
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const authSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  lastSeenAt: z.string().nullable(),
});

export const authenticatedSessionSchema = z.object({
  user: accountUserSchema,
  session: authSessionSchema,
});

export const loginInputSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const registerInputSchema = z
  .object({
    name: displayNameSchema,
    email: normalizedEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const profileUpdateInputSchema = z.object({
  name: displayNameSchema,
  email: normalizedEmailSchema,
  avatarUrl: optionalAvatarUrlSchema,
});

export const verificationTokenTypeSchema = z.enum([
  'email_verification',
  'password_reset',
  'magic_link',
  'email_change',
]);

export const passwordChangeInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    nextPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((value) => value.nextPassword === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((value) => value.currentPassword !== value.nextPassword, {
    message: 'Choose a different password from your current one.',
    path: ['nextPassword'],
  });

export const forgotPasswordInputSchema = z.object({
  email: normalizedEmailSchema,
});

export const resetPasswordInputSchema = z
  .object({
    token: z.string().trim().min(1, 'Token is required.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const verifyEmailInputSchema = z.object({
  token: z.string().trim().min(1, 'Token is required.'),
});

export const accountSessionSummarySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  lastSeenAt: z.string().nullable(),
  isCurrent: z.boolean(),
});

export const accountOverviewSchema = z.object({
  user: accountUserSchema,
  currentSession: authSessionSchema,
  activeSessionCount: z.number().int().nonnegative(),
  recentSessions: z.array(accountSessionSummarySchema),
  preferences: dashboardPresetSchema,
});

const trackedSymbolPattern = /^[A-Z0-9][A-Z0-9:._/-]*$/;

export function normalizeTrackedSymbolsInput(input: string): string[] {
  const seen = new Set<string>();
  const normalizedSymbols: string[] = [];

  for (const candidate of input.replace(/\r?\n/g, ',').split(',')) {
    const normalized = candidate.trim().toUpperCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    normalizedSymbols.push(normalized);
  }

  return normalizedSymbols;
}

export const trackedSymbolSchema = z
  .string()
  .trim()
  .min(1, 'Symbol cannot be empty.')
  .max(20, 'Symbol must be 20 characters or fewer.')
  .transform((value) => value.toUpperCase())
  .refine((value) => trackedSymbolPattern.test(value), {
    message: 'Use symbols like AAPL, MSFT, BRK.B, BTC-USD.',
  });

export const preferencesUpdateInputSchema = z.object({
  locale: localeSchema,
  defaultChartType: chartTypeSchema,
  defaultTimePeriod: timePeriodSchema,
  trackedSymbols: z.array(trackedSymbolSchema).max(12, 'Track up to 12 symbols.'),
  visibleModules: z.array(dashboardModuleIdSchema).min(1),
  simulationPreferences: z.object({
    preferredBrokerMode: brokerModeSchema,
    brokerModeCapitalLimitUsd: z.number().int().nonnegative().max(1_000_000),
    microTradeAllocationPercent: z.number().min(0).max(100),
    defaultAssetScope: brokerAssetScopeSchema,
  }),
  activityPreferences: z.object({
    orderActivityDigest: z.boolean(),
    laneStatusAlerts: z.boolean(),
  }),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type AccountUser = z.infer<typeof accountUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthenticatedSession = z.infer<typeof authenticatedSessionSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>;
export type VerificationTokenType = z.infer<typeof verificationTokenTypeSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeInputSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;
export type AccountSessionSummary = z.infer<typeof accountSessionSummarySchema>;
export type AccountOverview = z.infer<typeof accountOverviewSchema>;
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateInputSchema>;
