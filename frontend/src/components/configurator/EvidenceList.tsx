import { FileText, Ruler, Sigma, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ConfiguratorEvidence } from 'shared/schemas/configurator/common.schema';

import { cn } from '@/lib/utils';
import { EVIDENCE_KIND_LABELS } from './configuratorVocabulary';

const EVIDENCE_ICONS: Record<ConfiguratorEvidence['kind'], LucideIcon> = {
  source_page: FileText,
  measurement: Ruler,
  sample: Users,
  rule: Sigma
};

const formatMeasuredAt = (measuredAt: string): string => {
  const parsed = new Date(measuredAt);
  if (Number.isNaN(parsed.getTime())) {
    return measuredAt;
  }
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const EvidenceDetail = ({ evidence }: { evidence: ConfiguratorEvidence }) => {
  if (evidence.kind === 'source_page') {
    return (
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <dt>Document</dt>
        <dd className="truncate font-mono text-foreground" title={evidence.filename}>
          {evidence.filename}
        </dd>
        <dt>Page PDF</dt>
        <dd className="font-mono tabular-nums text-foreground">{evidence.pdf_page}</dd>
        {evidence.catalog_page ? (
          <>
            <dt>Page catalogue</dt>
            <dd className="font-mono text-foreground">{evidence.catalog_page}</dd>
          </>
        ) : null}
        <dt>Extraction</dt>
        <dd className="text-foreground">{evidence.extraction_method}</dd>
        <dt>Empreinte</dt>
        <dd className="truncate font-mono text-foreground" title={evidence.sha256}>
          {evidence.sha256.slice(0, 16)}…
        </dd>
      </dl>
    );
  }

  if (evidence.kind === 'measurement') {
    return (
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <dt>Mesurée le</dt>
        <dd className="font-mono tabular-nums text-foreground">
          {evidence.measured_at ? formatMeasuredAt(evidence.measured_at) : 'Date non enregistrée'}
        </dd>
      </dl>
    );
  }

  if (evidence.kind === 'sample') {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground">
        Échantillon de{' '}
        <span className="font-mono tabular-nums text-foreground">{evidence.sample_size}</span>{' '}
        moteurs de la base.
      </p>
    );
  }

  return (
    <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
      <p>
        Règle <span className="font-mono text-foreground">{evidence.rule_code}</span>
      </p>
      {evidence.inputs.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {evidence.inputs.map((input) => (
            <li
              key={`${input.key}-${String(input.value)}`}
              className="rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-foreground"
            >
              {input.key} = {input.value === null ? '—' : String(input.value)}
              {input.unit ? ` ${input.unit}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

type EvidenceListProps = {
  evidence: readonly ConfiguratorEvidence[];
  className?: string;
};

/**
 * Liste des preuves attachees a un fait, un critere ou un conseil.
 *
 * Les PDF constructeurs ne sont ni exposes ni telechargeables : seules les
 * metadonnees, la page et l'empreinte sont affichees.
 */
export const EvidenceList = ({ evidence, className }: EvidenceListProps) => {
  if (evidence.length === 0) {
    return (
      <p className={cn('text-[11px] text-muted-foreground', className)}>
        Aucune preuve rattachée.
      </p>
    );
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {evidence.map((item, index) => {
        const Icon = EVIDENCE_ICONS[item.kind];
        return (
          <li
            key={`${item.kind}-${item.label}-${String(index)}`}
            className="rounded-md border border-border bg-card p-2.5"
          >
            <div className="flex items-start gap-2">
              <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {EVIDENCE_KIND_LABELS[item.kind]}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-foreground">{item.label}</p>
                <EvidenceDetail evidence={item} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
