import { useState, type ChangeEvent } from 'react';
import { Check } from 'lucide-react';

import type { MotorMounting } from 'shared/schemas/configurator/motor.schema';

import { Input } from '@/components/ui/inputs/basic/Input';
import { cn } from '@/lib/utils';
import { MotorVisualExplorer } from './MotorVisualExplorer';
import { MotorSchematic } from './MotorSchematic';
import type { NameplateDraft } from './buildMotorSpecFromNameplate';
import {
  MOTOR_DIMENSIONS,
  MOUNTING_DIMENSIONS,
  MOUNTING_PRESENTATIONS,
  polesFromPlateSpeed,
  synchronousSpeedRpm,
  type MotorDimensionKey
} from './motorMountingDimensions';

type MotorNameplateFormProps = {
  draft: NameplateDraft;
  onChange: (draft: NameplateDraft) => void;
  className?: string;
};

type StepId = 'essentiel' | 'montage' | 'cotes';

const STEPS: readonly { id: StepId; label: string; question: string }[] = [
  {
    id: 'essentiel',
    label: 'L’essentiel',
    question: 'Que lit le client sur la plaque ?'
  },
  {
    id: 'montage',
    label: 'Le montage',
    question: 'Comment le moteur est-il tenu ?'
  },
  {
    id: 'cotes',
    label: 'Les cotes',
    question: 'Le client peut-il mesurer ?'
  }
];

const POLE_CHOICES = [2, 4, 6, 8] as const;

const FieldLabel = ({ children, unit, required = false }: {
  children: string;
  unit?: string;
  required?: boolean;
}) => (
  <span className="flex items-baseline justify-between gap-2 text-[12px] text-muted-foreground">
    <span>
      {children}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </span>
    {unit ? <span className="font-mono text-[11px]">{unit}</span> : null}
  </span>
);

const isStepComplete = (step: StepId, draft: NameplateDraft): boolean => {
  if (step === 'essentiel') {
    return draft.power_kw.trim().length > 0
      && draft.frequency_hz.trim().length > 0
      && draft.supply_mode !== null;
  }
  if (step === 'montage') {
    return draft.mounting !== null;
  }
  return false;
};

/**
 * Saisie guidee de la plaque signaletique.
 *
 * Trois etapes, dans l'ordre ou les questions se posent au telephone : ce qui
 * est ecrit sur la plaque, comment le moteur est tenu, puis ce que le client
 * peut mesurer. Les etapes ne bloquent pas — on peut sauter a la troisieme —
 * mais l'ordre porte la priorite reelle.
 *
 * Deux choix structurants :
 *
 * - la forme de montage se choisit **en voyant** la bride, pas en lisant un
 *   code : personne ne distingue B14 de B5 de tete ;
 * - les cotes demandees suivent le montage. En B5 on ne demande jamais A, B, C
 *   ou H, qui n'existent pas ; en B3 on ne demande jamais M, N ou P.
 */
