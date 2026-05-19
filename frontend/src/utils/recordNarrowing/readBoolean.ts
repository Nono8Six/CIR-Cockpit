/**
 * @description Safely reads a boolean value from a record key.
 * @param {Record<string, unknown>} record - The target record.
 * @param {string} key - The key to read.
 * @returns {boolean | null} The boolean value, or null if invalid or missing.
 */
export const readBoolean = (record: Record<string, unknown>, key: string): boolean | null => {
  const value = record[key];
  return typeof value === 'boolean' ? value : null;
};
