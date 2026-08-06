import { describe, expect, it } from 'vitest';

import { criterionStatusSchema } from '../../../../../shared/schemas/configurator/common.schema';
import { motorFactPathSchema } from '../../../../../shared/schemas/configurator/motor.schema';
import {
  VERDICT_ICONS,
  VERDICT_LABELS,
  VERDICT_SENTENCES,
  VERDICT_SEVERITY_ORDER,
  VERDICT_SHORT_LABELS,
  VERDICT_TONES,
  compareVerdictSeverity
} from '../configuratorVocabulary';
import {
  MOTOR_FACT_LABELS,
  getMotorFactFamily,
  groupMotorFactsByFamily,
  type MotorFactPath
} from '../motorFactLabels';
import { MOTOR_JOURNEYS, MOTOR_JOURNEY_ORDER, getMotorJourney } from '../motorJourneys';
import { parseMotorJourneyId } from '../parseMotorJourneyId';

describe('vocabulaire des verdicts', () => {
  it('couvre exactement les quatre etats metier du contrat partage', () => {
    const contractStatuses = [...criterionStatusSchema.options].sort();

    expect([...VERDICT_SEVERITY_ORDER].sort()).toEqual(contractStatuses);
    expect(Object.keys(VERDICT_LABELS).sort()).toEqual(contractStatuses);
    expect(Object.keys(VERDICT_SHORT_LABELS).sort()).toEqual(contractStatuses);
    expect(Object.keys(VERDICT_SENTENCES).sort()).toEqual(contractStatuses);
    expect(Object.keys(VERDICT_TONES).sort()).toEqual(contractStatuses);
    expect(Object.keys(VERDICT_ICONS).sort()).toEqual(contractStatuses);
  });

  it('n emploie jamais le mot garantie dans une formulation de verdict', () => {
    for (const sentence of Object.values(VERDICT_SENTENCES)) {
      expect(sentence.toLowerCase()).not.toContain('garantie');
    }
  });

  it('rappelle que la validation finale reste au montage sur un verdict satisfait', () => {
    expect(VERDICT_SENTENCES.satisfied).toContain('Validation finale au montage');
  });

  it('donne a chaque etat une icone distincte, pour rester lisible sans couleur', () => {
    const icons = new Set(Object.values(VERDICT_ICONS));
    expect(icons.size).toBe(4);
  });

  it('classe les statuts du plus contraignant au moins contraignant', () => {
    expect(VERDICT_SEVERITY_ORDER).toEqual([
      'not_satisfied',
      'indeterminate',
      'under_reservation',
      'satisfied'
    ]);

    expect(compareVerdictSeverity('not_satisfied', 'satisfied')).toBeLessThan(0);
    expect(compareVerdictSeverity('satisfied', 'indeterminate')).toBeGreaterThan(0);
    expect(compareVerdictSeverity('under_reservation', 'under_reservation')).toBe(0);
  });

  it('trie une liste melangee sans modifier la source', () => {
    const source: Array<'satisfied' | 'not_satisfied' | 'indeterminate' | 'under_reservation'> = [
      'satisfied',
      'under_reservation',
      'not_satisfied',
      'indeterminate'
    ];

    expect([...source].sort(compareVerdictSeverity)).toEqual([
      'not_satisfied',
      'indeterminate',
      'under_reservation',
      'satisfied'
    ]);
    expect(source[0]).toBe('satisfied');
  });
});

describe('libelles des faits moteur', () => {
  it('nomme chaque fait expose par le contrat, sans laisser de cle technique', () => {
    const contractFactPaths = [...motorFactPathSchema.options].sort();

    expect(Object.keys(MOTOR_FACT_LABELS).sort()).toEqual(contractFactPaths);

    for (const label of Object.values(MOTOR_FACT_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain('.');
    }
  });

  it('rattache chaque fait a une famille', () => {
    for (const factPath of motorFactPathSchema.options) {
      expect(getMotorFactFamily(factPath)).toBeDefined();
    }

    expect(getMotorFactFamily('mounting')).toBe('mounting');
    expect(getMotorFactFamily('electrical.power_kw')).toBe('electrical');
    expect(getMotorFactFamily('mechanical.frame.K')).toBe('frame');
    expect(getMotorFactFamily('mechanical.shaft.D')).toBe('shaft');
    expect(getMotorFactFamily('mechanical.coupling.axial_min')).toBe('shaft');
    expect(getMotorFactFamily('mechanical.flange.M')).toBe('flange');
    expect(getMotorFactFamily('application.ip_rating')).toBe('application');
  });

  it('regroupe les faits manquants par famille dans un ordre stable', () => {
    const missingFacts: MotorFactPath[] = [
      'application.ip_rating',
      'mechanical.shaft.D',
      'electrical.power_kw',
      'mechanical.shaft.F'
    ];

    expect(groupMotorFactsByFamily(missingFacts)).toEqual([
      { family: 'electrical', factPaths: ['electrical.power_kw'] },
      { family: 'shaft', factPaths: ['mechanical.shaft.D', 'mechanical.shaft.F'] },
      { family: 'application', factPaths: ['application.ip_rating'] }
    ]);
  });

  it('ne produit aucun groupe pour une liste vide', () => {
    expect(groupMotorFactsByFamily([])).toEqual([]);
  });
});

describe('parcours moteur', () => {
  it('expose les quatre entrees, le remplacement en premier', () => {
    expect(MOTOR_JOURNEY_ORDER[0]).toBe('remplacement');
    expect(MOTOR_JOURNEYS).toHaveLength(4);
  });

  it('declare l etat de livraison de chaque parcours', () => {
    for (const journey of MOTOR_JOURNEYS) {
      expect(journey.path.startsWith('/configurateurs/moteurs/')).toBe(true);
      if (journey.availability.state === 'planned') {
        expect(journey.availability.slice).toMatch(/^C\d+$/);
      }
    }
  });

  it('ouvre le remplacement et laisse les trois autres parcours annoncés', () => {
    expect(getMotorJourney('remplacement').availability.state).toBe('open');

    for (const journeyId of ['consultation', 'application', 'pas-a-pas'] as const) {
      expect(getMotorJourney(journeyId).availability.state).toBe('planned');
    }
  });

  it('retrouve un parcours par son identifiant', () => {
    expect(getMotorJourney('remplacement').label).toBe('Remplacement');
    expect(getMotorJourney('pas-a-pas').label).toBe('Pas à pas');
  });

  it('refuse un segment d URL inconnu sans lever d erreur', () => {
    expect(parseMotorJourneyId('remplacement')).toBe('remplacement');
    expect(parseMotorJourneyId('inconnu')).toBeNull();
    expect(parseMotorJourneyId('')).toBeNull();
  });
});
