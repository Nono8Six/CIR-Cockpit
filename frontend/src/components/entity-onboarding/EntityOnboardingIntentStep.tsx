import { useRef, type KeyboardEvent } from "react";
import { Building2, Check } from "lucide-react";

import type {
  OnboardingIntent,
  OnboardingMode,
} from "@/components/entity-onboarding/entityOnboarding.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ChoiceOption = { id: string; title: string; body: string };

interface EntityOnboardingIntentStepProps {
  effectiveIntent: OnboardingIntent;
  intents: OnboardingIntent[];
  isIntentLocked: boolean;
  mode: OnboardingMode;
  clientKind: "company" | "individual";
  onClientKindChange: (kind: "company" | "individual") => void;
  onIntentChange: (intent: OnboardingIntent) => void;
}

const INTENT_OPTIONS: ChoiceOption[] = [
  {
    id: "prospect",
    title: "Prospect",
    body: "Qualification legere pour une prise de contact.",
  },
  {
    id: "client",
    title: "Client",
    body: "Creation d'un compte complet pour l'annuaire.",
  },
];

const CLIENT_KIND_OPTIONS: ChoiceOption[] = [
  {
    id: "company",
    title: "Societe",
    body: "Recherche SIRENE, etablissements et controle CIR.",
  },
  {
    id: "individual",
    title: "Particulier",
    body: "Client sans entite, avec compte comptant direct.",
  },
];

const focusOption = (
  refs: Array<HTMLButtonElement | null>,
  index: number,
): void => {
  refs[index]?.focus();
};

const getNextEnabledIndex = (
  indexes: number[],
  currentIndex: number,
  direction: 1 | -1,
): number => {
  const currentEnabledIndex = indexes.indexOf(currentIndex);
  if (currentEnabledIndex === -1) return indexes[0] ?? currentIndex;
  const nextOffset =
    (currentEnabledIndex + direction + indexes.length) % indexes.length;
  return indexes[nextOffset] ?? currentIndex;
};

const cardClasses =
  "group relative flex items-center justify-between rounded-md border px-4 py-3 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

