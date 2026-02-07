import { useCallback, useState } from 'react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { exportErrorJournal, clearErrorJournal } from '@/services/errors/journal';
import { notifySuccess } from '@/services/errors/notify';
import { handleUiError } from '@/services/errors/handleUiError';

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
      notifySuccess('Journal exporte');
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
      notifySuccess('Journal efface');
    } catch (err) {
      handleUiError(err, "Impossible d'effacer le journal.", { source: 'ErrorJournalExport.clear' });
    } finally {
      setIsClearing(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal d&apos;erreurs</CardTitle>
        <CardDescription>
          Exportez les erreurs pour un diagnostic local ou un support technique.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">
          Le journal est stocke localement dans le navigateur. Aucun envoi externe n&apos;est effectue.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button type="button" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Export en cours…' : 'Exporter le journal'}
        </Button>
        <Button type="button" variant="outline" onClick={handleClear} disabled={isClearing}>
          {isClearing ? 'Suppression…' : 'Effacer le journal'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ErrorJournalExport;
