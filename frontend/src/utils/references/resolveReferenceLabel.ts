import type { AgencyConfig } from '@/services/config';

type Resolution = NonNullable<AgencyConfig['resolutions']>[number];

export const resolveReferenceLabel = (
  dimension: Resolution['dimension'],
  rawLabel: string,
  resolutions: Resolution[] = []
): string => {
  const normalized = rawLabel.trim().toLowerCase();
  return resolutions.find((item) =>
    item.dimension === dimension && item.source_label.trim().toLowerCase() === normalized
  )?.target_label ?? rawLabel;
};
