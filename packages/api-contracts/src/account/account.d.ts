import { z } from 'zod';
export declare const userRoleSchema: z.ZodEnum<{
    member: "member";
    admin: "admin";
}>;
export declare const normalizedEmailSchema: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const displayNameSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const optionalAvatarUrlSchema: z.ZodPipe<z.ZodString, z.ZodTransform<string | null, string>>;
export declare const accountUserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<{
        member: "member";
        admin: "admin";
    }>;
    avatarUrl: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const authSessionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    createdAt: z.ZodString;
    expiresAt: z.ZodString;
    lastSeenAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const authenticatedSessionSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        role: z.ZodEnum<{
            member: "member";
            admin: "admin";
        }>;
        avatarUrl: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
    session: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        createdAt: z.ZodString;
        expiresAt: z.ZodString;
        lastSeenAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const loginInputSchema: z.ZodObject<{
    email: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    password: z.ZodString;
}, z.core.$strip>;
export declare const registerInputSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export declare const profileUpdateInputSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    avatarUrl: z.ZodPipe<z.ZodString, z.ZodTransform<string | null, string>>;
}, z.core.$strip>;
export declare const verificationTokenTypeSchema: z.ZodEnum<{
    email_verification: "email_verification";
    password_reset: "password_reset";
    magic_link: "magic_link";
    email_change: "email_change";
}>;
export declare const passwordChangeInputSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    nextPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export declare const forgotPasswordInputSchema: z.ZodObject<{
    email: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
export declare const resetPasswordInputSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export declare const verifyEmailInputSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export declare const accountSessionSummarySchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    expiresAt: z.ZodString;
    lastSeenAt: z.ZodNullable<z.ZodString>;
    isCurrent: z.ZodBoolean;
}, z.core.$strip>;
export declare const accountOverviewSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        role: z.ZodEnum<{
            member: "member";
            admin: "admin";
        }>;
        avatarUrl: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
    currentSession: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        createdAt: z.ZodString;
        expiresAt: z.ZodString;
        lastSeenAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    activeSessionCount: z.ZodNumber;
    recentSessions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        expiresAt: z.ZodString;
        lastSeenAt: z.ZodNullable<z.ZodString>;
        isCurrent: z.ZodBoolean;
    }, z.core.$strip>>;
    preferences: z.ZodObject<{
        locale: z.ZodEnum<{
            en: "en";
            de: "de";
            fr: "fr";
            es: "es";
            it: "it";
            pt: "pt";
            nl: "nl";
            zh: "zh";
            ja: "ja";
            ko: "ko";
            ar: "ar";
            hi: "hi";
        }>;
        defaultChartType: z.ZodEnum<{
            stock: "stock";
            bar: "bar";
            donut: "donut";
            comparison: "comparison";
            trend: "trend";
        }>;
        defaultTimePeriod: z.ZodEnum<{
            "1s": "1s";
            "3s": "3s";
            "5s": "5s";
            "10s": "10s";
            "1m": "1m";
            "1h": "1h";
            "1d": "1d";
            "1w": "1w";
            "1mo": "1mo";
            "1y": "1y";
            "2y": "2y";
            "5y": "5y";
        }>;
        trackedSymbols: z.ZodArray<z.ZodString>;
        visibleModules: z.ZodArray<z.ZodEnum<{
            "market-overview": "market-overview";
            "broker-tools": "broker-tools";
            "system-observation": "system-observation";
            watchlist: "watchlist";
            "forecast-analysis": "forecast-analysis";
        }>>;
        simulationPreferences: z.ZodObject<{
            preferredBrokerMode: z.ZodEnum<{
                manual_stock_lane: "manual_stock_lane";
                manual_multi_asset_lane: "manual_multi_asset_lane";
                ai_copilot_lane: "ai_copilot_lane";
                signal_follow_lane: "signal_follow_lane";
                agent_sandbox_lane: "agent_sandbox_lane";
            }>;
            brokerModeCapitalLimitUsd: z.ZodNumber;
            microTradeAllocationPercent: z.ZodNumber;
            defaultAssetScope: z.ZodEnum<{
                stock: "stock";
                etf: "etf";
                crypto: "crypto";
                "multi-asset": "multi-asset";
            }>;
        }, z.core.$strip>;
        activityPreferences: z.ZodObject<{
            orderActivityDigest: z.ZodBoolean;
            laneStatusAlerts: z.ZodBoolean;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare function normalizeTrackedSymbolsInput(input: string): string[];
export declare const trackedSymbolSchema: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const preferencesUpdateInputSchema: z.ZodObject<{
    locale: z.ZodEnum<{
        en: "en";
        de: "de";
        fr: "fr";
        es: "es";
        it: "it";
        pt: "pt";
        nl: "nl";
        zh: "zh";
        ja: "ja";
        ko: "ko";
        ar: "ar";
        hi: "hi";
    }>;
    defaultChartType: z.ZodEnum<{
        stock: "stock";
        bar: "bar";
        donut: "donut";
        comparison: "comparison";
        trend: "trend";
    }>;
    defaultTimePeriod: z.ZodEnum<{
        "1s": "1s";
        "3s": "3s";
        "5s": "5s";
        "10s": "10s";
        "1m": "1m";
        "1h": "1h";
        "1d": "1d";
        "1w": "1w";
        "1mo": "1mo";
        "1y": "1y";
        "2y": "2y";
        "5y": "5y";
    }>;
    trackedSymbols: z.ZodArray<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    visibleModules: z.ZodArray<z.ZodEnum<{
        "market-overview": "market-overview";
        "broker-tools": "broker-tools";
        "system-observation": "system-observation";
        watchlist: "watchlist";
        "forecast-analysis": "forecast-analysis";
    }>>;
    simulationPreferences: z.ZodObject<{
        preferredBrokerMode: z.ZodEnum<{
            manual_stock_lane: "manual_stock_lane";
            manual_multi_asset_lane: "manual_multi_asset_lane";
            ai_copilot_lane: "ai_copilot_lane";
            signal_follow_lane: "signal_follow_lane";
            agent_sandbox_lane: "agent_sandbox_lane";
        }>;
        brokerModeCapitalLimitUsd: z.ZodNumber;
        microTradeAllocationPercent: z.ZodNumber;
        defaultAssetScope: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
            "multi-asset": "multi-asset";
        }>;
    }, z.core.$strip>;
    activityPreferences: z.ZodObject<{
        orderActivityDigest: z.ZodBoolean;
        laneStatusAlerts: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>;
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
//# sourceMappingURL=account.d.ts.map