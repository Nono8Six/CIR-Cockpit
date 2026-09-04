import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import TaskCreateDialog from '@/components/tasks/TaskCreateDialog';

const mutateAsync = vi.fn().mockResolvedValue({});
vi.mock('@/hooks/tasks/useTasks', () => ({
  newRequestKey: () => '11111111-1111-4111-8111-111111111111',
  useTaskTypes: () => ({ isLoading: false, data: { task_types: [{ id: '22222222-2222-4222-8222-222222222222', label: 'Relance' }] } }),
  useTaskMutations: () => ({ create: { mutateAsync, isPending: false } }),
}));

describe('TaskCreateDialog', () => {
  it('keeps title, type and due date mandatory and sends a real quick-create payload', async () => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);
    render(<TaskCreateDialog open onOpenChange={vi.fn()} agencyId="33333333-3333-4333-8333-333333333333" userId="44444444-4444-4444-8444-444444444444" />);
    const create = screen.getByRole('button', { name: 'Créer' });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Titre de la tâche'), { target: { value: 'Rappeler le client' } });
    fireEvent.click(screen.getByLabelText('Type de tâche'));
    fireEvent.click(await screen.findByRole('option', { name: 'Relance' }));
    fireEvent.change(screen.getByLabelText('Échéance'), { target: { value: dueDate } });
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ kind: 'quick', title: 'Rappeler le client', due_date: dueDate })));
  });

  it('has no detectable accessibility violation in its required form', async () => {
    const { container } = render(<TaskCreateDialog open onOpenChange={vi.fn()} agencyId="33333333-3333-4333-8333-333333333333" userId="44444444-4444-4444-8444-444444444444" />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
