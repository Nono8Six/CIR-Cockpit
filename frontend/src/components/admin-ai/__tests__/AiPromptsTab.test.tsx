import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiPromptsTab } from '@/components/admin-ai/AiPromptsTab';
import * as ai from '@/services/ai';

vi.mock('@/services/ai');
const templateId = '11111111-1111-4111-8111-111111111111'; const versionId = '22222222-2222-4222-8222-222222222222';
describe('AiPromptsTab', () => {
  beforeEach(() => {
    const version = { id: versionId, template_id: templateId, version: 1, status: 'draft' as const, body: 'Prompt initial', change_note: null, created_by: null, published_by: null, published_at: null, created_at: '2026-07-11T10:00:00Z' };
    vi.mocked(ai.listAiPrompts).mockResolvedValue({ ok: true, prompts: [{ id: templateId, feature: 'assistant.referentiels', label: 'Assistant', description: null, allowed_variables: [], created_at: '2026-07-11T10:00:00Z', updated_at: '2026-07-11T10:00:00Z', versions: [version], draft_version: version, published_version: null }] });
    vi.mocked(ai.saveAiPromptDraft).mockResolvedValue({ ok: true, version });
  });
  it('édite et enregistre le brouillon via le service existant', async () => {
    const user = userEvent.setup(); render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AiPromptsTab /></QueryClientProvider>);
    const editor = await screen.findByRole('textbox', { name: 'Corps du brouillon' }); await user.clear(editor); await user.type(editor, 'Prompt révisé'); await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(ai.saveAiPromptDraft).toHaveBeenCalledWith({ template_id: templateId, body: 'Prompt révisé', change_note: null });
  });
});
