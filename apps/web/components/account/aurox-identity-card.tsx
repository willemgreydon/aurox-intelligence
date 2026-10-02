'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

type Labels = {
  ariaLabel: string;
  demoLabel: string;
  identityNumberLabel: string;
  accountHolderLabel: string;
  simulationLabel: string;
  number: string;
  back?: {
    heading?: string;
    roleLabel?: string;
    memberSinceLabel?: string;
    referenceLabel?: string;
    statement?: string;
    flipToBackHint?: string;
    flipToFrontHint?: string;
  };
};

/** Pre-formatted, display-ready back-of-card details sourced from account state. */
type Details = {
  role: string;
  memberSince: string;
};

type Props = {
  userName: string;
  labels: Labels;
  details?: Details;
};

const DEFAULT_NUMBER = '2468 1357 9024 6801';

const BACK_DEFAULTS = {
  heading: 'Identity record',
  roleLabel: 'Access role',
  memberSinceLabel: 'Member since',
  referenceLabel: 'Reference',
  statement: 'Simulation identity. Not a payment instrument and not linked to any bank or card network.',
  flipToBackHint: 'Show identity details',
  flipToFrontHint: 'Show card front',
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Aurox identity visualization, deliberately not a payment instrument.
 *
 * One physical two-sided object: a perspective container → a `preserve-3d`
 * inner that rotates 180° → two `backface-visibility: hidden` faces. The server
 * render is neutral; pointer tilt and the flip transition are client-only
 * enhancements. The control is a real button so Enter/Space/tap all flip it, and
 * `prefers-reduced-motion` keeps the front/back swap while dropping the spin.
 */
export function AuroxIdentityCard({ userName, labels, details }: Props) {
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const [flipped, setFlipped] = useState(false);

  const toggleFlip = useCallback(() => setFlipped((value) => !value), []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setFlipped(false);
    }
  }, []);

  // Bounded pointer tilt. Only mutates CSS custom properties / transform — never
  // layout — and never triggers a flip (flip is an explicit click/key action).
  useEffect(() => {
    const card = cardRef.current;
    if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let active = false;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let bounds: DOMRect | null = null;

    const render = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      card.style.setProperty('--card-tilt-x', `${currentY.toFixed(3)}deg`);
      card.style.setProperty('--card-tilt-y', `${currentX.toFixed(3)}deg`);
      card.style.setProperty('--card-pointer-x', `${(50 + currentX * 5).toFixed(2)}%`);
      card.style.setProperty('--card-pointer-y', `${(50 + currentY * 5).toFixed(2)}%`);

      if (active || Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
        frame = window.requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const wake = () => {
      active = true;
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const rest = () => {
      active = false;
      targetX = 0;
      targetY = 0;
      bounds = null;
      card.style.setProperty('--card-pointer-x', '50%');
      card.style.setProperty('--card-pointer-y', '50%');
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const handlePointerEnter = () => {
      bounds = card.getBoundingClientRect();
      wake();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!bounds) bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      targetX = clamp(x * 6, -3, 3);
      targetY = clamp(y * -6, -3, 3);
      card.style.setProperty('--card-pointer-x', `${((x + 0.5) * 100).toFixed(2)}%`);
      card.style.setProperty('--card-pointer-y', `${((y + 0.5) * 100).toFixed(2)}%`);
      wake();
    };

    if (finePointer.matches) {
      card.addEventListener('pointermove', handlePointerMove);
      card.addEventListener('pointerenter', handlePointerEnter);
      card.addEventListener('pointerleave', rest);
    }

    return () => {
      card.removeEventListener('pointermove', handlePointerMove);
      card.removeEventListener('pointerenter', handlePointerEnter);
      card.removeEventListener('pointerleave', rest);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const number = labels.number || DEFAULT_NUMBER;
  const back = { ...BACK_DEFAULTS, ...(labels.back ?? {}) };
  const flipHint = flipped ? back.flipToFrontHint : back.flipToBackHint;

  return (
    <button
      ref={cardRef}
      type="button"
      className="aurox-identity-card"
      data-flipped={flipped ? 'true' : 'false'}
      aria-pressed={flipped}
      aria-label={`${labels.ariaLabel}. ${flipHint}.`}
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
    >
      <span className="aurox-identity-card__inner">
        {/* FRONT — preserved identity surface. */}
        <span className="aurox-identity-card__face aurox-identity-card__face--front" aria-hidden={flipped}>
          <span className="aurox-identity-card__material" />
          <span className="aurox-identity-card__grid" />
          <span className="aurox-identity-card__specular" />
          <span className="aurox-identity-card__content">
            <span className="aurox-identity-card__topline">
              <span className="aurox-identity-card__brand">
                <Image src="/aurox.svg" alt="" width={34} height={34} className="aurox-identity-card__mark" />
                <span>AUROX</span>
              </span>
              <span className="aurox-identity-card__demo">{labels.demoLabel}</span>
            </span>

            <span className="aurox-identity-card__center">
              <span className="aurox-identity-card__label">{labels.identityNumberLabel}</span>
              <span className="aurox-identity-card__number" aria-label={`${labels.identityNumberLabel}: ${number}`}>
                {number}
              </span>
            </span>

            <span className="aurox-identity-card__bottomline">
              <span className="aurox-identity-card__field">
                <span className="aurox-identity-card__label">{labels.accountHolderLabel}</span>
                <strong>{userName}</strong>
              </span>
              <span className="aurox-identity-card__status">{labels.simulationLabel}</span>
            </span>
          </span>
        </span>

        {/* BACK — same object, reverse side. Real, display-safe account metadata. */}
        <span className="aurox-identity-card__face aurox-identity-card__face--back" aria-hidden={!flipped}>
          <span className="aurox-identity-card__material aurox-identity-card__material--back" />
          <span className="aurox-identity-card__magstripe" />
          <span className="aurox-identity-card__content aurox-identity-card__content--back">
            <span className="aurox-identity-card__topline">
              <span className="aurox-identity-card__brand aurox-identity-card__brand--back">
                <Image src="/aurox.svg" alt="" width={26} height={26} className="aurox-identity-card__mark" />
                <span>{back.heading}</span>
              </span>
              <span className="aurox-identity-card__demo">{labels.simulationLabel}</span>
            </span>

            <dl className="aurox-identity-card__details">
              <div>
                <dt>{labels.accountHolderLabel}</dt>
                <dd>{userName}</dd>
              </div>
              {details ? (
                <>
                  <div>
                    <dt>{back.roleLabel}</dt>
                    <dd>{details.role}</dd>
                  </div>
                  <div>
                    <dt>{back.memberSinceLabel}</dt>
                    <dd>{details.memberSince}</dd>
                  </div>
                </>
              ) : null}
              <div>
                <dt>{back.referenceLabel}</dt>
                <dd className="aurox-identity-card__ref">{number}</dd>
              </div>
            </dl>

            <span className="aurox-identity-card__signature" aria-hidden="true" />
            <p className="aurox-identity-card__statement">{back.statement}</p>
          </span>
        </span>
      </span>
    </button>
  );
}
