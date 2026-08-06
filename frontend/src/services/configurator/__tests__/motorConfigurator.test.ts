import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  invokeTrpc,
  parseTrpcContract,
  type TrpcResponseContract
} from '@/services/api/invokeTrpc';
import {
  buildMotorAdvice,
  compareMotors,
  computeMotorEnergy,
  findMotorEquivalentsFromMotor,
  findMotorEquivalentsFromSpec,
  getMotorCatalogEntry,
  listMotorCatalog
} from '../motorConfigurator';

vi.mock('@/services/api/invokeTrpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/invokeTrpc')>()),
  invokeTrpc: vi.fn()
}));

type CapturedCall = {
  call: (api: unknown, options: unknown) => unknown;
  contract: TrpcResponseContract<unknown, unknown>;
  fallback: string;
};

const captureInvocation = (): CapturedCall => {
  const [call, contract, fallback] = vi.mocked(invokeTrpc).mock.calls[0] as unknown as [
    CapturedCall['call'],
    CapturedCall['contract'],
    string
  ];
  return { call, contract, fallback };
};

const buildRouterSpy = () => {
  const query = vi.fn().mockResolvedValue(undefined);
  return {
    query,
    api: {
      configurator: {
        motor: {
          catalog: { list: { query }, get: { query } },
          equivalents: { fromMotor: { query }, fromSpec: { query } },
          advice: { build: { query } },
          energy: { compute: { query } },
          compare: { query }
        }
      }
    }
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(invokeTrpc).mockResolvedValue(undefined as never);
});

describe('frontiere frontend des routes Configurateurs moteur', () => {
  it.each([
    ['catalogue', () => listMotorCatalog({ limit: 25 } as never)],
    ['fiche technique', () => getMotorCatalogEntry({ operating_point_id: '1' } as never)],
    ['équivalents depuis moteur', () => findMotorEquivalentsFromMotor({} as never)],
    ['équivalents depuis spécification', () => findMotorEquivalentsFromSpec({} as never)],
    ['conseils', () => buildMotorAdvice({} as never)],
    ['énergie', () => computeMotorEnergy({} as never)],
    ['comparaison', () => compareMotors({} as never)]
  ])('appelle la route %s en lecture, jamais en mutation', async (_label, run) => {
    await run();

    const { call } = captureInvocation();
    const router = buildRouterSpy();
    await call(router.api, { context: {} });

    expect(router.query).toHaveBeenCalledOnce();
  });

  it('transmet un message de repli en francais pour chaque route', async () => {
    await listMotorCatalog({ limit: 25 } as never);

    const { fallback } = captureInvocation();
    expect(fallback).toBe('Impossible de charger le catalogue technique moteur.');
  });

  it('refuse une reponse hors contrat avec une erreur CIR, sans rendu partiel', async () => {
    await listMotorCatalog({ limit: 25 } as never);

    const { contract } = captureInvocation();
    expect(() => parseTrpcContract(contract, { items: 'pas un tableau' })).toThrowError(
      expect.objectContaining({ code: 'CONFIGURATOR_OUTPUT_INVALID' })
    );
  });

  it('laisse passer une reponse conforme au contrat partage', async () => {
    await listMotorCatalog({ limit: 1 } as never);

    const { contract } = captureInvocation();
    const payload = {
      request_id: '1e1f8b0c-2d3e-4f5a-8b9c-0d1e2f3a4b5c',
      snapshot: {
        id: '6fbf4046-be74-4422-9fe8-2d2d8a8d9157',
        label: 'Catalogue technique moteur',
        activated_at: '2026-07-28T12:05:56.000Z'
      },
      items: [],
      next_cursor: null
    };

    expect(parseTrpcContract(contract, payload)).toEqual(payload);
  });
});
