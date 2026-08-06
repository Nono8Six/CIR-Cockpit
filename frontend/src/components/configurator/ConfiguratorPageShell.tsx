import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { TooltipProvider } from '@/components/ui/feedback/Tooltip';
import { cn } from '@/lib/utils';

export type ConfiguratorBreadcrumb = {
  label: string;
  to?: string;
};

type ConfiguratorPageShellProps = {
  breadcrumbs: readonly ConfiguratorBreadcrumb[];
  /** Partie affirmée du titre, rendue en noir. */
  title: string;
  /**
   * Suite du titre, rendue en gris dans la même phrase. Le titre porte alors la
   * promesse complète sans paragraphe d'accompagnement.
   */
  titleContinuation?: string;
  /** Actions de tête de page ; la principale à droite. */
  actions?: ReactNode;
  /** Bandeau permanent : identité du catalogue, conflit, avertissement. */
  banner?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Ossature commune a toutes les pages Configurateurs.
 *
 * Un fond chaud, des surfaces blanches arrondies, un filet tres clair et une
 * ombre d'un pixel : la profondeur vient de la matiere, pas du trait. Le titre
 * est bi-ton — la partie affirmee en noir, la suite en gris — et porte seul la
 * promesse de la page, sans paragraphe d'accompagnement.
 *
 * Elle fixe la seule chose qui doit rester stable de C5 a C13 : ou l'utilisateur
 * se trouve, sur quel catalogue il travaille, et quelles actions existent a ce
 * niveau. Chaque tranche insere son contenu en dessous sans redefinir sa propre
 * entete.
 */
export const ConfiguratorPageShell = ({
  breadcrumbs,
  title,
  titleContinuation,
  actions,
  banner,
  children,
  className
}: ConfiguratorPageShellProps) => (
  <TooltipProvider delayDuration={200}>
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
    <header className="shrink-0 px-5 pb-5 pt-5 sm:px-8">
      <nav aria-label="Fil d’Ariane">
        <ol className="flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.label} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight aria-hidden="true" className="size-3 shrink-0 opacity-50" />
              ) : null}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="rounded underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-foreground">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="max-w-3xl text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[30px]">
          {title}
          {titleContinuation ? (
            <>
              {' '}
              <span className="font-medium text-muted-foreground">{titleContinuation}</span>
            </>
          ) : null}
        </h1>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {banner ? <div className="mt-5">{banner}</div> : null}
    </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 sm:px-8">{children}</div>
    </div>
  </TooltipProvider>
);

type ConfiguratorSectionProps = {
  /** Intitulé de la section, en casse normale. */
  label: string;
  id: string;
  /** Complément aligné à droite : compteur, filtre, action secondaire. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Section d'une page Configurateurs. La hierarchie tient a l'espace et au poids
 * du texte, pas a une echelle de titres : un intitule discret, puis le contenu.
 */
export const ConfiguratorSection = ({
  label,
  id,
  aside,
  children,
  className
}: ConfiguratorSectionProps) => (
  <section className={cn('space-y-3', className)} aria-labelledby={id}>
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 id={id} className="text-[13px] font-semibold text-foreground">
        {label}
      </h2>
      {aside}
    </div>
    {children}
  </section>
);
