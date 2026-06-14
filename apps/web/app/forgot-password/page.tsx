import { AuthShell } from '../../components/auth/auth-shell';
import { ForgotPasswordForm } from '../../components/auth/forgot-password-form';
import { getMessages } from '../../lib/i18n/messages';
import { redirectIfAuthenticated } from '../../server/auth/session';
import { getRequestLocale } from '../../server/i18n/locale';

export default async function ForgotPasswordPage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  await redirectIfAuthenticated();

  return (
    <AuthShell
      eyebrow={messages.auth.forgotEyebrow}
      title={messages.auth.forgotTitle}
      description={messages.auth.forgotDescription}
      features={[
        messages.auth.secureSession,
        messages.auth.protectedWorkspace,
        messages.auth.profileManagement,
      ]}
      footerPrompt={messages.auth.alreadyRegistered}
      footerLinkLabel={messages.auth.signIn}
      footerLinkHref="/login"
    >
      <ForgotPasswordForm messages={messages.auth} />
    </AuthShell>
  );
}
