import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TaskContextPanel from '@/components/tasks/TaskContextPanel';

const createDialogSpy = vi.fn();

vi.mock('@/hooks/tasks/useTasks', () => ({
  useTasksList: () => ({ isPending: false, isError: false, data: { total: 0, items: [] } }),
}));
vi.mock('@/components/tasks/TaskCreateDialog', () => ({
  default: (props: { open: boolean }) => { createDialogSpy(props.open); return null; },
}));
vi.mock('@/components/tasks/TaskDetailDialog', () => ({ default: () => null }));

describe('TaskContextPanel', () => {
  it('proposes the next task after an Activity but never creates it without confirmation', () => {
    render(
      <TaskContextPanel
        agencyId="agency-1"
        userId="user-1"
        userRole="tcs"
        activityId="activity-1"
        context={{ activityId: 'activity-1', contextLabel: 'Appel client' }}
      />,
    );
    expect(screen.getByText('Aucune tâche liée. Vous pouvez planifier la prochaine action.')).toBeVisible();
    expect(createDialogSpy).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Planifier' }));
    expect(createDialogSpy).toHaveBeenLastCalledWith(true);
  });
});
