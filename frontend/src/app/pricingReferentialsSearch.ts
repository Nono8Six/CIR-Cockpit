import { z } from 'zod/v4';

export const pricingReferentialsTabSchema = z.enum([
  'imports',
  'classification',
  'segments',
  'anomalies',
  'changements'
]);

export const pricingReferentialsSearchStateSchema = z.strictObject({
  tab: pricingReferentialsTabSchema.optional()
});

export type PricingReferentialsTab = z.infer<typeof pricingReferentialsTabSchema>;
export type PricingReferentialsSearchState = z.infer<typeof pricingReferentialsSearchStateSchema>;

export const validatePricingReferentialsSearch = (
  search: Record<string, unknown>
): PricingReferentialsSearchState => {
  const parsed = pricingReferentialsSearchStateSchema.safeParse(search);
  return parsed.success ? parsed.data : {};
};
