import { z } from 'zod/v4';

export const dashboardSearchStateSchema = z.strictObject({
  interactionId: z.string().trim().min(1).optional()
});

export const validateDashboardSearch = (search: Record<string, unknown>) => {
  const parsed = dashboardSearchStateSchema.safeParse(search);
  return parsed.success ? parsed.data : {};
};
