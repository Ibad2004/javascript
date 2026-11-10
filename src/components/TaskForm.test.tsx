import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TaskForm } from './TaskForm';

describe('TaskForm', () => {
  it('has a label for every input', () => {
    render(<TaskForm />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
  });

  it('has a disabled submit button with a visible note', () => {
    render(<TaskForm />);
    expect(screen.getByRole('button', { name: 'Add task' })).toBeDisabled();
    expect(screen.getByText('Adding tasks comes in the next update.')).toBeVisible();
  });

  it('stops the browser from reloading the page on submit', () => {
    render(<TaskForm />);
    const form = screen.getByRole('button', { name: 'Add task' }).closest('form');
    expect(form).not.toBeNull();
    if (form === null) return;
    // fireEvent returns false when the handler called preventDefault().
    expect(fireEvent.submit(form)).toBe(false);
  });

  it('does not crash when the user presses Enter in the title field', async () => {
    const user = userEvent.setup();
    render(<TaskForm />);
    const title = screen.getByLabelText('Title');
    await user.type(title, 'Buy milk{Enter}');
    expect(title).toHaveValue('Buy milk');
    expect(screen.getByRole('heading', { name: 'Add a task' })).toBeInTheDocument();
  });
});
