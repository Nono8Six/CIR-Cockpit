import { Inbox, Loader2, TriangleAlert, MoreVertical, Pencil, Archive, ArchiveRestore, Trash2, Building2 } from 'lucide-react';

import { Agency } from '@/types';
import { Button } from '../ui/inputs/basic/Button';
import AgencyCard from './AgencyCard';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../ui/data-display/Table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '../ui/navigation/DropdownMenu';
import { Badge } from '../ui/data-display/Badge';

type AgenciesManagerListProps = {
  agencies: Agency[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRename: (agency: Agency) => void;
  onToggleArchive: (agency: Agency) => void;
  onDelete: (agency: Agency) => void;
};

const AgenciesManagerList = ({
  agencies,
  isLoading,
  isError,
  onRetry,
  onRename,
  onToggleArchive,
  onDelete
}: AgenciesManagerListProps) => {
  return (
    <div className="space-y-4" data-testid="admin-agencies-list">
      {isLoading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-muted/20">
          <span className="inline-flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span>Chargement des agences en cours...</span>
          </span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
          <p className="inline-flex flex-col items-center gap-2 font-medium">
            <TriangleAlert size={24} className="text-destructive" />
            <span>La liste des agences est temporairement indisponible.</span>
          </p>
          <div className="mt-4">
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Réessayer le chargement
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !isError && agencies.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-muted/10">
          <span className="inline-flex flex-col items-center gap-2">
            <Inbox size={24} className="text-muted-foreground/60" />
            <span>Aucune agence trouvée.</span>
          </span>
        </div>
      )}

      {!isLoading && !isError && agencies.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-border/50 bg-card overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <Table>
              <TableHeader className="bg-muted/5 border-b border-border/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50%] py-3 pl-6 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Agence</TableHead>
                  <TableHead className="w-[30%] py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Date de création</TableHead>
                  <TableHead className="w-[15%] py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Statut</TableHead>
                  <TableHead className="w-[5%] py-3 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency) => {
                  const createdDate = agency.created_at
                    ? new Date(agency.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Date inconnue';

                  return (
                    <TableRow
                      key={agency.id}
                      className="group relative transition-all duration-200 hover:bg-muted/15"
                      data-testid={`admin-agency-row-${agency.id}`}
                    >
                      <TableCell className="py-3.5 pl-6 relative">
                        <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full bg-primary opacity-0 group-hover:opacity-100 transition-all duration-200" />
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/5 text-primary shadow-xs group-hover:bg-primary/10 transition-colors duration-200">
                            <Building2 size={16} />
                          </div>
                          <span className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                            {agency.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-muted-foreground">
                        {createdDate}
                      </TableCell>
                      <TableCell className="py-3.5">
                        {agency.archived_at ? (
                          <Badge variant="warning" className="inline-flex items-center gap-1.5 text-[10px] bg-warning/10 text-warning border-warning/20 hover:bg-warning hover:text-warning-foreground transition-all duration-200 uppercase font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                            Archivée
                          </Badge>
                        ) : (
                          <Badge variant="success" className="inline-flex items-center gap-1.5 text-[10px] bg-success/10 text-success border-success/20 hover:bg-success hover:text-success-foreground transition-all duration-200 uppercase font-semibold">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                            </span>
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-muted rounded-full"
                              aria-label="Actions"
                            >
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Options d&apos;agence</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => onRename(agency)}
                              data-testid={`admin-agency-rename-${agency.id}`}
                            >
                              <Pencil size={14} className="mr-2 text-muted-foreground" />
                              <span>Renommer</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onToggleArchive(agency)}
                              data-testid={`admin-agency-archive-toggle-${agency.id}`}
                            >
                              {agency.archived_at ? (
                                <>
                                  <ArchiveRestore size={14} className="mr-2 text-muted-foreground" />
                                  <span>Restaurer l&apos;agence</span>
                                </>
                              ) : (
                                <>
                                  <Archive size={14} className="mr-2 text-muted-foreground" />
                                  <span>Archiver l&apos;agence</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(agency)}
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              data-testid={`admin-agency-delete-${agency.id}`}
                            >
                              <Trash2 size={14} className="mr-2" />
                              <span>Supprimer l&apos;agence</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Grid View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {agencies.map((agency) => (
              <AgencyCard
                key={agency.id}
                agency={agency}
                onRename={onRename}
                onToggleArchive={onToggleArchive}
                onDelete={onDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AgenciesManagerList;
