import {
  motorEquivalentFromSpecInputSchema,
  type MotorEquivalentFromSpecInput,
  type MotorMounting
} from 'shared/schemas/configurator/motor.schema';

import { getMountingPresentation } from './motorMountingDimensions';

/**
 * Ce que le client dicte au telephone. Tout est facultatif sauf ce que le
 * contrat exige pour chercher : puissance, frequence et mode d'alimentation.
 */
export type NameplateDraft = {
  mounting: MotorMounting | null;
  power_kw: string;
  frequency_hz: string;
  supply_mode: 'mains' | 'vfd' | null;
  poles: string;
  speed_rpm: string;
  voltage_v: string;
  network: string;
  coupling: 'Y' | 'D' | null;
  rated_current_a: string;
  efficiency_class: 'IE1' | 'IE2' | 'IE3' | 'IE4' | 'IE5' | null;
  /**
   * Cotes relevées si le client peut mesurer. Lesquelles sont demandées dépend
   * de la forme de montage : voir `MOUNTING_DIMENSIONS`.
   */
  A: string;
  B: string;
  C: string;
  H: string;
  K: string;
  D: string;
  E: string;
  F: string;
  M: string;
  N: string;
  P: string;
  S: string;
  S_thread: string;
  T: string;
  Z: string;
  bolt_diameter: string;
};

export const EMPTY_NAMEPLATE_DRAFT: NameplateDraft = {
  mounting: null,
  power_kw: '',
  frequency_hz: '50',
  supply_mode: 'vfd',
  poles: '',
  speed_rpm: '',
  voltage_v: '',
  network: '',
  coupling: null,
  rated_current_a: '',
  efficiency_class: null,
  A: '',
  B: '',
  C: '',
  H: '',
  K: '',
  D: '',
  E: '',
  F: '',
  M: '',
  N: '',
  P: '',
  S: '',
  S_thread: '',
  T: '',
  Z: '',
  bolt_diameter: ''
};

/**
 * Une valeur dictee par le client est un releve de plaque, pas une mesure
 * verifiee : origine `nameplate`, confirmation `unconfirmed`. La preuve dit
 * exactement d'ou elle vient, parce que le contrat exige une preuve des qu'une
 * valeur est renseignee — et parce qu'un releve telephonique doit rester
 * identifiable comme tel jusqu'au verdict.
 */
const NAMEPLATE_EVIDENCE = [
  {
    kind: 'measurement' as const,
    label: 'Relevé de plaque signalétique communiqué par le client'
  }
];

