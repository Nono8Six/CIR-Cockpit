import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/feedback/Tooltip';
import type { ConfiguratorEvidence } from '../../../../../shared/schemas/configurator/common.schema';
import { CriteriaTable, type MotorCriterion } from '../CriteriaTable';
import { ConfiguratorEmptyState } from '../ConfiguratorEmptyState';
import { ConfiguratorErrorState } from '../ConfiguratorErrorState';
import { ConfiguratorPendingState } from '../ConfiguratorPendingState';
import { DataGradeChip } from '../DataGradeChip';
import { EvidenceDialog } from '../EvidenceDialog';
import { EvidenceList } from '../EvidenceList';
import { FactValue } from '../FactValue';
import { IssuesPanel, type MotorValidationIssue } from '../IssuesPanel';
import { MissingFactsPanel } from '../MissingFactsPanel';
import { PartialResultNotice } from '../PartialResultNotice';
import { ProvenanceChip } from '../ProvenanceChip';
import { RequiredActionsPanel, type MotorRequiredAction } from '../RequiredActionsPanel';
import { SnapshotConflictNotice, SnapshotIdentity } from '../SnapshotIdentity';
import { VerdictBadge } from '../VerdictBadge';
import { VerdictLegend } from '../VerdictLegend';
import { VerdictSummary } from '../VerdictSummary';

const renderWithTooltips = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>);

const SOURCE_PAGE_EVIDENCE: ConfiguratorEvidence = {
  kind: 'source_page',
  label: 'Catalogue technique Innomotics D 81.1, page 297',
  source_document_id: '3f0a2f5e-6a1d-4b3a-9c2d-8e7f6a5b4c3d',
  filename: 'innomotics-d811-02-2026.pdf',
  sha256: 'a'.repeat(64),
  pdf_page: 297,
  catalog_page: '5/12',
  extraction_method: 'table_extraction'
};

const RULE_EVIDENCE: ConfiguratorEvidence = {
  kind: 'rule',
  label: 'Jeu calculé entre le trou de patte et le boulon',
  rule_code: 'FRAME_K_BOLT_CLEARANCE',
  inputs: [
    { key: 'K', value: 15, unit: 'mm' },
    { key: 'bolt_diameter', value: 14, unit: 'mm' }
  ]
};

describe('VerdictBadge', () => {
  it('affiche les quatre etats avec leur libelle', () => {
    render(
      <>
        <VerdictBadge status="satisfied" />
        <VerdictBadge status="under_reservation" />
        <VerdictBadge status="indeterminate" />
        <VerdictBadge status="not_satisfied" />
      </>
    );

    expect(screen.getByText('Compatible')).toBeInTheDocument();
    expect(screen.getByText('Sous réserve')).toBeInTheDocument();
    expect(screen.getByText('Indéterminé')).toBeInTheDocument();
    expect(screen.getByText('Adaptation nécessaire')).toBeInTheDocument();
  });

  it('garde le libelle accessible meme en mode icone seule', () => {
    const { container } = render(<VerdictBadge status="not_satisfied" iconOnly />);

    expect(screen.getByText('Adaptation nécessaire')).toHaveClass('sr-only');
    expect(container.querySelector('[data-verdict="not_satisfied"]')).not.toBeNull();
  });
});

describe('VerdictSummary', () => {
  it('reprend l explication du backend plutot que la phrase generique', () => {
    render(
      <VerdictSummary
        status="under_reservation"
        explanation="La cote E sort de la plage axiale prouvée de l’accouplement."
      />
    );

    expect(
      screen.getByText('La cote E sort de la plage axiale prouvée de l’accouplement.')
    ).toBeInTheDocument();
  });

  it('retombe sur la formulation verrouillee quand le backend n explique pas', () => {
    render(<VerdictSummary status="satisfied" />);

    expect(
      screen.getByText(/Validation finale au montage requise/)
    ).toBeInTheDocument();
  });
});

