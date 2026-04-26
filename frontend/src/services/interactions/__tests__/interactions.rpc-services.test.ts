import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Channel, type InteractionRow } from '@/types';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { deleteInteractionDraft } from '@/services/interactions/deleteInteractionDraft';
import { getInteractionDraft } from '@/services/interactions/getInteractionDraft';
import { getInteractions } from '@/services/interactions/getInteractions';
import { getKnownCompanies } from '@/services/interactions/getKnownCompanies';
import { saveInteractionDraft } from '@/services/interactions/saveInteractionDraft';

vi.mock('@/services/agency/getActiveAgencyId', () => ({
  getActiveAgencyId: vi.fn()
}));

vi.mock('@/services/api/safeTrpc', () => ({
  invokeTrpc: vi.fn()
}));

const buildInteractionRow = (overrides: Partial<InteractionRow> = {}): InteractionRow => ({
  id: 'interaction-1',
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
  entity_id: 'entity-1',
  entity_type: 'Client',
  interaction_type: 'Demande',
  last_action_at: '2026-02-01T09:00:00.000Z',
  mega_families: ['Freinage'],
  notes: null,
  order_ref: null,
  reminder_at: null,
  status: 'Nouveau',
  status_id: null,
  status_is_terminal: false,
  subject: 'Demande de devis',
  timeline: [
    {
      id: 'event-1',
      date: '2026-02-01T09:00:00.000Z',
      type: 'creation',
      content: 'Creation'
    }
  ],
  updated_at: '2026-02-01T09:00:00.000Z',
  updated_by: null,
  ...overrides
});

const mockGetActiveAgencyId = vi.mocked(getActiveAgencyId);
const mockInvokeTrpc = vi.mocked(invokeTrpc);

