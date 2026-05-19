/**
 * @description Safely reads a string value from a record key.
 * @param {Record<string, unknown>} record - The target record.
 * @param {string} key - The key to read.
 * @returns {string | null} The string value, or null if invalid or missing.
 */
export const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' ? value : null;
};
