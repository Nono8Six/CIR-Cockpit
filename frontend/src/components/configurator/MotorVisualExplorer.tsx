import { useState } from 'react';
import { Box, Ruler } from 'lucide-react';

import type { MotorMounting } from 'shared/schemas/configurator/motor.schema';

import { cn } from '@/lib/utils';
import { MotorSchematic } from './MotorSchematic';
import type { MotorDimensionKey } from './motorMountingDimensions';

type MotorView = 'perspective' | 'profile' | 'flange' | 'rear';

const VIEWS: readonly { id: MotorView; label: string; position: string }[] = [
  { id: 'perspective', label: 'Perspective', position: '0% 0%' },
  { id: 'profile', label: 'Profil', position: '100% 0%' },
  { id: 'flange', label: 'Bride', position: '0% 100%' },
  { id: 'rear', label: 'Arrière', position: '100% 100%' }
];

type MotorVisualExplorerProps = {
  mounting: MotorMounting;
  highlighted: MotorDimensionKey | null;
};

/**
 * Deux representations volontairement separees : la photo generique aide le
 * client a reconnaitre les faces du moteur, le dessin cote dit ou mesurer.
 * L'image ne sert jamais de preuve technique et ne remplace pas une cote.
 */
export const MotorVisualExplorer = ({ mounting, highlighted }: MotorVisualExplorerProps) => {
  const [mode, setMode] = useState<'measure' | 'realistic'>('measure');
  const [view, setView] = useState<MotorView>('perspective');
  const selectedView = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-2">
        <div className="flex rounded-lg bg-surface-2 p-0.5" role="group" aria-label="Type de vue moteur">
          <button
            type="button"
            aria-pressed={mode === 'measure'}
            onClick={() => { setMode('measure'); }}
            className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium',
              mode === 'measure' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
          >
            <Ruler aria-hidden="true" className="size-3" /> Guide de mesure
          </button>
          <button
            type="button"
            aria-pressed={mode === 'realistic'}
            onClick={() => { setMode('realistic'); }}
            className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium',
              mode === 'realistic' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
          >
            <Box aria-hidden="true" className="size-3" /> Vue réaliste
          </button>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{mounting}</span>
      </div>

      {mode === 'measure' ? (
        <div className="p-3">
          <MotorSchematic
            mounting={mounting}
            highlighted={highlighted}
            view={highlighted !== null && ['M', 'N', 'P', 'S', 'S_thread', 'T', 'Z'].includes(highlighted)
              ? 'face'
              : 'profile'}
          />
        </div>
      ) : (
        <div>
          <div
            role="img"
            aria-label={`Moteur électrique industriel, vue ${selectedView.label.toLowerCase()}`}
            className="aspect-[16/10] w-full bg-cover bg-no-repeat"
            style={{
              backgroundImage: "url('/assets/configurator/motor-b35-turnaround.png')",
              backgroundPosition: selectedView.position,
              backgroundSize: '200% 200%'
            }}
          />
          <div className="grid grid-cols-4 gap-1 border-t border-border-subtle p-2">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={view === item.id}
                onClick={() => { setView(item.id); }}
                className={cn('rounded-md px-1.5 py-1.5 text-[11px] transition-colors motion-reduce:transition-none',
                  view === item.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-surface-2')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="border-t border-border-subtle px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        {mode === 'realistic'
          ? 'Visualisation générique non contractuelle : elle sert à orienter le client, jamais à déduire une cote.'
          : highlighted === null
            ? 'Placez le curseur dans une cote : le point de mesure correspondant s’allume.'
            : 'Le schéma indique où poser le mètre. La valeur reste celle communiquée par le client.'}
      </p>
    </div>
  );
};