describe('interactions RPC services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getInteractions returns an empty list without active agency', async () => {
    mockGetActiveAgencyId.mockResolvedValue('');

    await expect(getInteractions()).resolves.toEqual([]);
    expect(mockInvokeTrpc).not.toHaveBeenCalled();
  });

  it('getInteractions calls data.interactions list_by_agency and hydrates timeline', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parseResponse) => {
      const mutate = vi.fn().mockResolvedValue({
        ok: true,
        interactions: [buildInteractionRow()],
        page: 1,
        page_size: 200,
        total: 1
      });

      const payload = await call(
        { data: { interactions: { mutate } } } as unknown as Parameters<typeof call>[0],
        {}
      );
      expect(payload).toMatchObject({ ok: true });
      expect(mutate).toHaveBeenCalledWith({
        action: 'list_by_agency',
        agency_id: 'agency-1'
      }, {});

      return parseResponse(payload);
    });

    const interactions = await getInteractions('agency-1');

    expect(interactions).toHaveLength(1);
    expect(interactions[0]?.timeline[0]?.content).toBe('Creation');
  });

  it('getKnownCompanies returns an empty list without active agency', async () => {
    mockGetActiveAgencyId.mockResolvedValue('');

    await expect(getKnownCompanies()).resolves.toEqual([]);
    expect(mockInvokeTrpc).not.toHaveBeenCalled();
  });

  it('getKnownCompanies calls data.interactions known_companies', async () => {
    mockGetActiveAgencyId.mockResolvedValue('agency-1');
    mockInvokeTrpc.mockImplementationOnce(async (call, parseResponse) => {
      const mutate = vi.fn().mockResolvedValue({
        ok: true,
        companies: ['Alpha', 'Beta']
      });

      const payload = await call(
        { data: { interactions: { mutate } } } as unknown as Parameters<typeof call>[0],
        {}
      );
      expect(mutate).toHaveBeenCalledWith({
        action: 'known_companies',
        agency_id: 'agency-1'
      }, {});

      return parseResponse(payload);
    });

    await expect(getKnownCompanies()).resolves.toEqual(['Alpha', 'Beta']);
  });

  it('getInteractionDraft calls data.interactions draft_get and parses the payload', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parseResponse) => {
      const mutate = vi.fn().mockResolvedValue({
        ok: true,
        draft: {
          id: 'draft-1',
          updated_at: '2026-02-01T09:00:00.000Z',
          payload: {
            values: {
              channel: Channel.PHONE,
              entity_type: 'Client',
              subject: 'Draft subject'
            }
          }
        }
      });

      const payload = await call(
        { data: { interactions: { mutate } } } as unknown as Parameters<typeof call>[0],
        {}
      );
      expect(mutate).toHaveBeenCalledWith({
        action: 'draft_get',
        user_id: 'user-1',
        agency_id: 'agency-1',
        form_type: 'interaction'
      }, {});

      return parseResponse(payload);
    });

    await expect(getInteractionDraft({
      userId: 'user-1',
      agencyId: 'agency-1'
    })).resolves.toEqual({
      id: 'draft-1',
      updated_at: '2026-02-01T09:00:00.000Z',
      payload: {
        values: {
          channel: Channel.PHONE,
          entity_type: 'Client',
          subject: 'Draft subject'
        }
      }
    });
  });

  it('getInteractionDraft returns null when the backend has no draft', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parseResponse) => {
      const mutate = vi.fn().mockResolvedValue({
        ok: true,
        draft: null
      });

      const payload = await call(
        { data: { interactions: { mutate } } } as unknown as Parameters<typeof call>[0],
        {}
      );

      return parseResponse(payload);
    });

    await expect(getInteractionDraft({
      userId: 'user-1',
      agencyId: 'agency-1'
    })).resolves.toBeNull();
  });

  it('saveInteractionDraft calls data.interactions draft_save and parses the saved draft', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parseResponse) => {
      const mutate = vi.fn().mockResolvedValue({
        ok: true,
        draft: {
          id: 'draft-1',
          updated_at: '2026-02-01T09:00:00.000Z',
          payload: {
            values: {
              channel: Channel.EMAIL,
              entity_type: 'Prospect',
              subject: 'Saved subject'
            }
          }
        }
      });

      const payload = await call(
        { data: { interactions: { mutate } } } as unknown as Parameters<typeof call>[0],
        {}
      );
      expect(mutate).toHaveBeenCalledWith({
        action: 'draft_save',
        user_id: 'user-1',
        agency_id: 'agency-1',
        form_type: 'interaction',
        payload: {
          values: {
            channel: Channel.EMAIL,
            entity_type: 'Prospect',
            subject: 'Saved subject'
          }
        }
      }, {});

      return parseResponse(payload);
    });

    await expect(saveInteractionDraft({
      userId: 'user-1',
      agencyId: 'agency-1',
      payload: {
        values: {
          channel: Channel.EMAIL,
          entity_type: 'Prospect',
          subject: 'Saved subject'
        }
      }
    })).resolves.toEqual({
      id: 'draft-1',
      updated_at: '2026-02-01T09:00:00.000Z',
      payload: {
        values: {
          channel: Channel.EMAIL,
          entity_type: 'Prospect',
          subject: 'Saved subject'
        }
      }
    });
  });

  it('deleteInteractionDraft calls data.interactions draft_delete', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parseResponse) => {
      const mutate = vi.fn().mockResolvedValue({
        ok: true,
        draft: null
      });

      const payload = await call(
        { data: { interactions: { mutate } } } as unknown as Parameters<typeof call>[0],
        {}
      );
      expect(mutate).toHaveBeenCalledWith({
        action: 'draft_delete',
        user_id: 'user-1',
        agency_id: 'agency-1',
        form_type: 'interaction'
      }, {});

      return parseResponse(payload);
    });

    await expect(deleteInteractionDraft({
      userId: 'user-1',
      agencyId: 'agency-1'
    })).resolves.toBeUndefined();
  });
});
