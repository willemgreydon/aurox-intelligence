import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '../ui/card';
import { Section } from '../ui/section';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  features: [string, string, string];
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  features,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
  children,
}: AuthShellProps) {
  return (
    <Section className="auth-section">
      <div className="auth-shell">
        <div className="auth-shell__intro">
          <div className="section__eyebrow">{eyebrow}</div>
          <h1 className="auth-shell__title">{title}</h1>
          <p className="auth-shell__description">{description}</p>
          <div className="auth-shell__feature-list">
            {features.map((feature) => (
              <div key={feature} className="pill">
                {feature}
              </div>
            ))}
          </div>
        </div>

        <Card className="auth-card">
          {children}
          <p className="auth-card__footer">
            {footerPrompt} <Link href={footerLinkHref}>{footerLinkLabel}</Link>
          </p>
        </Card>
      </div>
    </Section>
  );
}
