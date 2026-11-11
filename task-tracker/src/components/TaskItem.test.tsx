import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FAKE_TODAY, makeTask } from '../test/makeTask';
import type { Task } from '../types';
import { TaskItem } from './TaskItem';

function renderItem(task: Task, isSelected = false) {
  const onSelect = vi.fn();
  const onEdit = vi.fn();
  render(
    <ul>
      <TaskItem
        task={task}
        isSelected={isSelected}
        isEditing={false}
        onSelect={onSelect}
        onEdit={onEdit}
        today={FAKE_TODAY}
      />
    </ul>,
  );
  return { onSelect, onEdit };
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
    const button = screen.getByRole('button', { name: /^ہفتہ وار رپورٹ/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ہفتہ وار رپورٹ')).toHaveAttribute('dir', 'auto');
  });

  it('can be selected with the keyboard (Tab, then Enter or Space)', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderItem(makeTask({ id: 'abc' }));
    await user.tab();
    expect(screen.getByRole('button', { name: /^Task abc/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith('abc');
  });

  it('has an Edit button NEXT TO the select button, not inside it', async () => {
    const user = userEvent.setup();
    const { onEdit, onSelect } = renderItem(makeTask({ id: 'abc', title: 'Buy milk' }));
    const edit = screen.getByRole('button', { name: 'Edit Buy milk' });
    const select = screen.getByRole('button', { name: /^Buy milk/ });
    expect(select).not.toContainElement(edit);
    expect(edit.closest('button')).toBe(edit);
    await user.click(edit);
    expect(onEdit).toHaveBeenCalledWith('abc');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keeps a long title and Urdu text in the row with dir="auto"', () => {
    const long = 'Refactor_'.repeat(11);
    renderItem(makeTask({ id: '1', title: long }));
    expect(screen.getByText(long)).toHaveAttribute('dir', 'auto');
    expect(screen.getByRole('button', { name: `Edit ${long}` })).toBeInTheDocument();
  });
});
