import { z } from 'zod/v4';

export const entityDepartmentCodePattern = /^\d{2}$/;

export const entityDepartmentCodeSchema = z
  .string()
  .trim()
  .regex(entityDepartmentCodePattern, 'Departement invalide');

export const optionalEntityDepartmentCodeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() ?? '')
  .refine(
    (value) => value.length === 0 || entityDepartmentCodePattern.test(value),
    { message: 'Departement invalide' }
  );
