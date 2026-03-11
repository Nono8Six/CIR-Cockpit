import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { AgencyMembershipSummary, UserRole } from '@/types';
import type { UiPocClientsFilters } from '@/services/clients/getUiPocClientsPage';

const ALL_AGENCIES = '__all_agencies__';

type UiPocClientsFiltersProps = {
  filters: UiPocClientsFilters;
  userRole: UserRole;
  hasMultipleAgencies: boolean;
  agencies: AgencyMembershipSummary[];
  onFiltersChange: (next: UiPocClientsFilters) => void;
  onResetFilters: () => void;
};

const UiPocClientsFilters = ({
  filters,
  userRole,
  hasMultipleAgencies,
  agencies,
  onFiltersChange,
  onResetFilters
}: UiPocClientsFiltersProps) => {
  const showAgencyFilter = userRole === 'super_admin' || hasMultipleAgencies;

  return (
    <section className="rounded-lg border border-border/70 bg-card p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
            placeholder="Recherche nom / numéro client..."
            className="pl-9"
            aria-label="Recherche clients POC"
          />
        </div>

        <Input
          value={filters.department}
          onChange={(event) =>
            onFiltersChange({ ...filters, department: event.target.value })
          }
          placeholder="Département"
          aria-label="Filtre département"
        />

        <Input
          value={filters.city}
          onChange={(event) =>
            onFiltersChange({ ...filters, city: event.target.value })
          }
          placeholder="Ville"
          aria-label="Filtre ville"
        />

        <Input
          value={filters.commercial}
          onChange={(event) =>
            onFiltersChange({ ...filters, commercial: event.target.value })
          }
          placeholder="Commercial (created_by)"
          aria-label="Filtre commercial"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {showAgencyFilter ? (
          <Select
            value={filters.agencyId ?? ALL_AGENCIES}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                agencyId: value === ALL_AGENCIES ? null : value
              })
            }
          >
            <SelectTrigger className="w-full md:w-[260px]" density="comfortable">
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_AGENCIES}>Toutes les agences</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.agency_id} value={agency.agency_id}>
                  {agency.agency_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
          Réinitialiser filtres
        </Button>
      </div>
    </section>
  );
};

export default UiPocClientsFilters;
