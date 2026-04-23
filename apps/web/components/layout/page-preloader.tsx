'use client';

import { useEffect, useRef, useState } from 'react';

type PagePreloaderProps = {
  labels: {
    loadingStocks: string;
    loadingEtfs: string;
    loadingCrypto: string;
  };
  minDurationMs?: number;
};

export function PagePreloader({ labels, minDurationMs = 1100 }: PagePreloaderProps) {
  const [progress, setProgress] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const markReady = () => setIsReady(true);

    // Don't block on full window load forever; interactive is enough for perceived readiness.
    if (document.readyState !== 'loading') {
      markReady();
    } else {
      const handleReadyStateChange = () => {
        if (document.readyState !== 'loading') {
          markReady();
        }
      };

      document.addEventListener('readystatechange', handleReadyStateChange);
      window.addEventListener('load', markReady, { once: true });

      // Hard fallback so content can never be permanently blocked by a stuck load event.
      const fallbackTimer = window.setTimeout(markReady, 2500);

      return () => {
        document.removeEventListener('readystatechange', handleReadyStateChange);
        window.removeEventListener('load', markReady);
        window.clearTimeout(fallbackTimer);
      };
    }
  }, []);

  useEffect(() => {
    if (isHidden) {
      return;
    }

    const progressInterval = window.setInterval(() => {
      setProgress((previous) => {
        if (previous >= 95) {
          return previous;
        }
        const step = previous < 40 ? 4 : previous < 70 ? 3 : 2;
        return Math.min(95, previous + step);
      });
    }, 80);

    const phaseInterval = window.setInterval(() => {
      setPhaseIndex((previous) => (previous + 1) % 3);
    }, 950);

    return () => {
      window.clearInterval(progressInterval);
      window.clearInterval(phaseInterval);
    };
  }, [isHidden]);

  useEffect(() => {
    if (!isReady || isHidden) {
      return;
    }

    const elapsed = Date.now() - mountedAtRef.current;
    const delay = Math.max(0, minDurationMs - elapsed);

    const finishTimer = window.setTimeout(() => {
      setProgress(100);
      setIsClosing(true);
      window.setTimeout(() => {
        setIsHidden(true);
      }, 220);
    }, delay);

    return () => window.clearTimeout(finishTimer);
  }, [isReady, isHidden, minDurationMs]);

  if (isHidden) {
    return null;
  }

  const phases = [labels.loadingStocks, labels.loadingEtfs, labels.loadingCrypto];

  return (
    <div className={`page-preloader${isClosing ? ' page-preloader--closing' : ''}`} aria-live="polite">
      <div className="page-preloader__center">
        <div className="page-preloader__percent">{progress}%</div>
        <div className="page-preloader__message">{phases[phaseIndex]}</div>
      </div>
    </div>
  );
}
