import { createAppError } from '@/services/errors/AppError';

/**
 * Garde des hooks Configurateurs a entree conditionnelle. Une requete desactivee
 * n'appelle jamais son `queryFn` ; cette garde couvre le cas ou l'entree
 * disparaitrait entre l'activation et l'execution, sans jamais fabriquer
 * d'entree par defaut.
 */
export const requireConfiguratorInput = <TInput>(
  input: TInput | null,
  hookName: string
): TInput => {
  if (input === null) {
    throw createAppError({
      code: 'CONFIG_INVALID',
      message: 'Requête Configurateurs incomplète.',
      source: 'client',
      details: `${hookName} a été exécuté sans entrée.`
    });
  }

  return input;
};
