import type { ReactNode } from 'react';
import type { AiFeature } from '../../../../shared/schemas/ai.schema';

export const AI_DAYS = 30;
export const featureLabels: Record<AiFeature, string> = {
  'assistant.referentiels': 'Assistant référentiels',
  'pricing.references.diagnose': 'Diagnostic global',
  'pricing.references.diagnose.classification': 'Diagnostic classification',
  'pricing.references.diagnose.segments': 'Diagnostic segments'
};
export const features = Object.entries(featureLabels) as [AiFeature, string][];
export const formatNumber = new Intl.NumberFormat('fr-FR');
export const formatCost = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
export const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Jamais';

export const SectionState = ({ children }: { children: ReactNode }) => <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground" role="status">{children}</div>;
export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => <label className="grid gap-1.5 text-xs font-medium text-foreground">{label}{children}{hint ? <span className="font-normal text-muted-foreground">{hint}</span> : null}</label>;
export const Metric = ({ label, value, detail }: { label: string; value: string; detail?: string }) => <div className="min-w-0 border-t border-border pt-3"><p className="text-[11px] font-medium text-muted-foreground">{label}</p><p className="mt-1 truncate text-base font-semibold tabular-nums text-foreground" title={value}>{value}</p>{detail ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={detail}>{detail}</p> : null}</div>;
