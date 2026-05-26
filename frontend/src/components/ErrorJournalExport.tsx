import { useCallback, useState } from 'react';
import { Download, Trash2, Activity, FileText, ShieldAlert } from 'lucide-react';

import { Button } from './ui/inputs/basic/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/data-display/Card';
import { exportErrorJournal, clearErrorJournal } from '@/services/errors/journal';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { handleUiError } from '@/services/errors/handleUiError';
import { Badge } from './ui/data-display/Badge';

const ErrorJournalExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const payload = await exportErrorJournal();
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `error-journal-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      notifySuccess('Journal exporté');
    } catch (err) {
      handleUiError(err, "Impossible d'exporter le journal.", { source: 'ErrorJournalExport.export' });
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleClear = useCallback(async () => {
    setIsClearing(true);
    try {
      await clearErrorJournal();
      notifySuccess('Journal effacé');
    } catch (err) {
      handleUiError(err, "Impossible d'effacer le journal.", { source: 'ErrorJournalExport.clear' });
    } finally {
      setIsClearing(false);
    }
  }, []);

  return (
    <div className="space-y-6" data-testid="admin-diagnostic-panel">
      {/* Overview / Banner */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-muted/50 via-muted/30 to-background p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shadow-xs shrink-0">
            <Activity size={24} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Centre de diagnostic</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
              Consultez l&apos;état de l&apos;application client et gérez les rapports d&apos;erreurs locaux. Ces informations facilitent la résolution des incidents techniques.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">État :</span>
          <Badge variant="success" className="text-[10px] uppercase font-semibold bg-success/10 text-success border-success/20">
            Opérationnel
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Card */}
        <Card className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shadow-xs">
                <FileText size={16} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Exporter le journal</CardTitle>
                <CardDescription className="text-xs">Sauvegarder les logs au format JSON</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Le journal contient un historique détaillé des erreurs UI/API levées par l&apos;application dans votre navigateur actuel. 
              Cet export local ne contient aucune donnée sensible d&apos;identification.
            </p>
          </CardContent>
          <div className="p-4 bg-muted/5 border-t border-border/50 flex gap-2">
            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full h-9 text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              <Download size={14} />
              {isExporting ? 'Export en cours…' : 'Télécharger le journal'}
            </Button>
          </div>
        </Card>

        {/* Clear Card */}
        <Card className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive shadow-xs">
                <ShieldAlert size={16} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Effacer le journal</CardTitle>
            <CardDescription className="text-xs">Réinitialiser l&apos;historique local</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Videz définitivement l&apos;historique des erreurs stocké dans la mémoire de stockage local (localStorage) de votre navigateur. 
              Cette opération est irréversible.
            </p>
          </CardContent>
          <div className="p-4 bg-muted/5 border-t border-border/50 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isClearing}
              className="w-full h-9 text-xs font-semibold border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/30 rounded-lg flex items-center justify-center gap-2"
            >
              <Trash2 size={14} />
              {isClearing ? 'Suppression…' : 'Vider le journal'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ErrorJournalExport;
