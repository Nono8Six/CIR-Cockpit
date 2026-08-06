import { ArrowRight, PhoneCall } from 'lucide-react';

import type { MotorEquivalentCandidateResult } from 'shared/schemas/configurator/motor.schema';

import { cn } from '@/lib/utils';
import {
  MOTOR_FACT_RESOLUTION,
  getMotorFactFamily,
  getMotorFactLabel,
  type MotorFactPath
} from './motorFactLabels';

/**
 * Question a poser, formulee dans les mots du terrain. Le libelle du fait sert
 * de repli quand aucune formulation dediee n'existe : mieux vaut une question
 * un peu seche qu'une question inventee.
 */
const FACT_QUESTIONS: Partial<Record<MotorFactPath, string>> = {
  'mounting': 'Le moteur est-il monté sur pattes, sur bride, ou les deux ?',
  'electrical.poles': 'Combien de pôles, ou quelle vitesse est inscrite sur la plaque ?',
  'electrical.speed_rpm': 'Quelle vitesse nominale est inscrite, en tr/min ?',
  'electrical.voltage_v': 'Quelle tension est inscrite sur la plaque ?',
  'electrical.coupling': 'Le moteur est-il couplé en étoile ou en triangle ?',
  'electrical.network': 'Sur quel réseau le moteur est-il raccordé ?',
  'electrical.rated_current_a': 'Quel courant nominal est inscrit, en ampères ?',
  'electrical.efficiency_class': 'Une classe de rendement (IE2, IE3…) est-elle inscrite ?',
  'mechanical.frame.A': 'Pouvez-vous mesurer l’entraxe entre les pattes, dans le sens de la largeur ?',
  'mechanical.frame.B': 'Pouvez-vous mesurer l’entraxe entre les pattes, dans le sens de la longueur ?',
  'mechanical.frame.C': 'Pouvez-vous mesurer du bout d’arbre au premier trou de patte ?',
  'mechanical.frame.H': 'Quelle est la hauteur entre le sol et l’axe de l’arbre ?',
  'mechanical.frame.K': 'Quel est le diamètre des trous de fixation des pattes ?',
  'mechanical.frame.bolt_diameter': 'Quel diamètre font les boulons réellement montés ?',
  'mechanical.shaft.D': 'Quel est le diamètre du bout d’arbre ?',
  'mechanical.shaft.E': 'Quelle est la longueur du bout d’arbre ?',
  'mechanical.shaft.F': 'Quelle est la largeur de la clavette ?',
  'mechanical.flange.M': 'Quel est l’entraxe des trous de la bride ?',
  'mechanical.flange.N': 'Quel est le diamètre de centrage de la bride ?',
  'mechanical.flange.P': 'Quel est le diamètre extérieur de la bride ?',
  'mechanical.flange.S': 'Quel est le diamètre des trous de la bride ?',
  'mechanical.flange.Z': 'Combien de trous compte la bride ?',
  'application.ip_rating': 'Un indice de protection particulier est-il exigé sur ce poste ?',
  'application.brake_required': 'Le moteur doit-il être équipé d’un frein ?'
};

type RemainingQuestionsPanelProps = {
  candidates: readonly MotorEquivalentCandidateResult[];
  className?: string;
  /** Nombre maximum de questions affichées. */
  limit?: number;
  onSelectFact?: (factPath: MotorFactPath) => void;
};

/**
 * Les questions qu'il reste a poser au client, classees par ce qu'elles
 * debloquent.
 *
 * C'est le troisieme temps du parcours : le client a dicte sa plaque, l'outil a
 * propose des candidats, et il reste a lever les incertitudes avant de
 * s'engager. Le classement est un simple decompte des faits manquants deja
 * renvoyes par le backend — le frontend ne recalcule aucune regle et ne decide
 * jamais qu'un fait est decisif.
 */
export const RemainingQuestionsPanel = ({
  candidates,
  className,
  limit = 6,
  onSelectFact
}: RemainingQuestionsPanelProps) => {
  const impactByFact = new Map<MotorFactPath, number>();
  for (const candidate of candidates) {
    for (const factPath of candidate.missing_facts) {
      impactByFact.set(factPath, (impactByFact.get(factPath) ?? 0) + 1);
    }
  }

  const ranked = [...impactByFact.entries()]
    .sort(([leftFact, leftCount], [rightFact, rightCount]) =>
      rightCount - leftCount || leftFact.localeCompare(rightFact))
    .slice(0, limit);

  if (ranked.length === 0) {
    return null;
  }

  return (
    <section
      className={cn('tech-raised overflow-hidden rounded-xl bg-card', className)}
      aria-labelledby="remaining-questions-title"
    >
      <div className="border-b border-border-subtle px-4 py-3">
        <h3
          id="remaining-questions-title"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"
        >
          <PhoneCall aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          À demander au client
        </h3>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
          Ces informations manquent pour conclure. Elles sont classées par le nombre de
          candidats pour lesquels elles réduiraient l’incertitude.
        </p>
      </div>
      <ol className="divide-y divide-border-subtle">
        {ranked.map(([factPath, count]) => (
          <li key={factPath} className="flex items-start gap-3 px-4 py-2.5">
            <span className="mt-px shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
              {count}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] leading-snug text-foreground">
                {FACT_QUESTIONS[factPath] ?? getMotorFactLabel(factPath)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {MOTOR_FACT_RESOLUTION[getMotorFactFamily(factPath)]}
              </p>
            </div>
            {onSelectFact ? (
              <button
                type="button"
                onClick={() => { onSelectFact(factPath); }}
                className="ml-auto flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Renseigner <ArrowRight aria-hidden="true" className="size-3" />
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
};
