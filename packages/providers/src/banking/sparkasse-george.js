import { getProviderEnv } from '../config';
export function getSparkasseGeorgeConnectionCapability() {
    const env = getProviderEnv();
    const hasPartnerCredentials = Boolean(env.ERSTE_CONNECT_CLIENT_ID && env.ERSTE_CONNECT_CLIENT_SECRET);
    if (hasPartnerCredentials) {
        return {
            providerKey: 'sparkasse-george-business',
            providerLabel: 'Sparkasse George Businesskonto',
            connectionStatus: 'available',
            accessModel: 'partner-api',
            supportedScopes: ['balances', 'transactions', 'payments', 'multibanking'],
            isConsentRequired: true,
            requiresRegulatedPartner: false,
            disclosure: 'Partner-style Erste open banking connectivity is configured for consent-based business account data access. Payment initiation still requires explicit user authorization and downstream execution handling.',
            setupHint: 'Provision consent flow, account selection, and token storage before exposing account sync to end users.',
        };
    }
    return {
        providerKey: 'sparkasse-george-business',
        providerLabel: 'Sparkasse George Businesskonto',
        connectionStatus: env.ENABLE_SPARKASSE_GEORGE_SANDBOX ? 'sandbox' : 'credentials-required',
        accessModel: 'psd2-xs2a',
        supportedScopes: ['balances', 'transactions'],
        isConsentRequired: true,
        requiresRegulatedPartner: true,
        disclosure: 'Direct PSD2-style account access requires explicit user consent and usually a regulated AIS/PIS path or an approved partner setup. The app must not imply bank connectivity until onboarding is completed.',
        setupHint: env.ENABLE_SPARKASSE_GEORGE_SANDBOX
            ? 'Sandbox mode can be used for integration testing, but production account linking is not configured.'
            : 'Configure regulated open-banking access or an Erste partner integration before enabling live account connection.',
    };
}
