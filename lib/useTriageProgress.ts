"use client";

import { useEffect, useState } from "react";

const PROGRESS_LABELS = ["Working…", "Measuring…", "Reasoning…"] as const;

export function useTriageProgress(active: boolean): { label: string; reset: () => void } {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      setStep((current) => (current + 1) % PROGRESS_LABELS.length);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [active]);

  return { label: PROGRESS_LABELS[step], reset: () => setStep(0) };
}