export const MotorNameplateForm = ({ draft, onChange, className }: MotorNameplateFormProps) => {
  const [activeStep, setActiveStep] = useState<StepId>('essentiel');
  const [focusedDimension, setFocusedDimension] = useState<MotorDimensionKey | null>(null);

  const setField = (key: keyof NameplateDraft) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...draft, [key]: event.target.value });
  };

  const frequency = Number(draft.frequency_hz.replace(',', '.'));
  const selectedPoles = Number(draft.poles);
  const synchronous = synchronousSpeedRpm(selectedPoles, frequency);
  const plateSpeed = Number(draft.speed_rpm.replace(',', '.'));
  const inferredPoles = draft.poles.trim().length === 0 && draft.speed_rpm.trim().length > 0
    ? polesFromPlateSpeed(plateSpeed, frequency)
    : null;

  const requestedDimensions: readonly MotorDimensionKey[] = draft.mounting
    ? MOUNTING_DIMENSIONS[draft.mounting]
    : [];
  const feetAndShaft = requestedDimensions.filter(
    (key) => MOTOR_DIMENSIONS[key].group !== 'flange'
  );
  const flangeDimensions = requestedDimensions.filter(
    (key) => MOTOR_DIMENSIONS[key].group === 'flange'
  );

  return (
    <div className={cn('space-y-4', className)}>
      <ol className="flex gap-1" aria-label="Étapes de la description">
        {STEPS.map((step, index) => {
          const isActive = activeStep === step.id;
          const isDone = isStepComplete(step.id, draft);
          return (
            <li key={step.id} className="flex-1">
              <button
                type="button"
                onClick={() => { setActiveStep(step.id); }}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none',
                  isActive
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-foreground hover:bg-surface-1'
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                    isActive
                      ? 'bg-background/20 text-background'
                      : isDone
                        ? 'bg-success text-success-foreground'
                        : 'bg-surface-3 text-muted-foreground'
                  )}
                >
                  {isDone && !isActive ? (
                    <Check aria-hidden="true" className="size-2.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate text-[12px] font-medium">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        {STEPS.find((step) => step.id === activeStep)?.question}
      </p>

      {activeStep === 'essentiel' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <FieldLabel unit="kW" required>Puissance</FieldLabel>
              <Input
                value={draft.power_kw}
                onChange={setField('power_kw')}
                inputMode="decimal"
                className="h-9 font-mono tabular-nums"
                placeholder="—"
              />
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel unit="Hz" required>Fréquence</FieldLabel>
              <Input
                value={draft.frequency_hz}
                onChange={setField('frequency_hz')}
                inputMode="decimal"
                className="h-9 font-mono tabular-nums"
                placeholder="—"
              />
              <span className="text-[10px] text-muted-foreground">50 Hz prérempli — France</span>
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-muted-foreground">
              Alimentation <span className="text-destructive">*</span>
            </span>
            <div className="flex gap-1">
              {([
                { value: 'mains' as const, label: 'Réseau' },
                { value: 'vfd' as const, label: 'Variateur' }
              ]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={draft.supply_mode === option.value}
                  onClick={() => { onChange({ ...draft, supply_mode: option.value }); }}
                  className={cn(
                    'h-9 flex-1 rounded-lg border text-[12px] transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none',
                    draft.supply_mode === option.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-foreground hover:bg-surface-1'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">Variateur sélectionné par défaut</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-muted-foreground">Nombre de pôles</span>
            <div className="flex gap-1">
              {POLE_CHOICES.map((poles) => {
                const isSelected = selectedPoles === poles;
                const speed = synchronousSpeedRpm(poles, frequency);
                return (
                  <button
                    key={poles}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      onChange({ ...draft, poles: isSelected ? '' : String(poles) });
                    }}
                    className={cn(
                      'flex h-11 flex-1 flex-col items-center justify-center rounded-lg border transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none',
                      isSelected
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-foreground hover:bg-surface-1'
                    )}
                  >
                    <span className="font-mono text-[13px] font-semibold leading-none">
                      {poles}P
                    </span>
                    {speed !== null ? (
                      <span
                        className={cn(
                          'mt-0.5 font-mono text-[10px] leading-none',
                          isSelected ? 'text-background/70' : 'text-muted-foreground'
                        )}
                      >
                        ~{speed}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <FieldLabel unit="tr/min">Vitesse lue sur la plaque</FieldLabel>
            <Input
              value={draft.speed_rpm}
              onChange={setField('speed_rpm')}
              inputMode="decimal"
              className="h-9 font-mono tabular-nums"
              placeholder="—"
            />
            {inferredPoles !== null ? (
              <span className="text-[11px] text-muted-foreground">
                Cette vitesse correspond à un moteur {inferredPoles} pôles. Sélectionnez-le
                ci-dessus pour l’utiliser comme critère.
              </span>
            ) : null}
            {synchronous !== null && draft.speed_rpm.trim().length === 0 ? (
              <span className="text-[11px] text-muted-foreground">
                Vitesse de synchronisme {synchronous} tr/min. La plaque indiquera un peu moins,
                à cause du glissement.
              </span>
            ) : null}
          </label>

          <div className="grid grid-cols-2 gap-2 border-t border-border-subtle pt-3">
            <label className="flex flex-col gap-1">
              <FieldLabel unit="V">Tension</FieldLabel>
              <Input
                value={draft.voltage_v}
                onChange={setField('voltage_v')}
                inputMode="decimal"
                className="h-9 font-mono tabular-nums"
                placeholder="—"
              />
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel unit="A">Courant</FieldLabel>
              <Input
                value={draft.rated_current_a}
                onChange={setField('rated_current_a')}
                inputMode="decimal"
                className="h-9 font-mono tabular-nums"
                placeholder="—"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <FieldLabel>Réseau indiqué</FieldLabel>
              <Input value={draft.network} onChange={setField('network')} className="h-9" placeholder="ex. 400 V tri" />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-muted-foreground">Couplage</span>
              <div className="grid h-9 grid-cols-2 gap-1">
                {(['Y', 'D'] as const).map((coupling) => (
                  <button
                    key={coupling}
                    type="button"
                    aria-pressed={draft.coupling === coupling}
                    onClick={() => { onChange({ ...draft, coupling: draft.coupling === coupling ? null : coupling }); }}
                    className={cn('rounded-lg border font-mono text-[11px]', draft.coupling === coupling
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-foreground hover:bg-surface-1')}
                  >
                    {coupling === 'Y' ? 'Y étoile' : 'Δ triangle'}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <FieldLabel>Classe IE</FieldLabel>
              <select
                value={draft.efficiency_class ?? ''}
                onChange={(event) => { onChange({ ...draft, efficiency_class: (event.target.value || null) as NameplateDraft['efficiency_class'] }); }}
                className="h-9 rounded-lg border border-input bg-background px-2 text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Non lue</option>
                {(['IE1', 'IE2', 'IE3', 'IE4', 'IE5'] as const).map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {activeStep === 'montage' ? (
        <div className="space-y-2">
          {MOUNTING_PRESENTATIONS.map((presentation) => {
            const isSelected = draft.mounting === presentation.mounting;
            return (
              <button
                key={presentation.mounting}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  onChange({ ...draft, mounting: presentation.mounting });
                  setActiveStep('cotes');
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none',
                  isSelected
                    ? 'border-foreground bg-surface-1'
                    : 'border-border bg-card hover:bg-surface-1'
                )}
              >
                <MotorSchematic
                  mounting={presentation.mounting}
                  view={presentation.hasFlange && !presentation.hasFeet ? 'face' : 'profile'}
                  className="w-24 shrink-0"
                />
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[13px] font-semibold text-foreground">
                      {presentation.mounting}
                    </span>
                    <span className="text-[13px] font-medium text-foreground">
                      {presentation.name}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                    {presentation.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {activeStep === 'cotes' ? (
        draft.mounting === null ? (
          <p className="rounded-xl border border-border bg-surface-1 p-4 text-[13px] leading-snug text-muted-foreground">
            Choisissez d’abord la forme de montage : elle décide des cotes à relever. En bride,
            les cotes de pattes n’existent pas, et inversement.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <MotorVisualExplorer mounting={draft.mounting} highlighted={focusedDimension} />
              <p className="mt-1 min-h-[2.4em] text-[12px] leading-snug text-muted-foreground">
                {focusedDimension === null ? (
                  'Placez le curseur dans un champ : la cote correspondante s’allume sur le schéma.'
                ) : (
                  <>
                    <span className="font-medium text-foreground">
                      {MOTOR_DIMENSIONS[focusedDimension].label}
                    </span>
                    {' — '}
                    {MOTOR_DIMENSIONS[focusedDimension].where}
                  </>
                )}
              </p>
            </div>

            <DimensionGrid
              title="Fixation et arbre"
              keys={feetAndShaft}
              draft={draft}
              focused={focusedDimension}
              onFocus={setFocusedDimension}
              setField={setField}
            />
            {feetAndShaft.includes('K') ? (
              <label className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
                <FieldLabel unit="mm">Diamètre des boulons montés</FieldLabel>
                <Input value={draft.bolt_diameter} onChange={setField('bolt_diameter')} inputMode="decimal" className="h-8 font-mono tabular-nums" placeholder="Non relevé" />
                <span className="text-[11px] text-muted-foreground">À distinguer du diamètre K des trous de pattes.</span>
              </label>
            ) : null}
            <DimensionGrid
              title="Bride"
              keys={flangeDimensions}
              draft={draft}
              focused={focusedDimension}
              onFocus={setFocusedDimension}
              setField={setField}
            />

            <p className="text-[12px] leading-snug text-muted-foreground">
              Chaque cote resserre les candidats. Une cote laissée vide reste une question à
              poser, jamais une valeur supposée.
            </p>
          </div>
        )
      ) : null}
    </div>
  );
};

/**
 * Liste des cotes a relever.
 *
 * Une ligne par cote plutot qu'une grille de champs muets : la lettre seule ne
 * dit rien, c'est le libelle qui permet de formuler la question au client. La
 * ligne s'allume au survol comme au focus, et pilote le surlignage du schema —
 * lire « H » et voir simultanement ou poser le metre est la seule facon
 * d'obtenir une mesure juste par telephone.
 */
const DimensionGrid = ({ title, keys, draft, focused, onFocus, setField }: {
  title: string;
  keys: readonly MotorDimensionKey[];
  draft: NameplateDraft;
  focused: MotorDimensionKey | null;
  onFocus: (key: MotorDimensionKey | null) => void;
  setField: (key: keyof NameplateDraft) => (event: ChangeEvent<HTMLInputElement>) => void;
}) => {
  if (keys.length === 0) return null;

  const filled = keys.filter((key) => draft[key].trim().length > 0).length;

  return (
    <div className="tech-raised overflow-hidden rounded-xl bg-card">
      <div className="flex items-baseline justify-between gap-2 border-b border-border-subtle px-3 py-2">
        <p className="text-[12px] font-medium text-foreground">{title}</p>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {filled}
          <span className="text-border">/</span>
          {keys.length}
        </p>
      </div>
      <ul className="divide-y divide-border-subtle">
        {keys.map((key) => {
          const spec = MOTOR_DIMENSIONS[key];
          const isActive = focused === key;
          const isFilled = draft[key].trim().length > 0;
          return (
            <li
              key={key}
              onMouseEnter={() => { onFocus(key); }}
              onMouseLeave={() => { onFocus(null); }}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 transition-colors duration-100 motion-reduce:transition-none',
                isActive && 'bg-accent/40'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[12px] font-semibold transition-colors duration-100 motion-reduce:transition-none',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isFilled
                      ? 'bg-foreground text-background'
                      : 'bg-surface-2 text-muted-foreground'
                )}
              >
                {key === 'S_thread' ? 'S' : key}
              </span>
              <label className="min-w-0 flex-1 cursor-text">
                <span className="block truncate text-[12px] leading-tight text-foreground">
                  {spec.label}
                </span>
                <span className="sr-only">{`${key} — ${spec.label}`}</span>
                <Input
                  value={draft[key]}
                  onChange={setField(key)}
                  onFocus={() => { onFocus(key); }}
                  onBlur={() => { onFocus(null); }}
                  inputMode={key === 'S_thread' ? 'text' : 'decimal'}
                  aria-label={`${key} — ${spec.label}`}
                  className="mt-0.5 h-7 border-0 bg-transparent px-0 font-mono text-[13px] tabular-nums shadow-none focus-visible:ring-0"
                  placeholder="Non relevé"
                />
              </label>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {spec.unit}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export type { MotorMounting };
