import { describe, expect, it } from 'vitest';

import { Channel, type Interaction } from '@/types';
import {
  DEFAULT_DOSSIER_SORT,
  buildDossierRows,
  buildOpenDossiersDelta,
  buildWeeklyEvolution,
  computeConversionRate,
  formatCompactEuro,
  hasEnoughEvolutionPoints,
  selectDossierRows,
  shortenBadgeLabel,
  sumClosedAmounts,
  type WeeklyEvolutionPoint
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

const buildEvolutionPoints = (
  openCounts: number[],
  pipelineAmounts: number[] = []
): WeeklyEvolutionPoint[] =>
  openCounts.map((openDossiersCount, index) => ({
    weekStart: index,
    label: `S${index}`,
    openPipelineAmount: pipelineAmounts[index] ?? 0,
    openPipelineCount: 0,
    wonCumulativeAmount: 0,
    openDossiersCount
  }));

describe('hasEnoughEvolutionPoints', () => {
  it('ne compte pas un stock de dossiers sans montant comme une courbe tracable', () => {
    const points = buildEvolutionPoints([2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
    expect(hasEnoughEvolutionPoints(points)).toBe(false);
  });

  it('refuse une serie dont moins de 8 semaines portent un montant', () => {
    const amounts = [0, 0, 0, 0, 0, 0, 0, 0, 100, 200, 200, 200];
    expect(hasEnoughEvolutionPoints(buildEvolutionPoints(amounts.map(() => 1), amounts))).toBe(false);
  });

  it('refuse une serie plate : douze fois le meme montant reste un seul fait', () => {
    const amounts = Array.from({ length: 12 }, () => 4800);
    expect(hasEnoughEvolutionPoints(buildEvolutionPoints(amounts.map(() => 1), amounts))).toBe(false);
  });

  it('accepte une serie de 8 semaines chiffrees et variables', () => {
    const amounts = [0, 0, 0, 0, 100, 100, 200, 200, 300, 300, 400, 400];
    expect(hasEnoughEvolutionPoints(buildEvolutionPoints(amounts.map(() => 1), amounts))).toBe(true);
  });
});

describe('buildOpenDossiersDelta', () => {
  it('chiffre la variation du stock ouvert sur la fenetre demandee', () => {
    const points = buildEvolutionPoints([1, 1, 2, 2, 3]);
    expect(buildOpenDossiersDelta(points, 4)).toEqual({
      value: 2,
      label: '+2 dossiers sur 4 sem.'
    });
  });

  it('annonce un stock stable plutot qu un zero muet', () => {
    const points = buildEvolutionPoints([3, 4, 5, 4, 3]);
    expect(buildOpenDossiersDelta(points, 4)?.label).toBe('stable sur 4 sem.');
  });

  it('retourne null quand l historique est trop court', () => {
    expect(buildOpenDossiersDelta(buildEvolutionPoints([1, 2]), 4)).toBeNull();
  });
});

describe('shortenBadgeLabel', () => {
  it('laisse intact un libelle qui tient', () => {
    expect(shortenBadgeLabel('En cours', 20)).toBe('En cours');
  });

  it('coupe sur une frontiere de mot et jamais en plein mot', () => {
    expect(shortenBadgeLabel('Attente éléments du client', 24)).toBe('Attente éléments…');
  });

  it('ne termine pas un libelle raccourci sur un mot-outil', () => {
    expect(shortenBadgeLabel('Relance à faire par le commercial', 24)).toBe('Relance à faire…');
  });

  it('coupe net un mot unique trop long', () => {
    expect(shortenBadgeLabel('Incontestablementlong', 10)).toBe('Incontesta…');
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

describe('buildDossierRows', () => {
  const oldestOpen = buildInteraction({ id: 'oldest-open', last_action_at: '2026-07-10T09:00:00.000Z' });
  const recentOpen = buildInteraction({ id: 'recent-open', last_action_at: '2026-07-20T09:00:00.000Z' });
  const closed = buildInteraction({ id: 'closed', stage: 'won', amount: 900 });

  it('produit exactement une ligne par dossier et distingue les dossiers ouverts des clos', () => {
    const rows = buildDossierRows({
      interactions: [oldestOpen, recentOpen, closed],
      isStatusDone
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.urgency)).toEqual(['open', 'open', 'closed']);
    expect(rows.filter((row) => row.isOpen)).toHaveLength(2);
  });

  it('classe un statut terminal comme clos meme sans etape pipeline', () => {
    const terminal = buildInteraction({ id: 'terminal', status_is_terminal: true });
    const [row] = buildDossierRows({ interactions: [terminal], isStatusDone });
    expect(row.urgency).toBe('closed');
    expect(row.isOpen).toBe(false);
  });
});

describe('selectDossierRows', () => {
  const oldestOpen = buildInteraction({
    id: 'oldest-open',
    channel: Channel.PHONE,
    last_action_at: '2026-07-18T09:00:00.000Z',
    amount: 1000
  });
  const recentOpen = buildInteraction({
    id: 'recent-open',
    channel: Channel.EMAIL,
    last_action_at: '2026-07-20T09:00:00.000Z',
    amount: 5000
  });
  const recentClosed = buildInteraction({
    id: 'recent-closed',
    channel: Channel.PHONE,
    stage: 'won',
    amount: 200,
    last_action_at: '2026-07-19T09:00:00.000Z'
  });
  const oldClosed = buildInteraction({
    id: 'old-closed',
    channel: Channel.PHONE,
    stage: 'lost',
    last_action_at: '2026-01-01T09:00:00.000Z'
  });

  const rows = buildDossierRows({
    interactions: [oldClosed, recentClosed, recentOpen, oldestOpen],
    isStatusDone
  });

  const select = (overrides: Partial<Parameters<typeof selectDossierRows>[0]> = {}) =>
    selectDossierRows({
      rows,
      scope: 'open',
      channel: 'all',
      periodDays: 30,
      sort: DEFAULT_DOSSIER_SORT,
      now,
      ...overrides
    }).map((row) => row.interaction.id);

  it('ne garde que les dossiers ouverts, de la plus ancienne activité à la plus récente', () => {
    expect(select()).toEqual(['oldest-open', 'recent-open']);
  });

  it('ajoute les dossiers clos de la periode sans jamais dupliquer une ligne', () => {
    const ids = select({ scope: 'period' });
    expect(ids).toEqual(['oldest-open', 'recent-open', 'recent-closed']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('filtre par canal', () => {
    expect(select({ scope: 'period', channel: Channel.EMAIL })).toEqual(['recent-open']);
  });

  it('trie par montant decroissant puis inverse le sens sur demande', () => {
    expect(select({ sort: { key: 'amount', direction: 'desc' } })).toEqual(['recent-open', 'oldest-open']);
    expect(select({ sort: { key: 'amount', direction: 'asc' } })).toEqual(['oldest-open', 'recent-open']);
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
