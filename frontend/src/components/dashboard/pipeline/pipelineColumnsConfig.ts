import {
  PIPELINE_STAGE_LABELS,
  type PipelineBoard,
  type PipelineMoveTarget
} from '@/utils/dashboard/dashboardPipeline';

export type PipelineColumnKey = 'unqualified' | 'qualification' | 'quote_sent' | 'negotiation' | 'closed';

export type PipelineColumnConfig = {
  key: PipelineColumnKey;
  label: string;
  // Cible d'etape lors d'un depot dans la colonne ; undefined = pas une cible de depot direct.
  dropTarget?: PipelineMoveTarget;
  amountKey?: keyof PipelineBoard['amounts'];
};

// Libelles derives de PIPELINE_STAGE_LABELS (source unique du vocabulaire d'etapes).
export const PIPELINE_COLUMNS: PipelineColumnConfig[] = [
  { key: 'unqualified', label: PIPELINE_STAGE_LABELS.unqualified, dropTarget: null, amountKey: 'unqualified' },
  { key: 'qualification', label: PIPELINE_STAGE_LABELS.qualification, dropTarget: 'qualification', amountKey: 'qualification' },
  { key: 'quote_sent', label: PIPELINE_STAGE_LABELS.quote_sent, dropTarget: 'quote_sent', amountKey: 'quote_sent' },
  { key: 'negotiation', label: PIPELINE_STAGE_LABELS.negotiation, dropTarget: 'negotiation', amountKey: 'negotiation' },
  { key: 'closed', label: 'Clôturé (30 j)' }
];

export const PIPELINE_MOVE_TARGETS: Array<{ target: PipelineMoveTarget; label: string }> = [
  { target: null, label: PIPELINE_STAGE_LABELS.unqualified },
  { target: 'qualification', label: PIPELINE_STAGE_LABELS.qualification },
  { target: 'quote_sent', label: PIPELINE_STAGE_LABELS.quote_sent },
  { target: 'negotiation', label: PIPELINE_STAGE_LABELS.negotiation }
];

export const PIPELINE_LOST_REASONS = ['Prix', 'Délai', 'Concurrence', 'Sans suite', 'Autre'] as const;

export const PIPELINE_DRAG_DATA_TYPE = 'application/x-cir-interaction-id';
