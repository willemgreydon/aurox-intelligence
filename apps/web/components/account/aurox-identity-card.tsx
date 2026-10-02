'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

type Labels = {
  ariaLabel: string;
  demoLabel: string;
  identityNumberLabel: string;
  accountHolderLabel: string;
  simulationLabel: string;
  number: string;
};

type Props = {
  userName: string;
  labels: Labels;
};

const DEFAULT_NUMBER = '2468 1357 9024 6801';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Aurox identity visualization, deliberately not a payment instrument.
 * The server render is always neutral; motion is a client-only enhancement.
 */
export function AuroxIdentityCard({ userName, labels }: Props) {
  const cardRef = useRef<HTMLElement | null>(null);

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

  return (
    <section
      ref={cardRef}
      className="aurox-identity-card"
      aria-label={labels.ariaLabel}
    >
      <div className="aurox-identity-card__material" aria-hidden="true" />
      <div className="aurox-identity-card__grid" aria-hidden="true" />
      <div className="aurox-identity-card__specular" aria-hidden="true" />
      <div className="aurox-identity-card__content">
        <div className="aurox-identity-card__topline">
          <div className="aurox-identity-card__brand">
            <Image src="/aurox.svg" alt="" width={34} height={34} className="aurox-identity-card__mark" />
            <span>AUROX</span>
          </div>
          <span className="aurox-identity-card__demo">{labels.demoLabel}</span>
        </div>

        <div className="aurox-identity-card__center">
          <span className="aurox-identity-card__label">{labels.identityNumberLabel}</span>
          <span className="aurox-identity-card__number" aria-label={`${labels.identityNumberLabel}: ${number}`}>
            {number}
          </span>
        </div>

        <div className="aurox-identity-card__bottomline">
          <div>
            <span className="aurox-identity-card__label">{labels.accountHolderLabel}</span>
            <strong>{userName}</strong>
          </div>
          <span className="aurox-identity-card__status">{labels.simulationLabel}</span>
        </div>
      </div>
    </section>
  );
}