describe('FactValue', () => {
  it('nomme le motif d une valeur absente au lieu d afficher zero', () => {
    render(<FactValue value={null} absenceReason="not_published" />);

    expect(screen.getByText('Non publié')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('distingue une cote a mesurer d une cote non publiee', () => {
    render(<FactValue value={null} absenceReason="to_measure" />);

    expect(screen.getByText('À mesurer')).toBeInTheDocument();
  });

  it('formate les nombres en francais avec leur unite', () => {
    render(<FactValue value={1234.5} unit="mm" />);

    expect(screen.getByText(/1\s?234,5/)).toBeInTheDocument();
    expect(screen.getByText('mm')).toBeInTheDocument();
  });

  it('rend les booleens en francais', () => {
    render(<FactValue value={false} />);

    expect(screen.getByText('Non')).toBeInTheDocument();
  });
});

describe('ProvenanceChip et DataGradeChip', () => {
  it('signale qu une mesure terrain n est pas une valeur verifiee', () => {
    renderWithTooltips(
      <ProvenanceChip origin="user_measurement" confirmation="unconfirmed" />
    );

    expect(screen.getByText(/peut être fausse/)).toBeInTheDocument();
  });

  it('rappelle que le grade ne qualifie pas une saisie utilisateur', () => {
    renderWithTooltips(<DataGradeChip catalogDataGrade="B" />);

    expect(screen.getByText(/Extraction sourcée du catalogue constructeur/)).toBeInTheDocument();
  });
});

describe('EvidenceList', () => {
  it('affiche la provenance sans exposer de lien vers le PDF constructeur', () => {
    const { container } = render(<EvidenceList evidence={[SOURCE_PAGE_EVIDENCE]} />);

    expect(screen.getByText('innomotics-d811-02-2026.pdf')).toBeInTheDocument();
    expect(screen.getByText('297')).toBeInTheDocument();
    expect(container.querySelector('a')).toBeNull();
  });

  it('tronque l empreinte sans la masquer completement', () => {
    render(<EvidenceList evidence={[SOURCE_PAGE_EVIDENCE]} />);

    expect(screen.getByText(`${'a'.repeat(16)}…`)).toBeInTheDocument();
  });

  it('detaille les entrees d une preuve de calcul', () => {
    render(<EvidenceList evidence={[RULE_EVIDENCE]} />);

    expect(screen.getByText('FRAME_K_BOLT_CLEARANCE')).toBeInTheDocument();
    expect(screen.getByText('K = 15 mm')).toBeInTheDocument();
  });

  it('annonce explicitement l absence de preuve', () => {
    render(<EvidenceList evidence={[]} />);

    expect(screen.getByText('Aucune preuve rattachée.')).toBeInTheDocument();
  });
});

describe('EvidenceDialog', () => {
  it('ouvre un dialog centre et le referme avec Escape', async () => {
    const user = userEvent.setup();
    render(<EvidenceDialog title="Cote K" evidence={[SOURCE_PAGE_EVIDENCE]} />);

    const trigger = screen.getByRole('button', { name: /1 preuve/ });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Cote K')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('ne propose aucun declencheur quand il n existe aucune preuve', () => {
    render(<EvidenceDialog title="Cote K" evidence={[]} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('MissingFactsPanel', () => {
  it('regroupe les manques et donne l action a mener', () => {
    render(
      <MissingFactsPanel missingFacts={['mechanical.shaft.D', 'mechanical.flange.M']} />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('faits manquants')).toBeInTheDocument();
    expect(screen.getByText('Cote D — diamètre du bout d’arbre')).toBeInTheDocument();
    expect(screen.getByText(/Mesurez la cote sur la bride/)).toBeInTheDocument();
  });

  it('disparait quand plus rien ne manque', () => {
    const { container } = render(<MissingFactsPanel missingFacts={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('IssuesPanel', () => {
  const issues: MotorValidationIssue[] = [
    {
      code: 'EFFICIENCY_CURVE',
      severity: 'info',
      message: 'La courbe de rendement est incomplète.',
      restriction: null,
      evidence: []
    },
    {
      code: 'IE_BELOW_THRESHOLD',
      severity: 'error',
      message: 'Le rendement publié est inférieur au seuil de la classe annoncée.',
      restriction: 'L’argumentaire de classe de rendement ne peut pas être utilisé.',
      evidence: [SOURCE_PAGE_EVIDENCE]
    }
  ];

  it('rappelle qu une anomalie n exclut pas le candidat', () => {
    render(<IssuesPanel issues={issues} />);

    expect(screen.getByText(/n’exclut pas ce moteur/)).toBeInTheDocument();
  });

  it('remonte les erreurs avant les informations et affiche la restriction', () => {
    render(<IssuesPanel issues={issues} />);

    const codes = screen.getAllByText(/IE_BELOW_THRESHOLD|EFFICIENCY_CURVE/);
    expect(codes[0]).toHaveTextContent('IE_BELOW_THRESHOLD');
    expect(
      screen.getByText(/L’argumentaire de classe de rendement ne peut pas être utilisé/)
    ).toBeInTheDocument();
  });
});

describe('RequiredActionsPanel', () => {
  const actions: MotorRequiredAction[] = [
    {
      code: 'FRAME_H_SHIM',
      label: 'Caler la hauteur d’axe',
      explanation: 'La hauteur d’axe du candidat est inférieure de 5 mm.',
      evidence: [RULE_EVIDENCE]
    }
  ];

  it('separe les adaptations des controles', () => {
    const { rerender } = render(<RequiredActionsPanel kind="adaptation" actions={actions} />);
    expect(screen.getByText('Adaptations nécessaires')).toBeInTheDocument();

    rerender(<RequiredActionsPanel kind="check" actions={actions} />);
    expect(screen.getByText('Contrôles à effectuer')).toBeInTheDocument();
  });

  it('ne s affiche pas sans action', () => {
    const { container } = render(<RequiredActionsPanel kind="check" actions={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('CriteriaTable', () => {
  const criteria: MotorCriterion[] = [
    {
      code: 'SHAFT_D',
      label: 'Diamètre du bout d’arbre',
      status: 'satisfied',
      blocking: true,
      expected: 28,
      observed: 28,
      unit: 'mm',
      explanation: 'Le diamètre publié correspond exactement au diamètre attendu.',
      evidence: [SOURCE_PAGE_EVIDENCE],
      affected_by_issue_codes: []
    },
    {
      code: 'FRAME_H',
      label: 'Hauteur d’axe',
      status: 'not_satisfied',
      blocking: true,
      expected: 132,
      observed: 160,
      unit: 'mm',
      delta: 28,
      explanation: 'La hauteur d’axe du candidat dépasse celle du moteur en place.',
      evidence: [],
      affected_by_issue_codes: ['INERTIA_IMPLAUSIBLE']
    }
  ];

  it('place le critere le plus contraignant en tete', () => {
    render(<CriteriaTable criteria={criteria} caption="Critères mécaniques" />);

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveAttribute('data-verdict', 'not_satisfied');
    expect(rows[1]).toHaveAttribute('data-verdict', 'satisfied');
  });

  it('affiche l ecart signe et les anomalies qui affectent un critere', () => {
    render(<CriteriaTable criteria={criteria} caption="Critères mécaniques" />);

    expect(screen.getByText('+28 mm')).toBeInTheDocument();
    expect(screen.getByText('INERTIA_IMPLAUSIBLE')).toBeInTheDocument();
  });

  it('annonce l absence d evaluation plutot qu un tableau vide', () => {
    render(<CriteriaTable criteria={[]} caption="Critères mécaniques" />);

    expect(screen.getByText('Aucun critère n’a été évalué.')).toBeInTheDocument();
  });
});

describe('etats de la brique', () => {
  it('montre le temps reellement ecoule, sans progression fictive', () => {
    render(
      <ConfiguratorPendingState
        label="Recherche des équivalents dans le catalogue technique"
        longWaitThresholdSeconds={3}
        longWaitHint="Cette recherche compare le moteur à l’ensemble du catalogue."
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('00:00');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('propose une sortie sur un etat vide', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ConfiguratorEmptyState
        title="Aucun moteur ne correspond"
        description="Aucun moteur du catalogue actif ne satisfait ces critères."
        action={{ label: 'Élargir la recherche', onClick }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Élargir la recherche' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('affiche le message public de l erreur et son code, sans trace technique', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ConfiguratorErrorState
        error={{
          _tag: 'AppError',
          code: 'CONFIGURATOR_DB_TIMEOUT',
          message: 'La lecture du catalogue a dépassé le délai autorisé.',
          source: 'edge'
        }}
        fallbackMessage="Lecture impossible."
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La lecture du catalogue a dépassé le délai autorisé.'
    );
    expect(screen.getByText('CONFIGURATOR_DB_TIMEOUT')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Réessayer/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('enonce ce qui est etabli et ce qui ne l est pas sur un resultat partiel', () => {
    render(
      <PartialResultNotice
        established="Les critères électriques sont tous évalués."
        limitation="Les dégagements de bâti ne sont pas mesurés."
      />
    );

    expect(screen.getByText('Établi')).toBeInTheDocument();
    expect(screen.getByText('Hors de portée')).toBeInTheDocument();
  });
});

describe('identite et conflit de catalogue', () => {
  const snapshot = {
    id: '6fbf4046-be74-4422-9fe8-2d2d8a8d9157',
    label: 'Catalogue technique moteur 2026-07',
    activated_at: '2026-07-28T12:05:56.000Z'
  };

  it('affiche le catalogue sur lequel tout resultat est fonde', () => {
    render(<SnapshotIdentity snapshot={snapshot} />);

    expect(screen.getByText('Catalogue technique moteur 2026-07')).toBeInTheDocument();
    expect(screen.getByText('6fbf4046')).toBeInTheDocument();
  });

  it('reste silencieux quand le catalogue n a pas change', () => {
    const { container } = render(
      <SnapshotConflictNotice
        expectedSnapshotId={snapshot.id}
        currentSnapshotId={snapshot.id}
        onReload={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('alerte et propose un rechargement quand un nouveau catalogue est actif', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    render(
      <SnapshotConflictNotice
        expectedSnapshotId={snapshot.id}
        currentSnapshotId="11111111-2222-3333-4444-555555555555"
        onReload={onReload}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Catalogue technique modifié');
    await user.click(screen.getByRole('button', { name: /Recharger sur le catalogue actif/ }));
    expect(onReload).toHaveBeenCalledOnce();
  });
});

describe('VerdictLegend', () => {
  it('enonce le contrat de lecture et les quatre etats', () => {
    render(<VerdictLegend />);

    expect(screen.getByText(/compatibilité\s+documentaire/)).toBeInTheDocument();
    expect(screen.getByText('Compatible')).toBeInTheDocument();
    expect(screen.getByText('Sous réserve')).toBeInTheDocument();
    expect(screen.getByText('Indéterminé')).toBeInTheDocument();
    expect(screen.getByText('Adaptation nécessaire')).toBeInTheDocument();
  });
});
