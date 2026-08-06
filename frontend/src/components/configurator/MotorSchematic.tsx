import type { MotorMounting } from 'shared/schemas/configurator/motor.schema';

import { cn } from '@/lib/utils';
import { getMountingPresentation, type MotorDimensionKey } from './motorMountingDimensions';

type MotorSchematicProps = {
  mounting: MotorMounting;
  /** Cote mise en avant sur le schéma. */
  highlighted?: MotorDimensionKey | null;
  /** `profile` : vue de côté. `face` : vue de face, côté bride. */
  view?: 'profile' | 'face';
  className?: string;
};

const BODY = 'fill-surface-2 stroke-foreground/70';
const DETAIL = 'fill-none stroke-foreground/45';
const MEASURE = 'stroke-primary';
const MEASURE_TEXT = 'fill-primary font-mono text-[9px] font-semibold';
const IDLE_MEASURE = 'stroke-foreground/20';
const IDLE_TEXT = 'fill-foreground/35 font-mono text-[9px]';

const isOn = (highlighted: MotorDimensionKey | null | undefined, key: MotorDimensionKey) =>
  highlighted === key || (highlighted === 'S_thread' && key === 'S');

const measureClass = (active: boolean) => cn(active ? MEASURE : IDLE_MEASURE);
const measureTextClass = (active: boolean) => cn(active ? MEASURE_TEXT : IDLE_TEXT);

/**
 * Cote horizontale : trait a fleches et libelle centre.
 */
const HSpan = ({ x1, x2, y, label, active }: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  active: boolean;
}) => (
  <g strokeWidth={active ? 1.4 : 1}>
    <line x1={x1} y1={y} x2={x2} y2={y} className={measureClass(active)} />
    <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} className={measureClass(active)} />
    <line x1={x2} y1={y - 3} x2={x2} y2={y + 3} className={measureClass(active)} />
    <text
      x={(x1 + x2) / 2}
      y={y - 4}
      textAnchor="middle"
      className={measureTextClass(active)}
      strokeWidth={0}
    >
      {label}
    </text>
  </g>
);

/** Cote verticale. */
const VSpan = ({ x, y1, y2, label, active }: {
  x: number;
  y1: number;
  y2: number;
  label: string;
  active: boolean;
}) => (
  <g strokeWidth={active ? 1.4 : 1}>
    <line x1={x} y1={y1} x2={x} y2={y2} className={measureClass(active)} />
    <line x1={x - 3} y1={y1} x2={x + 3} y2={y1} className={measureClass(active)} />
    <line x1={x - 3} y1={y2} x2={x + 3} y2={y2} className={measureClass(active)} />
    <text
      x={x - 5}
      y={(y1 + y2) / 2 + 3}
      textAnchor="end"
      className={measureTextClass(active)}
      strokeWidth={0}
    >
      {label}
    </text>
  </g>
);

