import type { PipelineBoard, PipelineMoveTarget } from '@/utils/dashboard/dashboardPipeline';

export type PipelineColumnKey = 'unqualified' | 'qualification' | 'quote_sent' | 'negotiation' | 'closed';

export type PipelineColumnConfig = {
  key: PipelineColumnKey;
  label: string;
  // Cible d'etape lors d'un depot dans la colonne ; undefined = pas une cible de depot direct.
  dropTarget?: PipelineMoveTarget;
  amountKey?: keyof PipelineBoard['amounts'];
};

export const PIPELINE_COLUMNS: PipelineColumnConfig[] = [
  { key: 'unqualified', label: 'À qualifier', dropTarget: null, amountKey: 'unqualified' },
  { key: 'qualification', label: 'Qualifié', dropTarget: 'qualification', amountKey: 'qualification' },
  { key: 'quote_sent', label: 'Devis envoyé', dropTarget: 'quote_sent', amountKey: 'quote_sent' },
  { key: 'negotiation', label: 'Négociation', dropTarget: 'negotiation', amountKey: 'negotiation' },
  { key: 'closed', label: 'Clôturé (30 j)' }
];

export const PIPELINE_MOVE_TARGETS: Array<{ target: PipelineMoveTarget; label: string }> = [
  { target: null, label: 'À qualifier' },
  { target: 'qualification', label: 'Qualifié' },
  { target: 'quote_sent', label: 'Devis envoyé' },
  { target: 'negotiation', label: 'Négociation' }
];

export const PIPELINE_LOST_REASONS = ['Prix', 'Délai', 'Concurrence', 'Sans suite', 'Autre'] as const;

export const PIPELINE_DRAG_DATA_TYPE = 'application/x-cir-interaction-id';
