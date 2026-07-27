import { describe, expect, it } from 'vitest';

import { Channel, type Interaction } from '@/types';
import {
  buildTopClients,
  buildWeeklyEvolution,
  computeConversionRate,
  filterDossiersForTable,
  formatCompactEuro,
  sumClosedAmounts
} from '@/utils/dashboard/dashboardOverview';

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

const isStatusDone = (interaction: Interaction) => Boolean(interaction.status_is_terminal);
const now = new Date('2026-07-21T12:00:00.000Z');

describe('buildWeeklyEvolution', () => {
  it('reconstruit le stock pipeline par semaine depuis created_at et stage_changed_at', () => {
    const openDeal = buildInteraction({
      id: 'open',
      stage: 'quote_sent',
      amount: 5000,
      created_at: '2026-07-01T09:00:00.000Z'
    });
    const wonDeal = buildInteraction({
      id: 'won',
      stage: 'won',
      amount: 3000,
      created_at: '2026-06-15T09:00:00.000Z',
      stage_changed_at: '2026-07-10T09:00:00.000Z'
    });

    const points = buildWeeklyEvolution({
      interactions: [openDeal, wonDeal],
      isStatusDone,
      weeks: 4,
      now
    });

    expect(points).toHaveLength(4);
    const lastPoint = points[points.length - 1];
    expect(lastPoint.openPipelineAmount).toBe(5000);
    expect(lastPoint.openPipelineCount).toBe(1);
    expect(lastPoint.wonCumulativeAmount).toBe(3000);

    // Avant sa cloture (10/07), le dossier gagne comptait encore dans le stock ouvert.
    const firstPoint = points[0];
    expect(firstPoint.openPipelineAmount).toBe(8000);
    expect(firstPoint.wonCumulativeAmount).toBe(0);
  });

  it('compte les dossiers ouverts avec updated_at comme proxy de cloture', () => {
    const stillOpen = buildInteraction({ id: 'open', created_at: '2026-07-01T09:00:00.000Z' });
    const closedEarly = buildInteraction({
      id: 'closed',
      created_at: '2026-06-20T09:00:00.000Z',
      status_is_terminal: true,
      updated_at: '2026-07-08T09:00:00.000Z'
    });

    const points = buildWeeklyEvolution({
      interactions: [stillOpen, closedEarly],
      isStatusDone,
      weeks: 4,
      now
    });

    const lastPoint = points[points.length - 1];
    expect(lastPoint.openDossiersCount).toBe(1);

    const firstPoint = points[0];
    expect(firstPoint.openDossiersCount).toBe(2);
  });

  it('etiquette les semaines en numero ISO', () => {
    const points = buildWeeklyEvolution({ interactions: [], isStatusDone, weeks: 2, now });
    expect(points.map((point) => point.label)).toEqual(['S29', 'S30']);
  });
});

describe('buildTopClients', () => {
  it('classe les clients par montant cumule sur la periode', () => {
    const first = buildInteraction({
      id: 'a',
      company_name: 'Michelin',
      entity_id: 'entity-michelin',
      stage: 'quote_sent',
      amount: 4000,
      last_action_at: '2026-07-18T09:00:00.000Z',
      timeline: []
    });
    const second = buildInteraction({
      id: 'b',
      company_name: 'Michelin',
      entity_id: 'entity-michelin',
      stage: 'won',
      amount: 2000,
      last_action_at: '2026-07-15T09:00:00.000Z'
    });
    const third = buildInteraction({
      id: 'c',
      company_name: 'Solvay',
      entity_id: 'entity-solvay',
      stage: 'negotiation',
      amount: 1500,
      last_action_at: '2026-07-10T09:00:00.000Z'
    });
    const outOfPeriod = buildInteraction({
      id: 'd',
      company_name: 'Vicat',
      entity_id: 'entity-vicat',
      stage: 'won',
      amount: 9000,
      last_action_at: '2026-01-01T09:00:00.000Z'
    });

    const top = buildTopClients({
      interactions: [first, second, third, outOfPeriod],
      periodDays: 30,
      now
    });

    expect(top.map((entry) => entry.name)).toEqual(['Michelin', 'Solvay']);
    expect(top[0].amount).toBe(6000);
    expect(top[0].ratio).toBe(1);
    expect(top[1].ratio).toBe(0.25);
  });

  it('ignore les dossiers sans montant', () => {
    const noAmount = buildInteraction({ id: 'a', stage: 'qualification', amount: null });
    expect(buildTopClients({ interactions: [noAmount], periodDays: 30, now })).toEqual([]);
  });
});

describe('computeConversionRate', () => {
  it('retourne le pourcentage arrondi de gagnes', () => {
    expect(computeConversionRate(2, 3)).toBe(40);
  });

  it('retourne null sans dossier clos', () => {
    expect(computeConversionRate(0, 0)).toBeNull();
  });
});

describe('formatCompactEuro', () => {
  it('formate selon la magnitude', () => {
    expect(formatCompactEuro(820)).toBe('820 €');
    expect(formatCompactEuro(4800)).toBe('4,8 k€');
    expect(formatCompactEuro(342_000)).toBe('342 k€');
    expect(formatCompactEuro(1_840_000)).toBe('1,8 M€');
  });
});

describe('filterDossiersForTable', () => {
  it('filtre par periode et canal puis trie par derniere activite', () => {
    const recentPhone = buildInteraction({
      id: 'recent-phone',
      channel: Channel.PHONE,
      last_action_at: '2026-07-20T09:00:00.000Z'
    });
    const recentMail = buildInteraction({
      id: 'recent-mail',
      channel: Channel.EMAIL,
      last_action_at: '2026-07-19T09:00:00.000Z'
    });
    const oldPhone = buildInteraction({
      id: 'old-phone',
      channel: Channel.PHONE,
      last_action_at: '2026-01-01T09:00:00.000Z'
    });

    const all = filterDossiersForTable({
      interactions: [oldPhone, recentMail, recentPhone],
      periodDays: 30,
      channel: 'all',
      now
    });
    expect(all.map((row) => row.id)).toEqual(['recent-phone', 'recent-mail']);

    const phoneOnly = filterDossiersForTable({
      interactions: [oldPhone, recentMail, recentPhone],
      periodDays: 30,
      channel: Channel.PHONE,
      now
    });
    expect(phoneOnly.map((row) => row.id)).toEqual(['recent-phone']);
  });
});

describe('sumClosedAmounts', () => {
  it('somme separement gagnes et perdus', () => {
    const won = buildInteraction({ id: 'won', stage: 'won', amount: 1000 });
    const lost = buildInteraction({ id: 'lost', stage: 'lost', amount: 400 });
    const lostNoAmount = buildInteraction({ id: 'lost-2', stage: 'lost', amount: null });

    expect(sumClosedAmounts([won, lost, lostNoAmount])).toEqual({ wonAmount: 1000, lostAmount: 400 });
  });
});
