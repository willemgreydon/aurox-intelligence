import { AuthShell } from '../../components/auth/auth-shell';
import { LoginForm } from '../../components/auth/login-form';
import { getMessages } from '../../lib/i18n/messages';
import { redirectIfAuthenticated } from '../../server/auth/session';
import { getRequestLocale } from '../../server/i18n/locale';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = getSearchParamValue(resolvedSearchParams?.next);
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  await redirectIfAuthenticated(nextPath ?? undefined);

  return (
    <AuthShell
      eyebrow={messages.auth.loginEyebrow}
      title={messages.auth.loginTitle}
      description={messages.auth.loginDescription}
      features={[
        messages.auth.secureSession,
        messages.auth.protectedWorkspace,
        messages.auth.profileManagement,
      ]}
      footerPrompt={messages.auth.needAccount}
      footerLinkLabel={messages.auth.createOne}
      footerLinkHref={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : '/signup'}
    >
      <LoginForm nextPath={nextPath} messages={messages.auth} />
    </AuthShell>
  );
}