const ProfileView = ({ mounting, highlighted }: {
  mounting: MotorMounting;
  highlighted?: MotorDimensionKey | null;
}) => {
  const presentation = getMountingPresentation(mounting);

  return (
    <g strokeWidth={1.2} strokeLinejoin="round">
      {/* Carcasse */}
      <rect x={46} y={38} width={104} height={62} rx={5} className={BODY} />
      {/* Ailettes de refroidissement */}
      {[54, 62, 70, 78, 86, 94, 102, 110, 118, 126, 134, 142].map((x) => (
        <line key={x} x1={x} y1={41} x2={x} y2={97} className={DETAIL} strokeWidth={0.7} />
      ))}
      {/* Boite a bornes */}
      <rect x={82} y={24} width={34} height={15} rx={2} className={BODY} />
      {/* Capot ventilateur */}
      <rect x={30} y={46} width={17} height={46} rx={3} className={BODY} />

      {/* Bride avant */}
      {presentation.hasFlange ? (
        <rect
          x={150}
          y={presentation.flangeBore === 'through' ? 30 : 44}
          width={7}
          height={presentation.flangeBore === 'through' ? 78 : 50}
          className={BODY}
        />
      ) : null}

      {/* Arbre */}
      <rect x={presentation.hasFlange ? 157 : 150} y={63} width={38} height={12} className={BODY} />
      {/* Rainure de clavette */}
      <rect
        x={presentation.hasFlange ? 165 : 158}
        y={63}
        width={18}
        height={3.5}
        className={cn(isOn(highlighted, 'F') ? 'fill-primary stroke-primary' : 'fill-foreground/25 stroke-none')}
      />

      {/* Pattes */}
      {presentation.hasFeet ? (
        <>
          <rect x={54} y={100} width={26} height={9} rx={1.5} className={BODY} />
          <rect x={118} y={100} width={26} height={9} rx={1.5} className={BODY} />
          <circle
            cx={67}
            cy={104.5}
            r={2.6}
            className={cn(
              'stroke-none',
              isOn(highlighted, 'K') ? 'fill-primary' : 'fill-foreground/35'
            )}
          />
          <circle
            cx={131}
            cy={104.5}
            r={2.6}
            className={cn(
              'stroke-none',
              isOn(highlighted, 'K') ? 'fill-primary' : 'fill-foreground/35'
            )}
          />
          <line x1={20} y1={109} x2={205} y2={109} className={DETAIL} strokeWidth={1.5} />
        </>
      ) : null}

      {/* Axe */}
      <line
        x1={22}
        y1={69}
        x2={200}
        y2={69}
        className="stroke-foreground/30"
        strokeWidth={0.7}
        strokeDasharray="7 3 1.5 3"
      />

      {/* Cotes */}
      {presentation.hasFeet ? (
        <>
          <HSpan x1={67} x2={131} y={124} label="B" active={isOn(highlighted, 'B')} />
          <VSpan x={18} y1={69} y2={109} label="H" active={isOn(highlighted, 'H')} />
          <HSpan
            x1={presentation.hasFlange ? 157 : 150}
            x2={131}
            y={136}
            label="C"
            active={isOn(highlighted, 'C')}
          />
        </>
      ) : null}
      <HSpan
        x1={presentation.hasFlange ? 157 : 150}
        x2={195}
        y={53}
        label="E"
        active={isOn(highlighted, 'E')}
      />
      <VSpan x={205} y1={63} y2={75} label="D" active={isOn(highlighted, 'D')} />
    </g>
  );
};

