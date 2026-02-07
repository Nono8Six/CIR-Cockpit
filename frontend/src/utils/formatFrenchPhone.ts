export const formatFrenchPhone = (value: string): string => {
  if (!value) return value;
  const digits = value.replace(/[^\d]/g, '').slice(0, 10);
  if (digits.length < 3) return digits;
  if (digits.length < 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length < 7) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  if (digits.length < 9) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
  }
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};
