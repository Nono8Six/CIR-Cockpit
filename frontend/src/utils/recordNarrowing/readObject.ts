import { isRecord } from './isRecord';

/**
 * @description Safely reads an object record from a record key.
 * @param {Record<string, unknown>} record - The target record.
 * @param {string} key - The key to read.
 * @returns {Record<string, unknown> | null} The nested record object, or null if invalid or missing.
 */
export const readObject = (record: Record<string, unknown>, key: string): Record<string, unknown> | null => {
  const value = record[key];
  return isRecord(value) ? value : null;
};
