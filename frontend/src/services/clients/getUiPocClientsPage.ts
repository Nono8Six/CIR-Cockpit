import type { Client } from '@/types';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export type UiPocClientsSortBy =
  | 'client_number'
  | 'name'
  | 'city'
  | 'department'
  | 'commercial'
  | 'account_type';

export type UiPocClientsSortDirection = 'asc' | 'desc';

export type UiPocClientsFilters = {
  search: string;
  city: string;
  department: string;
  commercial: string;
  agencyId: string | null;
};

export type GetUiPocClientsPageOptions = {
  page: number;
  pageSize: number;
  sortBy: UiPocClientsSortBy;
  sortDirection: UiPocClientsSortDirection;
  filters: UiPocClientsFilters;
};

export type UiPocClientsPage = {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const SORT_COLUMN_BY_KEY: Record<UiPocClientsSortBy, keyof Client> = {
  client_number: 'client_number',
  name: 'name',
  city: 'city',
  department: 'department',
  commercial: 'created_by',
  account_type: 'account_type'
};

const normalizeValue = (value: string): string => value.trim();

const sanitizePage = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.trunc(value));
};

const sanitizePageSize = (value: number): number => {
  if (!Number.isFinite(value)) return 25;
  return Math.min(100, Math.max(1, Math.trunc(value)));
};

const escapeForOrFilter = (value: string): string => value.replace(/[%_,]/g, '');

export const getUiPocClientsPage = async ({
  page,
  pageSize,
  sortBy,
  sortDirection,
  filters
}: GetUiPocClientsPageOptions): Promise<UiPocClientsPage> => {
  const supabase = requireSupabaseClient();

  const safePage = sanitizePage(page);
  const safePageSize = sanitizePageSize(pageSize);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from('entities')
    .select('*', { count: 'exact' })
    .eq('entity_type', 'Client')
    .is('archived_at', null);

  const search = normalizeValue(filters.search);
  const city = normalizeValue(filters.city);
  const department = normalizeValue(filters.department);
  const commercial = normalizeValue(filters.commercial);

  if (filters.agencyId) {
    query = query.eq('agency_id', filters.agencyId);
  }
  if (search) {
    const escaped = escapeForOrFilter(search);
    query = query.or(`name.ilike.%${escaped}%,client_number.ilike.%${escaped}%`);
  }
  if (city) {
    query = query.ilike('city', `%${city}%`);
  }
  if (department) {
    query = query.ilike('department', `%${department}%`);
  }
  if (commercial) {
    query = query.ilike('created_by', `%${commercial}%`);
  }

  query = query
    .order(SORT_COLUMN_BY_KEY[sortBy], { ascending: sortDirection === 'asc', nullsFirst: false })
    .range(from, to);

  const { data, count, error, status } = await query;

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'read',
      resource: 'les clients (POC)',
      status
    });
  }

  const total = count ?? 0;

  return {
    clients: data ?? [],
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize))
  };
};
