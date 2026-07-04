import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PricingReferenceHealthReport } from '../../../../../../shared/schemas/pricing/references.schema';

interface HealthStatusBannerProps {
  report: PricingReferenceHealthReport | null | undefined;
  isLoading: boolean;
}

/**
 * Super-compact, premium status banner that takes up minimal space.
 */
export const HealthStatusBanner = ({ report, isLoading }: HealthStatusBannerProps) => {
  if (isLoading) {
    return (
      <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-100 border border-slate-200/50" />
    );
  }

  if (!report) {
    return null;
  }

  const hasBlockers = report.anomalies.bloquante > 0;
  const hasMediumOrLow = report.anomalies.moyenne > 0 || report.anomalies.faible > 0;

  let bannerBg = 'bg-emerald-50/50 border-emerald-200/80 text-emerald-800';
  let bannerTitle = 'Référentiel 100% Sain';
  let bannerText = 'Aucune anomalie détectée dans les données.';
  let BannerIcon = CheckCircle2;

  if (hasBlockers) {
    bannerBg = 'bg-rose-50/50 border-rose-200/80 text-rose-800';
    bannerTitle = 'Statut critique';
    bannerText = "Des anomalies bloquantes empêchent l'exploitation correcte du référentiel.";
    BannerIcon = AlertTriangle;
  } else if (hasMediumOrLow) {
    bannerBg = 'bg-sky-50/50 border-sky-200/80 text-sky-800';
    bannerTitle = 'Anomalies mineures';
    bannerText = 'Quelques anomalies moyennes ou faibles sont présentes à titre informatif.';
    BannerIcon = AlertTriangle;
  }

  return (
    <div
      className={cn(
        'border py-1.5 px-3 rounded-lg flex items-center gap-2 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-300 animate-in fade-in slide-in-from-top-1 w-fit shrink-0',
        bannerBg
      )}
    >
      <BannerIcon className="size-4 shrink-0" />
      <span className="font-semibold">{bannerTitle} :</span>
      <span className="opacity-90">{bannerText}</span>
    </div>
  );
};
