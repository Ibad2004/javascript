import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { FAKE_TODAY, makeTask } from '../test/makeTask';
import type { Task } from '../types';
import { TaskItem } from './TaskItem';

function renderItem(task: Task) {
  const onDelete = vi.fn();
  const onToggleDone = vi.fn();
  render(
    <MemoryRouter>
      <ul>
        <TaskItem task={task} onDelete={onDelete} onToggleDone={onToggleDone} today={FAKE_TODAY} />
      </ul>
    </MemoryRouter>,
  );
  return { onDelete, onToggleDone };
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

  it('is a real link to the task page, with dir="auto" on the title', () => {
    renderItem(makeTask({ id: '1', title: 'ہفتہ وار رپورٹ' }));
    const link = screen.getByRole('link', { name: /^ہفتہ وار رپورٹ/ });
    expect(link).toHaveAttribute('href', '/tasks/1');
    expect(screen.getByText('ہفتہ وار رپورٹ')).toHaveAttribute('dir', 'auto');
  });

  it('encodes an odd id in the link, so the URL stays valid', () => {
    renderItem(makeTask({ id: 'a b/%?', title: 'Odd' }));
    expect(screen.getByRole('link', { name: /^Odd/ })).toHaveAttribute(
      'href',
      '/tasks/a%20b%2F%25%3F',
    );
  });

  it('a keyboard user reaches the link with Tab (after the checkbox)', async () => {
    const user = userEvent.setup();
    renderItem(makeTask({ id: 'abc' }));
    await user.tab(); // the checkbox
    await user.tab();
    expect(screen.getByRole('link', { name: /^Task abc/ })).toHaveFocus();
  });

  it('has an Edit link NEXT TO the task link, not inside it, to the same page', () => {
    renderItem(makeTask({ id: 'abc', title: 'Buy milk' }));
    const edit = screen.getByRole('link', { name: 'Edit Buy milk' });
    const link = screen.getByRole('link', { name: /^Buy milk/ });
    expect(link).not.toContainElement(edit);
    expect(edit).toHaveAttribute('href', '/tasks/abc');
  });

  it('keeps a long title and Urdu text in the row with dir="auto"', () => {
    const long = 'Refactor_'.repeat(11);
    renderItem(makeTask({ id: '1', title: long }));
    expect(screen.getByText(long)).toHaveAttribute('dir', 'auto');
    expect(screen.getByRole('link', { name: `Edit ${long}` })).toBeInTheDocument();
  });

  it('has a Delete button named after the task, outside the task link', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderItem(makeTask({ id: 'abc', title: 'Buy milk' }));
    const del = screen.getByRole('button', { name: 'Delete Buy milk' });
    expect(screen.getByRole('link', { name: /^Buy milk/ })).not.toContainElement(del);
    await user.click(del);
    expect(onDelete).toHaveBeenCalledWith('abc');
  });

  it('has a checkbox labelled "Mark <title> as done" that toggles with Space', async () => {
    const user = userEvent.setup();
    const { onToggleDone } = renderItem(makeTask({ id: 'abc', title: 'Buy milk' }));
    const checkbox = screen.getByRole('checkbox', { name: 'Mark Buy milk as done' });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole('link', { name: /^Buy milk/ })).not.toContainElement(checkbox);
    await user.tab();
    expect(checkbox).toHaveFocus();
    await user.keyboard(' ');
    expect(onToggleDone).toHaveBeenCalledWith('abc');
  });

  it('shows a done task as checked', () => {
    renderItem(makeTask({ id: '1', title: 'Old', done: true }));
    expect(screen.getByRole('checkbox', { name: 'Mark Old as done' })).toBeChecked();
  });

  it('lays out the row as checkbox, link, Edit, Delete (no control inside another)', () => {
    renderItem(makeTask({ id: '1', title: 'Row' }));
    const item = screen.getByRole('listitem');
    const controls = [...item.querySelectorAll('input, button, a')];
    expect(
      controls.map((el) => el.getAttribute('aria-label') ?? el.getAttribute('type') ?? 'link'),
    ).toEqual(['checkbox', 'link', 'Edit Row', 'Delete Row']);
    expect(item.querySelector('a a, a button, a input, button button, button input')).toBeNull();
  });
});
