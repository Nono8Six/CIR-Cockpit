import type { ErrorCode } from '../../../../../shared/errors/types.ts';
import { httpError, type HttpError } from '../../middleware/errorHandler.ts';

const withPrivateCause = (error: HttpError, cause?: unknown): HttpError => {
  if (cause !== undefined) {
    Object.defineProperty(error, 'cause', {
      configurable: true,
      enumerable: false,
      value: cause,
      writable: false
    });
  }
  return error;
};

const createConfiguratorError = (
  status: number,
  code: ErrorCode,
  message: string,
  cause?: unknown
): HttpError => withPrivateCause(httpError(status, code, message), cause);

const readCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = Reflect.get(error, 'code');
  return typeof code === 'string' ? code : undefined;
};

const isHttpError = (error: unknown): error is HttpError => {
  if (!(error instanceof Error)) return false;
  return typeof Reflect.get(error, 'status') === 'number'
    && typeof Reflect.get(error, 'code') === 'string';
};

export const configuratorSnapshotUnavailable = (): HttpError =>
  createConfiguratorError(
    503,
    'CONFIGURATOR_SNAPSHOT_UNAVAILABLE',
    'Catalogue technique indisponible.'
  );

export const configuratorOperatingPointNotFound = (): HttpError =>
  createConfiguratorError(
    404,
    'CONFIGURATOR_OPERATING_POINT_NOT_FOUND',
    'Point de fonctionnement introuvable.'
  );

export const configuratorMechanicalClearanceUnavailable = (): HttpError =>
  createConfiguratorError(
    422,
    'CONFIGURATOR_MECHANICAL_CLEARANCE_UNAVAILABLE',
    'Jeu mecanique non calculable.'
  );

export const configuratorRulesetUnavailable = (): HttpError =>
  createConfiguratorError(
    503,
    'CONFIGURATOR_RULESET_UNAVAILABLE',
    'Regles techniques indisponibles.'
  );

export const configuratorOutputInvalid = (cause?: unknown): HttpError =>
  createConfiguratorError(
    500,
    'CONFIGURATOR_OUTPUT_INVALID',
    'Resultat technique invalide.',
    cause
  );

export const mapConfiguratorReadError = (error: unknown): HttpError => {
  if (isHttpError(error)) return error;

  const code = readCode(error);
  if (code === '57014' || code === '55P03') {
    return createConfiguratorError(
      504,
      'CONFIGURATOR_DB_TIMEOUT',
      'Lecture technique trop longue.',
      error
    );
  }

  return createConfiguratorError(
    500,
    'CONFIGURATOR_DB_READ_FAILED',
    'Lecture technique impossible.',
    error
  );
};
