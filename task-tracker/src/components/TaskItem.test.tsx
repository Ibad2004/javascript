import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FAKE_TODAY, makeTask } from '../test/makeTask';
import type { Task } from '../types';
import { TaskItem } from './TaskItem';

function renderItem(task: Task, isSelected = false) {
  const onSelect = vi.fn();
  render(
    <ul>
      <TaskItem task={task} isSelected={isSelected} onSelect={onSelect} today={FAKE_TODAY} />
    </ul>,
  );
  return { onSelect };
}

describe('TaskItem', () => {
  it('shows status and priority as text, not only colour', () => {
    renderItem(makeTask({ id: '1', priority: 'high', done: false }));
    expect(screen.getByText('Not done')).toBeInTheDocument();
    expect(screen.getByText('Priority: High')).toBeInTheDocument();
  });

  it('marks a past date on a not-done task as overdue', () => {
    renderItem(makeTask({ id: '1', dueDate: '2026-11-05' }));
    expect(screen.getByText('Overdue (was due 5 Nov 2026)')).toBeInTheDocument();
  });

  it('never shows a done task as overdue', () => {
    renderItem(makeTask({ id: '1', done: true, dueDate: '2026-11-05' }));
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
    expect(screen.getByText('Due 5 Nov 2026')).toBeInTheDocument();
  });

  it('shows "Due today" for a task due on the fake today', () => {
    renderItem(makeTask({ id: '1', dueDate: FAKE_TODAY }));
    expect(screen.getByText('Due today')).toBeInTheDocument();
  });

  it('is a real button with aria-pressed and dir="auto" on the title', () => {
    renderItem(makeTask({ id: '1', title: 'ہفتہ وار رپورٹ' }), true);
    const button = screen.getByRole('button', { name: /ہفتہ وار رپورٹ/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ہفتہ وار رپورٹ')).toHaveAttribute('dir', 'auto');
  });

  it('can be selected with the keyboard (Tab, then Enter or Space)', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderItem(makeTask({ id: 'abc' }));
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith('abc');
  });
});
