import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FAKE_TODAY, makeTask } from '../test/makeTask';
import { TaskDetail } from './TaskDetail';

describe('TaskDetail', () => {
  it('shows "No description" for an empty description', () => {
    render(<TaskDetail task={makeTask({ id: '1', description: '' })} today={FAKE_TODAY} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('treats a description of only spaces as empty', () => {
    render(<TaskDetail task={makeTask({ id: '1', description: '   \n ' })} today={FAKE_TODAY} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('shows the task fields, keeping the line breaks of the description', () => {
    const task = makeTask({
      id: '1',
      title: 'Write notes',
      description: 'Line one\nLine two',
      priority: 'low',
      dueDate: null,
    });
    render(<TaskDetail task={task} today={FAKE_TODAY} />);

    // The title is the page's <h1> (TaskDetailPage), not repeated here.
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('No due date')).toBeInTheDocument();
    const description = screen.getByText(/Line one/);
    expect(description.textContent).toBe('Line one\nLine two');
    expect(description).toHaveClass('description');
  });
});
