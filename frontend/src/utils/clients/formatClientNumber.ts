export const stripClientNumber = (value?: string | null): string =>
  (value ?? '').replace(/\D/g, '').slice(0, 10);

export const formatClientNumber = (value?: string | null): string => {
  return stripClientNumber(value);
};
