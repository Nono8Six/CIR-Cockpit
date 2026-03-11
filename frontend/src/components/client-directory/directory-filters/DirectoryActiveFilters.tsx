import { useMemo } from 'react';
import { X } from 'lucide-react';
import type {
  DirectoryCommercialOption,
  DirectoryListInput
} from 'shared/schemas/directory.schema';

import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DirectoryActiveFiltersProps {
  search: DirectoryListInput;
  agencies: Array<{ id: string; name: string }>;
  commercials: DirectoryCommercialOption[];
  onRemove: (patch: Partial<DirectoryListInput>) => void;
}

const DirectoryActiveFilters = ({
  search,
  agencies,
  commercials,
  onRemove
}: DirectoryActiveFiltersProps) => {
  const agencyById = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency.name])),
    [agencies]
  );
  const commercialById = useMemo(
    () => new Map(commercials.map((commercial) => [commercial.id, commercial.display_name])),
    [commercials]
  );

  const filters = [
    search.q ? {
      id: 'q',
      label: `Recherche : ${search.q}`,
      patch: { q: undefined, page: 1 } satisfies Partial<DirectoryListInput>
    } : null,
    search.type !== 'all' ? {
      id: 'type',
      label: `Type : ${search.type === 'client' ? 'Clients' : 'Prospects'}`,
      patch: {
        type: 'all',
        cirCommercialIds: [],
        page: 1
      } satisfies Partial<DirectoryListInput>
    } : null,
    search.city ? {
      id: 'city',
      label: `Ville : ${search.city}`,
      patch: { city: undefined, page: 1 } satisfies Partial<DirectoryListInput>
    } : null,
    search.includeArchived ? {
      id: 'archived',
      label: 'Archives incluses',
      patch: { includeArchived: false, page: 1 } satisfies Partial<DirectoryListInput>
    } : null
  ].filter((value): value is NonNullable<typeof value> => value !== null);

  const departmentFilters = search.departments.map((department) => ({
    id: `department-${department}`,
    label: `Département : ${department}`,
    patch: {
      departments: search.departments.filter((value) => value !== department),
      page: 1
    } satisfies Partial<DirectoryListInput>
  }));

  const agencyFilters = search.agencyIds.map((agencyId) => ({
    id: `agency-${agencyId}`,
    label: `Agence : ${agencyById.get(agencyId) ?? 'Agence'}`,
    patch: {
      agencyIds: search.agencyIds.filter((value) => value !== agencyId),
      page: 1
    } satisfies Partial<DirectoryListInput>
  }));

  const commercialFilters = search.cirCommercialIds.map((commercialId) => ({
    id: `commercial-${commercialId}`,
    label: `Commercial : ${commercialById.get(commercialId) ?? 'Commercial'}`,
    patch: {
      cirCommercialIds: search.cirCommercialIds.filter((value) => value !== commercialId),
      page: 1
    } satisfies Partial<DirectoryListInput>
  }));

  const allFilters = [...filters, ...departmentFilters, ...agencyFilters, ...commercialFilters];

  if (allFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allFilters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          className={cn(
            badgeVariants({ variant: 'secondary', density: 'dense' }),
            'gap-1.5 rounded-full border border-border/70 pr-1.5 text-[11px] transition-colors hover:bg-accent'
          )}
          onClick={() => onRemove(filter.patch)}
        >
          <span>{filter.label}</span>
          <X className="size-3.5" />
        </button>
      ))}
    </div>
  );
};

export default DirectoryActiveFilters;
