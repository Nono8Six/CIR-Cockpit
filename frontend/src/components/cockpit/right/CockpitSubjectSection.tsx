import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';

type CockpitSubjectSectionProps = {
  labelStyle: string;
  subjectField: UseFormRegisterReturn;
  notesField: UseFormRegisterReturn;
  errors: FieldErrors<InteractionFormValues>;
  families: string[];
  megaFamilies: string[];
  onToggleFamily: (family: string) => void;
};

const CockpitSubjectSection = ({
  labelStyle,
  subjectField,
  notesField,
  errors,
  families,
  megaFamilies,
  onToggleFamily
}: CockpitSubjectSectionProps) => {
  return (
    <div className="flex-1 flex flex-col space-y-2">
      <label className={labelStyle} htmlFor="subject-input">Sujet & Technique</label>
      <input
        id="subject-input"
        type="text"
        {...subjectField}
        className="w-full bg-transparent border-0 border-b border-border px-0 py-2 text-lg font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-ring focus-visible:outline-none placeholder:text-muted-foreground/70 transition-colors"
        placeholder="Ex: Verin ISO 15552 diam 80 course 200..."
        aria-invalid={!!errors.subject}
        aria-label="Sujet et technique"
        autoComplete="off"
      />
      {errors.subject ? (
        <p className="text-xs text-destructive" role="status" aria-live="polite">
          {errors.subject.message}
        </p>
      ) : null}
      <div data-testid="cockpit-family-tags" className="flex flex-wrap items-center gap-2 pb-1">
        {families.map((family) => (
          <button
            key={family}
            type="button"
            onClick={() => onToggleFamily(family)}
            className={`px-2.5 py-1 text-xs uppercase font-bold rounded-md border transition-colors ${
              megaFamilies.includes(family)
                ? 'bg-primary text-white border-ring shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:border-ring/40 hover:text-foreground'
            }`}
          >
            {family}
          </button>
        ))}
      </div>
      <textarea
        {...notesField}
        rows={3}
        className="flex-1 min-h-[80px] w-full bg-surface-1/70 border border-border rounded-md px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-border focus-visible:outline-none resize-none placeholder:text-muted-foreground/80"
        placeholder="Ajouter des details techniques, references constructeur, contexte..."
        aria-label="Details techniques"
        autoComplete="off"
      ></textarea>
    </div>
  );
};

export default CockpitSubjectSection;
