import { httpError } from '../../middleware/errorHandler.ts';

const PASSWORD_SYMBOLS = '!@#$%^&*';
const PASSWORD_DIGITS = '0123456789';
const PASSWORD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const PASSWORD_DEFAULT_LENGTH = 12;

export const BANNED_UNTIL = '9999-12-31T00:00:00.000Z';
export const SYSTEM_LAST_NAME = 'SYSTEME';
export const SYSTEM_DEFAULT_FIRST_NAME = 'Agence';
export const SYSTEM_ORPHAN_FIRST_NAME = 'Orpheline';
export const SYSTEM_EMAIL_DOMAIN = 'cir.invalid';

export const normalizePersonName = (value?: string): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const buildDisplayName = (lastName?: string, firstName?: string): string | undefined => {
  const normalizedLastName = normalizePersonName(lastName);
  const normalizedFirstName = normalizePersonName(firstName);
  const displayName = [normalizedLastName, normalizedFirstName].filter(Boolean).join(' ').trim();
  return displayName || undefined;
};

export const validatePasswordPolicy = (password: string): void => {
  if (password.length < 8) {
    throw httpError(400, 'PASSWORD_TOO_SHORT', 'Le mot de passe doit contenir au moins 8 caracteres.');
  }
  if (!/\d/.test(password)) {
    throw httpError(400, 'PASSWORD_REQUIRES_DIGIT', 'Le mot de passe doit contenir au moins un chiffre.');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    throw httpError(400, 'PASSWORD_REQUIRES_SYMBOL', 'Le mot de passe doit contenir au moins un symbole.');
  }
};

const randomInt = (max: number): number => {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return value % max;
};

const shuffle = (items: string[]): string[] => {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
};

export const generateTempPassword = (length = PASSWORD_DEFAULT_LENGTH): string => {
  const safeLength = Math.max(length, 8);
  const allChars = PASSWORD_LETTERS + PASSWORD_DIGITS + PASSWORD_SYMBOLS;
  const result = [
    PASSWORD_DIGITS[randomInt(PASSWORD_DIGITS.length)],
    PASSWORD_SYMBOLS[randomInt(PASSWORD_SYMBOLS.length)],
    PASSWORD_LETTERS[randomInt(PASSWORD_LETTERS.length)]
  ];

  while (result.length < safeLength) {
    result.push(allChars[randomInt(allChars.length)]);
  }

  return shuffle(result).join('');
};

export const ensurePassword = (raw?: string): { password: string; generated: boolean } => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    const generated = generateTempPassword();
    validatePasswordPolicy(generated);
    return { password: generated, generated: true };
  }

  validatePasswordPolicy(trimmed);
  return { password: trimmed, generated: false };
};

export const normalizeAgencyIds = (value: string[] | undefined): string[] => {
  if (!value || value.length === 0) return [];
  return Array.from(new Set(value.map((entry) => entry.trim()).filter(Boolean)));
};