const EntityOnboardingIntentStep = ({
  effectiveIntent,
  intents,
  isIntentLocked,
  mode,
  clientKind,
  onClientKindChange,
  onIntentChange,
}: EntityOnboardingIntentStepProps) => {
  const intentRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const clientKindRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visibleIntentOptions = INTENT_OPTIONS.filter((option) =>
    intents.includes(option.id as OnboardingIntent),
  );
  const intentEnabledIndexes = visibleIntentOptions.flatMap((_option, index) =>
    isIntentLocked ? [] : [index],
  );
  const activeIntentIndex = visibleIntentOptions.findIndex(
    (option) => effectiveIntent === option.id,
  );
  const focusableIntentIndex =
    activeIntentIndex >= 0
      ? activeIntentIndex
      : (intentEnabledIndexes[0] ?? -1);

  const clientKindEnabledIndexes = CLIENT_KIND_OPTIONS.flatMap((option, index) =>
    mode === "convert" && option.id === "individual" ? [] : [index],
  );
  const activeClientKindIndex = CLIENT_KIND_OPTIONS.findIndex(
    (option) => clientKind === option.id,
  );
  const focusableClientKindIndex =
    activeClientKindIndex >= 0
      ? activeClientKindIndex
      : (clientKindEnabledIndexes[0] ?? -1);

  const handleIntentKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (isIntentLocked || intentEnabledIndexes.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = getNextEnabledIndex(intentEnabledIndexes, index, 1);
      onIntentChange(visibleIntentOptions[nextIndex]?.id as OnboardingIntent);
      focusOption(intentRefs.current, nextIndex);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const previousIndex = getNextEnabledIndex(intentEnabledIndexes, index, -1);
      onIntentChange(
        visibleIntentOptions[previousIndex]?.id as OnboardingIntent,
      );
      focusOption(intentRefs.current, previousIndex);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstIndex = intentEnabledIndexes[0];
      if (typeof firstIndex === "number") {
        onIntentChange(visibleIntentOptions[firstIndex]?.id as OnboardingIntent);
        focusOption(intentRefs.current, firstIndex);
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastIndex = intentEnabledIndexes.at(-1);
      if (typeof lastIndex === "number") {
        onIntentChange(visibleIntentOptions[lastIndex]?.id as OnboardingIntent);
        focusOption(intentRefs.current, lastIndex);
      }
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onIntentChange(visibleIntentOptions[index]?.id as OnboardingIntent);
    }
  };

  const handleClientKindKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (clientKindEnabledIndexes.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = getNextEnabledIndex(clientKindEnabledIndexes, index, 1);
      onClientKindChange(CLIENT_KIND_OPTIONS[nextIndex]?.id as "company" | "individual");
      focusOption(clientKindRefs.current, nextIndex);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const previousIndex = getNextEnabledIndex(clientKindEnabledIndexes, index, -1);
      onClientKindChange(CLIENT_KIND_OPTIONS[previousIndex]?.id as "company" | "individual");
      focusOption(clientKindRefs.current, previousIndex);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstIndex = clientKindEnabledIndexes[0];
      if (typeof firstIndex === "number") {
        onClientKindChange(CLIENT_KIND_OPTIONS[firstIndex]?.id as "company" | "individual");
        focusOption(clientKindRefs.current, firstIndex);
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastIndex = clientKindEnabledIndexes.at(-1);
      if (typeof lastIndex === "number") {
        onClientKindChange(CLIENT_KIND_OPTIONS[lastIndex]?.id as "company" | "individual");
        focusOption(clientKindRefs.current, lastIndex);
      }
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onClientKindChange(CLIENT_KIND_OPTIONS[index]?.id as "company" | "individual");
    }
  };

  return (
    <div className="flex h-full flex-col space-y-12">
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm font-medium text-foreground">
          <Building2 aria-hidden="true" className="size-4 text-muted-foreground" />
          <h3>Intention de creation</h3>
          {isIntentLocked ? (
            <Badge variant="outline" className="ml-auto text-[10px]">
              Type impose
            </Badge>
          ) : null}
        </div>

        <div role="radiogroup" aria-label="Intention" className="flex flex-col gap-2">
          {visibleIntentOptions.map((option, index) => {
            const isActive = effectiveIntent === option.id;
            return (
              <button
                key={option.id}
                ref={(element) => {
                  intentRefs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-label={`Selectionner ${option.title}`}
                disabled={isIntentLocked}
                tabIndex={index === focusableIntentIndex && !isIntentLocked ? 0 : -1}
                onClick={() => onIntentChange(option.id as OnboardingIntent)}
                onKeyDown={(event) => handleIntentKeyDown(event, index)}
                className={cn(
                  cardClasses,
                  isActive
                    ? "border-border bg-surface-1/50 shadow-sm"
                    : "border-border-subtle hover:border-border hover:bg-surface-1/30",
                  isIntentLocked && "cursor-not-allowed opacity-60",
                )}
              >
                <div className="relative z-10 flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-subtle group-hover:border-border",
                    )}
                  >
                    {isActive ? <Check className="size-3" strokeWidth={3} /> : null}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold tracking-tight text-foreground">
                      {option.title}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {option.body}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {effectiveIntent === "client" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm font-medium text-foreground">
            <Building2 aria-hidden="true" className="size-4 text-muted-foreground" />
            <h3>Nature du compte</h3>
            {mode === "convert" ? (
              <Badge variant="outline" className="ml-auto text-[10px]">
                Societe imposee
              </Badge>
            ) : null}
          </div>

          <div role="radiogroup" aria-label="Cadre client" className="flex flex-col gap-2">
            {CLIENT_KIND_OPTIONS.map((option, index) => {
              const isActive = clientKind === option.id;
              const isDisabled =
                mode === "convert" && option.id === "individual";

              return (
                <button
                  key={option.id}
                  ref={(element) => {
                    clientKindRefs.current[index] = element;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`Selectionner ${option.title}`}
                  disabled={isDisabled}
                  tabIndex={index === focusableClientKindIndex && !isDisabled ? 0 : -1}
                  onClick={() =>
                    onClientKindChange(option.id as "company" | "individual")
                  }
                  onKeyDown={(event) => handleClientKindKeyDown(event, index)}
                  className={cn(
                    cardClasses,
                    isActive
                      ? "border-border bg-surface-1/50 shadow-sm"
                      : "border-border-subtle hover:border-border hover:bg-surface-1/30",
                    isDisabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <div className="relative z-10 flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border-subtle group-hover:border-border",
                      )}
                    >
                      {isActive ? <Check className="size-3" strokeWidth={3} /> : null}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold tracking-tight text-foreground">
                        {option.title}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {option.body}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EntityOnboardingIntentStep;
