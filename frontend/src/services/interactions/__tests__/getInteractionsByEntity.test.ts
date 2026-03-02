import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Interaction, Channel } from '@/types';
import { invokeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { getInteractions } from '@/services/interactions/getInteractions';
import { getInteractionsByEntity } from '@/services/interactions/getInteractionsByEntity';

vi.mock('@/services/api/safeRpc', () => ({
  invokeRpc: vi.fn()
}));

vi.mock('@/services/interactions/getInteractions', () => ({
  getInteractions: vi.fn()
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

const mockInvokeRpc = vi.mocked(invokeRpc);
const mockGetInteractions = vi.mocked(getInteractions);

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
    expect(mockGetInteractions).not.toHaveBeenCalled();
  });

  it('falls back to Supabase filtering when backend does not support list_by_entity yet', async () => {
    mockInvokeRpc.mockRejectedValue(
      createAppError({
        code: 'INVALID_PAYLOAD',
        message:
          '[{"code":"invalid_union","errors":[],"note":"No matching discriminator","discriminator":"action","path":["action"],"message":"Invalid input"}]',
        source: 'edge'
      })
    );
    mockGetInteractions.mockResolvedValue([
      buildInteraction('out-of-entity', 'entity-2', '2026-02-12T10:00:00.000Z'),
      buildInteraction('older', 'entity-1', '2026-02-01T09:00:00.000Z'),
      buildInteraction('newer', 'entity-1', '2026-02-10T09:00:00.000Z')
    ]);

    const result = await getInteractionsByEntity('entity-1', 1, 20);

    expect(mockGetInteractions).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(2);
    expect(result.interactions.map((interaction) => interaction.id)).toEqual(['newer', 'older']);
  });

  it('keeps throwing unrelated RPC errors without fallback', async () => {
    const error = createAppError({
      code: 'INVALID_PAYLOAD',
      message: 'Payload invalide.',
      source: 'edge'
    });
    mockInvokeRpc.mockRejectedValue(error);

    await expect(getInteractionsByEntity('entity-1', 1, 20)).rejects.toBe(error);
    expect(mockGetInteractions).not.toHaveBeenCalled();
  });
});
