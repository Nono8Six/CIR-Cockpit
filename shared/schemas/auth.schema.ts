import { z } from 'zod/v4';

export const emailSchema = z
  .string()
  .trim()
  .email('Adresse email invalide')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^a-zA-Z0-9]/, 'Le mot de passe doit contenir au moins un symbole');

export const uuidSchema = z.string().uuid('Identifiant invalide');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Nom requis')
  .max(120, 'Nom trop long');

export const firstNameSchema = z
  .string()
  .trim()
  .min(1, 'Prenom requis')
  .max(120, 'Prenom trop long');

export const lastNameSchema = z
  .string()
  .trim()
  .min(1, 'Nom requis')
  .max(120, 'Nom trop long');

export const agencyNameSchema = z
  .string()
  .trim()
  .min(1, "Nom d'agence requis")
  .max(120, "Nom d'agence trop long");
