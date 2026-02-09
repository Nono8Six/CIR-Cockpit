import type { Entity } from '@/types';
import { Button } from '@/components/ui/button';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';

type AppSearchProspectsSectionProps = {
  prospects: Entity[];
  onRequestConvert: (entity: ConvertClientEntity) => void;
};

const AppSearchProspectsSection = ({
  prospects,
  onRequestConvert
}: AppSearchProspectsSectionProps) => {
  if (prospects.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Prospects
      </div>
      {prospects.map((entity) => (
        <div
          key={entity.id}
          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-900 text-sm">{entity.name}</span>
            <span className="text-xs text-slate-500">
              {entity.city || 'Sans ville'}
            </span>
          </div>
          <Button
            type="button"
            className="h-7 px-2 text-xs"
            onClick={() => onRequestConvert({
              id: entity.id,
              name: entity.name,
              client_number: entity.client_number ?? null,
              account_type: entity.account_type ?? null
            })}
          >
            Convertir
          </Button>
        </div>
      ))}
    </div>
  );
};

export default AppSearchProspectsSection;
