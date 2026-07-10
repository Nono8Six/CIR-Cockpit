import type { PricingReferenceSegmentsListResponse } from '../../../../../../shared/schemas/pricing/references.schema';

export type SegmentRow = PricingReferenceSegmentsListResponse['rows'][number];

export type SegmentColumnId =
  | 'marque'
  | 'cat_fab'
  | 'segment'
  | 'idnumerique'
  | 'cat_fab_l'
  | 'strategiq'
  | 'codif_fair'
  | 'tarif_fab'
  | 'mega_famille'
  | 'famille'
  | 'sous_famille'
  | 'mega_libelle'
  | 'famille_libelle'
  | 'sfam_libelle'
  | 'source_row_number'
  | 'segment_key'
  | 'cir_key'
  | 'link_status'
  | 'purchase_grid_rows_count';

export type SegmentGridDensity = 'compact' | 'comfortable';

export type SegmentColumnGroup = 'Identité fabricant' | 'Classification CIR' | 'Traçabilité' | 'Achat';

export interface SegmentColumnConfig {
  id: SegmentColumnId;
  label: string;
  group: SegmentColumnGroup;
  defaultVisible: boolean;
  required?: boolean;
  mono?: boolean;
  numeric?: boolean;
  minSize: number;
  size: number;
  maxSize: number;
}

export const SEGMENT_COLUMN_GROUPS: SegmentColumnGroup[] = [
  'Identité fabricant',
  'Classification CIR',
  'Achat',
  'Traçabilité'
];

export const SEGMENT_COLUMN_CONFIGS: SegmentColumnConfig[] = [
  {
    id: 'marque',
    label: 'Marque',
    group: 'Identité fabricant',
    defaultVisible: true,
    required: true,
    minSize: 120,
    size: 150,
    maxSize: 320
  },
  {
    id: 'cat_fab',
    label: 'Cat fab',
    group: 'Identité fabricant',
    defaultVisible: true,
    required: true,
    mono: true,
    minSize: 96,
    size: 108,
    maxSize: 180
  },
  {
    id: 'segment',
    label: 'Segment',
    group: 'Identité fabricant',
    defaultVisible: true,
    required: true,
    minSize: 130,
    size: 180,
    maxSize: 380
  },
  {
    id: 'idnumerique',
    label: 'ID numérique',
    group: 'Identité fabricant',
    defaultVisible: true,
    required: true,
    mono: true,
    minSize: 108,
    size: 124,
    maxSize: 180
  },
  {
    id: 'cat_fab_l',
    label: 'Libellé cat fab',
    group: 'Identité fabricant',
    defaultVisible: true,
    minSize: 160,
    size: 220,
    maxSize: 420
  },
  {
    id: 'strategiq',
    label: 'Stratégique',
    group: 'Identité fabricant',
    defaultVisible: true,
    minSize: 110,
    size: 128,
    maxSize: 220
  },
  {
    id: 'codif_fair',
    label: 'Codif FAIR',
    group: 'Identité fabricant',
    defaultVisible: false,
    mono: true,
    minSize: 110,
    size: 130,
    maxSize: 220
  },
  {
    id: 'tarif_fab',
    label: 'Tarif fab',
    group: 'Identité fabricant',
    defaultVisible: true,
    mono: true,
    minSize: 104,
    size: 120,
    maxSize: 220
  },
  {
    id: 'cir_key',
    label: 'Clé CIR',
    group: 'Classification CIR',
    defaultVisible: true,
    mono: true,
    minSize: 116,
    size: 132,
    maxSize: 220
  },
  {
    id: 'mega_famille',
    label: 'Méga-famille',
    group: 'Classification CIR',
    defaultVisible: false,
    mono: true,
    minSize: 112,
    size: 132,
    maxSize: 200
  },
  {
    id: 'famille',
    label: 'Famille',
    group: 'Classification CIR',
    defaultVisible: false,
    mono: true,
    minSize: 104,
    size: 120,
    maxSize: 200
  },
  {
    id: 'sous_famille',
    label: 'Sous-famille',
    group: 'Classification CIR',
    defaultVisible: false,
    mono: true,
    minSize: 112,
    size: 128,
    maxSize: 200
  },
  {
    id: 'mega_libelle',
    label: 'Libellé méga',
    group: 'Classification CIR',
    defaultVisible: true,
    minSize: 160,
    size: 220,
    maxSize: 420
  },
  {
    id: 'famille_libelle',
    label: 'Libellé famille',
    group: 'Classification CIR',
    defaultVisible: true,
    minSize: 160,
    size: 220,
    maxSize: 420
  },
  {
    id: 'sfam_libelle',
    label: 'Libellé sous-famille',
    group: 'Classification CIR',
    defaultVisible: true,
    minSize: 170,
    size: 230,
    maxSize: 460
  },
  {
    id: 'link_status',
    label: 'Liaison',
    group: 'Classification CIR',
    defaultVisible: true,
    minSize: 130,
    size: 156,
    maxSize: 260
  },
  {
    id: 'source_row_number',
    label: 'Ligne source',
    group: 'Traçabilité',
    defaultVisible: false,
    mono: true,
    numeric: true,
    minSize: 104,
    size: 118,
    maxSize: 180
  },
  {
    id: 'segment_key',
    label: 'Clé segment',
    group: 'Traçabilité',
    defaultVisible: false,
    mono: true,
    minSize: 180,
    size: 240,
    maxSize: 520
  },
  {
    id: 'purchase_grid_rows_count',
    label: 'Grilles',
    group: 'Achat',
    defaultVisible: true,
    mono: true,
    numeric: true,
    minSize: 92,
    size: 104,
    maxSize: 150
  }
];

export const SEGMENT_COLUMN_IDS = SEGMENT_COLUMN_CONFIGS.map((column) => column.id);

export const DEFAULT_SEGMENT_COLUMN_VISIBILITY = SEGMENT_COLUMN_CONFIGS.reduce<Record<string, boolean>>(
  (visibility, column) => {
    visibility[column.id] = column.defaultVisible;
    return visibility;
  },
  {}
);

export const DEFAULT_SEGMENT_COLUMN_SIZING = SEGMENT_COLUMN_CONFIGS.reduce<Record<string, number>>(
  (sizing, column) => {
    sizing[column.id] = column.size;
    return sizing;
  },
  {}
);

export const DEFAULT_SEGMENT_COLUMN_PINNING = {
  left: ['marque'],
  right: []
};

export const getSegmentColumnConfig = (columnId: string): SegmentColumnConfig | undefined =>
  SEGMENT_COLUMN_CONFIGS.find((column) => column.id === columnId);

export const normalizeSegmentColumnOrder = (order: string[]): string[] => {
  const known = new Set(SEGMENT_COLUMN_IDS);
  const selected = order.filter((columnId) => known.has(columnId as SegmentColumnId));
  const missing = SEGMENT_COLUMN_IDS.filter((columnId) => !selected.includes(columnId));
  return [...selected, ...missing];
};

export const normalizeSegmentColumnVisibility = (visibility: Record<string, boolean>): Record<string, boolean> => {
  const next = { ...DEFAULT_SEGMENT_COLUMN_VISIBILITY, ...visibility };
  for (const column of SEGMENT_COLUMN_CONFIGS) {
    if (column.required) {
      next[column.id] = true;
    }
  }
  return next;
};
