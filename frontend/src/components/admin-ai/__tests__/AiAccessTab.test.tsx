import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAccessTab } from '@/components/admin-ai/AiAccessTab';
import * as ai from '@/services/ai';

vi.mock('@/services/ai');
const uuid = '11111111-1111-4111-8111-111111111111'; const agency = '22222222-2222-4222-8222-222222222222';
const renderTab = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AiAccessTab /></QueryClientProvider>);

describe('AiAccessTab', () => {
  beforeEach(() => {
    vi.mocked(ai.getAiMembersAccessOverview).mockResolvedValue({ ok: true, members: [{ user_id: uuid, display_name: 'Alice Martin', email: 'alice@cir.fr', role: 'tcs', agency_id: agency, agency_name: 'CIR Bordeaux', allowed: true, origin: 'global' }] });
    vi.mocked(ai.listAiAccess).mockResolvedValue({ ok: true, grants: [{ id: uuid, feature: 'assistant.referentiels', scope: 'global', target: null, allowed: true, created_by_name: null, updated_by_name: null, created_at: '2026-07-11T10:00:00Z', updated_at: '2026-07-11T10:00:00Z' }] });
    vi.mocked(ai.getAiUsageByMember).mockResolvedValue({ ok: true, period_start: '2026-06-11', period_end: '2026-07-11', members: [{ user_id: uuid, display_name: 'Alice Martin', email: 'alice@cir.fr', feature: 'assistant.referentiels', calls: 3, input_tokens: 10, output_tokens: 5, total_tokens: 15, cost_amount: 0.01, currency: 'USD' }] });
    vi.mocked(ai.saveAiAccess).mockResolvedValue({ ok: true, grant: null });
  });
  it('affiche les noms résolus et sauvegarde un override membre', async () => {
    const user = userEvent.setup(); renderTab();
    expect(await screen.findByText('Alice Martin')).toBeInTheDocument(); expect(screen.getAllByText('CIR Bordeaux')).toHaveLength(2); expect(screen.queryByText(uuid)).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Accès de Alice Martin' }));
    expect(ai.saveAiAccess).toHaveBeenCalledWith({ feature: 'assistant.referentiels', scope: 'user', user_id: uuid, allowed: false }, expect.anything());
  });
});
