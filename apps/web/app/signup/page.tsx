import { AuthShell } from '../../components/auth/auth-shell';
import { RegisterForm } from '../../components/auth/register-form';
import { getMessages } from '../../lib/i18n/messages';
import { redirectIfAuthenticated } from '../../server/auth/session';
import { getRequestLocale } from '../../server/i18n/locale';

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = getSearchParamValue(resolvedSearchParams?.next);
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  await redirectIfAuthenticated(nextPath ?? undefined);

  return (
    <AuthShell
      eyebrow={messages.auth.signupEyebrow}
      title={messages.auth.signupTitle}
      description={messages.auth.signupDescription}
      features={[
        messages.auth.secureSession,
        messages.auth.protectedWorkspace,
        messages.auth.profileManagement,
      ]}
      footerPrompt={messages.auth.alreadyRegistered}
      footerLinkLabel={messages.auth.signIn}
      footerLinkHref={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}
    >
      <RegisterForm nextPath={nextPath} messages={messages.auth} />
    </AuthShell>
  );
}
