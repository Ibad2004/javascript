import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from '../test/makeTask';
import { TaskSummary } from './TaskSummary';

describe('TaskSummary', () => {
  it('shows "No tasks yet" for 0 tasks', () => {
    render(<TaskSummary tasks={[]} />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('shows "1 of 1 done" for one done task', () => {
    render(<TaskSummary tasks={[makeTask({ id: '1', done: true })]} />);
    expect(screen.getByText('1 of 1 done')).toBeInTheDocument();
  });

  it('shows "1 of 3 done" when some are done', () => {
    render(
      <TaskSummary
        tasks={[makeTask({ id: '1', done: true }), makeTask({ id: '2' }), makeTask({ id: '3' })]}
      />,
    );
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
  });

  it('shows "2 of 2 done" when all are done', () => {
    render(
      <TaskSummary
        tasks={[makeTask({ id: '1', done: true }), makeTask({ id: '2', done: true })]}
      />,
    );
    expect(screen.getByText('2 of 2 done')).toBeInTheDocument();
  });
});
