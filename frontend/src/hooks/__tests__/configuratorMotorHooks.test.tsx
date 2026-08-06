import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import {
  buildMotorAdvice,
  compareMotors,
  computeMotorEnergy,
  findMotorEquivalentsFromMotor,
  findMotorEquivalentsFromSpec,
  getMotorCatalogEntry,
  listMotorCatalog
} from '@/services/configurator/motorConfigurator';
import {
  useMotorAdvice,
  useMotorComparison,
  useMotorEnergy
} from '../configurator/useMotorAnalysis';
import { useMotorCatalogEntry } from '../configurator/useMotorCatalogEntry';
import { useMotorCatalogList } from '../configurator/useMotorCatalogList';
import {
  MOTOR_EQUIVALENTS_LONG_WAIT_SECONDS,
  useMotorEquivalentsFromMotor,
  useMotorEquivalentsFromSpec
} from '../configurator/useMotorEquivalents';
import { formatElapsedSeconds, useElapsedSeconds } from '../configurator/useElapsedSeconds';
import { requireConfiguratorInput } from '../configurator/requireConfiguratorInput';

vi.mock('@/services/configurator/motorConfigurator', () => ({
  listMotorCatalog: vi.fn(),
  getMotorCatalogEntry: vi.fn(),
  findMotorEquivalentsFromMotor: vi.fn(),
  findMotorEquivalentsFromSpec: vi.fn(),
  buildMotorAdvice: vi.fn(),
  computeMotorEnergy: vi.fn(),
  compareMotors: vi.fn()
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ConfiguratorMotorHooksTestWrapper';
  return Wrapper;
};

const SNAPSHOT = {
  id: '6fbf4046-be74-4422-9fe8-2d2d8a8d9157',
  label: 'Catalogue technique moteur',
  activated_at: '2026-07-28T12:05:56.000Z'
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMotorCatalogList', () => {
  it('lit le catalogue et expose le snapshot resolu par le backend', async () => {
    vi.mocked(listMotorCatalog).mockResolvedValue({
      request_id: '1e1f8b0c-2d3e-4f5a-8b9c-0d1e2f3a4b5c',
      snapshot: SNAPSHOT,
      items: [],
      next_cursor: null
    } as never);

    const { result } = renderHook(() => useMotorCatalogList({ limit: 1 } as never), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(listMotorCatalog).toHaveBeenCalledWith({ limit: 1 });
    expect(result.current.data?.snapshot.id).toBe(SNAPSHOT.id);
  });

  it('reste inactif quand l appelant desactive la requete', () => {
    renderHook(() => useMotorCatalogList({ limit: 25 } as never, false), {
      wrapper: buildWrapper()
    });

    expect(listMotorCatalog).not.toHaveBeenCalled();
  });
});

describe('hooks a entree conditionnelle', () => {
  it('n appelle aucune route tant que l entree est nulle', () => {
    const wrapper = buildWrapper();

    renderHook(() => useMotorCatalogEntry(null), { wrapper });
    renderHook(() => useMotorEquivalentsFromMotor(null), { wrapper });
    renderHook(() => useMotorEquivalentsFromSpec(null), { wrapper });
    renderHook(() => useMotorAdvice(null), { wrapper });
    renderHook(() => useMotorEnergy(null), { wrapper });
    renderHook(() => useMotorComparison(null), { wrapper });

    expect(getMotorCatalogEntry).not.toHaveBeenCalled();
    expect(findMotorEquivalentsFromMotor).not.toHaveBeenCalled();
    expect(findMotorEquivalentsFromSpec).not.toHaveBeenCalled();
    expect(buildMotorAdvice).not.toHaveBeenCalled();
    expect(computeMotorEnergy).not.toHaveBeenCalled();
    expect(compareMotors).not.toHaveBeenCalled();
  });

  it('declenche la fiche technique des que l entree existe', async () => {
    vi.mocked(getMotorCatalogEntry).mockResolvedValue({ snapshot: SNAPSHOT } as never);
    const input = { operating_point_id: '412', mounting: 'B35' } as never;

    const { result } = renderHook(() => useMotorCatalogEntry(input), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getMotorCatalogEntry).toHaveBeenCalledWith(input);
  });

  it('declenche la recherche d equivalents depuis un moteur', async () => {
    vi.mocked(findMotorEquivalentsFromMotor).mockResolvedValue({ candidates: [] } as never);
    const input = { operating_point_id: '412', mounting: 'B3', limit: 25, sort: 'compatibility' } as never;

    const { result } = renderHook(() => useMotorEquivalentsFromMotor(input), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(findMotorEquivalentsFromMotor).toHaveBeenCalledWith(input);
  });

  it('declenche la recherche d equivalents depuis une specification', async () => {
    vi.mocked(findMotorEquivalentsFromSpec).mockResolvedValue({ candidates: [] } as never);
    const input = { schema_version: 1, mounting: 'B5' } as never;

    const { result } = renderHook(() => useMotorEquivalentsFromSpec(input), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(findMotorEquivalentsFromSpec).toHaveBeenCalledWith(input);
  });

  it('declenche conseils, energie et comparaison sur entree fournie', async () => {
    vi.mocked(buildMotorAdvice).mockResolvedValue({ advice: [] } as never);
    vi.mocked(computeMotorEnergy).mockResolvedValue({ candidate: {} } as never);
    vi.mocked(compareMotors).mockResolvedValue({ rows: [] } as never);

    const wrapper = buildWrapper();
    const adviceInput = {
      candidate: { candidate: { operating_point_id: '412' } }
    } as never;
    const energyInput = {
      candidate_operating_point_id: '412',
      profile: { load_points: [{ load_fraction: 0.75, hours_per_year: 4000 }] }
    } as never;
    const compareInput = { operating_point_ids: ['412', '413'] } as never;

    const advice = renderHook(() => useMotorAdvice(adviceInput), { wrapper });
    const energy = renderHook(() => useMotorEnergy(energyInput), { wrapper });
    const comparison = renderHook(() => useMotorComparison(compareInput), { wrapper });

    await waitFor(() => {
      expect(advice.result.current.isSuccess).toBe(true);
      expect(energy.result.current.isSuccess).toBe(true);
      expect(comparison.result.current.isSuccess).toBe(true);
    });

    expect(buildMotorAdvice).toHaveBeenCalledWith(adviceInput);
    expect(computeMotorEnergy).toHaveBeenCalledWith(energyInput);
    expect(compareMotors).toHaveBeenCalledWith(compareInput);
  });
});

describe('requireConfiguratorInput', () => {
  it('rend l entree telle quelle quand elle existe', () => {
    expect(requireConfiguratorInput({ a: 1 }, 'useTest')).toEqual({ a: 1 });
  });

  it('leve une erreur CIR plutot qu une entree fabriquee', () => {
    expect(() => requireConfiguratorInput(null, 'useTest')).toThrowError(
      expect.objectContaining({ code: 'CONFIG_INVALID' })
    );
  });
});

describe('useElapsedSeconds', () => {
  it('compte les secondes reellement ecoulees et repart de zero a l arret', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ active }) => useElapsedSeconds(active), {
      initialProps: { active: true }
    });

    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(result.current).toBe(4);

    rerender({ active: false });
    expect(result.current).toBe(0);

    vi.useRealTimers();
  });

  it('formate le compteur en minutes et secondes', () => {
    expect(formatElapsedSeconds(0)).toBe('00:00');
    expect(formatElapsedSeconds(7)).toBe('00:07');
    expect(formatElapsedSeconds(75)).toBe('01:15');
    expect(formatElapsedSeconds(-3)).toBe('00:00');
  });

  it('fixe le seuil d attente longue en deca de la duree mesuree des equivalences', () => {
    expect(MOTOR_EQUIVALENTS_LONG_WAIT_SECONDS).toBeLessThan(6);
  });
});