const parseNumber = (raw: string): number | null => {
  const normalized = raw.trim().replace(',', '.');
  if (normalized.length === 0) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

type Unit = 'kW' | 'rpm' | 'Hz' | 'V' | 'A' | 'mm';

const numericFact = (raw: string, unit: Unit) => {
  const value = parseNumber(raw);
  return {
    value,
    unit,
    origin: 'nameplate' as const,
    confirmation: 'unconfirmed' as const,
    evidence: value === null ? [] : NAMEPLATE_EVIDENCE
  };
};

const enumFact = <TValue extends string | number>(value: TValue | null) => ({
  value,
  origin: 'nameplate' as const,
  confirmation: 'unconfirmed' as const,
  evidence: value === null ? [] : NAMEPLATE_EVIDENCE
});

const optionalDimension = (raw: string) => {
  const value = parseNumber(raw);
  return value === null ? undefined : {
    value,
    unit: 'mm' as const,
    origin: 'user_measurement' as const,
    confirmation: 'confirmed' as const,
    evidence: [{
      kind: 'measurement' as const,
      label: 'Mesure communiquée par le client pendant l’appel'
    }]
  };
};

const optionalTextMeasurement = (raw: string) => {
  const value = raw.trim();
  return value.length === 0 ? undefined : {
    value,
    origin: 'user_measurement' as const,
    confirmation: 'confirmed' as const,
    evidence: [{
      kind: 'measurement' as const,
      label: 'Mesure communiquée par le client pendant l’appel'
    }]
  };
};

const omitUndefined = <TShape extends Record<string, unknown>>(shape: TShape): TShape =>
  Object.fromEntries(
    Object.entries(shape).filter(([, value]) => value !== undefined)
  ) as TShape;

/**
 * Construit la specification de recherche depuis ce que le client a dicte.
 *
 * Retourne `null` tant que le contrat n'est pas satisfait : le frontend ne
 * complete jamais une plaque incomplete par une valeur par defaut, une norme ou
 * une moyenne. Un champ vide reste vide et devient un fait manquant que
 * l'utilisateur ira redemander au client.
 */
export const buildMotorSpecFromNameplate = (
  draft: NameplateDraft
): MotorEquivalentFromSpecInput | null => {
  if (draft.mounting === null) return null;

  const polesValue = parseNumber(draft.poles);
  const hasFlange = getMountingPresentation(draft.mounting).hasFlange;

  const candidateInput = {
    schema_version: 1 as const,
    mounting: draft.mounting,
    electrical: omitUndefined({
      power_kw: numericFact(draft.power_kw, 'kW'),
      frequency_hz: numericFact(draft.frequency_hz, 'Hz'),
      supply_mode: enumFact(draft.supply_mode),
      network: draft.network.trim() ? enumFact(draft.network.trim()) : enumFact<string>(null),
      speed_rpm: draft.speed_rpm.trim() ? numericFact(draft.speed_rpm, 'rpm') : undefined,
      poles: polesValue === null ? undefined : enumFact(polesValue),
      voltage_v: draft.voltage_v.trim() ? numericFact(draft.voltage_v, 'V') : undefined,
      coupling: draft.coupling === null ? undefined : enumFact(draft.coupling),
      rated_current_a: draft.rated_current_a.trim()
        ? numericFact(draft.rated_current_a, 'A')
        : undefined,
      efficiency_class:
        draft.efficiency_class === null ? undefined : enumFact(draft.efficiency_class)
    }),
    mechanical: {
      frame: {
        dimensions: omitUndefined({
          A: optionalDimension(draft.A),
          B: optionalDimension(draft.B),
          C: optionalDimension(draft.C),
          H: optionalDimension(draft.H),
          K: optionalDimension(draft.K)
        }),
        adjustment: omitUndefined({
          bolt_diameter: optionalDimension(draft.bolt_diameter)
        })
      },
      shaft: {
        dimensions: omitUndefined({
          D: optionalDimension(draft.D),
          E: optionalDimension(draft.E),
          F: optionalDimension(draft.F)
        })
      },
      // La bride n'est transmise que si le montage en comporte une : demander
      // M/N/P en B3 n'aurait aucun sens, et en envoyer un objet vide non plus.
      ...(hasFlange
        ? {
          flange: {
            dimensions: omitUndefined({
              M: optionalDimension(draft.M),
              N: optionalDimension(draft.N),
              P: optionalDimension(draft.P),
              S: getMountingPresentation(draft.mounting).flangeBore === 'through'
                ? optionalDimension(draft.S)
                : undefined,
              S_thread: getMountingPresentation(draft.mounting).flangeBore === 'tapped'
                ? optionalTextMeasurement(draft.S_thread)
                : undefined,
              T: optionalDimension(draft.T),
              Z: parseNumber(draft.Z) === null
                ? undefined
                : {
                  value: parseNumber(draft.Z),
                  unit: 'count' as const,
                  origin: 'user_measurement' as const,
                  confirmation: 'confirmed' as const,
                  evidence: [{
                    kind: 'measurement' as const,
                    label: 'Mesure communiquée par le client pendant l’appel'
                  }]
                }
            })
          }
        }
        : {})
    },
    limit: 25,
    sort: 'compatibility' as const
  };

  const parsed = motorEquivalentFromSpecInputSchema.safeParse(candidateInput);
  return parsed.success ? parsed.data : null;
};

/**
 * Ce qu'il manque pour lancer la recherche, formule comme la question a poser
 * au client plutot que comme un nom de champ.
 */
export const listBlockingNameplateQuestions = (draft: NameplateDraft): string[] => {
  const questions: string[] = [];
  if (draft.mounting === null) {
    questions.push('Quelle est la forme de montage du moteur ?');
  }
  if (parseNumber(draft.power_kw) === null) {
    questions.push('Quelle puissance est inscrite sur la plaque, en kW ?');
  }
  if (parseNumber(draft.frequency_hz) === null) {
    questions.push('Quelle fréquence est inscrite sur la plaque, en Hz ?');
  }
  if (draft.supply_mode === null) {
    questions.push('Le moteur est-il alimenté par le réseau ou par un variateur ?');
  }
  return questions;
};
