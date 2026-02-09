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
        className="w-full bg-transparent border-0 border-b border-slate-200 px-0 py-2 text-lg font-semibold text-slate-900 focus:ring-2 focus:ring-cir-red/30 focus:border-cir-red focus:outline-none placeholder:text-slate-300 transition-colors"
        placeholder="Ex: Verin ISO 15552 diam 80 course 200..."
        aria-invalid={!!errors.subject}
        aria-label="Sujet et technique"
        autoComplete="off"
      />
      {errors.subject ? (
        <p className="text-xs text-red-600" role="status" aria-live="polite">
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
                ? 'bg-cir-red text-white border-cir-red shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-cir-red/40 hover:text-slate-700'
            }`}
          >
            {family}
          </button>
        ))}
      </div>
      <textarea
        {...notesField}
        rows={3}
        className="flex-1 min-h-[80px] w-full bg-slate-50/50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:outline-none resize-none placeholder:text-slate-400"
        placeholder="Ajouter des details techniques, references constructeur, contexte..."
        aria-label="Details techniques"
        autoComplete="off"
      ></textarea>
    </div>
  );
};

export default CockpitSubjectSection;
