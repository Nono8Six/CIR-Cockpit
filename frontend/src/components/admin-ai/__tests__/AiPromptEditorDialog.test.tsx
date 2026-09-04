import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AiPromptEditorDialog } from '@/components/admin-ai/AiPromptEditorDialog';
import type { AiPromptWithVersions } from '../../../../../shared/schemas/ai.schema';

const createMockTemplate = (overrides?: Partial<AiPromptWithVersions>): AiPromptWithVersions => ({
  id: '11111111-1111-4111-8111-111111111111',
  feature: 'pricing.references.diagnose',
  label: 'Veille des référentiels',
  description: null,
  allowed_variables: ['cir_facts', 'client_name'],
  archived_at: null,
  archived_by: null,
  created_at: '2026-07-11T10:00:00Z',
  updated_at: '2026-07-11T10:00:00Z',
  versions: [
    {
      id: 'pub-v1',
      template_id: '11111111-1111-4111-8111-111111111111',
      version: 1,
      status: 'archived',
      body: 'Prompt version 1 originale',
      change_note: 'Version 1 initiale',
      created_by: null,
      published_by: null,
      published_at: '2026-07-11T10:00:00Z',
      created_at: '2026-07-11T10:00:00Z',
    },
    {
      id: 'pub-v2',
      template_id: '11111111-1111-4111-8111-111111111111',
      version: 2,
      status: 'published',
      body: 'Prompt version 2 publié\nDeuxième ligne',
      change_note: 'Version 2 publiée',
      created_by: null,
      published_by: null,
      published_at: '2026-07-12T10:00:00Z',
      created_at: '2026-07-12T10:00:00Z',
    },
    {
      id: 'draft-v3',
      template_id: '11111111-1111-4111-8111-111111111111',
      version: 3,
      status: 'draft',
      body: 'Prompt version 2 publié\nDeuxième ligne modifiée\nTroisième ligne ajoutée',
      change_note: 'Préparation v3',
      created_by: null,
      published_by: null,
      published_at: null,
      created_at: '2026-07-13T10:00:00Z',
    },
  ],
  published_version: {
    id: 'pub-v2',
    template_id: '11111111-1111-4111-8111-111111111111',
    version: 2,
    status: 'published',
    body: 'Prompt version 2 publié\nDeuxième ligne',
    change_note: 'Version 2 publiée',
    created_by: null,
    published_by: null,
    published_at: '2026-07-12T10:00:00Z',
    created_at: '2026-07-12T10:00:00Z',
  },
  draft_version: {
    id: 'draft-v3',
    template_id: '11111111-1111-4111-8111-111111111111',
    version: 3,
    status: 'draft',
    body: 'Prompt version 2 publié\nDeuxième ligne modifiée\nTroisième ligne ajoutée',
    change_note: 'Préparation v3',
    created_by: null,
    published_by: null,
    published_at: null,
    created_at: '2026-07-13T10:00:00Z',
  },
  usage: {
    calls: 100,
    successful_calls: 95,
    failed_calls: 5,
    calls_last_30_days: 20,
    total_tokens: 50000,
    cost_amount: 1.5,
    currency: 'USD',
    last_used_at: '2026-07-15T10:00:00Z',
  },
  ...overrides,
});

