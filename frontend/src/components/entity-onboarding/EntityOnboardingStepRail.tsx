import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface EntityOnboardingStepRailProps {
  currentIndex: number;
  progress: number;
  sourceLabel: string;
}

const STEPS = [
  { label: 'Type', description: 'Cadre de la fiche' },
  { label: 'Recherche', description: 'Entreprise et etablissement' },
  { label: 'Informations', description: 'Champs metier' },
  { label: 'Validation', description: 'Controle final' }
] as const;

const EntityOnboardingStepRail = ({
  currentIndex,
  progress,
  sourceLabel
}: EntityOnboardingStepRailProps) => {
  return (
    <aside className="hidden min-h-0 border-r border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-7 xl:flex xl:flex-col">
      <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
        <Sparkles className="size-3.5" />
        {sourceLabel}
      </Badge>
      <h2 className="mt-5 text-[2rem] font-semibold tracking-tight text-foreground">
        Nouvelle fiche entreprise
      </h2>
      <p className="mt-3 max-w-[22ch] text-sm leading-6 text-muted-foreground">
        Un flux moderne pour qualifier la societe, choisir le bon etablissement et finaliser la fiche sans friction.
      </p>

      <div className="mt-6 overflow-hidden rounded-full bg-border/70">
        <div className="h-2 rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-8 space-y-3">
        {STEPS.map((step, index) => (
          <div
            key={step.label}
            className={cn(
              'rounded-[24px] border px-4 py-4 transition-colors',
              currentIndex === index
                ? 'border-primary/40 bg-primary/8 shadow-sm'
                : index < currentIndex
                  ? 'border-emerald-200/80 bg-emerald-50/60'
                  : 'border-border/60 bg-background/70'
            )}
          >
            <p className="text-sm font-medium text-foreground">{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>

      <Card variant="section" className="mt-auto rounded-[28px] border-border/70 bg-background/80 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-2 text-primary">
            <ShieldCheck className="size-4" />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Donnees officielles issues de l&apos;API Recherche d&apos;entreprises, puis confirmees humainement avant creation.
          </p>
        </div>
      </Card>
    </aside>
  );
};

export default EntityOnboardingStepRail;

