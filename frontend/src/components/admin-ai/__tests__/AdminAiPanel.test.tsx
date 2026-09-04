import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminAiPanel from '@/components/admin-ai/AdminAiPanel';

vi.mock('@/components/admin-ai/AiSituationView', () => ({
  AiSituationView: ({ onNavigate }: { onNavigate: (v: string) => void }) => (
    <div>
      <span>Contenu Situation</span>
      <button onClick={() => onNavigate('capacites')}>Aller à capacités</button>
    </div>
  ),
}));
vi.mock('@/components/admin-ai/AiCapabilitiesView', () => ({
  AiCapabilitiesView: () => <div>Contenu Capacités</div>,
}));
vi.mock('@/components/admin-ai/AiPromptStudioView', () => ({
  AiPromptStudioView: () => <div>Contenu Prompt Studio</div>,
}));
vi.mock('@/components/admin-ai/AiRightsBudgetsView', () => ({
  AiRightsBudgetsView: () => <div>Contenu Droits et budgets</div>,
}));
vi.mock('@/components/admin-ai/AiJournalView', () => ({
  AiJournalView: () => <div>Contenu Journal</div>,
}));

describe('AdminAiPanel', () => {
  it('expose les cinq vues de la Gestion IA découpées', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<AdminAiPanel onViewChange={onViewChange} />);

    for (const label of ['Situation', 'Capacités', 'Prompt Studio', 'Droits et budgets', 'Journal']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }

    expect(screen.getByText('Contenu Situation')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Capacités' }));
    expect(screen.getByText('Contenu Capacités')).toBeInTheDocument();
    expect(onViewChange).toHaveBeenCalledWith('capacites');

    await user.click(screen.getByRole('tab', { name: 'Prompt Studio' }));
    expect(screen.getByText('Contenu Prompt Studio')).toBeInTheDocument();
    expect(onViewChange).toHaveBeenCalledWith('prompts');

    await user.click(screen.getByRole('tab', { name: 'Droits et budgets' }));
    expect(screen.getByText('Contenu Droits et budgets')).toBeInTheDocument();
    expect(onViewChange).toHaveBeenCalledWith('droits');

    await user.click(screen.getByRole('tab', { name: 'Journal' }));
    expect(screen.getByText('Contenu Journal')).toBeInTheDocument();
    expect(onViewChange).toHaveBeenCalledWith('journal');
  });

  it('navigue via le callback interne de la vue Situation', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<AdminAiPanel onViewChange={onViewChange} />);

    await user.click(screen.getByRole('button', { name: 'Aller à capacités' }));
    expect(screen.getByText('Contenu Capacités')).toBeInTheDocument();
    expect(onViewChange).toHaveBeenCalledWith('capacites');
  });

  it('monte directement sur la vue demandée via la prop view', () => {
    render(<AdminAiPanel view="prompts" />);
    expect(screen.getByText('Contenu Prompt Studio')).toBeInTheDocument();
  });

  it('synchronise la vue active lorsque la route change sans remontage', () => {
    const { rerender } = render(<AdminAiPanel view="situation" />);

    expect(screen.getByText('Contenu Situation')).toBeInTheDocument();

    rerender(<AdminAiPanel view="journal" />);

    expect(screen.getByText('Contenu Journal')).toBeInTheDocument();
  });
});