describe('AiPromptEditorDialog', () => {
  it('affiche les onglets brouillon, version publiée, diff et la liste des variables autorisées', async () => {
    const template = createMockTemplate();
    render(
      <AiPromptEditorDialog
        template={template}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestoreVersion={vi.fn()}
        isSaving={false}
        isPublishing={false}
        isRestoring={false}
      />,
    );

    expect(screen.getByText('Veille des référentiels')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Brouillon' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Version 2 publiée/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Différences' })).toBeInTheDocument();

    // Variables dans la barre latérale
    expect(screen.getByText('Variables autorisées')).toBeInTheDocument();
    expect(screen.getByText('{{cir_facts}}')).toBeInTheDocument();
    expect(screen.getByText('{{client_name}}')).toBeInTheDocument();
  });

  it('alerte sur les variables non autorisées dans le corps', async () => {
    const template = createMockTemplate();
    render(
      <AiPromptEditorDialog
        template={template}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestoreVersion={vi.fn()}
        isSaving={false}
        isPublishing={false}
        isRestoring={false}
      />,
    );

    const textarea = screen.getByRole('textbox', { name: /Corps du prompt système/ });
    fireEvent.change(textarea, { target: { value: 'Contenu avec {{variable_inconnue}}' } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Variables non déclarées dans allowed_variables');
    expect(alert).toHaveTextContent('{{variable_inconnue}}');
  });

  it('bascule vers la vue de la version publiée et vers le diff', async () => {
    const user = userEvent.setup();
    const template = createMockTemplate();
    render(
      <AiPromptEditorDialog
        template={template}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestoreVersion={vi.fn()}
        isSaving={false}
        isPublishing={false}
        isRestoring={false}
      />,
    );

    // Clic sur l'onglet Version publiée
    await user.click(screen.getByRole('button', { name: /Version 2 publiée/ }));
    expect(screen.getByTestId('published-version-view')).toBeInTheDocument();
    expect(screen.getByText(/Publiée le/)).toBeInTheDocument();

    // Clic sur l'onglet Différences
    await user.click(screen.getByRole('button', { name: 'Différences' }));
    expect(screen.getByTestId('ai-prompt-diff-viewer')).toBeInTheDocument();
  });

  it('exige une confirmation par AlertDialog avant de publier', async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    const template = createMockTemplate();
    render(
      <AiPromptEditorDialog
        template={template}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        onPublish={onPublish}
        onRestoreVersion={vi.fn()}
        isSaving={false}
        isPublishing={false}
        isRestoring={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Publier le brouillon' }));

    // AlertDialog ouvert
    expect(screen.getByText(/Publier le brouillon \(Version 3\) \?/)).toBeInTheDocument();

    // Annulation
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onPublish).not.toHaveBeenCalled();

    // Réouverture et confirmation
    await user.click(screen.getByRole('button', { name: 'Publier le brouillon' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer la publication' }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('exige une confirmation par AlertDialog avant de restaurer une ancienne version', async () => {
    const user = userEvent.setup();
    const onRestoreVersion = vi.fn();
    const template = createMockTemplate();
    render(
      <AiPromptEditorDialog
        template={template}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestoreVersion={onRestoreVersion}
        isSaving={false}
        isPublishing={false}
        isRestoring={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Restaurer en brouillon' }));

    expect(screen.getByText(/Restaurer la version 1 en brouillon \?/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onRestoreVersion).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Restaurer en brouillon' }));
    await user.click(screen.getByRole('button', { name: 'Restaurer la version' }));
    expect(onRestoreVersion).toHaveBeenCalledWith('pub-v1');
  });

  it('met à jour son état et active la publication lors de la réception d’un template avec un nouveau brouillon sans remontage', () => {
    const templateWithoutDraft = createMockTemplate({
      draft_version: null,
      versions: [
        {
          id: 'pub-v2',
          template_id: '11111111-1111-4111-8111-111111111111',
          version: 2,
          status: 'published',
          body: 'Prompt version 2 publié',
          change_note: 'Version 2 publiée',
          created_by: null,
          published_by: null,
          published_at: '2026-07-12T10:00:00Z',
          created_at: '2026-07-12T10:00:00Z',
        },
      ],
    });

    const { rerender } = render(
      <AiPromptEditorDialog
        template={templateWithoutDraft}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestoreVersion={vi.fn()}
        isSaving={false}
        isPublishing={false}
        isRestoring={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Publier le brouillon' })).toBeDisabled();
    expect(screen.queryByText(/Brouillon v3/)).not.toBeInTheDocument();

    const templateWithDraft = createMockTemplate({
      draft_version: {
        id: 'draft-v3',
        template_id: '11111111-1111-4111-8111-111111111111',
        version: 3,
        status: 'draft',
        body: 'Prompt version 3 brouillon rafraîchi',
        change_note: 'Brouillon v3 automatique',
        created_by: null,
        published_by: null,
        published_at: null,
        created_at: '2026-07-15T10:00:00Z',
      },
      versions: [
        {
          id: 'draft-v3',
          template_id: '11111111-1111-4111-8111-111111111111',
          version: 3,
          status: 'draft',
          body: 'Prompt version 3 brouillon rafraîchi',
          change_note: 'Brouillon v3 automatique',
          created_by: null,
          published_by: null,
          published_at: null,
          created_at: '2026-07-15T10:00:00Z',
        },
        {
          id: 'pub-v2',
          template_id: '11111111-1111-4111-8111-111111111111',
          version: 2,
          status: 'published',
          body: 'Prompt version 2 publié',
          change_note: 'Version 2 publiée',
          created_by: null,
          published_by: null,
          published_at: '2026-07-12T10:00:00Z',
          created_at: '2026-07-12T10:00:00Z',
        },
      ],
    });

    rerender(
      <AiPromptEditorDialog
        template={templateWithDraft}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestoreVersion={vi.fn()}
        isSaving={false}
        isPublishing={false}
        isRestoring={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Publier le brouillon' })).toBeEnabled();
    expect(screen.getByText('Brouillon v3')).toBeInTheDocument();
    expect(screen.getByText('Brouillon v3 automatique')).toBeInTheDocument();
  });
});
