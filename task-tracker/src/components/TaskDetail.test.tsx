import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FAKE_TODAY, makeTask } from '../test/makeTask';
import { TaskDetail } from './TaskDetail';

describe('TaskDetail', () => {
  it('asks the user to pick a task when nothing is selected', () => {
    render(<TaskDetail task={null} today={FAKE_TODAY} />);
    expect(screen.getByText('Select a task to see its details')).toBeInTheDocument();
  });

  it('shows "No description" for an empty description', () => {
    render(<TaskDetail task={makeTask({ id: '1', description: '' })} today={FAKE_TODAY} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('treats a description of only spaces as empty', () => {
    render(<TaskDetail task={makeTask({ id: '1', description: '   \n ' })} today={FAKE_TODAY} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('shows the full task, keeping the line breaks of the description', () => {
    const task = makeTask({
      id: '1',
      title: 'Write notes',
      description: 'Line one\nLine two',
      priority: 'low',
      dueDate: null,
    });
    render(<TaskDetail task={task} today={FAKE_TODAY} />);

    expect(screen.getByRole('heading', { name: 'Write notes' })).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('No due date')).toBeInTheDocument();
    const description = screen.getByText(/Line one/);
    expect(description.textContent).toBe('Line one\nLine two');
    expect(description).toHaveClass('description');
  });
});
