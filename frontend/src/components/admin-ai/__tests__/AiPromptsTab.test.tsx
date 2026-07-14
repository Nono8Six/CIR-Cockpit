import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiPromptsTab } from '@/components/admin-ai/AiPromptsTab';
import * as ai from '@/services/ai';

vi.mock('@/services/ai');

const templateId = '11111111-1111-4111-8111-111111111111';
const archivedTemplateId = '33333333-3333-4333-8333-333333333333';
const versionId = '22222222-2222-4222-8222-222222222222';

const renderTab = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <AiPromptsTab />
  </QueryClientProvider>,
);

describe('AiPromptsTab', () => {
  beforeEach(() => {
    const version = {
      id: versionId,
      template_id: templateId,
      version: 1,
      status: 'draft' as const,
      body: 'Prompt initial',
      change_note: null,
      created_by: null,
      published_by: null,
      published_at: null,
      created_at: '2026-07-11T10:00:00Z',
    };
    vi.mocked(ai.listAiPrompts).mockResolvedValue({
      ok: true,
      prompts: [
        {
          id: templateId,
          feature: 'assistant.referentiels',
          label: 'Assistant',
          description: null,
          allowed_variables: [],
          archived_at: null,
          archived_by: null,
          created_at: '2026-07-11T10:00:00Z',
          updated_at: '2026-07-11T10:00:00Z',
          versions: [version],
          draft_version: version,
          published_version: null,
          usage: {
            calls: 12,
            successful_calls: 11,
            failed_calls: 1,
            calls_last_30_days: 4,
            total_tokens: 2500,
            cost_amount: 0.12,
            currency: 'USD',
            last_used_at: '2026-07-14T08:00:00Z',
          },
        },
        {
          id: archivedTemplateId,
          feature: 'pricing.references.diagnose',
          label: 'Diagnostic global',
          description: null,
          allowed_variables: [],
          archived_at: '2026-07-14T09:00:00Z',
          archived_by: null,
          created_at: '2026-07-11T10:00:00Z',
          updated_at: '2026-07-14T09:00:00Z',
          versions: [],
          draft_version: null,
          published_version: null,
          usage: {
            calls: 0,
            successful_calls: 0,
            failed_calls: 0,
            calls_last_30_days: 0,
            total_tokens: 0,
            cost_amount: 0,
            currency: 'USD',
            last_used_at: null,
          },
        },
      ],
    });
    vi.mocked(ai.saveAiPromptDraft).mockResolvedValue({ ok: true, version });
    vi.mocked(ai.deleteAiPromptTemplate).mockResolvedValue({ ok: true, deleted_id: archivedTemplateId });
  });

  it('affiche la consommation et enregistre le brouillon', async () => {
    const user = userEvent.setup();
    renderTab();

    expect((await screen.findAllByText('12')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Chat des référentiels tarifaires/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Assistant.*Chat des référentiels tarifaires/ }));
    const editor = await screen.findByRole('textbox', { name: /Corps du prompt système/ });
    await user.clear(editor);
    await user.type(editor, 'Prompt révisé');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));

    expect(ai.saveAiPromptDraft).toHaveBeenCalledWith(
      { template_id: templateId, body: 'Prompt révisé', change_note: null },
      expect.anything(),
    );
  });

  it('supprime définitivement un template archivé sans usage après confirmation', async () => {
    const user = userEvent.setup();
    renderTab();

    await screen.findByText('Assistant');
    await user.click(screen.getByRole('button', { name: 'Archivés' }));
    await user.click(screen.getByRole('button', { name: 'Actions pour Diagnostic global' }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer définitivement' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));

    expect(ai.deleteAiPromptTemplate).toHaveBeenCalledWith(
      { template_id: archivedTemplateId },
      expect.anything(),
    );
  });
});
