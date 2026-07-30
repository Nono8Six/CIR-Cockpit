import { defineStepper } from '@stepperize/react';

export const STEP_DEFINITIONS = [
  { id: 'intent', title: 'Type', description: 'Choisir le cadre de création' },
  {
    id: 'company',
    title: 'Recherche',
    description: "Trouver l entreprise et l établissement",
  },
  {
    id: 'details',
    title: 'Informations',
    description: 'Compléter les champs métier',
  },
  { id: 'review', title: 'Validation', description: 'Vérifier avant création' },
] as const;

export type StepId = (typeof STEP_DEFINITIONS)[number]['id'];

export const { useStepper: useEntityOnboardingStepper } = defineStepper(
  { id: 'intent', title: 'Type' },
  { id: 'company', title: 'Recherche' },
  { id: 'details', title: 'Informations' },
  { id: 'review', title: 'Validation' },
);

export type EntityOnboardingStepper = ReturnType<
  typeof useEntityOnboardingStepper
>;
