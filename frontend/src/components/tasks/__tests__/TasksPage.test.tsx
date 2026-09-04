import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-08-13T12:00:00Z'));
});

import TasksPage from '@/components/tasks/TasksPage';

const listSpy = vi.fn();
const assignment = vi.fn().mockResolvedValue({});
const status = vi.fn().mockResolvedValue({});
vi.mock('@/hooks/tasks/useTasks', () => ({
  newRequestKey: () => '11111111-1111-4111-8111-111111111111',
  useTaskTypes: () => ({ data: { task_types: [{ id: '22222222-2222-4222-8222-222222222222', label: 'Relance' }] } }),
  useTasksList: (input: unknown) => { listSpy(input); return { isPending: false, isError: false, data: { total: 1, page: 1, page_size: 25, items: [{ task: { id: 'task-1', agency_id: 'agency-1', version: 1, title: 'Préparer le rendez-vous', description: null, task_type_id: 'type-1', planned_channel: null, scope: 'internal_cir', organization_id: null, contact_id: null, source_activity_id: null, completion_activity_id: null, created_by: 'user-1', responsible_id: null, status: 'todo', priority: 'high', due_date: '2026-08-14', due_time: null, due_timezone: 'Europe/Paris', visibility: 'agency', completed_at: null, completed_by: null, canceled_at: null, canceled_by: null, cancel_reason: null, series_id: null, previous_task_id: null, created_at: '2026-08-12T12:00:00Z', updated_at: '2026-08-12T12:00:00Z' }, task_type: { id: 'type-1', label: 'Relance' }, contributors: [], organization_name: null, contact_name: null, responsible_name: null, is_overdue: false }] } }; },
  useTaskMutations: () => ({ assignment: { mutateAsync: assignment }, status: { mutateAsync: status }, reschedule: { mutateAsync: vi.fn(), isPending: false }, execute: { mutateAsync: vi.fn(), isPending: false } }),
}));
vi.mock('@/components/tasks/TaskCreateDialog', () => ({ default: () => null }));
vi.mock('@/components/tasks/TaskDetailDialog', () => ({ default: () => null }));

describe('TasksPage', () => {
  afterAll(() => {
    vi.useRealTimers();
  });

  it('renders the collective queue and only exposes valid quick actions', async () => {
    render(<TasksPage agencyId="agency-1" userId="user-1" userRole="tcs" />);
    fireEvent.click(screen.getByRole('button', { name: 'File d’agence' }));
    expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ responsible_id: null }));
    const row = screen.getByRole('button', { name: 'Préparer le rendez-vous' }).closest('tr')!;
    expect(within(row).getByRole('button', { name: /prendre/i })).toBeInTheDocument();
    expect(within(row).queryByTitle('Commencer')).not.toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: /prendre/i }));
    expect(assignment).toHaveBeenCalledWith({ task_id: 'task-1', expected_version: 1, action: 'claim' });
  });

  it('has no detectable accessibility violation on the dense task list', async () => {
    const { container } = render(<TasksPage agencyId="agency-1" userId="user-1" userRole="tcs" />);
    expect((await axe(container)).violations).toEqual([]);
  });

  it('maps shortcuts to the same detailed server filters', () => {
    render(<TasksPage agencyId="agency-1" userId="user-1" userRole="tcs" />);
    fireEvent.click(screen.getByRole('button', { name: 'Mes contributions' }));
    expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ contributor_id: 'user-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'File d’agence' }));
    expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ responsible_id: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Mes tâches' }));
    expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ responsible_id: 'user-1' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrer par échéance' }));
    fireEvent.click(screen.getByRole('option', { name: 'Aujourd’hui' }));
    expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ due_from: '2026-08-13', due_to: '2026-08-13' }));
  });
});
