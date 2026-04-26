import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Interaction, Channel } from '@/types';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { getInteractionsByEntity } from '@/services/interactions/getInteractionsByEntity';

vi.mock('@/services/api/safeTrpc', () => ({
  invokeTrpc: vi.fn()
}));

const buildInteraction = (
  id: string,
  entityId: string,
  lastActionAt: string
): Interaction => ({
  id,
  agency_id: 'agency-1',
  channel: Channel.PHONE,
  company_name: 'Client Test',
  contact_email: 'client@exemple.fr',
  contact_id: null,
  contact_name: 'Alice Martin',
  contact_phone: '0102030405',
  contact_service: 'Atelier',
  created_at: '2026-02-01T09:00:00.000Z',
  created_by: 'user-1',
  entity_id: entityId,
  entity_type: 'Client',
  interaction_type: 'Demande',
  last_action_at: lastActionAt,
  mega_families: ['Freinage'],
  notes: null,
  order_ref: null,
  reminder_at: null,
  status: 'Nouveau',
  status_id: null,
  status_is_terminal: false,
  subject: 'Demande de devis',
  timeline: [],
  updated_at: lastActionAt,
  updated_by: null
});

const mockInvokeRpc = vi.mocked(invokeTrpc);

describe('getInteractionsByEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the paginated payload from RPC when action is supported', async () => {
    mockInvokeRpc.mockImplementationOnce(async (_call, parseResponse) =>
      parseResponse({
        ok: true,
        interactions: [buildInteraction('interaction-1', 'entity-1', '2026-02-10T09:00:00.000Z')],
        page: 1,
        page_size: 20,
        total: 1
      })
    );

    const result = await getInteractionsByEntity('entity-1', 1, 20);

    expect(result).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1
    });
    expect(result.interactions).toHaveLength(1);
  });

  it('throws RPC errors without fallback to a global interactions read', async () => {
    const error = createAppError({
      code: 'INVALID_PAYLOAD',
      message: 'Payload invalide.',
      source: 'edge'
    });
    mockInvokeRpc.mockRejectedValue(error);

    await expect(getInteractionsByEntity('entity-1', 1, 20)).rejects.toBe(error);
  });
});