const FaceView = ({ mounting, highlighted }: {
  mounting: MotorMounting;
  highlighted?: MotorDimensionKey | null;
}) => {
  const presentation = getMountingPresentation(mounting);
  const centre = { x: 112, y: 74 };
  const boltRadius = presentation.flangeBore === 'through' ? 52 : 40;
  const outerRadius = presentation.flangeBore === 'through' ? 62 : 49;

  return (
    <g strokeWidth={1.2}>
      {presentation.hasFlange ? (
        <>
          <circle cx={centre.x} cy={centre.y} r={outerRadius} className={BODY} />
          <circle
            cx={centre.x}
            cy={centre.y}
            r={30}
            className={cn('fill-none', isOn(highlighted, 'N') ? MEASURE : DETAIL)}
            strokeWidth={isOn(highlighted, 'N') ? 1.8 : 1}
          />
          <circle
            cx={centre.x}
            cy={centre.y}
            r={boltRadius}
            className={cn('fill-none', isOn(highlighted, 'M') ? MEASURE : IDLE_MEASURE)}
            strokeDasharray="4 3"
            strokeWidth={isOn(highlighted, 'M') ? 1.5 : 0.9}
          />
          {[0, 90, 180, 270].map((angle) => {
            const radians = (angle * Math.PI) / 180;
            return (
              <circle
                key={angle}
                cx={centre.x + boltRadius * Math.cos(radians)}
                cy={centre.y + boltRadius * Math.sin(radians)}
                r={5}
                className={cn(
                  presentation.flangeBore === 'tapped' ? 'fill-surface-3' : 'fill-background',
                  isOn(highlighted, 'S') || isOn(highlighted, 'Z')
                    ? 'stroke-primary'
                    : 'stroke-foreground/50'
                )}
                strokeWidth={isOn(highlighted, 'S') || isOn(highlighted, 'Z') ? 1.8 : 1}
              />
            );
          })}
          {/* Arbre vu de face */}
          <circle cx={centre.x} cy={centre.y} r={11} className={BODY} />
          <rect
            x={centre.x - 3}
            y={centre.y - 13.5}
            width={6}
            height={4}
            className={cn(isOn(highlighted, 'F') ? 'fill-primary' : 'fill-foreground/30', 'stroke-none')}
          />

          <HSpan
            x1={centre.x - outerRadius}
            x2={centre.x + outerRadius}
            y={centre.y + outerRadius + 22}
            label="P"
            active={isOn(highlighted, 'P')}
          />
          <HSpan
            x1={centre.x - boltRadius}
            x2={centre.x + boltRadius}
            y={centre.y + outerRadius + 10}
            label="M"
            active={isOn(highlighted, 'M')}
          />
          <HSpan
            x1={centre.x - 30}
            x2={centre.x + 30}
            y={centre.y - outerRadius - 6}
            label="N"
            active={isOn(highlighted, 'N')}
          />
        </>
      ) : (
        <>
          <rect x={62} y={26} width={100} height={96} rx={6} className={BODY} />
          <circle cx={centre.x} cy={centre.y} r={11} className={BODY} />
          <rect x={40} y={122} width={30} height={9} rx={1.5} className={BODY} />
          <rect x={154} y={122} width={30} height={9} rx={1.5} className={BODY} />
          <circle
            cx={55}
            cy={126.5}
            r={2.6}
            className={cn('stroke-none', isOn(highlighted, 'K') ? 'fill-primary' : 'fill-foreground/35')}
          />
          <circle
            cx={169}
            cy={126.5}
            r={2.6}
            className={cn('stroke-none', isOn(highlighted, 'K') ? 'fill-primary' : 'fill-foreground/35')}
          />
          <HSpan x1={55} x2={169} y={146} label="A" active={isOn(highlighted, 'A')} />
          <VSpan x={30} y1={74} y2={131} label="H" active={isOn(highlighted, 'H')} />
        </>
      )}
    </g>
  );
};

/**
 * Schema du moteur, adapte a la forme de montage choisie.
 *
 * Un TCS au telephone ne sait pas ou poser le metre a partir d'une lettre. Le
 * schema porte donc la cote surlignee au moment ou le champ est saisi : c'est le
 * seul moyen d'obtenir une mesure juste du client. Le dessin suit la forme de
 * montage — pas de bride dessinee en B3, pas de pattes en B5.
 *
 * Le trait est volontairement schematique et non figuratif : il montre ou
 * mesurer, il ne pretend pas representer un moteur reel du catalogue.
 */
export const MotorSchematic = ({
  mounting,
  highlighted = null,
  view = 'profile',
  className
}: MotorSchematicProps) => {
  const presentation = getMountingPresentation(mounting);
  const caption = view === 'face'
    ? `Vue de face — ${presentation.name}`
    : `Vue de côté — ${presentation.name}`;

  return (
    <figure className={cn('m-0', className)}>
      <svg
        viewBox="0 0 224 160"
        role="img"
        aria-label={caption}
        className="h-auto w-full"
      >
        {view === 'face' ? (
          <FaceView mounting={mounting} highlighted={highlighted} />
        ) : (
          <ProfileView mounting={mounting} highlighted={highlighted} />
        )}
      </svg>
    </figure>
  );
};
