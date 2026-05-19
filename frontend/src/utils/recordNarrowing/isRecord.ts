/**
 * @description Type guard to check if a value is a Record<string, unknown>.
 * @param {unknown} value - The value to check.
 * @returns {value is Record<string, unknown>} True if the value is a Record, false otherwise.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
