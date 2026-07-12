import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminAiPanel from '@/components/admin-ai/AdminAiPanel';

vi.mock('@/components/admin-ai/AiOverviewTab', () => ({ AiOverviewTab: () => <div>Vue synthèse</div> }));
vi.mock('@/components/admin-ai/AiModelsTab', () => ({ AiModelsTab: () => <div>Gestion modèles</div> }));
vi.mock('@/components/admin-ai/AiAccessTab', () => ({ AiAccessTab: () => <div>Gestion accès</div> }));
vi.mock('@/components/admin-ai/AiQuotasTab', () => ({ AiQuotasTab: () => <div>Gestion quotas</div> }));
vi.mock('@/components/admin-ai/AiPromptsTab', () => ({ AiPromptsTab: () => <div>Gestion prompts</div> }));
vi.mock('@/components/admin-ai/AiUsageTab', () => ({ AiUsageTab: () => <div>Journal usage</div> }));

describe('AdminAiPanel', () => {
  it('expose les six onglets de gouvernance découpés', async () => {
    const user = userEvent.setup(); render(<AdminAiPanel />);
    for (const label of ['Vue d’ensemble', 'Fournisseur & modèles', 'Accès membres', 'Quotas', 'Prompts', 'Usage & audit']) expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Prompts' }));
    expect(screen.getByText('Gestion prompts')).toBeInTheDocument();
  });
});
