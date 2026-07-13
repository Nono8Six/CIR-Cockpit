import { describe, expect, it } from 'vitest';

import { Channel, type Interaction } from '@/types';
import {
  buildPipelineBoard,
  formatPipelineAmount,
  getStageAgeDays,
  isCommercialInteraction
} from '@/utils/dashboard/dashboardPipeline';

const buildInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
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
  entity_id: null,
  entity_type: 'Client',
  interaction_type: 'Demande',
  last_action_at: '2026-02-01T09:00:00.000Z',
  mega_families: ['Freinage'],
  notes: null,
  order_ref: null,
  reminder_at: null,
  stage: null,
  stage_changed_at: null,
  amount: null,
  quote_sent_at: null,
  lost_reason: null,
  status: 'Nouveau',
  status_id: null,
  status_is_terminal: false,
  subject: 'Demande de devis',
  timeline: [],
  updated_at: '2026-02-01T09:00:00.000Z',
  updated_by: null,
  ...overrides
});

const now = new Date('2026-02-15T12:00:00.000Z');

describe('buildPipelineBoard', () => {
  it('regroupe par etape avec sommes et total ouvert', () => {
    const unqualified = buildInteraction({ id: 'unqualified', amount: 1000 });
    const qualified = buildInteraction({ id: 'qualified', stage: 'qualification', amount: 2000 });
    const quoteSent = buildInteraction({ id: 'quote', stage: 'quote_sent', amount: 3000 });
    const negotiation = buildInteraction({ id: 'nego', stage: 'negotiation', amount: null });
    const doneUnqualified = buildInteraction({ id: 'done', status_is_terminal: true });

    const board = buildPipelineBoard({
      interactions: [unqualified, qualified, quoteSent, negotiation, doneUnqualified],
      isStatusDone: (interaction) => Boolean(interaction.status_is_terminal),
      now
    });

    expect(board.unqualified.map((row) => row.id)).toEqual(['unqualified']);
    expect(board.qualification.map((row) => row.id)).toEqual(['qualified']);
    expect(board.quote_sent.map((row) => row.id)).toEqual(['quote']);
    expect(board.negotiation.map((row) => row.id)).toEqual(['nego']);
    expect(board.amounts).toEqual({
      unqualified: 1000,
      qualification: 2000,
      quote_sent: 3000,
      negotiation: 0
    });
    expect(board.openAmountTotal).toBe(6000);
  });

  it('limite la colonne cloturee aux 30 derniers jours et compte gagnes/perdus', () => {
    const wonRecent = buildInteraction({
      id: 'won-recent',
      stage: 'won',
      stage_changed_at: '2026-02-10T09:00:00.000Z'
    });
    const lostRecent = buildInteraction({
      id: 'lost-recent',
      stage: 'lost',
      lost_reason: 'Prix',
      stage_changed_at: '2026-02-01T09:00:00.000Z'
    });
    const wonOld = buildInteraction({
      id: 'won-old',
      stage: 'won',
      stage_changed_at: '2025-12-01T09:00:00.000Z'
    });

    const board = buildPipelineBoard({
      interactions: [lostRecent, wonOld, wonRecent],
      isStatusDone: () => false,
      now
    });

    expect(board.closed.map((row) => row.id)).toEqual(['won-recent', 'lost-recent']);
    expect(board.wonCount30d).toBe(1);
    expect(board.lostCount30d).toBe(1);
  });

  it('exclut les dossiers non commerciaux et les compte a part', () => {
    const devis = buildInteraction({ id: 'devis', interaction_type: 'Demande de devis' });
    const solicitation = buildInteraction({
      id: 'solicitation',
      interaction_type: 'Démarchage téléphonique',
      entity_type: 'Sollicitation'
    });
    const interneDone = buildInteraction({
      id: 'interne',
      interaction_type: 'Interne (CIR)',
      status_is_terminal: true
    });

    const board = buildPipelineBoard({
      interactions: [devis, solicitation, interneDone],
      isStatusDone: (interaction) => Boolean(interaction.status_is_terminal),
      now
    });

    // Le devis est commercial (type) -> colonne "nouvelles demandes".
    expect(board.unqualified.map((row) => row.id)).toEqual(['devis']);
    // La sollicitation ouverte non commerciale est comptee a part.
    expect(board.excludedOpenCount).toBe(1);
    // L'interne clos n'est ni dans le pipeline ni compte comme ouvert exclu.
  });

  it('trie les colonnes actives par anciennete dans l etape', () => {
    const fresh = buildInteraction({
      id: 'fresh',
      stage: 'qualification',
      stage_changed_at: '2026-02-14T09:00:00.000Z'
    });
    const stale = buildInteraction({
      id: 'stale',
      stage: 'qualification',
      stage_changed_at: '2026-01-20T09:00:00.000Z'
    });

    const board = buildPipelineBoard({
      interactions: [fresh, stale],
      isStatusDone: () => false,
      now
    });

    expect(board.qualification.map((row) => row.id)).toEqual(['stale', 'fresh']);
  });
});

describe('getStageAgeDays', () => {
  it('utilise stage_changed_at puis retombe sur created_at', () => {
    const withStageDate = buildInteraction({ stage_changed_at: '2026-02-10T12:00:00.000Z' });
    const withoutStageDate = buildInteraction();

    expect(getStageAgeDays(withStageDate, now)).toBe(5);
    expect(getStageAgeDays(withoutStageDate, now)).toBe(14);
  });
});

describe('isCommercialInteraction', () => {
  it('reconnait etape, montant ou type de vente', () => {
    expect(isCommercialInteraction(buildInteraction({ stage: 'qualification' }))).toBe(true);
    expect(isCommercialInteraction(buildInteraction({ amount: 500 }))).toBe(true);
    expect(
      isCommercialInteraction(buildInteraction({ interaction_type: 'Demande de prix' }))
    ).toBe(true);
    expect(
      isCommercialInteraction(
        buildInteraction({ interaction_type: 'Démarchage téléphonique' })
      )
    ).toBe(false);
  });
});

describe('formatPipelineAmount', () => {
  it('formate en euros francais et tolere les valeurs absentes', () => {
    expect(formatPipelineAmount(null)).toBe('—');
    expect(formatPipelineAmount(12400)).toContain('12');
    expect(formatPipelineAmount(12400)).toContain('€');
  });
});
