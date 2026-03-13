import { Building2, CircleCheckBig, Search, ShieldCheck, UserRound } from 'lucide-react';

import type { OnboardingIntent, OnboardingMode } from '@/components/entity-onboarding/entityOnboarding.types';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

type ChoiceOption = {
  id: string;
  title: string;
  body: string;
  chips: string[];
};

interface EntityOnboardingIntentStepProps {
  effectiveIntent: OnboardingIntent;
  intents: OnboardingIntent[];
  isIntentLocked: boolean;
  mode: OnboardingMode;
  clientKind: 'company' | 'individual';
  onClientKindChange: (kind: 'company' | 'individual') => void;
  onIntentChange: (intent: OnboardingIntent) => void;
}

const BASE_TOGGLE_ITEM_CLASS_NAME =
  'h-auto min-h-[138px] flex-col items-start justify-between rounded-lg border border-border-subtle bg-background px-4 py-4 text-left transition-[background-color,border-color,box-shadow,transform] shadow-none hover:border-border hover:bg-surface-1 data-[state=on]:border-primary/35 data-[state=on]:bg-primary/5 data-[state=on]:text-foreground';

const INTENT_OPTIONS: ChoiceOption[] = [
  {
    id: 'prospect',
    title: 'Prospect',
    body: 'Qualification legere pour lancer la relation.',
    chips: ['Recherche officielle', 'Fiche courte']
  },
  {
    id: 'client',
    title: 'Client',
    body: 'Creation d un compte complet dans l annuaire.',
    chips: ['Numero client', 'Compte client']
  }
];

const CLIENT_KIND_OPTIONS: ChoiceOption[] = [
  {
    id: 'company',
    title: 'Societe',
    body: 'Recherche officielle, etablissements et controle des doublons.',
    chips: ['SIRET', 'SIREN', 'Commercial CIR']
  },
  {
    id: 'individual',
    title: 'Particulier',
    body: 'Client sans societe, avec contact principal et compte comptant.',
    chips: ['Nom + prenom', 'Telephone ou email', 'Sans commercial']
  }
];

const EntityOnboardingIntentStep = ({
  effectiveIntent,
  intents,
  isIntentLocked,
  mode,
  clientKind,
  onClientKindChange,
  onIntentChange
}: EntityOnboardingIntentStepProps) => {
  const visibleIntentOptions = INTENT_OPTIONS.filter((option) => intents.includes(option.id as OnboardingIntent));

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_320px]">
      <section className="rounded-lg border border-border-subtle bg-background">
        <div className="border-b border-border-subtle px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/8 text-primary">
              <Building2 className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Cadre de creation</p>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Type de fiche</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Le type choisi regle le niveau de qualification, les champs exposes et le controle final.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-4 py-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Intention
              </p>
              {isIntentLocked ? <Badge variant="outline">Type impose</Badge> : null}
            </div>

            <ToggleGroup
              type="single"
              value={effectiveIntent}
              className="grid gap-2 md:grid-cols-2"
              onValueChange={(nextValue) => {
                if (!nextValue) {
                  return;
                }

                onIntentChange(nextValue as OnboardingIntent);
              }}
            >
              {visibleIntentOptions.map((option) => {
                const isActive = effectiveIntent === option.id;
                return (
                  <ToggleGroupItem
                    key={option.id}
                    value={option.id}
                    variant="outline"
                    size="lg"
                    disabled={isIntentLocked}
                    aria-label={`Selectionner ${option.title}`}
                    className={BASE_TOGGLE_ITEM_CLASS_NAME}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-foreground">{option.title}</span>
                          {isActive ? <Badge variant="secondary" density="dense">Actif</Badge> : null}
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{option.body}</p>
                      </div>
                      {isActive ? <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {option.chips.map((chip) => (
                        <Badge key={chip} variant="outline" density="dense" className="border-border-subtle bg-surface-1/80">
                          {chip}
                        </Badge>
                      ))}
                    </div>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          {effectiveIntent === 'client' ? (
            <div className="space-y-2.5 border-t border-border-subtle pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Cadre client
                </p>
                {mode === 'convert' ? <Badge variant="outline">Societe imposee</Badge> : null}
              </div>

              <ToggleGroup
                type="single"
                value={clientKind}
                className="grid gap-2 md:grid-cols-2"
                onValueChange={(nextValue) => {
                  if (!nextValue) {
                    return;
                  }

                  onClientKindChange(nextValue as 'company' | 'individual');
                }}
              >
                {CLIENT_KIND_OPTIONS.map((option) => {
                  const isActive = clientKind === option.id;
                  const isDisabled = mode === 'convert' && option.id === 'individual';

                  return (
                    <ToggleGroupItem
                      key={option.id}
                      value={option.id}
                      variant="outline"
                      size="lg"
                      disabled={isDisabled}
                      aria-label={`Selectionner ${option.title}`}
                      className={cn(BASE_TOGGLE_ITEM_CLASS_NAME, isDisabled && 'cursor-not-allowed opacity-60')}
                    >
                      <div className="flex w-full items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-foreground">{option.title}</span>
                            {isActive ? <Badge variant="secondary" density="dense">Actif</Badge> : null}
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">{option.body}</p>
                        </div>
                        {isActive ? <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {option.chips.map((chip) => (
                          <Badge key={chip} variant="outline" density="dense" className="border-border-subtle bg-surface-1/80">
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="rounded-lg border border-border-subtle bg-background">
        <div className="border-b border-border-subtle px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Lecture du flux
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 text-sm leading-6 text-muted-foreground">
          <div className="rounded-lg border border-border-subtle bg-surface-1/70 p-4">
            <p className="font-medium text-foreground">
              {mode === 'convert'
                ? 'Le prospect reste la base de travail, puis le compte client est finalise.'
                : effectiveIntent === 'client' && clientKind === 'individual'
                  ? 'Le parcours particulier remplace la recherche entreprise par une qualification identite + doublons.'
                  : 'Le flux annuaire garde la meme logique: recherche, verification, completion et validation.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-border-subtle px-3 py-3">
              <Search className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Recherche ou qualification</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Resultats officiels ou saisie structuree selon le cadre choisi.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border-subtle px-3 py-3">
              {clientKind === 'individual' ? (
                <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Champs adaptes</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Les sections suivantes ne montrent que les donnees utiles a ce type de fiche.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default EntityOnboardingIntentStep;
